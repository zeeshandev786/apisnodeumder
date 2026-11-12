const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Create a Stripe Checkout session
const createCheckoutSession = async (req, res, next) => {
  try {
    const { productName, amount, currency = 'usd', quantity = 1 } = req.body;

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
            unit_amount: Math.round(amount * 100), // convert to cents
          },
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/cancel.html`,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
};

// Verify payment after redirect
const verifySession = async (req, res, next) => {
  try {
    const { session_id } = req.params;
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({
      success: true,
      status: session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total: (session.amount_total / 100).toFixed(2),
      currency: session.currency,
    });
  } catch (err) {
    next(err);
  }
};

// Get publishable key for frontend
const getConfig = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
};

module.exports = { createCheckoutSession, verifySession, getConfig };
