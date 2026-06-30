// ═══════════════════════════════════════════════════════
// MATH LEGENDS ARENA LIVE - FULL FINAL VERSION
// Real-time + Countdown + Sound + Confetti + BG Music
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

// === GLOBAL ===
let currentRoomId = null;
let unsubscribeSnapshot = null;
let playersData = [];
let currentChampion = null;
let countdownInterval = null;
let bgMusic = null;

// === DOM ===
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
    podiumContainer: document.getElementById('podium-container'),
    statPlayers: document.getElementById('stat-active-players'),
    statHighScore: document.getElementById('stat-highest-score'),
    statHighName: document.getElementById('stat-highest-name'),
    statSchools: document.getElementById('stat-total-schools'),
    commentFeed: document.getElementById('commentator-feed')
};

// ========================================
// INIT
// ========================================
document.addEventListener('DOMContentLoaded', () => {

    elements.btnStart.addEventListener('click', handleStartArena);
    elements.btnBack.addEventListener('click', handleExitArena);

    elements.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleStartArena();
    });

    elements.input.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 4 && !val.includes('-')) {
            val = val.slice(0, 4) + '-' + val.slice(4, 8);
        }
        e.target.value = val;
    });

    startLiveClock();
});

// ========================================
// SCREEN
// ========================================
function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// ========================================
// START ARENA
// ========================================
async function handleStartArena() {

    const id = elements.input.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) {
        alert("Format Room ID salah. Contoh: ABCD-1234");
        return;
    }

    currentRoomId = id;

    try {
        await verifyRoomExists();

        // Ambil expiresAt untuk countdown
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists() && roomSnap.data().expiresAt) {
            startCountdown(roomSnap.data().expiresAt);
        }

        // Background music
        if (!bgMusic) {
            bgMusic = new Audio('assets/music/bg-music.mp3');
            bgMusic.loop = true;
            bgMusic.volume = 0.4;
        }
        bgMusic.play().catch(()=>{});

        setupRealTimeListener();

        switchScreen('leaderboard');
        elements.displayRoom.textContent = currentRoomId;

        addComment(`🎯 Terhubung ke Room: ${currentRoomId}`, 'info');
        addComment(`👀 Menunggu peserta bergabung...`, 'info');

    } catch (err) {
        alert(err.message);
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
        const unsub = onSnapshot(q, snap => {
            unsub();
            if (snap.empty) reject(new Error("Room belum ada peserta"));
            else resolve(true);
        }, err => reject(err));
    });
}

// ========================================
// REAL-TIME LISTENER
// ========================================
function setupRealTimeListener() {

    const q = query(
        collection(db, 'leaderboard'),
        where('roomId', '==', currentRoomId),
        where('gameMode', '==', 'TURNAMEN'),
        orderBy('score', 'desc')
    );

    unsubscribeSnapshot = onSnapshot(q, snap => {

        const newData = [];
        snap.forEach(d => newData.push({ id: d.id, ...d.data() }));

        // Cek juara baru
        if (newData.length > 0) {
            const newChamp = newData[0].name;
            if (currentChampion !== null && currentChampion !== newChamp) {
                celebrateNewChampion(newChamp);
            }
            currentChampion = newChamp;
        }

        playersData = newData;
        renderLeaderboard();
        updateStatistics();
    });
}

// ========================================
// RENDER LEADERBOARD
// ========================================
function renderLeaderboard() {

    playersData.sort((a, b) => b.score - a.score);

    // Podium top 3
    const top3 = playersData.slice(0, 3);
    elements.podiumContainer.innerHTML = '';
    elements.podiumContainer.style.display = top3.length ? 'grid' : 'none';

    const positions = [
        { idx: 1, cls: 'second', medal: '🥈' },
        { idx: 0, cls: 'first', medal: '🥇' },
        { idx: 2, cls: 'third', medal: '🥉' }
    ];

    positions.forEach(pos => {
        if (!top3[pos.idx]) return;
        const p = top3[pos.idx];
        const div = document.createElement('div');
        div.className = `podium-place ${pos.cls}`;
        div.innerHTML = `
            <span class="podium-medal">${pos.medal}</span>
            <div class="podium-name">${p.name}</div>
            <div class="podium-school">${p.school || ''}</div>
            <div class="podium-score">${p.score}</div>
        `;
        elements.podiumContainer.appendChild(div);
    });

    // List rank 4+
    const rest = playersData.slice(3);
    elements.leaderboardList.innerHTML = '';

    rest.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = "player-entry";
        div.innerHTML = `
            <div class="rank-num">${i + 4}</div>
            <div class="player-info">
                <div class="player-name">${p.name}</div>
                <div class="player-school">${p.school || ''}</div>
            </div>
            <div class="player-score-val">${p.score}</div>
        `;
        elements.leaderboardList.appendChild(div);
    });
}

// ========================================
// STATISTICS
// ========================================
function updateStatistics() {
    elements.statPlayers.textContent = playersData.length;

    if (playersData.length > 0) {
        elements.statHighScore.textContent = playersData[0].score;
        elements.statHighName.textContent = playersData[0].name;
        elements.statSchools.textContent = [...new Set(playersData.map(p => p.school))].length;
    } else {
        elements.statHighScore.textContent = '0';
        elements.statHighName.textContent = '-';
        elements.statSchools.textContent = '0';
    }
}

// ========================================
// COMMENTARY
// ========================================
function addComment(text, type = '') {
    const div = document.createElement('div');
    div.className = `feed-item ${type}`;
    div.innerHTML = text;
    elements.commentFeed.insertBefore(div, elements.commentFeed.firstChild);
    while (elements.commentFeed.children.length > 30) {
        elements.commentFeed.removeChild(elements.commentFeed.lastChild);
    }
}

// ========================================
// COUNTDOWN
// ========================================
function startCountdown(expiresAt) {
    const el = document.getElementById("countdown-timer");
    if (!el) return;
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const distance = expiresAt.toMillis() - Date.now();
        if (distance <= 0) {
            clearInterval(countdownInterval);
            el.textContent = "⛔ TURNAMEN SELESAI";
            return;
        }
        const h = Math.floor(distance / 3600000);
        const m = Math.floor((distance % 3600000) / 60000);
        const s = Math.floor((distance % 60000) / 1000);
        el.textContent = `⏳ ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);
}

// ========================================
// CLOCK
// ========================================
function startLiveClock() {
    setInterval(() => {
        elements.liveClock.textContent = new Date().toLocaleTimeString('id-ID');
    }, 1000);
}

// ========================================
// EXIT
// ========================================
function handleExitArena() {
    if (!confirm("Keluar arena?")) return;
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    if (countdownInterval) clearInterval(countdownInterval);
    if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    switchScreen('input');
}

// ========================================
// CHAMPION CELEBRATION
// ========================================
function celebrateNewChampion(name) {
    try {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    } catch(e) {}
    const audio = new Audio('assets/champion.mp3');
    audio.volume = 0.8;
    audio.play().catch(()=>{});
    addComment(`🎊 <strong>${name}</strong> menjadi JUARA BARU! 🏆`, 'highlight');
}