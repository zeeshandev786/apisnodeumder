const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── Create Stripe Checkout Session ──────────────────────────────────────────
// POST /api/payment/create-checkout-session
// Body: { productName, amount, currency?, quantity?, userId?, userEmail? }
const createCheckoutSession = async (req, res, next) => {
  try {
    const {
      productName,
      amount,
      currency  = 'usd',
      quantity  = 1,
      userId    = '',
      userEmail = '',
    } = req.body;

    if (!productName || !amount) {
      res.status(400);
      throw new Error('productName and amount are required');
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: Math.round(amount * 100),
          },
          quantity,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      metadata: { userId, productName, amount: String(amount) },
      success_url: `${CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${CLIENT_URL}/cancel.html`,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
};

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
// POST /api/payment/webhook
// Stripe sends signed events here — verifies signature, then updates Firestore
const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // req.body is raw Buffer here (see app.js)
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      const userId = session.metadata?.userId;

      if (userId) {
        try {
          await db.collection('users').doc(userId).set(
            {
              isPaid: true,
              paidAt: FieldValue.serverTimestamp(),
              lastPayment: {
                sessionId:   session.id,
                productName: session.metadata?.productName || '',
                amount:      (session.amount_total / 100).toFixed(2),
                currency:    session.currency?.toUpperCase(),
                email:       session.customer_details?.email || '',
              },
            },
            { merge: true }
          );
          console.log(`[Webhook] isPaid=true → user: ${userId}`);
        } catch (err) {
          console.error('[Webhook] Firestore update failed:', err.message);
        }
      }
    }
  }

  res.json({ received: true });
};

// ─── Verify Session ───────────────────────────────────────────────────────────
// GET /api/payment/verify/:session_id
const verifySession = async (req, res, next) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.session_id);
    res.json({
      success: true,
      status:         session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total:   (session.amount_total / 100).toFixed(2),
      currency:       session.currency,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Publishable Key ──────────────────────────────────────────────────────
const getConfig = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
};

module.exports = { createCheckoutSession, stripeWebhook, verifySession, getConfig };
