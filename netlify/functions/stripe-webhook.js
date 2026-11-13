const Stripe = require('stripe');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function getDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
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

  // 2. Only handle completed + paid sessions
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const session = stripeEvent.data.object;

  if (session.payment_status !== 'paid') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  // 3. Pull everything we stored in metadata
  const {
    userId,
    productId,
    productName,
    amount,
    currency,
    desc,
    userEmail,
  } = session.metadata || {};

  if (!userId || !productId) {
    console.warn('[Webhook] Missing userId or productId in metadata');
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  // 4. Build the product object that will be saved
  const purchasedProduct = {
    productId,
    productName:   productName || productId,
    amount:        (session.amount_total / 100).toFixed(2),
    currency:      (currency || session.currency).toUpperCase(),
    desc:          desc || '',
    sessionId:     session.id,
    email:         session.customer_details?.email || userEmail || '',
    purchasedAt:   FieldValue.serverTimestamp(),
  };

  try {
    const db      = getDb();
    const userRef = db.collection('users').doc(userId);

    // Set top-level payment flags (merge keeps other user fields intact)
    await userRef.set(
      {
        isPaid:      true,
        paidAt:      FieldValue.serverTimestamp(),
        lastPayment: purchasedProduct,
      },
      { merge: true }
    );

    // Add product under products.{productId} using dot-notation
    // so buying a second product never overwrites the first
    await userRef.update({
      [`products.${productId}`]: purchasedProduct,
    });

    console.log(`[Webhook] ✓ products.${productId} saved for user: ${userId}`);
  } catch (err) {
    console.error('[Webhook] Firestore write failed:', err.message);
    return { statusCode: 500, body: 'Firestore write failed' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
