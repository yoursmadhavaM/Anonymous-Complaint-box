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
const storage = firebase.storage();

// Test Firebase configuration
function testFirebaseConfig() {
  console.log('Testing Firebase configuration...');
  console.log('Firebase config:', firebaseConfig);
  console.log('Firebase app initialized:', firebase.apps.length > 0);
  console.log('Firestore available:', !!db);
  console.log('Auth available:', !!auth);
  console.log('Storage available:', !!storage);
  
  // Test if we can access Firebase services
  try {
    const testRef = db.collection('test');
    console.log('Firestore connection test:', testRef);
  } catch (error) {
    console.error('Firestore connection error:', error);
  }
}

// Run test on page load
document.addEventListener('DOMContentLoaded', function() {
  testFirebaseConfig();
});

// --- Global Functions (defined early to avoid scope issues) ---
let resolveComplaintId = null;

function showResolutionModal(complaintId) {
  resolveComplaintId = complaintId;
  const resolutionDescription = document.getElementById('resolutionDescription');
  const resolutionError = document.getElementById('resolutionError');
  const resolutionModal = document.getElementById('resolutionModal');
  
  if (resolutionDescription) resolutionDescription.value = '';
  if (resolutionError) resolutionError.textContent = '';
  if (resolutionModal) resolutionModal.style.display = 'flex';
}

function hideResolutionModal() {
  resolveComplaintId = null;
  const resolutionModal = document.getElementById('resolutionModal');
  if (resolutionModal) resolutionModal.style.display = 'none';
}

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
  // If on index.html or dashboard, use ticker style
  const isIndex = getPage() === 'index';
  const isDashboard = getPage() === 'dashboard';
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
        if (isIndex || isDashboard) {
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
  const loginRequiredModal = document.getElementById('loginRequiredModal');
  const closeLoginRequiredModalBtn = document.getElementById('closeLoginRequiredModalBtn');
  const goToLoginBtn = document.getElementById('goToLoginBtn');
  const cancelLoginRequiredBtn = document.getElementById('cancelLoginRequiredBtn');
  
  if (!requestAnnouncementBtn || !announcementModal || !closeAnnouncementModalBtn) return;
  
  // Handle login required modal
  if (loginRequiredModal && closeLoginRequiredModalBtn && goToLoginBtn && cancelLoginRequiredBtn) {
    closeLoginRequiredModalBtn.onclick = function() {
      loginRequiredModal.style.display = 'none';
    };
    goToLoginBtn.onclick = function() {
      loginRequiredModal.style.display = 'none';
      window.location.href = 'login.html';
    };
    cancelLoginRequiredBtn.onclick = function() {
      loginRequiredModal.style.display = 'none';
    };
    loginRequiredModal.addEventListener('click', function(e) {
      if (e.target === loginRequiredModal) {
        loginRequiredModal.style.display = 'none';
      }
    });
  }
  
  requestAnnouncementBtn.onclick = function() {
    // Check if user is logged in
    const user = auth.currentUser;
    if (!user) {
      // Show login required modal
      if (loginRequiredModal) {
        loginRequiredModal.style.display = 'flex';
      }
      return;
    }
    
    // User is logged in, show announcement request modal
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
      
      // Double-check authentication
      const user = auth.currentUser;
      if (!user) {
        if (announcementRequestResult) {
          announcementRequestResult.style.color = '#e53935';
          announcementRequestResult.textContent = 'Please log in to submit announcement requests.';
        }
        return;
      }
      
      const text = document.getElementById('announcementText').value.trim();
      if (!text) {
        announcementRequestResult.textContent = 'Please enter an announcement request.';
        announcementRequestResult.className = 'result-message error';
        return;
      }

      try {
        await db.collection('announcements').add({
          text,
          status: 'pending',
          createdBy: user.uid,
          userEmail: user.email,
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
  const authModal = document.getElementById('authModal');
  const complaintForm = document.getElementById('complaintForm');
  const complaintTitle = document.getElementById('complaintTitle');
  const tokenSection = document.getElementById('tokenSection');
  const requestAnnouncementBtn = document.getElementById('requestAnnouncementBtn');
  const loginRequiredModal = document.getElementById('loginRequiredModal');
  const announcementModal = document.getElementById('announcementModal');
  const announcementRequestForm = document.getElementById('announcementRequestForm');
  const closeLoginRequiredModal = document.getElementById('closeLoginRequiredModal');
  const closeAnnouncementModal = document.getElementById('closeAnnouncementModal');
  const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');
  const announcementRequestResult = document.getElementById('announcementRequestResult');

  // Welcome modal buttons
  const loginBtn = document.getElementById('loginBtn');
  const anonymousBtn = document.getElementById('anonymousBtn');
  const submitComplaintBtn = document.getElementById('submitComplaintBtn');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const cancelComplaintBtn = document.getElementById('cancelComplaintBtn');
  const nameEmailFields = document.getElementById('nameEmailFields');
  const emailFields = document.getElementById('emailFields');

  if (loginBtn) {
    loginBtn.onclick = function() {
      window.location.href = 'login.html';
    };
  }

  if (anonymousBtn) {
    anonymousBtn.onclick = function() {
      window.location.href = 'anonymous.html';
    };
  }

  if (submitComplaintBtn) {
    submitComplaintBtn.onclick = function() {
      window.location.href = 'complaint.html';
    };
  }

  if (adminLoginBtn) {
    adminLoginBtn.onclick = function() {
      window.location.href = 'admin-dashboard.html';
    };
  }

  if (cancelComplaintBtn) {
    cancelComplaintBtn.onclick = function() {
      complaintForm.style.display = 'none';
      complaintTitle.style.display = 'none';
      authModal.style.display = 'block';
    };
  }

  // Complaint form submission
  if (complaintForm) {
    complaintForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const complaintName = document.getElementById('complaintName').value.trim();
      const complaintEmail = document.getElementById('complaintEmail').value.trim();
      const complaintType = document.getElementById('complaintType').value;
      const complaintDescription = document.getElementById('complaintDescription').value;
      const requiredResolution = document.getElementById('requiredResolution').value;
      
      // Check all required fields including name and email
      if (!complaintName || !complaintEmail || !complaintType || !complaintDescription || !requiredResolution) {
        alert('Please fill in all required fields.');
        return;
      }

      try {
        // Generate unique token
        const token = generateToken();
        
        // Save to Firestore with all fields
        await db.collection('complaints').add({
          token: token,
          name: complaintName,
          email: complaintEmail,
          type: complaintType,
          description: complaintDescription,
          requiredResolution: requiredResolution,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          isAnonymous: false
        });

        // Show success message with token
        complaintForm.style.display = 'none';
        complaintTitle.style.display = 'none';
        
        const tokenDisplay = document.getElementById('tokenDisplay');
        if (tokenDisplay) {
          tokenDisplay.textContent = token;
        }
        tokenSection.style.display = 'block';
        
        // Reset form
        complaintForm.reset();
        
      } catch (err) {
        console.error('Error submitting complaint:', err);
        alert('Failed to submit complaint. Please try again.');
      }
    };
  }

  // Check authentication state for announcement request button
  auth.onAuthStateChanged(function(user) {
    if (user && requestAnnouncementBtn) {
      requestAnnouncementBtn.classList.add('show');
    } else if (requestAnnouncementBtn) {
      requestAnnouncementBtn.classList.remove('show');
    }
  });

  // Announcement request button
  if (requestAnnouncementBtn) {
    requestAnnouncementBtn.onclick = function() {
      if (auth.currentUser) {
        announcementModal.style.display = 'flex';
      } else {
        loginRequiredModal.style.display = 'flex';
      }
    };
  }

  // Close login required modal
  if (closeLoginRequiredModal) {
    closeLoginRequiredModal.onclick = function() {
      loginRequiredModal.style.display = 'none';
    };
  }

  // Close announcement modal
  if (closeAnnouncementModal) {
    closeAnnouncementModal.onclick = function() {
      announcementModal.style.display = 'none';
    };
  }

  // Cancel announcement button
  if (cancelAnnouncementBtn) {
    cancelAnnouncementBtn.onclick = function() {
      announcementModal.style.display = 'none';
    };
  }

  // Announcement request form
  if (announcementRequestForm) {
    announcementRequestForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const announcementText = document.getElementById('announcementText').value.trim();
      
      if (!announcementText) {
        announcementRequestResult.textContent = 'Please enter an announcement request.';
        announcementRequestResult.className = 'result-message error';
        return;
      }

      try {
        await db.collection('announcements').add({
          text: announcementText,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: auth.currentUser.uid,
          userEmail: auth.currentUser.email
        });

        announcementRequestResult.textContent = 'Announcement request submitted successfully!';
        announcementRequestResult.className = 'result-message success';
        
        setTimeout(() => {
          announcementModal.style.display = 'none';
          announcementRequestForm.reset();
          announcementRequestResult.textContent = '';
          announcementRequestResult.className = '';
        }, 2000);
        
      } catch (err) {
        console.error('Error submitting announcement request:', err);
        announcementRequestResult.textContent = 'Failed to submit announcement request. Please try again.';
        announcementRequestResult.className = 'result-message error';
      }
    };
  }

  // Close modals when clicking outside
  [loginRequiredModal, announcementModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  });

  // Setup announcement bar
  setupAnnouncementBar();
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
      
      console.log('Login attempt for email:', email);
      console.log('Password length:', password.length);
      
      if (loginError) loginError.textContent = '';
      
      // Basic validation
      if (!email || !password) {
        if (loginError) loginError.textContent = 'Please enter both email and password.';
        return;
      }
      
      if (!email.includes('@')) {
        if (loginError) loginError.textContent = 'Please enter a valid email address.';
        return;
      }
      
      try {
        console.log('Attempting Firebase authentication...');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        window.location.href = 'dashboard.html';
      } catch (err) {
        console.error('Login error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        
        let errorMessage = 'Login failed: ';
        
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage += 'No account found with this email address.';
            break;
          case 'auth/wrong-password':
            errorMessage += 'Incorrect password.';
            break;
          case 'auth/invalid-email':
            errorMessage += 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage += 'This account has been disabled.';
            break;
          case 'auth/too-many-requests':
            errorMessage += 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage += 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage += err.message;
        }
        
        if (loginError) loginError.textContent = errorMessage;
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
  const userTypeSelect = document.getElementById('userType');
  const studentRegdDiv = document.getElementById('studentRegdDiv');
  const studentRegdInput = document.getElementById('studentRegd');
  const facultyIdDiv = document.getElementById('facultyIdDiv');
  const facultyIdInput = document.getElementById('facultyId');
  const parentDiv = document.getElementById('parentDiv');
  const parentContactInput = document.getElementById('parentContact');
  const childNameInput = document.getElementById('childName');
  const childRegdInput = document.getElementById('childRegd');
  const otherDiv = document.getElementById('otherDiv');
  const otherSpecifyInput = document.getElementById('otherSpecify');
  


  // Show/hide fields based on user type
  if (userTypeSelect) {
    userTypeSelect.onchange = function() {
      studentRegdDiv.style.display = 'none';
      facultyIdDiv.style.display = 'none';
      parentDiv.style.display = 'none';
      otherDiv.style.display = 'none';
      studentRegdInput.required = false;
      facultyIdInput.required = false;
      parentContactInput.required = false;
      childNameInput.required = false;
      childRegdInput.required = false;
      otherSpecifyInput.required = false;
      if (this.value === 'student') {
        studentRegdDiv.style.display = 'block';
        studentRegdInput.required = true;
      } else if (this.value === 'faculty') {
        facultyIdDiv.style.display = 'block';
        facultyIdInput.required = true;
      } else if (this.value === 'parent') {
        parentDiv.style.display = 'block';
        parentContactInput.required = true;
        childNameInput.required = true;
        childRegdInput.required = true;
      } else if (this.value === 'other') {
        otherDiv.style.display = 'block';
        otherSpecifyInput.required = true;
      }
    };
  }

  function validateRegistrationNumber(regd) {
    const pattern = /^[LY]\d{2}[A-Z]{2}\d{3}$/;
    if (!pattern.test(regd)) {
      return 'Invalid format. Use: L/Y + 2 digits + 2 letters + 3 digits (e.g., L24CD207)';
    }
    const year = regd.substring(1, 3);
    const branch = regd.substring(3, 5).toUpperCase();
    const validBranches = ['EE', 'CS', 'CD', 'CM', 'CO', 'CHE', 'ME', 'CI', 'AI'];
    if (!validBranches.includes(branch)) {
      return `Invalid branch code. Valid codes: ${validBranches.join(', ')}`;
    }
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const yearNum = parseInt(year);
    const currentYearNum = parseInt(currentYear);
    if (yearNum < 20 || yearNum > currentYearNum + 5) {
      return `Invalid year. Must be between 20 and ${currentYearNum + 5}`;
    }
    return null; // Valid
  }

  if (registerForm) {
    registerForm.onsubmit = async function(e) {
      e.preventDefault();
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const userType = document.getElementById('userType').value;
      const studentRegd = studentRegdInput.value.trim();
      const facultyId = facultyIdInput.value.trim();
      const parentContact = parentContactInput.value.trim();
      const childName = childNameInput.value.trim();
      const childRegd = childRegdInput.value.trim();
      const otherSpecify = otherSpecifyInput.value.trim();
      const password = document.getElementById('registerPassword').value;

      if (!userType) {
        alert('Please select a user type.');
        return;
      }
      // Student validation
      if (userType === 'student') {
        if (!studentRegd) {
          alert('Student registration number is required.');
          return;
        }
        const validationError = validateRegistrationNumber(studentRegd.toUpperCase());
        if (validationError) {
          alert(validationError);
          return;
        }
      }
      // Faculty validation
      if (userType === 'faculty') {
        if (!facultyId) {
          alert('Faculty ID is required.');
          return;
        }
        if (!/^\d{6}$/.test(facultyId)) {
          alert('Faculty ID must be exactly 6 digits.');
          return;
        }
      }
      // Parent validation
      if (userType === 'parent') {
        if (!parentContact || !/^\d{10}$/.test(parentContact)) {
          alert('Contact number must be exactly 10 digits.');
          return;
        }
        if (!childName) {
          alert("Child's name is required.");
          return;
        }
        if (!childRegd) {
          alert("Child's registration number is required.");
          return;
        }
        const validationError = validateRegistrationNumber(childRegd.toUpperCase());
        if (validationError) {
          alert('Child Regd: ' + validationError);
          return;
        }
      }
      // Other validation
      if (userType === 'other') {
        if (!otherSpecify) {
          alert('Please specify who you are.');
          return;
        }
      }
      try {
        console.log('Starting user registration...');
        console.log('Email:', email);
        console.log('Name:', name);
        console.log('User Type:', userType);
        console.log('Password length:', password.length);
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log('User created successfully:', userCredential.user.uid);
        const userData = {
          name,
          email,
          userType,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (userType === 'student') {
          userData.studentRegd = studentRegd.toUpperCase();
        }
        if (userType === 'faculty') {
          userData.facultyId = facultyId;
        }
        if (userType === 'parent') {
          userData.parentContact = parentContact;
          userData.childName = childName;
          userData.childRegd = childRegd.toUpperCase();
        }
        if (userType === 'other') {
          userData.otherSpecify = otherSpecify;
        }
        

        
        await db.collection('users').doc(userCredential.user.uid).set(userData);
        alert(`Welcome, ${name || email}! Your account has been created successfully.`);
        window.location.href = 'dashboard.html';
      } catch (err) {
        console.error('Registration error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        
        let errorMessage = 'Registration failed: ';
        
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage += 'An account with this email already exists.';
            break;
          case 'auth/invalid-email':
            errorMessage += 'Invalid email address.';
            break;
          case 'auth/weak-password':
            errorMessage += 'Password is too weak. Please use at least 6 characters.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage += 'Email/password accounts are not enabled. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage += 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage += err.message;
        }
        
        alert(errorMessage);
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
          let resultHtml = `<b>Status:</b> ${complaint.status || 'Unknown'}`;
          if (complaint.status === 'resolved' && complaint.resolutionDescription) {
            resultHtml += `<span class='resolution-text'>${complaint.resolutionDescription}</span>`;
          }
          statusResult.innerHTML = resultHtml;
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
  // Auth check and user info
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        const userData = doc.exists ? doc.data() : {};
        const name = userData.name || user.email;
        const userType = userData.userType || 'User';
        
        // Update user greeting and type
        const userGreeting = document.getElementById('userGreeting');
        const userTypeElement = document.getElementById('userType');
        if (userGreeting) userGreeting.textContent = `Welcome, ${name}!`;
        if (userTypeElement) userTypeElement.textContent = userType;
        
        // Update user avatar (profile pictures removed)
        const userAvatar = document.getElementById('userAvatarBtn');
        if (userAvatar) {
          userAvatar.innerHTML = '<i class="fas fa-user-circle"></i>';
        }
        
        // Load user data
        loadUserStats(user.uid);
        loadUserComplaints(user.uid);
        loadUserProfile(user.uid, userData);
        loadAnnouncements();
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    } else {
      window.location.href = 'login.html';
    }
  });

  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      auth.signOut().then(() => {
        alert('You have been logged out successfully.');
        window.location.href = 'index.html';
      });
    };
  }

  // Action buttons
  setupActionButtons();
  
  // Modals
  setupModals();
  
  // Filter buttons
  setupFilterButtons();
  
  // User dropdown menu
  setupUserDropdown();
  
  // Profile settings
  setupProfileSettings();
  
  // Announcement bar
  setupAnnouncementBar();
}

// Load user statistics
async function loadUserStats(userId) {
  try {
    const complaintsSnapshot = await db.collection('complaints')
      .where('email', '==', auth.currentUser.email)
      .get();
    
    const complaints = complaintsSnapshot.docs.map(doc => doc.data());
    const pending = complaints.filter(c => c.status === 'pending').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const total = complaints.length;
    const tokens = complaints.length; // Each complaint has a token
    
    // Update stats cards
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('resolvedCount').textContent = resolved;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('tokenCount').textContent = tokens;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// Load user complaints
async function loadUserComplaints(userId) {
  const complaintsList = document.getElementById('complaintsList');
  if (!complaintsList) return;
  
  try {
    const snapshot = await db.collection('complaints')
      .where('email', '==', auth.currentUser.email)
      .get();
    
    if (snapshot.empty) {
      complaintsList.innerHTML = '<div class="no-data">No complaints submitted yet.</div>';
      return;
    }
    
    const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort by createdAt in descending order (newest first) in JavaScript
    complaints.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toDate() - a.createdAt.toDate();
    });
    
    renderComplaints(complaints);
  } catch (err) {
    complaintsList.innerHTML = '<div class="error">Failed to load complaints.</div>';
    console.error('Error loading complaints:', err);
  }
}

// Render complaints in grid
function renderComplaints(complaints) {
  const complaintsList = document.getElementById('complaintsList');
  if (!complaintsList) return;
  
  complaintsList.innerHTML = complaints.map(complaint => `
    <div class="complaint-item">
      <div class="complaint-header">
        <span class="complaint-type">${complaint.complaintType}</span>
        <span class="complaint-status ${complaint.status}">${complaint.status}</span>
      </div>
      <div class="complaint-description">${complaint.description}</div>
      <div class="complaint-footer">
        <span class="complaint-token">${complaint.token}</span>
        <span>${complaint.createdAt ? new Date(complaint.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
      </div>
      ${complaint.status === 'resolved' && complaint.resolutionDescription ? 
        `<div class="resolution-info">
          <strong>Resolution:</strong> ${complaint.resolutionDescription}
        </div>` : ''
      }
    </div>
  `).join('');
}

// Load user profile
async function loadUserProfile(userId, userData) {
  const profileInfo = document.getElementById('profileInfo');
  if (!profileInfo) return;
  
  profileInfo.innerHTML = `
    <div class="profile-info">
      <div class="profile-field">
        <span class="profile-label">Name:</span>
        <span class="profile-value">${userData.name || 'Not provided'}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">Email:</span>
        <span class="profile-value">${auth.currentUser.email}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">User Type:</span>
        <span class="profile-value">${userData.userType || 'Not specified'}</span>
      </div>
      ${userData.studentRegd ? `
        <div class="profile-field">
          <span class="profile-label">Registration Number:</span>
          <span class="profile-value">${userData.studentRegd}</span>
        </div>
      ` : ''}
      ${userData.facultyId ? `
        <div class="profile-field">
          <span class="profile-label">Faculty ID:</span>
          <span class="profile-value">${userData.facultyId}</span>
        </div>
      ` : ''}
      ${userData.parentContact ? `
        <div class="profile-field">
          <span class="profile-label">Contact:</span>
          <span class="profile-value">${userData.parentContact}</span>
        </div>
        <div class="profile-field">
          <span class="profile-label">Child Name:</span>
          <span class="profile-value">${userData.childName || 'Not provided'}</span>
        </div>
        <div class="profile-field">
          <span class="profile-label">Child Registration:</span>
          <span class="profile-value">${userData.childRegd || 'Not provided'}</span>
        </div>
      ` : ''}
      ${userData.otherSpecify ? `
        <div class="profile-field">
          <span class="profile-label">User Category:</span>
          <span class="profile-value">${userData.otherSpecify}</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Load announcements
async function loadAnnouncements() {
  const announcementsList = document.getElementById('announcementsList');
  if (!announcementsList) return;
  
  try {
    const snapshot = await db.collection('announcements')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      announcementsList.innerHTML = '<div class="no-data">No announcements available.</div>';
      return;
    }
    
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    announcementsList.innerHTML = announcements.map(announcement => `
      <div class="announcement-item">
        <div class="announcement-text">${announcement.text}</div>
        <div class="announcement-date">${announcement.createdAt ? new Date(announcement.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
      </div>
    `).join('');
  } catch (err) {
    announcementsList.innerHTML = '<div class="error">Failed to load announcements.</div>';
    console.error('Error loading announcements:', err);
  }
}

// Setup action buttons
function setupActionButtons() {
  const newComplaintBtn = document.getElementById('newComplaintBtn');
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  const requestAnnouncementBtn = document.getElementById('requestAnnouncementBtn');
  
  if (newComplaintBtn) {
    newComplaintBtn.onclick = function() {
      document.getElementById('newComplaintModal').style.display = 'flex';
    };
  }
  
  if (checkStatusBtn) {
    checkStatusBtn.onclick = function() {
      document.getElementById('statusCheckModal').style.display = 'flex';
    };
  }
  
  if (requestAnnouncementBtn) {
    requestAnnouncementBtn.onclick = function() {
      document.getElementById('announcementRequestModal').style.display = 'flex';
    };
  }
}

// Setup modals
function setupModals() {
  // New Complaint Modal
  const newComplaintModal = document.getElementById('newComplaintModal');
  const closeNewComplaintModal = document.getElementById('closeNewComplaintModal');
  const newComplaintForm = document.getElementById('newComplaintForm');
  const cancelComplaintBtn = document.getElementById('cancelComplaintBtn');
  
  if (closeNewComplaintModal) {
    closeNewComplaintModal.onclick = function() {
      newComplaintModal.style.display = 'none';
    };
  }
  
  if (cancelComplaintBtn) {
    cancelComplaintBtn.onclick = function() {
      newComplaintModal.style.display = 'none';
    };
  }
  
  if (newComplaintForm) {
    newComplaintForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const complaintType = document.getElementById('complaintType').value;
      const description = document.getElementById('complaintDescription').value.trim();
      const requirement = document.getElementById('complaintRequirement').value;
      const otherRequirement = document.getElementById('otherRequirement').value.trim();
      
      const token = 'C-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const complaintData = {
        name: auth.currentUser.displayName || auth.currentUser.email,
        email: auth.currentUser.email,
        complaintType,
        description,
        requirement: requirement === 'Other' ? otherRequirement : requirement,
        isAnonymous: false,
        token,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      try {
        await db.collection('complaints').add(complaintData);
        alert(`Complaint submitted successfully! Your token is: ${token}`);
        newComplaintModal.style.display = 'none';
        newComplaintForm.reset();
        loadUserStats(auth.currentUser.uid);
        loadUserComplaints(auth.currentUser.uid);
      } catch (err) {
        alert('Failed to submit complaint. Please try again.');
      }
    };
  }
  
  // Status Check Modal
  const statusCheckModal = document.getElementById('statusCheckModal');
  const closeStatusCheckModal = document.getElementById('closeStatusCheckModal');
  const statusCheckForm = document.getElementById('statusCheckForm');
  const cancelStatusBtn = document.getElementById('cancelStatusBtn');
  
  if (closeStatusCheckModal) {
    closeStatusCheckModal.onclick = function() {
      statusCheckModal.style.display = 'none';
    };
  }
  
  if (cancelStatusBtn) {
    cancelStatusBtn.onclick = function() {
      statusCheckModal.style.display = 'none';
    };
  }
  
  if (statusCheckForm) {
    statusCheckForm.onsubmit = async function(e) {
      e.preventDefault();
      const token = document.getElementById('statusToken').value.trim();
      const statusResult = document.getElementById('statusResult');
      
      statusResult.textContent = 'Checking...';
      
      try {
        const querySnapshot = await db.collection('complaints').where('token', '==', token).get();
        if (querySnapshot.empty) {
          statusResult.textContent = 'No complaint found with this token.';
        } else {
          const complaint = querySnapshot.docs[0].data();
          let resultHtml = `<strong>Status:</strong> ${complaint.status || 'Unknown'}`;
          if (complaint.status === 'resolved' && complaint.resolutionDescription) {
            resultHtml += `<br><strong>Resolution:</strong> ${complaint.resolutionDescription}`;
          }
          statusResult.innerHTML = resultHtml;
        }
      } catch (err) {
        statusResult.textContent = 'Error checking status. Please try again.';
      }
    };
  }
  
  // Announcement Request Modal
  const announcementRequestModal = document.getElementById('announcementRequestModal');
  const closeAnnouncementRequestModal = document.getElementById('closeAnnouncementRequestModal');
  const announcementRequestForm = document.getElementById('announcementRequestForm');
  const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');
  
  if (closeAnnouncementRequestModal) {
    closeAnnouncementRequestModal.onclick = function() {
      announcementRequestModal.style.display = 'none';
    };
  }
  
  if (cancelAnnouncementBtn) {
    cancelAnnouncementBtn.onclick = function() {
      announcementRequestModal.style.display = 'none';
    };
  }
  
  if (announcementRequestForm) {
    announcementRequestForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const text = document.getElementById('announcementText').value.trim();
      const resultElement = document.getElementById('announcementRequestResult');
      
      try {
        await db.collection('announcements').add({
          text,
          status: 'pending',
          createdBy: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        resultElement.textContent = 'Announcement request submitted! Awaiting admin approval.';
        resultElement.className = 'result-message success';
        announcementRequestForm.reset();
      } catch (err) {
        resultElement.textContent = 'Failed to submit request.';
        resultElement.className = 'result-message error';
      }
    };
  }
  
  // Close modals when clicking outside
  [newComplaintModal, statusCheckModal, announcementRequestModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  });
}

// Setup filter buttons
function setupFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.onclick = function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      // TODO: Implement filtering logic
    };
  });
}

// Setup user dropdown menu
function setupUserDropdown() {
  const userAvatarBtn = document.getElementById('userAvatarBtn');
  const userDropdown = document.getElementById('userDropdown');
  const profileSettingsBtn = document.getElementById('profileSettingsBtn');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
  
  // Toggle dropdown on avatar click
  if (userAvatarBtn && userDropdown) {
    userAvatarBtn.onclick = function(e) {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    };
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (userDropdown && !userDropdown.contains(e.target) && !userAvatarBtn.contains(e.target)) {
      userDropdown.classList.remove('show');
    }
  });
  
  // Profile settings
  if (profileSettingsBtn) {
    profileSettingsBtn.onclick = function() {
      userDropdown.classList.remove('show');
      openProfileSettings();
    };
  }
  
  // Change password
  if (changePasswordBtn) {
    changePasswordBtn.onclick = function() {
      userDropdown.classList.remove('show');
      document.getElementById('changePasswordModal').style.display = 'flex';
    };
  }
  
  // Logout from dropdown
  if (logoutDropdownBtn) {
    logoutDropdownBtn.onclick = function() {
      userDropdown.classList.remove('show');
      auth.signOut().then(() => {
        alert('You have been logged out successfully.');
        window.location.href = 'index.html';
      });
    };
  }
}

// Setup profile settings
function setupProfileSettings() {
  const profileSettingsModal = document.getElementById('profileSettingsModal');
  const closeProfileSettingsModal = document.getElementById('closeProfileSettingsModal');
  const profileSettingsForm = document.getElementById('profileSettingsForm');
  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  const changePasswordModal = document.getElementById('changePasswordModal');
  const closeChangePasswordModal = document.getElementById('closeChangePasswordModal');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
  
  // Close profile settings modal
  if (closeProfileSettingsModal) {
    closeProfileSettingsModal.onclick = function() {
      profileSettingsModal.style.display = 'none';
    };
  }
  
  if (cancelProfileBtn) {
    cancelProfileBtn.onclick = function() {
      profileSettingsModal.style.display = 'none';
    };
  }
  
  // Close change password modal
  if (closeChangePasswordModal) {
    closeChangePasswordModal.onclick = function() {
      changePasswordModal.style.display = 'none';
    };
  }
  
  if (cancelPasswordBtn) {
    cancelPasswordBtn.onclick = function() {
      changePasswordModal.style.display = 'none';
    };
  }
  
  // Profile settings form submission
  if (profileSettingsForm) {
    profileSettingsForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const resultElement = document.getElementById('profileSettingsResult');
      const userId = auth.currentUser.uid;
      
      try {
        const updateData = {
          name: document.getElementById('profileName').value.trim()
        };
        
        // Add user type specific fields
        const userType = document.getElementById('profileUserType').value;
        if (userType === 'parent') {
          updateData.parentContact = document.getElementById('profileParentContact').value.trim();
          updateData.childName = document.getElementById('profileChildName').value.trim();
          updateData.childRegd = document.getElementById('profileChildRegd').value.trim();
        } else if (userType === 'other') {
          updateData.otherSpecify = document.getElementById('profileOtherSpecify').value.trim();
        }
        
        await db.collection('users').doc(userId).update(updateData);
        
        resultElement.textContent = 'Profile updated successfully!';
        resultElement.className = 'result-message success';
        
        // Update the greeting in the top nav
        const userGreeting = document.getElementById('userGreeting');
        if (userGreeting) {
          userGreeting.textContent = `Welcome, ${updateData.name}!`;
        }
        
        setTimeout(() => {
          profileSettingsModal.style.display = 'none';
        }, 1500);
        
      } catch (err) {
        resultElement.textContent = 'Failed to update profile. Please try again.';
        resultElement.className = 'result-message error';
      }
    };
  }
  
  // Change password form submission
  if (changePasswordForm) {
    changePasswordForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const resultElement = document.getElementById('changePasswordResult');
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (newPassword !== confirmPassword) {
        resultElement.textContent = 'New passwords do not match.';
        resultElement.className = 'result-message error';
        return;
      }
      
      if (newPassword.length < 6) {
        resultElement.textContent = 'Password must be at least 6 characters long.';
        resultElement.className = 'result-message error';
        return;
      }
      
      try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        resultElement.textContent = 'Password changed successfully!';
        resultElement.className = 'result-message success';
        
        setTimeout(() => {
          changePasswordModal.style.display = 'none';
          changePasswordForm.reset();
        }, 1500);
        
      } catch (err) {
        if (err.code === 'auth/wrong-password') {
          resultElement.textContent = 'Current password is incorrect.';
        } else {
          resultElement.textContent = 'Failed to change password. Please try again.';
        }
        resultElement.className = 'result-message error';
      }
    };
  }
  
  // Close modals when clicking outside
  [profileSettingsModal, changePasswordModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  });
}

// Open profile settings modal with user data
async function openProfileSettings() {
  const modal = document.getElementById('profileSettingsModal');
  if (!modal) return;
  
  try {
    const userId = auth.currentUser.uid;
    const doc = await db.collection('users').doc(userId).get();
    const userData = doc.exists ? doc.data() : {};
    
    // Populate form fields
    document.getElementById('profileName').value = userData.name || '';
    document.getElementById('profileEmail').value = auth.currentUser.email || '';
    document.getElementById('profileUserType').value = userData.userType || '';
    
    // Hide all user type specific fields
    document.getElementById('profileStudentFields').style.display = 'none';
    document.getElementById('profileFacultyFields').style.display = 'none';
    document.getElementById('profileParentFields').style.display = 'none';
    document.getElementById('profileOtherFields').style.display = 'none';
    
    // Show relevant fields based on user type
    if (userData.userType === 'student') {
      document.getElementById('profileStudentFields').style.display = 'block';
      document.getElementById('profileStudentRegd').value = userData.studentRegd || '';
    } else if (userData.userType === 'faculty') {
      document.getElementById('profileFacultyFields').style.display = 'block';
      document.getElementById('profileFacultyId').value = userData.facultyId || '';
    } else if (userData.userType === 'parent') {
      document.getElementById('profileParentFields').style.display = 'block';
      document.getElementById('profileParentContact').value = userData.parentContact || '';
      document.getElementById('profileChildName').value = userData.childName || '';
      document.getElementById('profileChildRegd').value = userData.childRegd || '';
    } else if (userData.userType === 'other') {
      document.getElementById('profileOtherFields').style.display = 'block';
      document.getElementById('profileOtherSpecify').value = userData.otherSpecify || '';
    }
    
    // Clear any previous result messages
    const resultElement = document.getElementById('profileSettingsResult');
    if (resultElement) {
      resultElement.textContent = '';
      resultElement.className = '';
    }
    
    modal.style.display = 'flex';
    
  } catch (err) {
    console.error('Error loading profile data:', err);
    alert('Failed to load profile data. Please try again.');
  }
}

// --- Admin: Load Pending Announcement Requests ---
async function loadAdminAnnouncementRequests() {
  const listDiv = document.getElementById('adminAnnouncementRequestsList');
  if (!listDiv) return;
  listDiv.textContent = 'Loading requests...';
  try {
    const snapshot = await db.collection('announcements')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      listDiv.textContent = 'No pending announcement requests.';
      return;
    }
    listDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-announcement-request';
      div.style.marginBottom = '14px';
      div.style.padding = '10px 14px';
      div.style.background = '#fff3e0';
      div.style.border = '1px solid #ffb74d';
      div.style.borderRadius = '6px';
      div.innerHTML = `<b>Request:</b> ${data.text}<br><small>Submitted: ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</small><br>` +
        `<button class='btn-approve' style='margin-right:8px;'>Approve</button>` +
        `<button class='btn-delete'>Delete</button>`;
      // Approve button
      div.querySelector('.btn-approve').onclick = async function() {
        await db.collection('announcements').doc(doc.id).update({ status: 'approved', createdBy: 'admin' });
        loadAdminAnnouncementRequests();
        if (typeof loadAdminAnnouncements === 'function') loadAdminAnnouncements();
      };
      // Delete button
      div.querySelector('.btn-delete').onclick = async function() {
        await db.collection('announcements').doc(doc.id).delete();
        loadAdminAnnouncementRequests();
      };
      listDiv.appendChild(div);
    });
  } catch (err) {
    listDiv.textContent = 'Failed to load requests.';
  }
}

// --- Admin: Load Approved Announcements ---
async function loadAdminAnnouncements() {
  const listDiv = document.getElementById('adminAnnouncementsList');
  if (!listDiv) return;
  listDiv.textContent = 'Loading announcements...';
  try {
    const snapshot = await db.collection('announcements')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      listDiv.textContent = 'No announcements.';
      return;
    }
    listDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-announcement';
      div.style.marginBottom = '14px';
      div.style.padding = '10px 14px';
      div.style.background = '#e3f2fd';
      div.style.border = '1px solid #64b5f6';
      div.style.borderRadius = '6px';
      div.innerHTML = `<b>Announcement:</b> ${data.text}<br><small>Created: ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</small><br>` +
        `<button class='btn-delete'>Delete</button>`;
      // Delete button
      div.querySelector('.btn-delete').onclick = async function() {
        await db.collection('announcements').doc(doc.id).delete();
        loadAdminAnnouncements();
      };
      listDiv.appendChild(div);
    });
  } catch (err) {
    listDiv.textContent = 'Failed to load announcements.';
  }
}

// --- Admin: Load Complaints ---
async function loadAdminComplaints() {
  const tableBody = document.getElementById('complaintsTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6">Loading complaints...</td></tr>';
  try {
    const snapshot = await db.collection('complaints')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6">No pending complaints.</td></tr>';
      return;
    }
    tableBody.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${data.complaintType || ''}</td>
        <td>${data.status || ''}</td>
        <td>${data.isAnonymous ? 'Anonymous' : (data.name || data.email || data.token || '')}</td>
        <td>${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</td>
        <td>
          <button class='btn-view'>View</button>
          <button class='btn-resolve'>Resolve</button>
          <button class='btn-delete'>Delete</button>
        </td>
      `;
      // View button
      tr.querySelector('.btn-view').onclick = function() {
        showComplaintDetails(doc.id, data);
      };
      // Resolve button
      tr.querySelector('.btn-resolve').onclick = function() {
        showResolutionModal(doc.id);
      };
      // Delete button
      tr.querySelector('.btn-delete').onclick = async function() {
        await db.collection('complaints').doc(doc.id).delete();
        loadAdminComplaints();
      };
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load complaints:', err);
    tableBody.innerHTML = '<tr><td colspan="6">Failed to load complaints.</td></tr>';
  }
}

// --- Admin: Load Resolved Complaints ---
async function loadAdminResolvedComplaints() {
  const tableBody = document.getElementById('resolvedComplaintsTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6">Loading resolved complaints...</td></tr>';
  try {
    const snapshot = await db.collection('complaints')
      .where('status', '==', 'resolved')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6">No resolved complaints.</td></tr>';
      return;
    }
    tableBody.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${data.complaintType || ''}</td>
        <td>${data.status || ''}</td>
        <td>${data.isAnonymous ? 'Anonymous' : (data.name || data.email || data.token || '')}</td>
        <td>${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</td>
        <td>
          <button class='btn-view'>View</button>
          <button class='btn-delete'>Delete</button>
        </td>
      `;
      // View button
      tr.querySelector('.btn-view').onclick = function() {
        showComplaintDetails(doc.id, data);
      };
      // Delete button
      tr.querySelector('.btn-delete').onclick = async function() {
        await db.collection('complaints').doc(doc.id).delete();
        loadAdminResolvedComplaints();
      };
      tableBody.appendChild(tr);
    });
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="6">Failed to load resolved complaints.</td></tr>';
  }
}

// --- Admin: Show Complaint Details Modal ---
function showComplaintDetails(id, data) {
  const modal = document.getElementById('detailsModal');
  const content = document.getElementById('detailsContent');
  if (!modal || !content) return;
  content.innerHTML = `<b>ID:</b> ${id}<br>
    <b>Type:</b> ${data.complaintType || ''}<br>
    <b>Status:</b> ${data.status || ''}<br>
    <b>User/Token:</b> ${data.isAnonymous ? 'Anonymous' : (data.name || data.email || data.token || '')}<br>
    <b>Date:</b> ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}<br>
    <b>Description:</b> ${data.description || ''}<br>
    <b>Requirement:</b> ${data.requirement || ''}<br>
    <b>Resolution Description:</b> ${data.resolutionDescription || ''}<br>`;
  modal.style.display = 'flex';
  document.getElementById('closeDetailsModalBtn').onclick = function() {
    modal.style.display = 'none';
  };
}

// --- Admin: Resolution Modal Functions ---

// --- Admin Dashboard Logic ---
function setupAdminDashboard() {
  // Check if user is authenticated
  auth.onAuthStateChanged(function(user) {
    if (!user) {
      // If not authenticated, redirect to login
      window.location.href = 'login.html';
      return;
    }
    
    // User is authenticated, proceed with admin dashboard setup
    console.log('Admin authenticated:', user.email);
    
    // Load admin data only after authentication
    setupSidebar();
    setupAnnouncementBar();
    loadAdminAnnouncementRequests();
    loadAdminAnnouncements();
    loadAdminComplaints();
    loadAdminResolvedComplaints();
  });
  
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
  
  // Setup resolution modal
  const resolutionForm = document.getElementById('resolutionForm');
  const cancelResolutionBtn = document.getElementById('cancelResolutionBtn');
  if (resolutionForm) {
    resolutionForm.onsubmit = async function(e) {
      e.preventDefault();
      const desc = document.getElementById('resolutionDescription').value.trim();
      if (!desc) {
        document.getElementById('resolutionError').textContent = 'Resolution description is required!';
        return;
      }
      if (!resolveComplaintId) return;
      await db.collection('complaints').doc(resolveComplaintId).update({ status: 'resolved', resolutionDescription: desc });
      hideResolutionModal();
      loadAdminComplaints();
      loadAdminResolvedComplaints();
    };
  }
  if (cancelResolutionBtn) {
    cancelResolutionBtn.onclick = function() {
      hideResolutionModal();
    };
  }

  // Admin announcement submission logic and refresh button setup
  auth.onAuthStateChanged(function(user) {
    if (user) {
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
            loadAdminAnnouncements(); // Refresh admin's own list
          } catch (err) {
            if (adminAnnouncementResult) {
              adminAnnouncementResult.style.color = '#e53935';
              adminAnnouncementResult.textContent = 'Failed to add announcement.';
              setTimeout(() => { adminAnnouncementResult.textContent = ''; }, 3000);
            }
          }
        };
      }

      const refreshBtn = document.getElementById('refreshBtn');
      if (refreshBtn) {
        refreshBtn.onclick = function() {
          loadAdminAnnouncementRequests();
          loadAdminAnnouncements();
          loadAdminComplaints();
          loadAdminResolvedComplaints();
        };
      }
    }
  });
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