const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// List all complaints
async function listAllComplaints() {
  try {
    const snapshot = await db.collection('complaints').get();
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });
  } catch (err) {
    console.error('Error listing complaints:', err);
  }
}

// Resolve a complaint by ID
async function resolveComplaint(complaintId) {
  try {
    await db.collection('complaints').doc(complaintId).update({
      status: 'resolved',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Complaint ${complaintId} marked as resolved.`);
  } catch (err) {
    console.error('Error resolving complaint:', err);
  }
}

// Delete a complaint by ID
async function deleteComplaint(complaintId) {
  try {
    await db.collection('complaints').doc(complaintId).delete();
    console.log(`Complaint ${complaintId} deleted.`);
  } catch (err) {
    console.error('Error deleting complaint:', err);
  }
}

// --- Usage examples (uncomment to use) ---
// listAllComplaints();
// resolveComplaint('COMPLAINT_ID_HERE');
// deleteComplaint('COMPLAINT_ID_HERE');

// Extend this script with more admin features as needed. 