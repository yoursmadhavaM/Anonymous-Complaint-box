# Anonymous Complaint Box

A comprehensive college complaint management portal built with HTML, CSS, JavaScript, and Firebase.

## 🎓 Features

### For Students/Users:
- **Anonymous Complaint Submission** - Submit complaints without revealing identity
- **Registered User Portal** - Create account and track all complaints
- **Status Tracking** - Check complaint status using unique tokens
- **User Types** - Support for Students, Faculty, Parents, and Others
- **Profile Management** - Update personal details and change passwords
- **Announcement System** - View college-wide announcements

### For Administrators:
- **Admin Dashboard** - Comprehensive complaint management interface
- **Complaint Resolution** - Mark complaints as resolved with detailed descriptions
- **Announcement Management** - Approve, add, or delete college announcements
- **User Management** - View and manage user accounts
- **Analytics** - Track complaint statistics and trends

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Firebase (Firestore Database, Authentication)
- **Admin API:** Node.js, Express.js
- **Version Control:** Git/GitHub

## 🚀 Quick Start

### Prerequisites
- Node.js (for admin backend)
- Firebase account
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yoursmadhavaM/Anonymous-Complaint-box.git
   cd Anonymous-Complaint-box
   ```

2. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database and Authentication
   - Download your `serviceAccountKey.json` and place it in the project root
   - Update Firebase configuration in `script.js`

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the admin server**
   ```bash
   node admin-server.js
   ```

5. **Open the application**
   - Open `index.html` in your web browser
   - Or serve using a local server

## 📁 Project Structure

```
Anonymous-Complaint-box/
├── index.html              # Welcome page
├── login.html              # User login
├── register.html           # User registration
├── anonymous.html          # Anonymous complaint submission
├── complaint.html          # Regular complaint submission
├── dashboard.html          # User dashboard
├── admin-dashboard.html    # Admin dashboard
├── status.html             # Complaint status check
├── terms.html              # Terms and conditions
├── styles.css              # Main stylesheet
├── logo-styles.css         # Logo-specific styles
├── script.js               # Main JavaScript logic
├── admin-server.js         # Admin API server
├── admin.js                # Admin CLI tool
├── package.json            # Node.js dependencies
└── serviceAccountKey.json  # Firebase service account (not in repo)
```

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Set up Firestore security rules
5. Create necessary indexes for queries

### Required Firestore Indexes
- `complaints` collection: `status` ASC, `createdAt` DESC
- `complaints` collection: `email` ASC, `createdAt` DESC
- `announcements` collection: `status` ASC, `createdAt` DESC

## 📱 User Guide

### Submitting a Complaint
1. **Anonymous:** Click "Submit Anonymously" on welcome page
2. **Registered:** Login and use "Submit New Complaint" button
3. **Fill required fields:** Type, description, and expected resolution
4. **Get token:** Save the unique token for status tracking

### Checking Status
1. Use the "Check Status" feature
2. Enter your complaint token
3. View current status and resolution details

### Admin Access
1. Start the admin server: `node admin-server.js`
2. Access admin dashboard
3. Manage complaints and announcements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase for backend services
- Font Awesome for icons
- College community for feedback and testing

## 📞 Support

For support or questions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for better college communication** 