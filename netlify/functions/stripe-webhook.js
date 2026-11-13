const Stripe = require('stripe');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase, ServerValue }     = require('firebase-admin/database');

// Firebase init using env vars (Netlify sets these in dashboard)
function getRtdb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential:  cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
  return getDatabase();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe  = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig     = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  // 1. Verify the event is genuinely from Stripe
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Webhook] Signature failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // 2. Only process completed + paid sessions
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const session = stripeEvent.data.object;

  if (session.payment_status !== 'paid') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  // 3. Pull everything from Stripe metadata
  const {
    userId,
    productId,
    productName,
    currency,
    desc,
    userEmail,
  } = session.metadata || {};

  if (!userId || !productId) {
    console.warn('[Webhook] Missing userId or productId in metadata');
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  try {
    const rtdb = getRtdb();

    // Single atomic multi-path write to Realtime Database
    await rtdb.ref('users/' + userId).update({
      isPaid:                     true,
      paidAt:                     ServerValue.TIMESTAMP,
      [`products/${productId}`]:  true,
    });

    console.log(`[Webhook] ✓ RTDB updated — products/${productId} for user: ${userId}`);
  } catch (err) {
    console.error('[Webhook] RTDB write failed:', err.message);
    return { statusCode: 500, body: 'RTDB write failed' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
