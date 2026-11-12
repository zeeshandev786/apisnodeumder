const express = require('express');
const {
  firebaseHealth,
  listAuthUsers,
  createDocument,
  getCollection,
} = require('../controllers/firebaseController');

const router = express.Router();

router.get('/health', firebaseHealth);
router.get('/auth/users', listAuthUsers);
router.post('/firestore', createDocument);
router.get('/firestore/:collection', getCollection);

module.exports = router;
