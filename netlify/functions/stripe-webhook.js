const Stripe = require('stripe');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Firebase init — uses FIREBASE_SERVICE_ACCOUNT_JSON env var (full JSON string)
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

  const stripe    = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig       = event.headers['stripe-signature'];
  const rawBody   = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    // Only mark paid if payment actually succeeded
    if (session.payment_status !== 'paid') {
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const userId = session.metadata?.userId;

    if (userId) {
      try {
        const db = getDb();
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
          { merge: true }   // keep existing user fields, only update payment fields
        );
        console.log(`[Webhook] isPaid=true set for user: ${userId}`);
      } catch (err) {
        console.error('[Webhook] Firestore update failed:', err.message);
        return { statusCode: 500, body: 'Firestore update failed' };
      }
    } else {
      console.warn('[Webhook] checkout.session.completed — no userId in metadata');
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
