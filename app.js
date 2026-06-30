// ═══════════════════════════════════════════════════════
// MATH LEGENDS ARENA LIVE - APPLICATION LOGIC
// Firebase v12.15.0 Modular (Firestore)
// ═══════════════════════════════════════════════════════

// Import konfigurasi dari firebase-config.js
import { db, collection, query, where, onSnapshot, orderBy } from './firebase-config.js';

// === GLOBAL VARIABLES ===
let currentRoomId = null;
let unsubscribeSnapshot = null;
let playersData = [];
let previousScores = {}; // Untuk track perubahan skor dan trigger animasi
let playerCount = 0;
let currentChampion = null; // ✨ Track juara saat ini

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
    podiumContainer: document.getElementById('podium-container'),
    // Statistik
    statPlayers: document.getElementById('stat-active-players'),
    statHighScore: document.getElementById('stat-highest-score'),
    statHighName: document.getElementById('stat-highest-name'),
    statSchools: document.getElementById('stat-total-schools'),
    // Commentator
    commentFeed: document.getElementById('commentator-feed')
};

// ========================================
// INITIALIZATION & EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Math Legends Arena Live initialized');
    
    // Event listeners
    elements.btnStart.addEventListener('click', handleStartArena);
    elements.btnBack.addEventListener('click', handleExitArena);
    elements.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleStartArena();
    });
    
    // Auto-format input (uppercase dan add dash)
    elements.input.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 4 && !val.includes('-')) {
            val = val.slice(0, 4) + '-' + val.slice(4, 8);
        }
        e.target.value = val;
        clearError();
    });

    // Start clock immediately (tidak perlu tunggu arena)
    startLiveClock();
});

// ========================================
// SCREEN MANAGEMENT
// ========================================

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
    
    if (screenName === 'input') {
        // Reset saat kembali ke lobby
        stopListening();
        resetUI();
    }
}

// ========================================
// CORE FUNCTIONALITY: START ARENA
// ========================================

async function handleStartArena() {
    const rawRoomId = elements.input.value.trim().toUpperCase();
    
    // Validasi format Room ID
    if (!rawRoomId) {
        showError('Silakan masukkan Room ID!');
        return;
    }
    
    // Validasi pola: 4 huruf/angka - 4 huruf/angka
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!pattern.test(rawRoomId)) {
        showError('Format Room ID salah! Contoh: ABCD-1234');
        return;
    }
    
    currentRoomId = rawRoomId;
    
    // UI State loading
    setLoadingState(true);
    
    try {
        // Cek dulu apakah room tersebut punya data di Firestore
        await verifyRoomExists();
        
        // Setup listener real-time
        setupRealTimeListener();
        
        // Switch screen
        switchScreen('leaderboard');
        elements.displayRoom.textContent = currentRoomId;
        
        // Initial commentator message
        addComment(`🎯 Terhubung ke Room: ${currentRoomId}`, 'info');
        addComment('👀 Menunggu peserta bergabung ke arena...', 'info');
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Gagal menghubungkan ke database');
        setLoadingState(false);
    }
}

// ========================================
// FIREBASE INTEGRATION
// ========================================

async function verifyRoomExists() {
    return new Promise((resolve, reject) => {
        // Query specific: Ambil data dari collection "leaderboard"
        // Filter: roomId == [input] AND gameMode == "TURNAMEN"
        const q = query(
            collection(db, 'leaderboard'),
            where('roomId', '==', currentRoomId),
            where('gameMode', '==', 'TURNAMEN'),
            orderBy('score', 'desc')
        );
        
        // Coba ambil snapshot sekali untuk validasi room exist
        const unsubscribe = onSnapshot(q, (snapshot) => {
            unsubscribe(); // Stop listening setelah cek
            
            if (snapshot.empty) {
                reject(new Error(`Room "${currentRoomId}" tidak ditemukan atau belum ada peserta!`));
            } else {
                resolve(true);
            }
        }, (err) => {
            reject(new Error('Error koneksi ke database: ' + err.message));
        });
    });
}

function setupRealTimeListener() {
    const q = query(
        collection(db, 'leaderboard'),
        where('roomId', '==', currentRoomId),
        where('gameMode', '==', 'TURNAMEN'),
        orderBy('score', 'desc') // Urutkan skor tertinggi duluan
    );

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const docData = change.id; // document reference
            const data = change.doc.data();
            
            if (change.type === 'added') {
                handleNewPlayer(data, change.doc.id);
            } else if (change.type === 'modified') {
                handlePlayerUpdated(data, change.doc.id);
            } else if (change.type === 'removed') {
                handlePlayerRemoved(change.doc.id);
            }
        });
        
        renderLeaderboard();
        updateStatistics();
        
    }, (error) => {
        console.error('Snapshot error:', error);
        addComment('⚠️ Error koneksi: ' + error.message, 'highlight');
    });
}

function stopListening() {
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
    }
}

// ========================================
// DATA HANDLING
// ========================================

function handleNewPlayer(data, docId) {
    // Cek duplikat berdasarkan name + school
    const existsIndex = playersData.findIndex(p => p.name === data.name && p.school === data.school);
    
    if (existsIndex === -1) {
        // Player baru — tambahkan ke array
        playersData.push({
            id: docId,
            ...data,
            isNew: true,
            timestampJoined: new Date()
        });
        
        addComment(`🆕 **${data.name}** dari ${data.school} bergabung ke arena!`, 'success');
    } else {
        // Player sudah ada — HANYA update jika skor baru LEBIH TINGGI
        if (data.score > playersData[existsIndex].score) {
            const oldScore = playersData[existsIndex].score;
            playersData[existsIndex] = { 
                ...playersData[existsIndex], 
                score: data.score,
                timestamp: data.timestamp,
                id: docId,
                updated: true
            };
            
            // Komentar untuk peningkatan skor
            addComment(`📈 **${data.name}** update skor: ${oldScore} → ${data.score} poin!`, 'highlight');
            
            setTimeout(() => {
                if (playersData[existsIndex]) playersData[existsIndex].updated = false;
            }, 2000);
        }
        // Kalau skor baru LEBIH RENDAH → abaikan, pertahankan skor tertinggi
    }
}

function handlePlayerUpdated(data, docId) {
    const index = playersData.findIndex(p => p.id === docId || (p.name === data.name && p.school === data.school));
    
    if (index !== -1) {
        const oldScore = playersData[index].score;
        const newScore = data.score;
        const diff = newScore - oldScore;
        
        playersData[index] = { 
            ...playersData[index],
            ...data,
            score: newScore,
            updated: true,
            previousScore: oldScore
        };
        
        // Generate komentar dinamis
        generateCommentary(playersData[index], diff, index);
        
        setTimeout(() => {
            if (playersData[index]) playersData[index].updated = false;
        }, 2000);
    }
}

function handlePlayerRemoved(docId) {
    playersData = playersData.filter(p => p.id !== docId);
    renderLeaderboard();
}

// ========================================
// COMMENTATOR SYSTEM
// ========================================

function generateCommentary(player, scoreDiff, rankIndex) {
    const name = player.name;
    const school = player.school;
    const newScore = player.score;
    
    let message = '';
    
    if (rankIndex === 0) {
        message = `👑 JUARA SEMENTARA! **${name}** (${school}) memimpin dengan ${newScore} poin!`;
    } else if (newScore >= 100) {
        message = `🔥 MANTAP! **${name}** tembus ${newScore} poin!`;
    } else if (scoreDiff >= 30) {
        message = `⚡ Skor **${name}** naik tajam (+${scoreDiff})! Total: ${newScore}`;
    } else if (scoreDiff > 0) {
        message = `📈 **${name}** menambah skor (${newScore})`;
    }
    
    if (message) {
        addComment(message, scoreDiff > 20 ? 'highlight' : 'info');
    }
}

function addComment(text, type = '') {
    const div = document.createElement('div');
    div.className = `feed-item ${type}`;
    
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // Convert markdown-style **text** to <strong>text</strong>
    const formattedText = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    div.innerHTML = `<small style="color:#666;margin-right:8px;font-size:0.75rem;">[${time}]</small>${formattedText}`;
    
    elements.commentFeed.insertBefore(div, elements.commentFeed.firstChild);
    
    // Batasi maksimum 30 entry
    while (elements.commentFeed.children.length > 30) {
        elements.commentFeed.removeChild(elements.commentFeed.lastChild);
    }
}
// ========================================
// RENDERING UI
// ========================================

function renderLeaderboard() {
    // Sort by score descending
    playersData.sort((a, b) => b.score - a.score);
    
    // 🎊 CEK PERGANTIAN JUARA #1
    const newChampion = playersData[0];
    
    if (newChampion) {
        const newChampionName = newChampion.name;
        
        console.log(`🏆 Champion check: current=${currentChampion}, new=${newChampionName}`);
        
        // Hanya trigger konfeti kalau juara BERUBAH (bukan pertama kali)
        if (currentChampion !== null && currentChampion !== newChampionName) {
            console.log(`🎉 CHAMPION CHANGED! ${currentChampion} → ${newChampionName}`);
            celebrateNewChampion(newChampionName);
        }
        
        // Update tracker (selalu update biar bisa detect perubahan)
        currentChampion = newChampionName;
    }
    
    // Render UI
    renderPodium();
    renderList();
    
    // Clear flags
    setTimeout(() => {
        playersData.forEach(p => { p.isNew = false; p.updated = false; });
    }, 1500);
}

function renderPodium() {
    const top3 = playersData.slice(0, 3);
    
    if (top3.length === 0) {
        elements.podiumContainer.style.display = 'none';
        return;
    }
    
    elements.podiumContainer.style.display = 'grid';
    elements.podiumContainer.innerHTML = '';
    
    // Order visual: Silver(2), Gold(1), Bronze(3)
    const positions = [
        { idx: 1, cls: 'second', medal: '🥈' },
        { idx: 0, cls: 'first', medal: '🥇', extraCrown: '<span class="crown-icon">👑</span>' },
        { idx: 2, cls: 'third', medal: '🥉' }
    ];
    
    positions.forEach(pos => {
        if (!top3[pos.idx]) return;
        const p = top3[pos.idx];
        
        const div = document.createElement('div');
        div.className = `podium-place ${pos.cls}`;
        div.innerHTML = `
            ${pos.extraCrown || ''}
            <span class="podium-medal">${pos.medal}</span>
            <div class="podium-name">${escapeHtml(p.name)}</div>
            <div class="podium-school">${escapeHtml(p.school)}</div>
            <div class="podium-score">${p.score}</div>
        `;
        elements.podiumContainer.appendChild(div);
    });
}

function renderList() {
    const rest = playersData.slice(3); // Peringkat 4 dst
    
    // Kondisi 1: Belum ada pemain sama sekali
    if (playersData.length === 0) {
        elements.leaderboardList.innerHTML = '<div class="no-data">⏳ Belum ada peserta...</div>';
        return;
    }
    
    // Kondisi 2: Pemain ada tapi cuma <=3 (semua sudah di podium)
    if (rest.length === 0) {
        elements.leaderboardList.innerHTML = `
            <div class="no-data" style="padding:20px;font-size:0.9rem;">
                ✨ Total ${playersData.length} pemain di arena. Menunggu peserta lain...
            </div>
        `;
        return;
    }
    
    // Kondisi 3: Render daftar pemain peringkat 4 ke bawah
    elements.leaderboardList.innerHTML = '';
    
    rest.forEach((player, arrIdx) => {
        const actualRank = arrIdx + 4; // Mulai dari 4
        
        const div = document.createElement('div');
        div.className = `player-entry ${player.isNew ? 'new-entry' : ''}`;
        div.dataset.name = player.name;
        
        const scoreClass = player.updated ? 'player-score-updated' : 'player-score-val';
        
        div.innerHTML = `
            <div class="rank-num">${actualRank}</div>
            <div class="player-info">
                <div class="player-name">${escapeHtml(player.name)}</div>
                <div class="player-school">${escapeHtml(player.school)}</div>
            </div>
            <div class="${scoreClass}">${player.score}</div>
            <div class="score-trend ${player.isNew ? 'trend-new' : ''}">
                ${player.isNew ? 'BARU' : ''}
            </div>
        `;
        
        elements.leaderboardList.appendChild(div);
    });
}

function updateStatistics() {
    playerCount = playersData.length;
    
    // Update count
    elements.statPlayers.textContent = playerCount;
    
    // Update highest score
    if (playerCount > 0) {
        const top = playersData[0];
        elements.statHighScore.textContent = top.score;
        elements.statHighName.textContent = top.name;
        
        // Count unique schools
        const uniqueSchools = [...new Set(playersData.map(p => p.school))];
        elements.statSchools.textContent = uniqueSchools.length;
    } else {
        elements.statHighScore.textContent = '0';
        elements.statHighName.textContent = '-';
        elements.statSchools.textContent = '0';
    }
}

// ========================================
// UTILITIES
// ========================================

function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });
        elements.liveClock.textContent = timeString;
    }, 1000);
}

function setLoadingState(isLoading) {
    elements.btnStart.disabled = isLoading;
    elements.btnStart.textContent = isLoading ? '⏳ MENYALAKAN...' : '📺 BUKA LIVE ARENA';
    elements.input.disabled = isLoading;
}

function showError(msg) {
    elements.errorMsg.textContent = msg;
    elements.errorMsg.classList.add('show');
    elements.input.classList.add('error');
    setTimeout(() => {
        elements.errorMsg.classList.remove('show');
        elements.input.classList.remove('error');
    }, 4000);
}

function clearError() {
    elements.errorMsg.classList.remove('show');
    elements.input.classList.remove('error');
}

function resetUI() {
    elements.input.value = '';
    elements.displayRoom.textContent = '-';
    playersData = [];
    previousScores = {};
    currentChampion = null; // ✨ Reset juara saat keluar room
    elements.leaderboardList.innerHTML = '<p class="loading-text">Menunggu data peserta masuk arena...</p>';
    elements.podiumContainer.style.display = 'none';
    elements.commentFeed.innerHTML = '<div class="feed-item info">🎮 Menunggu aktivitas pemain...</div>';
    elements.statPlayers.textContent = '0';
    elements.statHighScore.textContent = '0';
    elements.statHighName.textContent = '-';
    elements.statSchools.textContent = '0';
    setLoadingState(false);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleExitArena() {
    if(confirm('Keluar dari arena? Anda akan kembali ke layar awal.')) {
        switchScreen('input');
    }
}

console.log('✅ App.js loaded successfully - Math Legends Arena Live ready');
// ========================================
// CONFETTI CELEBRATION
// ========================================

// ========================================
// CONFETTI CELEBRATION
// ========================================

// ========================================
// CONFETTI + SOUND CELEBRATION
// ========================================

function celebrateNewChampion(championName) {
    console.log(`🎊 celebrateNewChampion CALLED for: ${championName}`);
    
    // ============ KONFETI ============
    try {
        if (typeof confetti !== 'undefined') {
            // Konfeti dari kiri
            confetti({
                particleCount: 100,
                angle: 60,
                spread: 70,
                origin: { x: 0, y: 0.7 },
                colors: ['#00d4ff', '#ffb347', '#ffffff', '#ffd700']
            });
            
            // Konfeti dari kanan
            confetti({
                particleCount: 100,
                angle: 120,
                spread: 70,
                origin: { x: 1, y: 0.7 },
                colors: ['#00d4ff', '#ffb347', '#ffffff', '#ffd700']
            });
            
            // Konfeti dari tengah (burst)
            setTimeout(() => {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.5 },
                    colors: ['#ffd700', '#ffb347', '#00d4ff']
                });
            }, 400);
            
            console.log('✅ Confetti triggered!');
        } else {
            console.warn('⚠️ Confetti library not loaded!');
        }
    } catch (e) {
        console.error('❌ Confetti error:', e);
    }
    
    // ============ SOUND ============
    playChampionSound();
    
    // ============ KOMENTAR ============
    addComment(`🎊 SELAMAT! **${championName}** menjadi JUARA BARU! 🏆`, 'highlight');
}

// 🔊 Play Sound dari File MP3 Lokal
function playChampionSound() {
    try {
        const audio = new Audio('assets/champion.mp3');
        audio.volume = 0.7;
        audio.play()
            .then(() => console.log('🔊 Sound played successfully!'))
            .catch(err => console.warn('⚠️ Sound blocked:', err.message));
    } catch (e) {
        console.error('❌ Sound error:', e);
    }
}