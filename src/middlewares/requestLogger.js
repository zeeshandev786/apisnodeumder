const morgan = require('morgan');
const { nodeEnv } = require('../config/config');

const requestLogger = morgan(nodeEnv === 'production' ? 'combined' : 'dev');

module.exports = requestLogger;
