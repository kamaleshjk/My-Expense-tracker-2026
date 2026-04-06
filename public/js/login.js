// Flow Finance - Authentication Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig, appId } from "./config.js";

// Log configuration status for debugging
console.log('Config loaded:', {
    hasApiKey: !!firebaseConfig?.apiKey,
    hasProjectId: !!firebaseConfig?.projectId,
    appId: appId
});

// Check if demo mode and show indicator
const isDemoMode = firebaseConfig && (firebaseConfig.apiKey === 'demo_api_key' || firebaseConfig.projectId === 'demo-project');
if (isDemoMode) {
    const demoIndicator = document.getElementById('demoModeIndicator');
    if (demoIndicator) {
        demoIndicator.classList.remove('hidden');
    }
}

let app, auth, db;
let firebaseReady = false;

// Validate and initialize Firebase only if config is available AND not demo mode
if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId && !isDemoMode) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        firebaseReady = true;
        console.log('Firebase initialized successfully');
    } catch(e) {
        console.error('Firebase initialization failed:', e);
    }
} else if (isDemoMode) {
    console.log('Demo mode detected - Firebase not initialized');
} else {
    console.warn('Firebase config incomplete - authentication will not work');
}

// Default categories
const defaultCategories = { 
    income: ['Salary', 'Freelance', 'Dividends'], 
    expense: ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment'] 
};
const defaultBudgets = {};

// Utilities
const showError = (msg) => {
    const toast = document.getElementById('errorToast');
    if (toast) {
        document.getElementById('errorMessage').innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
    }
};

const showSuccess = (msg) => {
    const toast = document.getElementById('successToast');
    if (toast) {
        document.getElementById('successMessage').innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
    }
};

// Switch between login and signup forms
window.switchAuthMode = (mode) => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');

    if (mode === 'login') {
        if(loginForm) loginForm.classList.remove('hidden');
        if(signupForm) signupForm.classList.add('hidden');
        if(loginTab) loginTab.className = "flex-1 py-2.5 text-xs font-black rounded-lg bg-white shadow text-[#0d2e27] uppercase transition-all";
        if(signupTab) signupTab.className = "flex-1 py-2.5 text-xs font-black rounded-lg text-slate-400 uppercase transition-all";
    } else {
        if(loginForm) loginForm.classList.add('hidden');
        if(signupForm) signupForm.classList.remove('hidden');
        if(loginTab) loginTab.className = "flex-1 py-2.5 text-xs font-black rounded-lg text-slate-400 uppercase transition-all";
        if(signupTab) signupTab.className = "flex-1 py-2.5 text-xs font-black rounded-lg bg-white shadow text-[#0d2e27] uppercase transition-all";
    }
};

// Setup authentication state listener - only if Firebase is ready
if (firebaseReady && auth) {
    onAuthStateChanged(auth, (user) => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (user) {
            // User is logged in, redirect to dashboard
            if(loadingOverlay) loadingOverlay.style.display = 'flex';
            // Redirect to dashboard.html after a short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 500);
        } else {
            // User is not logged in, hide loading overlay and show login form
            if(loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });
} else {
    // Firebase not ready - hide loading overlay immediately
    document.addEventListener('DOMContentLoaded', () => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        showError('Firebase is not configured. Please check your config.js file.');
    });
}

// Setup form listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!firebaseReady && !isDemoMode) {
        showError('Firebase is not configured. Falling back to local demo mode.');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        if(loginBtn) loginBtn.disabled = false;
        if(signupBtn) signupBtn.disabled = false;
        // continue: allow local demo mode for login/signup even if Firebase is missing
    }

    // For demo mode, check if already logged in
    if (isDemoMode || !firebaseReady) {
        const demoUser = localStorage.getItem('demoUser');
        if (demoUser) {
            window.location.href = '/dashboard.html';
        }
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');
            
            if(btn) btn.disabled = true;
            
            try {
                const useLocalDemo = isDemoMode || !firebaseReady;
                if (useLocalDemo) {
                    // Demo mode (or missing Firebase) accepts any credentials
                    console.log('Demo/login fallback successful');
                    localStorage.setItem('demoUser', JSON.stringify({
                        uid: 'demo-user-123',
                        displayName: email.split('@')[0] || 'Demo User',
                        email: email || 'demo@example.com'
                    }));
                    showSuccess("Demo login successful!");
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 500);
                } else {
                    // Real Firebase authentication
                    await signInWithEmailAndPassword(auth, email, password);
                    showSuccess("Login successful!");
                    // The auth state listener will handle the redirect
                }
            } catch (err) {
                showError("Login failed: " + err.code);
            } finally {
                if(btn) btn.disabled = false;
            }
        });
    }

    // Signup Form Handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirm = document.getElementById('signupConfirm').value;
            const btn = document.getElementById('signupBtn');
            
            if (password !== confirm) {
                showError("Passwords do not match");
                return;
            }
            
            if(btn) btn.disabled = true;
            
            // Check if demo mode
            const isDemoMode = firebaseConfig && (firebaseConfig.apiKey === 'demo_api_key' || firebaseConfig.projectId === 'demo-project');
            
            try {
                const useLocalDemo = isDemoMode || !firebaseReady;
                if (useLocalDemo) {
                    // Demo mode or missing Firebase accepts any credentials
                    console.log('Demo signup fallback successful');
                    localStorage.setItem('demoUser', JSON.stringify({
                        uid: 'demo-user-123',
                        displayName: name || 'Demo User',
                        email: email || 'demo@example.com'
                    }));
                    showSuccess("Demo account created successfully!");
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1000);
                } else {
                    // Real Firebase authentication
                    const userCred = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCred.user, { displayName: name });
                    await setDoc(doc(db, 'artifacts', appId, 'users', userCred.user.uid, 'settings', 'data'), { 
                        categories: defaultCategories, 
                        budgets: defaultBudgets 
                    });
                    showSuccess("Account created successfully!");
                    signupForm.reset();
                    window.switchAuthMode('login');
                }
            } catch (err) {
                showError("Signup failed: " + err.code);
            } finally {
                if(btn) btn.disabled = false;
            }
        });
    }

    // Initialize lucide icons after DOM is ready
    if(window.lucide) {
        setTimeout(() => lucide.createIcons(), 100);
    }
});
