const Stripe = require('stripe');

const SITE_URL = 'https://guileless-gelato-c97301.netlify.app';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const {
      productId,          // unique product key  e.g. "ironjaxpremiumskin"
      productName,        // display name on Stripe checkout (falls back to productId)
      amount,
      currency  = 'usd',
      quantity  = 1,
      desc      = '',
      userId    = '',
      userEmail = '',
    } = JSON.parse(event.body || '{}');

    if (!productId || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'productId and amount are required' }),
      };
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
      // Everything stored here is available in the webhook
      metadata: {
        userId,
        productId,
        productName: productName || productId,
        amount:      String(amount),
        currency:    currency.toUpperCase(),
        desc,
        userEmail,
      },
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${SITE_URL}/cancel.html`,
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
