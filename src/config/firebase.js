const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase }  = require('firebase-admin/database');
const { getAuth }      = require('firebase-admin/auth');
const path = require('path');

if (!getApps().length) {
  const serviceAccount = require(
    path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
  );

  initializeApp({
    credential:   cert(serviceAccount),
    databaseURL:  process.env.FIREBASE_DATABASE_URL,
  });

  console.log('[Firebase] Connected to project:', serviceAccount.project_id);
  console.log('[Firebase] RTDB URL:', process.env.FIREBASE_DATABASE_URL);
}

const rtdb = getDatabase();   // Realtime Database
const auth = getAuth();

module.exports = { rtdb, auth };
