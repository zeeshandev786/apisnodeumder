const express = require('express');
const homeRoutes = require('./homeRoutes');
const userRoutes = require('./userRoutes');
const firebaseRoutes = require('./firebaseRoutes');
const paymentRoutes = require('./paymentRoutes');

const router = express.Router();

router.use('/', homeRoutes);
router.use('/users', userRoutes);
router.use('/firebase', firebaseRoutes);
router.use('/payment', paymentRoutes);

module.exports = router;
