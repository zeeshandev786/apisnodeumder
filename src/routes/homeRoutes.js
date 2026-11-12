const express = require('express');
const { getHome, getHealth } = require('../controllers/homeController');

const router = express.Router();

router.get('/', getHome);
router.get('/health', getHealth);

module.exports = router;
