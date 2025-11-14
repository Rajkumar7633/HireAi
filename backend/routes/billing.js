const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { billingLimiter } = require('../middleware/rateLimiter')
const { createCheckout, createPortal, getHistory, sync } = require('../controllers/billingController')

// Protected routes (JWT auth)
router.post('/checkout', billingLimiter, auth, createCheckout)
router.get('/portal', billingLimiter, auth, createPortal)
// Read-only endpoints: no rate limiter to avoid 429s in app refreshes
router.get('/history', auth, getHistory)
router.get('/sync', auth, sync)

module.exports = router
