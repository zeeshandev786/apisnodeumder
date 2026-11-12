const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const requestLogger = require('./src/middlewares/requestLogger');
const { notFound, errorHandler } = require('./src/middlewares/errorHandler');
const routes = require('./src/routes');

const app = express();

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging
app.use(requestLogger);

// Serve static HTML pages (pay.html, success.html, cancel.html)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
