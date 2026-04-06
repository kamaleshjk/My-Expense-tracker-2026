// Firebase configuration - direct setup using explicit credentials (not environment vars).
const firebaseConfig = {
  apiKey: "AIzaSyC0PLl7cg88lOrqsMCyph6S-18Ac0jMZRM",
  authDomain: "myexpensetrackers1.firebaseapp.com",
  projectId: "myexpensetrackers1",
  storageBucket: "myexpensetrackers1.firebasestorage.app",
  messagingSenderId: "780299371407",
  appId: "1:780299371407:web:643fe6b202845bd67481fa",
  measurementId: "G-SDQ6E9XP67"
};

// App ID for internal Firestore path and local fallback
const appId = "flow-finance-local";

// Validate and warn when missing (helps during local dev/build)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Firebase configuration missing! Make sure runtime config or VITE_* variables are set.');
}

if (!appId) {
    console.warn('App ID not configured. Using default.');
}

export { firebaseConfig, appId };
