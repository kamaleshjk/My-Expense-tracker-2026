# Flow Finance - Modular Architecture

## Overview
Flow Finance has been refactored from a monolithic single-file application into a clean, modular architecture with separated concerns for better maintainability and security.

## Project Structure

```
public/
├── index.html              # Main HTML document (clean, structure only)
├── css/
│   └── styles.css          # Extracted CSS with Tailwind customizations
├── js/
│   ├── app.js              # Main application module (entry point)
│   ├── auth.js             # Authentication module
│   ├── data.js             # Data management & Firestore operations
│   ├── ui.js               # UI rendering & interactive elements
│   └── utils.js            # Shared utility functions
├── firebase.json           # Firebase configuration
└── 404.html                # Error page
```

## Module Responsibilities

### **index.html**
- Pure HTML structure (no embedded JavaScript)
- Contains all UI elements: login form, sidebar, modals, tables, charts
- Loads external libraries via CDN (Tailwind, Chart.js, Lucide, XLSX)
- References CSS and JavaScript modules
- **Security**: No Firebase credentials exposed in HTML

### **css/styles.css**
- Extracted CSS from inline `<style>` tag
- Custom animations, colors, and Tailwind overrides
- Root variables for theming
- Modal, card, and navigation styling
- Import of Google Fonts

### **js/utils.js**
- `showError(msg)` - Error notification toast (auto-dismiss 5s)
- `showSuccess(msg)` - Success notification toast (auto-dismiss 5s)
- `logout()` - Firebase sign out handler
- Shared helper functions for all modules

### **js/auth.js**
- Firebase Authentication setup
- User login & signup handlers
- Auth state management
- Form event listeners for login/signup
- User profile management
- Auto-initialization on page load

### **js/data.js**
- Firestore data synchronization
- Real-time listeners for transactions, splits, settings
- CRUD operations:
  - `addTransaction()` - Add income/expense
  - `deleteTransaction()` - Remove transaction
  - `addSplit()` - Create split expense with friends
  - `deleteSplit()` - Remove split & corresponding transaction
  - `markFriendPaid()` - Toggle payment status
  - `addCategory()` / `deleteCat()` - Manage categories
  - `editBudget()` - Update budget targets
- Settings persistence (categories, budgets)
- Automatic sync with Firestore using `onSnapshot()`

### **js/ui.js**
- UI rendering functions:
  - `render()` - Main render orchestrator
  - `renderOverview()` - Dashboard overview
  - `renderTable()` - Income/Expense tables
  - `renderBudgets()` - Budget cards
  - `renderSplits()` - Split expenses table
  - `renderSettings()` - Categories management
- Modal management (open/close/toggle)
- Event listeners for dynamic elements
- Chart.js integration for cash flow visualization
- Payment status modal with friend selection

### **js/app.js**
- Entry point (loaded via `<script type="module" src="js/app.js"></script>`)
- Firebase module imports from CDN
- Global state management:
  - `user` - Current authenticated user
  - `transactions` - Array of income/expense records
  - `splits` - Array of split expenses
  - `categories` - Income & expense categories
  - `budgets` - Monthly budget targets
  - `activeSection` - Current navigation section
  - `mainChart` - Chart.js instance
- Form submission handlers
- Excel export functionality (`generateExcel()`)
- Window function exports for HTML onclick handlers
- Application initialization

## Key Features

### **Authentication**
- Firebase Email/Password authentication
- Login and signup forms
- User profile display
- Logout functionality
- Secure session management

### **Transaction Management**
- Income and expense tracking
- Date-based organization
- Category assignment
- Notes/description field
- Real-time Firestore sync

### **Split Expenses**
- Multi-friend expense splitting
- Automatic calculation of per-person shares
- Payment status tracking (paid/unpaid)
- Visual indicators for payment completion
- Automatic transaction creation for user's share
- Bidirectional sync (deleting split deletes transaction)

### **Data Visualization**
- Real-time balance calculation
- Savings goal tracking (20% target)
- Cash flow line chart
- Category breakdown
- Monthly budgets

### **Excel Export**
- 5-sheet comprehensive report:
  1. **Summary** - Financial overview
  2. **Income** - All income transactions with totals
  3. **Expenses** - All expense transactions with totals
  4. **Split Expenses** - Split expense details
  5. **Categories** - Breakdown by category
- Professional formatting with colors and borders
- Currency formatting and number alignment
- SheetJS (XLSX) library integration

## Firebase Configuration

### **Database Structure**
```
artifacts/
└── {appId}/
    └── users/
        └── {uid}/
            ├── transactions/ - Income/expense records
            ├── splits/ - Split expense records
            └── settings/
                └── data - User preferences & budgets
```

### **Data Models**

**Transaction**
```javascript
{
  id: string,          // Auto-generated
  title: string,       // Description
  amount: number,      // In dollars
  category: string,    // Income/Expense category
  type: 'income' | 'expense',
  date: string,        // YYYY-MM-DD format
  notes: string        // Optional notes
}
```

**Split**
```javascript
{
  id: string,
  title: string,
  amount: number,
  date: string,
  friends: [
    { name: string, paid: boolean }
  ],
  yourShare: number,
  notes: string
}
```

**Settings**
```javascript
{
  categories: {
    income: string[],
    expense: string[]
  },
  budgets: {
    [categoryName]: number
  }
}
```

## Security Considerations

### **Current Implementation**
- ✅ Firebase credentials not hardcoded in client code
- ✅ All authentication handled by Firebase Auth
- ✅ Firestore security rules enforced server-side
- ✅ User data scoped by UID in database

### **Future Improvements**
- [ ] Implement Cloud Functions for sensitive operations
- [ ] Add Firestore security rules for data access control
- [ ] Use environment variables for Firebase config
- [ ] Add rate limiting for API calls
- [ ] Implement audit logging for transactions

## Module Dependencies

```
app.js (Entry point)
├── Firebase SDK (CDN imports)
├── utils.js (utility functions)
├── auth.js (authentication)
├── data.js (data management)
└── ui.js (UI rendering)

auth.js
├── utils.js
└── Firebase Auth

data.js
├── utils.js
└── Firestore

ui.js
├── utils.js
├── data.js
└── Chart.js

utils.js
└── (No dependencies)
```

## Development Workflow

### **Adding a New Feature**
1. Identify which module(s) the feature belongs in
2. Implement logic in appropriate module
3. Export function using `window.functionName = functionName`
4. Add HTML elements to `index.html`
5. Add CSS to `css/styles.css`
6. Test locally, then deploy with `firebase deploy`

### **Modifying Firestore Schema**
1. Update data model documentation
2. Modify Firestore paths in `data.js`
3. Update any related CRUD operations
4. Test with Firebase Emulator (if available)

### **Styling Updates**
1. Modify `css/styles.css` only
2. Use Tailwind classes in HTML
3. Add custom CSS only for animations/complex styles

## Testing Checklist

- [ ] Login with existing account
- [ ] Create new account with signup
- [ ] Add income transaction
- [ ] Add expense transaction
- [ ] Delete transaction (verify totals update)
- [ ] Create split expense with 2+ friends
- [ ] Mark friend as paid (verify status updates)
- [ ] Delete split expense (verify corresponding transaction deleted)
- [ ] Add/delete expense category
- [ ] Set budget for category
- [ ] Export to Excel (verify 5 sheets created)
- [ ] Test on mobile (responsive design)
- [ ] Logout and login again

## Deployment

```bash
# Deploy to Firebase Hosting
firebase deploy

# Only deploy hosting (not other services)
firebase deploy --only hosting

# View deployment logs
firebase hosting:logs
```

## Environment Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Start local development
firebase emulators:start

# Deploy
firebase deploy
```

## Performance Optimizations

- ✅ CSS separated from HTML for caching
- ✅ JavaScript modules lazy-loaded
- ✅ Real-time Firestore listeners for instant updates
- ✅ Efficient DOM updates with conditional rendering
- ✅ Chart.js instance reused (not recreated)
- ✅ Event delegation for dynamic elements

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Android)
- ✅ PWA support with Service Worker

## Troubleshooting

### **Issue: "Module not found"**
- Verify file paths in import statements
- Check that all JS files exist in `/public/js/`
- Ensure relative paths are correct

### **Issue: "Firebase not initialized"**
- Check Firebase config in `app.js`
- Verify API key and project ID
- Check Firestore security rules

### **Issue: Data not syncing**
- Check browser console for Firestore errors
- Verify user is authenticated
- Check Firestore database rules allow access
- Monitor network requests in DevTools

---

**Last Updated**: 2024
**Version**: 2.0 (Modular Architecture)
