const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { rtdb } = require('../config/firebase');
const { ServerValue } = require('firebase-admin/database');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── Create Stripe Checkout Session ──────────────────────────────────────────
// POST /api/payment/create-checkout-session
// Body: { productId, productName?, amount, currency?, quantity?, desc?, userId?, userEmail? }
const createCheckoutSession = async (req, res, next) => {
  try {
    const {
      productId,
      productName,
      amount,
      currency  = 'usd',
      quantity  = 1,
      desc      = '',
      userId    = '',
      userEmail = '',
    } = req.body;

    if (!productId || !amount) {
      res.status(400);
      throw new Error('productId and amount are required');
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: productName || productId },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      metadata: {
        userId,
        productId,
        productName: productName || productId,
        amount:      String(amount),
        currency:    currency.toUpperCase(),
        desc,
        userEmail,
      },
      success_url: `${CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${CLIENT_URL}/cancel.html`,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
};

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
// POST /api/payment/webhook  (raw body — registered in app.js before express.json)
const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Webhook] Signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      const {
        userId,
        productId,
        productName,
        amount,
        currency,
        desc,
        userEmail,
      } = session.metadata || {};

      if (userId && productId) {
        const purchasedProduct = {
          productId,
          productName:  productName || productId,
          amount:       (session.amount_total / 100).toFixed(2),
          currency:     (currency || session.currency || 'USD').toUpperCase(),
          desc:         desc || '',
          sessionId:    session.id,
          email:        session.customer_details?.email || userEmail || '',
          purchasedAt:  ServerValue.TIMESTAMP,
        };

        try {
          // Single atomic multi-path update to Realtime Database
          await rtdb.ref('users/' + userId).update({
            isPaid:                     true,
            paidAt:                     ServerValue.TIMESTAMP,
            lastPayment:                purchasedProduct,
            [`products/${productId}`]:  purchasedProduct,
          });

          console.log(`[Webhook] ✓ RTDB updated — products/${productId} for user: ${userId}`);
        } catch (err) {
          console.error('[Webhook] RTDB write failed:', err.message);
        }
      } else {
        console.warn('[Webhook] Missing userId or productId in metadata');
      }
    }
  }

  res.json({ received: true });
};

// ─── Verify Session + write full product object to RTDB ──────────────────────
// GET /api/payment/verify/:session_id
const verifySession = async (req, res, next) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.session_id);

    if (session.payment_status === 'paid') {
      const {
        userId,
        productId,
        productName,
        currency,
        desc,
        userEmail,
      } = session.metadata || {};

      if (userId && productId) {
        const purchasedProduct = {
          productId,
          productName:  productName || productId,
          amount:       (session.amount_total / 100).toFixed(2),
          currency:     (currency || session.currency || 'USD').toUpperCase(),
          desc:         desc || '',
          sessionId:    session.id,
          email:        session.customer_details?.email || userEmail || '',
          purchasedAt:  ServerValue.TIMESTAMP,
        };

        await rtdb.ref('users/' + userId).update({
          isPaid:                     true,
          paidAt:                     ServerValue.TIMESTAMP,
          lastPayment:                purchasedProduct,
          [`products/${productId}`]:  purchasedProduct,
        });

        console.log(`[verify] ✓ RTDB updated — products/${productId} for user: ${userId}`);
      }
    }

    res.json({
      success:        true,
      status:         session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total:   (session.amount_total / 100).toFixed(2),
      currency:       session.currency?.toUpperCase(),
      metadata:       session.metadata,
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
