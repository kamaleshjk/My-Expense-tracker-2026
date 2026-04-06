# Flow Finance - Personal Expense Tracker

A modern, modular expense tracking application built with Firebase, featuring real-time synchronization, split expense management, and Progressive Web App (PWA) capabilities.

![Flow Finance](https://img.shields.io/badge/Flow%20Finance-v1.0.0-green)
![Firebase](https://img.shields.io/badge/Firebase-Enabled-orange)
![PWA](https://img.shields.io/badge/PWA-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌟 Features

### 💰 **Expense Tracking**
- Track income and expenses with categories
- Real-time balance calculation and visualization
- Monthly budget management with progress tracking
- Savings goal monitoring (20% target)

### 👥 **Split Expenses**
- Share expenses with friends
- Automatic per-person share calculation
- Payment status tracking (paid/unpaid)
- Visual indicators for completed payments

### 📊 **Data Visualization**
- Interactive cash flow charts using Chart.js
- Category breakdown analysis
- Real-time dashboard updates
- Professional Excel export functionality

### 🔐 **Authentication**
- Secure Firebase Authentication
- Email/password login and signup
- User session management
- Protected data access

### 📱 **Progressive Web App**
- Install on home screen
- Offline functionality with service worker
- Fast loading and native app-like experience
- Cross-platform compatibility

### 📈 **Advanced Features**
- 5-sheet Excel export (Summary, Income, Expenses, Splits, Categories)
- Real-time Firestore synchronization
- Modular architecture for maintainability
- Responsive design with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS with custom animations
- **Backend**: Firebase (Authentication, Firestore)
- **Build Tool**: Vite
- **Charts**: Chart.js
- **Icons**: Lucide Icons
- **Export**: SheetJS (XLSX)
- **PWA**: Service Worker API

## 📁 Project Structure

```
flow-finance/
├── public/
│   ├── index.html          # Main entry point with auth routing
│   ├── dashboard.html      # Main application interface
│   ├── login.html          # Authentication page
│   ├── css/
│   │   └── styles.css      # Tailwind customizations & animations
│   ├── js/
│   │   ├── app.js          # Main application module
│   │   ├── auth.js         # Authentication handlers
│   │   ├── data.js         # Firestore operations
│   │   ├── ui.js           # UI rendering & interactions
│   │   ├── utils.js        # Shared utility functions
│   │   └── config.js       # Firebase configuration
│   ├── manifest.json       # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # PWA icons
├── firebase.json          # Firebase hosting config
├── vite.config.js         # Build configuration
└── package.json           # Dependencies & scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flow-finance.git
   cd flow-finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication and Firestore
   - Copy your Firebase config

4. **Configure Firebase credentials**
   Edit `public/js/config.js` with your Firebase project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "your_api_key",
     authDomain: "your_project.firebaseapp.com",
     projectId: "your_project_id",
     storageBucket: "your_project.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173)

### Build & Deploy

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   npm run deploy
   ```

## 📖 Usage

### Getting Started
1. Visit the app and create an account
2. Add your first income/expense transaction
3. Set up categories and monthly budgets
4. Explore the dashboard for insights

### Key Workflows

#### Adding Transactions
- Click "Add Income" or "Add Expense"
- Fill in amount, category, date, and notes
- Transactions sync instantly to Firestore

#### Splitting Expenses
- Use "Split Expense" to share costs with friends
- Track who has paid their share
- Automatic calculation of individual amounts

#### Managing Budgets
- Set monthly spending limits per category
- Monitor progress with visual indicators
- Get alerts when approaching limits

#### Exporting Data
- Generate comprehensive Excel reports
- Includes summary, detailed transactions, and category breakdowns
- Professional formatting with charts and totals

## 🏗️ Architecture

### Modular Design
The application follows a clean separation of concerns:

- **`app.js`**: Entry point and global state management
- **`auth.js`**: Firebase authentication handling
- **`data.js`**: Firestore CRUD operations and real-time sync
- **`ui.js`**: DOM manipulation and rendering logic
- **`utils.js`**: Shared helper functions and notifications

### Security
- Firebase Authentication for user management
- Firestore security rules for data access control
- Environment variables for sensitive configuration
- No credentials exposed in client-side code

### Performance
- Vite for fast development and optimized builds
- Service worker for offline functionality
- Real-time listeners with efficient data fetching
- Minified production bundles

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing modular architecture
- Add tests for new features
- Update documentation as needed
- Ensure code passes linting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com/) for backend services
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Chart.js](https://www.chartjs.org/) for data visualization
- [Vite](https://vitejs.dev/) for build tooling
- [SheetJS](https://sheetjs.com/) for Excel export

## 📞 Support

If you have any questions or need help:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review the troubleshooting guide in `BUILD_SETUP.md`

---

**Made with ❤️ for personal finance management**