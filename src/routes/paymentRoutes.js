const express = require('express');
const { createCheckoutSession, verifySession, getConfig } = require('../controllers/paymentController');

const router = express.Router();

router.get('/config', getConfig);
router.post('/create-checkout-session', createCheckoutSession);
router.get('/verify/:session_id', verifySession);
// Note: /webhook is registered in app.js (needs raw body, before express.json)

module.exports = router;
