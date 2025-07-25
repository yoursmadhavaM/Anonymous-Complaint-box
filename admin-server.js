const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// --- Complaints API ---
// Get all complaints with optional filtering
app.get('/complaints', async (req, res) => {
  try {
    let query = db.collection('complaints');
    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }
    if (req.query.type) {
      query = query.where('complaintType', '==', req.query.type);
    }
    const snapshot = await query.get();
    const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// Get complaint details
app.get('/complaints/:id', async (req, res) => {
  try {
    const doc = await db.collection('complaints').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaint.' });
  }
});

// Mark as resolved
app.patch('/complaints/:id/resolve', async (req, res) => {
  try {
    await db.collection('complaints').doc(req.params.id).update({
      status: 'resolved',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'Resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve complaint.' });
  }
});

// Delete complaint
app.delete('/complaints/:id', async (req, res) => {
  try {
    await db.collection('complaints').doc(req.params.id).delete();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete complaint.' });
  }
});

// --- Security Note ---
// For production, add authentication/authorization middleware here
// Example: app.use(authMiddleware)

const PORT = 4000;
app.listen(PORT, () => console.log(`Admin server running on port ${PORT}`)); 