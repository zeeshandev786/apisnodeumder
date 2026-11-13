const Stripe = require('stripe');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase, ServerValue }     = require('firebase-admin/database');

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
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const session_id = event.queryStringParameters?.session_id;
    if (!session_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'session_id is required' }),
      };
    }

    const stripe  = Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Only write to DB if payment actually succeeded
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
        const rtdb = getRtdb();

        // Atomic multi-path write — sets isPaid + products/{productId}=true
        await rtdb.ref('users/' + userId).update({
          isPaid:                     true,
          paidAt:                     ServerValue.TIMESTAMP,
          [`products/${productId}`]:  true,
        });

        console.log(`[verify-session] ✓ RTDB updated — products/${productId} for user: ${userId}`);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success:        true,
        status:         session.payment_status,
        customer_email: session.customer_details?.email,
        amount_total:   (session.amount_total / 100).toFixed(2),
        currency:       session.currency?.toUpperCase(),
        metadata:       session.metadata,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
