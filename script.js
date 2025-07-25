// Firebase compat initialization (for use with CDN scripts in all HTML files)
const firebaseConfig = {
  apiKey: "AIzaSyA-6DIng7Df8HmbE6KX5e8UxyGCIEPxxEk",
  authDomain: "anonymous-complaint-box.firebaseapp.com",
  projectId: "anonymous-complaint-box",
  storageBucket: "anonymous-complaint-box.appspot.com",
  messagingSenderId: "573878297184",
  appId: "1:573878297184:web:f5ee4ce9f6b7776e3cd905",
  measurementId: "G-5V8NQ941N9"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Utility: Get current page
function getPage() {
  const path = window.location.pathname;
  if (path.endsWith('admin-dashboard.html')) return 'admin';
  if (path.endsWith('dashboard.html')) return 'user';
  if (path.endsWith('index.html') || path === '/' || path === '') return 'index';
  if (path.endsWith('login.html')) return 'login';
  if (path.endsWith('register.html')) return 'register';
  if (path.endsWith('status.html')) return 'status';
  return 'other';
}

// --- Modal and Announcement Logic (shared) ---
function setupAnnouncementBar() {
  console.log('[DEBUG] setupAnnouncementBar called');
  const announcementBar = document.getElementById('announcementBar');
  if (!announcementBar) {
    console.log('[DEBUG] announcementBar div not found');
    return;
  }
  // If on index.html, use ticker style
  const isIndex = getPage() === 'index';
  db.collection('announcements')
    .where('status', '==', 'approved')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .then(snapshot => {
      console.log('[DEBUG] Firestore query complete. Docs found:', snapshot.size);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        console.log('[DEBUG] Announcement data:', data);
        if (isIndex) {
          announcementBar.classList.add('announcement-ticker');
          announcementBar.innerHTML = `<span class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></span><span class='ticker-content'>${data.text}</span>`;
        } else {
          announcementBar.classList.remove('announcement-ticker');
          announcementBar.innerHTML = `<span class=\"alert-icon\"><i class=\"fa-solid fa-triangle-exclamation\"></i></span> ${data.text}`;
        }
        announcementBar.style.display = '';
      } else {
        console.log('[DEBUG] No approved announcements found');
        announcementBar.style.display = 'none';
      }
    })
    .catch((err) => {
      console.log('[DEBUG] Firestore query error:', err);
      announcementBar.style.display = 'none';
    });
}

function setupAnnouncementRequestModal() {
  const requestAnnouncementBtn = document.getElementById('requestAnnouncementBtn');
  const announcementModal = document.getElementById('announcementModal');
  const closeAnnouncementModalBtn = document.getElementById('closeAnnouncementModalBtn');
  const announcementRequestForm = document.getElementById('announcementRequestForm');
  const announcementRequestResult = document.getElementById('announcementRequestResult');
  if (!requestAnnouncementBtn || !announcementModal || !closeAnnouncementModalBtn) return;
  requestAnnouncementBtn.onclick = function() {
    announcementModal.style.display = 'flex';
    if (announcementRequestResult) announcementRequestResult.textContent = '';
  };
  closeAnnouncementModalBtn.onclick = function() {
    announcementModal.style.display = 'none';
  };
  announcementModal.addEventListener('click', function(e) {
    if (e.target === announcementModal) announcementModal.style.display = 'none';
  });
  if (announcementRequestForm) {
    announcementRequestForm.onsubmit = async function(e) {
      e.preventDefault();
      const text = document.getElementById('announcementText').value.trim();
      if (!text) return;
      try {
        await db.collection('announcements').add({
          text,
          status: 'pending',
          createdBy: 'user',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (announcementRequestResult) {
          announcementRequestResult.style.color = '#388e3c';
          announcementRequestResult.textContent = 'Announcement request submitted! Awaiting admin approval.';
        }
        announcementRequestForm.reset();
      } catch (err) {
        if (announcementRequestResult) {
          announcementRequestResult.style.color = '#e53935';
          announcementRequestResult.textContent = 'Failed to submit request.';
        }
      }
    };
  }
}

// --- Index (Complaint Submission) Page Logic ---
function setupIndexPage() {
  // Modal logic
  const authModal = document.getElementById('authModal');
  const modalLoginBtn = document.getElementById('modalLoginBtn');
  const modalAnonBtn = document.getElementById('modalAnonBtn');
  const complaintForm = document.getElementById('complaintForm');
  const complaintTitle = document.getElementById('complaintTitle');
  if (authModal && modalLoginBtn && modalAnonBtn && complaintForm && complaintTitle) {
    authModal.style.display = 'flex';
    complaintForm.style.display = 'none';
    complaintTitle.style.display = 'none';
    modalLoginBtn.onclick = function() { window.location.href = 'login.html'; };
    modalAnonBtn.onclick = function() {
      authModal.style.display = 'none';
      complaintForm.style.display = '';
      complaintTitle.style.display = '';
    };
  }
  // Status modal logic
  const openStatusModalBtn = document.getElementById('openStatusModalBtn');
  const statusModal = document.getElementById('statusModal');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  if (openStatusModalBtn && statusModal && closeStatusModalBtn) {
    openStatusModalBtn.onclick = function() {
      statusModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };
    closeStatusModalBtn.onclick = function() {
      statusModal.style.display = 'none';
      document.body.style.overflow = '';
    };
    statusModal.addEventListener('click', function(e) {
      if (e.target === statusModal) {
        statusModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }
  // Complaint form submission
  if (complaintForm) {
    complaintForm.onsubmit = async function(e) {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const complaintType = document.getElementById('complaintType').value;
      const description = document.getElementById('description').value.trim();
      const requirement = document.getElementById('requirement').value;
      const otherRequirement = document.getElementById('otherRequirement').value.trim();
      const isAnonymous = document.getElementById('anonymous').checked;
      const token = 'C-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const complaintData = {
        name: isAnonymous ? null : name,
        email: isAnonymous ? null : email,
        complaintType,
        description,
        requirement: requirement === 'Other' ? otherRequirement : requirement,
        isAnonymous,
        token,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      try {
        await db.collection('complaints').add(complaintData);
        document.getElementById('tokenDisplay').textContent = token;
        document.getElementById('tokenSection').style.display = '';
        complaintForm.reset();
        complaintForm.style.display = 'none';
        complaintTitle.style.display = 'none';
      } catch (err) {
        alert('Failed to submit complaint. Please try again.');
      }
    };
  }
  // Inline status check
  const inlineStatusForm = document.getElementById('inlineStatusForm');
  const inlineStatusResult = document.getElementById('inlineStatusResult');
  if (inlineStatusForm && inlineStatusResult) {
    inlineStatusForm.onsubmit = async function(e) {
      e.preventDefault();
      const token = document.getElementById('inlineToken').value.trim();
      inlineStatusResult.textContent = 'Checking...';
      try {
        const querySnapshot = await db.collection('complaints').where('token', '==', token).get();
        if (querySnapshot.empty) {
          inlineStatusResult.textContent = 'No complaint found with this token.';
        } else {
          const complaint = querySnapshot.docs[0].data();
          inlineStatusResult.textContent = `Status: ${complaint.status || 'Unknown'}`;
        }
      } catch (err) {
        inlineStatusResult.textContent = 'Error checking status. Please try again.';
      }
    };
  }
  setupAnnouncementBar();
  setupAnnouncementRequestModal();
}

// --- Login Page Logic ---
function setupLoginPage() {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  if (loginForm) {
    loginForm.onsubmit = async function(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (loginError) loginError.textContent = '';
      try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'dashboard.html';
      } catch (err) {
        if (loginError) loginError.textContent = 'Login failed: ' + err.message;
      }
    };
  }
  if (forgotPasswordBtn) {
    forgotPasswordBtn.onclick = async function() {
      const email = document.getElementById('loginEmail').value.trim();
      if (!email) {
        if (loginError) loginError.textContent = 'Please enter your email to reset your password.';
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        if (loginError) {
          loginError.style.color = '#388e3c';
          loginError.textContent = 'Password reset email sent! Check your inbox.';
        }
      } catch (err) {
        if (loginError) {
          loginError.style.color = '#e53935';
          loginError.textContent = 'Error: ' + err.message;
        }
      }
    };
  }
}

// --- Register Page Logic ---
function setupRegisterPage() {
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.onsubmit = async function(e) {
      e.preventDefault();
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
          name,
          email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`Welcome, ${name || email}! Your account has been created.`);
        window.location.href = 'dashboard.html';
      } catch (err) {
        alert('Registration failed: ' + err.message);
      }
    };
  }
}

// --- Status Page Logic ---
function setupStatusPage() {
  const statusForm = document.getElementById('statusForm');
  const statusResult = document.getElementById('statusResult');
  if (statusForm && statusResult) {
    statusForm.onsubmit = async function(e) {
      e.preventDefault();
      const token = document.getElementById('token').value.trim();
      statusResult.textContent = 'Checking...';
      try {
        const querySnapshot = await db.collection('complaints').where('token', '==', token).get();
        if (querySnapshot.empty) {
          statusResult.textContent = 'No complaint found with this token.';
        } else {
          const complaint = querySnapshot.docs[0].data();
          statusResult.textContent = `Status: ${complaint.status || 'Unknown'}`;
        }
      } catch (err) {
        statusResult.textContent = 'Error checking status. Please try again.';
      }
    };
  }
}

// --- Dashboard Sidebar Logic (shared) ---
function setupSidebar() {
  const sidebar = document.querySelector('.dashboard-sidebar ul');
  const sections = document.querySelectorAll('.dashboard-section');
  if (sidebar && sections.length) {
    sidebar.addEventListener('click', function(e) {
      const li = e.target.closest('li[data-section]');
      if (!li) return;
      sidebar.querySelectorAll('li').forEach(item => item.classList.remove('active'));
      li.classList.add('active');
      sections.forEach(section => {
        section.style.display = section.id === li.dataset.section + 'Section' ? 'block' : 'none';
      });
    });
  }
}

// --- User Dashboard Logic ---
function setupUserDashboard() {
  // Auth check and greeting
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      const doc = await db.collection('users').doc(user.uid).get();
      const name = doc.exists ? doc.data().name : user.email;
      const greeting = document.createElement('div');
      greeting.textContent = `Welcome, ${name || user.email}!`;
      greeting.style.fontWeight = 'bold';
      greeting.style.fontSize = '1.2rem';
      greeting.style.marginBottom = '18px';
      document.querySelector('.dashboard-main')?.prepend(greeting);
    } else {
      window.location.href = 'login.html';
    }
  });
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      auth.signOut().then(() => {
        alert('You have been logged out.');
        window.location.href = 'login.html';
      });
    };
  }
  setupSidebar();
  setupAnnouncementBar();
}

// --- Admin Dashboard Logic ---
function setupAdminDashboard() {
  // Show dashboard on button click
  const adminWelcomeModal = document.getElementById('adminWelcomeModal');
  const adminEnterBtn = document.getElementById('adminEnterBtn');
  const dashboardContainer = document.querySelector('.dashboard-container');
  if (adminWelcomeModal && adminEnterBtn && dashboardContainer) {
    adminEnterBtn.onclick = function() {
      adminWelcomeModal.style.display = 'none';
      dashboardContainer.style.display = '';
    };
  }
  setupSidebar();
  setupAnnouncementBar();

  // Admin announcement submission logic
  const adminAnnouncementForm = document.getElementById('adminAnnouncementForm');
  const adminAnnouncementText = document.getElementById('adminAnnouncementText');
  const adminAnnouncementResult = document.getElementById('adminAnnouncementResult');
  if (adminAnnouncementForm && adminAnnouncementText) {
    adminAnnouncementForm.onsubmit = async function(e) {
      e.preventDefault();
      const text = adminAnnouncementText.value.trim();
      if (!text) return;
      try {
        await db.collection('announcements').add({
          text,
          status: 'approved',
          createdBy: 'admin',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        adminAnnouncementText.value = '';
        if (adminAnnouncementResult) {
          adminAnnouncementResult.style.color = '#388e3c';
          adminAnnouncementResult.textContent = 'Announcement added and visible to users!';
          setTimeout(() => { adminAnnouncementResult.textContent = ''; }, 3000);
        }
        setupAnnouncementBar(); // Refresh announcement bar for admin
      } catch (err) {
        if (adminAnnouncementResult) {
          adminAnnouncementResult.style.color = '#e53935';
          adminAnnouncementResult.textContent = 'Failed to add announcement.';
          setTimeout(() => { adminAnnouncementResult.textContent = ''; }, 3000);
        }
      }
    };
  }
  // Add more admin-specific logic as needed (e.g., fetch complaints, manage announcements)
}

// --- Main Entrypoint ---
document.addEventListener('DOMContentLoaded', function() {
  const page = getPage();
  if (page === 'index') setupIndexPage();
  else if (page === 'login') setupLoginPage();
  else if (page === 'register') setupRegisterPage();
  else if (page === 'status') setupStatusPage();
  else if (page === 'user') setupUserDashboard();
  else if (page === 'admin') setupAdminDashboard();
}); 