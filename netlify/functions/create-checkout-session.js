const Stripe = require('stripe');

const SITE_URL = 'https://guileless-gelato-c97301.netlify.app';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { productName, amount, currency = 'usd', quantity = 1 } = JSON.parse(event.body || '{}');

    if (!productName || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'productName and amount are required' }),
      };
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel.html`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
