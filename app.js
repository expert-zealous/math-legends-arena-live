// ═══════════════════════════════════════════════════════
// MATH LEGENDS ARENA LIVE - FINAL STABLE VERSION
// ═══════════════════════════════════════════════════════

import { 
  db,
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  getDoc
} from './firebase-config.js';

// === GLOBAL VARIABLES ===
let currentRoomId = null;
let unsubscribeSnapshot = null;
let playersData = [];
let currentChampion = null;
let countdownInterval = null;

// === DOM ELEMENTS ===
const screens = {
    input: document.getElementById('screen-input'),
    leaderboard: document.getElementById('screen-leaderboard')
};

const elements = {
    input: document.getElementById('room-id-input'),
    btnStart: document.getElementById('btn-start'),
    errorMsg: document.getElementById('error-msg'),
    displayRoom: document.getElementById('display-room-id'),
    btnBack: document.getElementById('btn-back'),
    liveClock: document.getElementById('live-clock'),
    leaderboardList: document.getElementById('leaderboard-list'),
    podiumContainer: document.getElementById('podium-container')
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {

    elements.btnStart.addEventListener('click', handleStartArena);
    elements.btnBack.addEventListener('click', handleExitArena);

    elements.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleStartArena();
    });

    startLiveClock();
});

// ========================================
// SCREEN MANAGEMENT
// ========================================

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ========================================
// START ARENA
// ========================================

async function handleStartArena() {

    const rawRoomId = elements.input.value.trim().toUpperCase();

    if (!rawRoomId) {
        alert("Masukkan Room ID");
        return;
    }

    currentRoomId = rawRoomId;

    try {

        await verifyRoomExists();

        // ✅ START COUNTDOWN
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            if (roomData.expiresAt) {
                startCountdown(roomData.expiresAt);
            }
        }

        setupRealTimeListener();

        switchScreen('leaderboard');
        elements.displayRoom.textContent = currentRoomId;

    } catch (error) {
        alert(error.message);
    }
}

// ========================================
// VERIFY ROOM
// ========================================

async function verifyRoomExists() {
    return new Promise((resolve, reject) => {

        const q = query(
            collection(db, 'leaderboard'),
            where('roomId', '==', currentRoomId),
            where('gameMode', '==', 'TURNAMEN'),
            orderBy('score', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            unsubscribe();
            if (snapshot.empty) {
                reject(new Error("Room tidak ditemukan atau belum ada peserta"));
            } else {
                resolve(true);
            }
        }, (err) => reject(err));
    });
}

// ========================================
// REALTIME LISTENER
// ========================================

function setupRealTimeListener() {

    const q = query(
        collection(db, 'leaderboard'),
        where('roomId', '==', currentRoomId),
        where('gameMode', '==', 'TURNAMEN'),
        orderBy('score', 'desc')
    );

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {

        playersData = [];

        snapshot.forEach(docSnap => {
            playersData.push(docSnap.data());
        });

        renderLeaderboard();
    });
}

// ========================================
// RENDER
// ========================================

function renderLeaderboard() {

    playersData.sort((a, b) => b.score - a.score);

    elements.leaderboardList.innerHTML = '';

    playersData.forEach((player, index) => {

        const div = document.createElement('div');
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #333;">
                <span>${index + 1}. ${player.name}</span>
                <strong>${player.score}</strong>
            </div>
        `;

        elements.leaderboardList.appendChild(div);
    });
}

// ========================================
// COUNTDOWN
// ========================================

function startCountdown(expiresAt) {

    const el = document.getElementById("countdown-timer");
    if (!el) return;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {

        const now = Date.now();
        const end = expiresAt.toMillis();
        const distance = end - now;

        if (distance <= 0) {
            clearInterval(countdownInterval);
            el.textContent = "⛔ TURNAMEN SELESAI";
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        el.textContent =
            `⏳ ${hours.toString().padStart(2,"0")}:${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`;

    }, 1000);
}

// ========================================
// CLOCK
// ========================================

function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        elements.liveClock.textContent = now.toLocaleTimeString('id-ID');
    }, 1000);
}

// ========================================
// EXIT
// ========================================

function handleExitArena() {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    switchScreen('input');
}