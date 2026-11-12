const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const requestLogger = require('./src/middlewares/requestLogger');
const { notFound, errorHandler } = require('./src/middlewares/errorHandler');
const routes = require('./src/routes');
const { stripeWebhook } = require('./src/controllers/paymentController');

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

// ⚠️  Stripe webhook must receive raw body — BEFORE express.json()
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// JSON & form parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging
app.use(requestLogger);

// Static pages
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
