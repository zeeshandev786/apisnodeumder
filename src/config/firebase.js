const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

if (!getApps().length) {
  const serviceAccount = require(
    path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
  );

  initializeApp({
    credential: cert(serviceAccount),
  });

  console.log('[Firebase] Connected to project:', serviceAccount.project_id);
}

const db = getFirestore();
const auth = getAuth();

module.exports = { db, auth };
