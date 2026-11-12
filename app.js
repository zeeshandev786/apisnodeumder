const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const requestLogger = require('./src/middlewares/requestLogger');
const { notFound, errorHandler } = require('./src/middlewares/errorHandler');
const routes = require('./src/routes');

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging
app.use(requestLogger);

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
