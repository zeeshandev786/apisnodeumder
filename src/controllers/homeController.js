const { appName } = require('../config/config');

const getHome = (req, res) => {
  res.json({
    success: true,
    message: 'Hello World — project is running!',
    app: appName,
    version: '1.0.0',
  });
};

const getHealth = (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { getHome, getHealth };
