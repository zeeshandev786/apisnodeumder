const { db, auth } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { getApp } = require('firebase-admin/app');

// Ping Firestore to confirm connection is live
const firebaseHealth = async (req, res, next) => {
  try {
    await db.listCollections();
    const app = getApp();
    res.json({
      success: true,
      message: 'Firebase connected',
      project: app.options.projectId || 'fatal-fist',
    });
  } catch (err) {
    next(err);
  }
};

// List up to 10 users from Firebase Auth
const listAuthUsers = async (req, res, next) => {
  try {
    const result = await auth.listUsers(10);
    const users = result.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      createdAt: u.metadata.creationTime,
    }));
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// Write a document to Firestore
const createDocument = async (req, res, next) => {
  try {
    const { collection, data } = req.body;
    if (!collection || !data) {
      res.status(400);
      throw new Error('collection and data are required');
    }
    const ref = await db.collection(collection).add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    res.status(201).json({ success: true, id: ref.id });
  } catch (err) {
    next(err);
  }
};

// Read all documents from a Firestore collection
const getCollection = async (req, res, next) => {
  try {
    const { collection } = req.params;
    const snapshot = await db.collection(collection).get();
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    next(err);
  }
};

module.exports = { firebaseHealth, listAuthUsers, createDocument, getCollection };
