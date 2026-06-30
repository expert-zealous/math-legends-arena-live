// ═══════════════════════════════════════════
// 🔥 FIREBASE CONFIGURATION
// Math Legends Live Arena
// ═══════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    onSnapshot,
    orderBy 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Konfigurasi Firebase MathLegend
const firebaseConfig = {
    apiKey: "AIzaSyDG3hvfyajqZodfZxoe1T9c_-FzXFRtjP0",
    authDomain: "mathlegend-3baaa.firebaseapp.com",
    projectId: "mathlegend-3baaa",
    storageBucket: "mathlegend-3baaa.firebasestorage.app",
    messagingSenderId: "58088890738",
    appId: "1:58088890738:web:a8c5458cbac5c9dc5a3deb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export untuk dipakai di file lain
export { db, collection, query, where, onSnapshot, orderBy };