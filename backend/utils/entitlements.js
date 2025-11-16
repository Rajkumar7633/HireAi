// Maps Stripe price IDs to internal plans and entitlements
// Use env to avoid hardcoding secrets or IDs in repo.

const DEFAULTS = {
  recruiter_pro: {
    role: 'recruiter',
    features: { analyticsPro: true, rulesEngine: true, rediscovery: true, bulkActions: true },
    limits: { candidatesPerMonth: 5000, aiReviewsPerMonth: 1000 },
  },
  student_plus: {
    role: 'job_seeker',
    features: { aiReviewsPlus: true, mockTests: true },
    limits: { aiReviewsPerMonth: 100, mockTestsPerMonth: 50 },
  },
}

function planFromPrice(priceId) {
  if (!priceId) return null

  // Be tolerant of env configuration: fall back to NEXT_PUBLIC_* if server-side vars are missing
  const recruiterPriceId =
    process.env.RECRUITER_PRO_PRICE || process.env.NEXT_PUBLIC_RECRUITER_PRO_PRICE || ''
  const studentPriceId =
    process.env.STUDENT_PLUS_PRICE || process.env.NEXT_PUBLIC_STUDENT_PLUS_PRICE || ''

  const map = {
    [recruiterPriceId]: { key: 'recruiter_pro', ...DEFAULTS.recruiter_pro },
    [studentPriceId]: { key: 'student_plus', ...DEFAULTS.student_plus },
  }
  return map[priceId] || null
}

function entitlementsFromPlan(plan) {
  if (!plan) return { features: {}, limits: {} }
  return { features: plan.features || {}, limits: plan.limits || {} }
}

module.exports = { planFromPrice, entitlementsFromPlan }
