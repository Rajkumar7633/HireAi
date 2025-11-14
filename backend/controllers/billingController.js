const Stripe = require('stripe')
const crypto = require('crypto')
const User = require('../models/User')
const { planFromPrice, entitlementsFromPlan } = require('../utils/entitlements')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 2,
  timeout: 20000,
})

function getIdempotencyKey(req) {
  return (
    req.headers['x-idempotency-key'] ||
    `${req.user?._id || 'anon'}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  )
}

// One-click sync: pull latest subscription from Stripe and update user entitlements
exports.sync = async (req, res) => {
  try {
    const userId = (req.user?.id || req.user?.userId || req.user?._id)?.toString()
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(userId).select('_id role stripeCustomerId email')
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Ensure or create customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId, role: user.role || 'job_seeker' },
      })
      customerId = customer.id
      await User.updateOne({ _id: userId }, { $set: { stripeCustomerId: customerId } })
    }

    let sub = null
    const sessionId = req.query?.session_id || req.query?.sessionId
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        const subId = session?.subscription
        if (subId) {
          sub = await stripe.subscriptions.retrieve(typeof subId === 'string' ? subId : subId.id)
        }
      } catch {}
    }
    if (!sub) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
          const list = subs.data || []
          const pref = ['active', 'trialing', 'past_due', 'unpaid']
          sub = list.find(s => pref.includes(s.status)) || list.sort((a,b)=> (b.current_period_end||0)-(a.current_period_end||0))[0] || null
          break
        } catch (e) {
          if (attempt === 2) throw e
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
        }
      }
    }
    if (!sub) {
      await User.updateOne(
        { _id: userId },
        { $set: { subscription: null, features: {}, limits: {} } }
      )
      return res.json({ updated: true, subscription: null, features: {}, limits: {} })
    }

    const priceId = sub.items?.data?.[0]?.price?.id
    const productId = sub.items?.data?.[0]?.price?.product
    const status = sub.status
    const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

    const plan = planFromPrice(priceId)
    const entitlements = entitlementsFromPlan(plan)
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          subscription: { productId, priceId, status, currentPeriodEnd },
          features: entitlements.features,
          limits: entitlements.limits,
        },
      }
    )

    return res.json({
      updated: true,
      subscription: { productId, priceId, status, currentPeriodEnd },
      features: entitlements.features,
      limits: entitlements.limits,
    })
  } catch (err) {
    console.error('Billing sync error', err?.message || err)
    return res.status(500).json({ message: 'Failed to sync subscription' })
  }
}
// Return recent invoices for authenticated user
exports.getHistory = async (req, res) => {
  try {
    const userId = (req.user?.id || req.user?.userId || req.user?._id)?.toString()
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(userId).select('stripeCustomerId')
    if (!user?.stripeCustomerId) return res.json({ invoices: [] })

    let invoices
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        invoices = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 12,
          expand: ['data.payment_intent.payment_method'],
        })
        break
      } catch (e) {
        if (attempt === 2) throw e
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }

    const data = (invoices.data || []).map((inv) => {
      const pm = inv.payment_intent?.payment_method
      const card = pm?.card
      return {
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount_paid || inv.amount_due,
        currency: inv.currency,
        created: inv.created ? new Date(inv.created * 1000) : null,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
        payment_method: pm?.type || (card ? 'card' : undefined),
        card_brand: card?.brand,
        card_last4: card?.last4,
      }
    })

    return res.json({ invoices: data })
  } catch (err) {
    console.error('Billing history error', err?.message || err)
    // Be resilient: return empty list instead of failing the page
    return res.json({ invoices: [] })
  }
}

exports.createCheckout = async (req, res) => {
  try {
    const { priceId, mode = 'subscription', successUrl, cancelUrl } = req.body || {}
    if (!priceId) return res.status(400).json({ message: 'priceId required' })

    const userId = (req.user?.id || req.user?._id)?.toString()
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    // Ensure customer
    const user = await User.findById(userId).select('_id email stripeCustomerId role')
    if (!user) return res.status(404).json({ message: 'User not found' })

    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId, role: user.role || 'job_seeker' },
      })
      customerId = customer.id
      user.stripeCustomerId = customerId
      await user.save()
    }

    // Price guard by role (optional simple check)
    const plan = planFromPrice(priceId)
    if (!plan) return res.status(400).json({ message: 'Unknown priceId' })
    if (plan.role && user.role && plan.role !== user.role) {
      return res.status(403).json({ message: 'Price not allowed for this role' })
    }

    // Compute role-based success redirect directly to dashboard
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
    const role = user.role || 'job_seeker'
    const roleDashboardPath = role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/job-seeker'
    const successUrlFinal =
      successUrl || `${FRONTEND_URL}${roleDashboardPath}?billing=success&session_id={CHECKOUT_SESSION_ID}`

    const session = await stripe.checkout.sessions.create(
      {
        mode,
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: successUrlFinal,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/billing/cancel`,
        metadata: { userId, role },
      },
      { idempotencyKey: getIdempotencyKey(req) }
    )

    return res.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error', err)
    return res.status(500).json({ message: 'Checkout failed' })
  }
}

exports.createPortal = async (req, res) => {
  try {
    const userId = (req.user?.id || req.user?.userId || req.user?._id)?.toString()
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(userId).select('stripeCustomerId email role')
    let customerId = user?.stripeCustomerId
    if (!customerId) {
      // Create a Stripe customer on-demand to avoid portal Unauthorized issues
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId, role: user?.role || 'job_seeker' },
      })
      customerId = customer.id
      await User.updateOne({ _id: userId }, { $set: { stripeCustomerId: customerId } })
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
    const portalPayload = {
      customer: customerId,
      return_url: `${FRONTEND_URL}/settings/billing`,
    }
    if (process.env.STRIPE_PORTAL_CONFIGURATION) {
      // If you have a saved Portal configuration ID, use it explicitly
      portalPayload.configuration = process.env.STRIPE_PORTAL_CONFIGURATION
    }
    try {
      const portal = await stripe.billingPortal.sessions.create(portalPayload)
      return res.json({ url: portal.url })
    } catch (e) {
      const msg = e?.message || ''
      if (msg.includes('default configuration has not been created')) {
        return res.status(400).json({ message: 'Stripe portal is not configured in test mode. Visit dashboard to enable a default configuration.', configured: false })
      }
      throw e
    }
  } catch (err) {
    console.error('Stripe portal error', err?.message, err)
    return res.status(500).json({ message: 'Portal failed', error: err?.message })
  }
}

// Webhook: must be mounted with express.raw({ type: 'application/json' })
exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed', err?.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerId = session.customer
        const userId = session.metadata?.userId
        if (userId && customerId) {
          await User.updateOne(
            { _id: userId },
            { $set: { stripeCustomerId: customerId } },
            { upsert: false }
          )
        }
        // Create a subscription schedule: Phase 1 = 2 months, Phase 2 = monthly
        try {
          const subId = session.subscription
          if (subId) {
            const subscription = await stripe.subscriptions.retrieve(typeof subId === 'string' ? subId : subId.id)
            // If a schedule already exists, skip (idempotency)
            if (!subscription.schedule) {
              const currentItem = subscription.items?.data?.[0]
              const monthlyPrice = currentItem?.price
              if (monthlyPrice && monthlyPrice.recurring?.interval === 'month') {
                const productId = monthlyPrice.product
                const currency = monthlyPrice.currency
                const unitAmount = monthlyPrice.unit_amount

                // Try to find an existing 2-month price for same product and currency
                let twoMonthPrice = null
                try {
                  const existing = await stripe.prices.list({
                    product: typeof productId === 'string' ? productId : productId.id,
                    active: true,
                    limit: 50,
                  })
                  twoMonthPrice = (existing.data || []).find(
                    (p) => p.recurring && p.recurring.interval === 'month' && p.recurring.interval_count === 2 && p.currency === currency && p.unit_amount === unitAmount
                  )
                } catch {}

                // If not found, create a 2-month price mirroring monthly unit amount and currency
                if (!twoMonthPrice) {
                  twoMonthPrice = await stripe.prices.create({
                    product: typeof productId === 'string' ? productId : productId.id,
                    currency,
                    unit_amount: unitAmount,
                    recurring: { interval: 'month', interval_count: 2 },
                  })
                }

                // Build schedule phases
                const phases = [
                  {
                    items: [
                      {
                        price: typeof twoMonthPrice === 'string' ? twoMonthPrice : twoMonthPrice.id,
                        quantity: currentItem.quantity || 1,
                      },
                    ],
                    iterations: 1,
                  },
                  {
                    items: [
                      {
                        price: typeof monthlyPrice === 'string' ? monthlyPrice : monthlyPrice.id,
                        quantity: currentItem.quantity || 1,
                      },
                    ],
                  },
                ]

                try {
                  await stripe.subscriptionSchedules.create({
                    from_subscription: subscription.id,
                    phases,
                  })
                  // Schedule created; Stripe will manage future billing periods. Subsequent webhooks will update DB.
                } catch (e) {
                  console.warn('Failed to create subscription schedule (non-fatal):', e?.message || e)
                }
              }
            }
          }
        } catch (e) {
          console.warn('checkout.session.completed schedule setup failed (non-fatal):', e?.message || e)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const customerId = sub.customer
        const priceId = sub.items?.data?.[0]?.price?.id
        const productId = sub.items?.data?.[0]?.price?.product
        const status = sub.status
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

        const user = await User.findOne({ stripeCustomerId: customerId }).select('_id role')
        if (user) {
          const plan = planFromPrice(priceId)
          const entitlements = entitlementsFromPlan(plan)
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                subscription: { productId, priceId, status, currentPeriodEnd },
                features: entitlements.features,
                limits: entitlements.limits,
              },
            }
          )
        }
        break
      }
      case 'invoice.payment_failed': {
        // Optionally flag account, notify user
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Webhook handling error', err)
    return res.status(500).send('Webhook handler error')
  }

  return res.json({ received: true })
}
