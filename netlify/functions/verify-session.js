const Stripe = require('stripe');

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

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        status: session.payment_status,
        customer_email: session.customer_details?.email,
        amount_total: (session.amount_total / 100).toFixed(2),
        currency: session.currency,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
