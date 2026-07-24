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
let currentMode = 'tournament';
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
    setupTvModeControls();
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

    // 🌐 KONDISI A: JIKA ROOM ID KOSONG -> BUKA MODE NORMAL (GLOBAL)
    if (!id) {
        currentMode = 'NORMAL';
        currentRoomId = null;
        currentChampion = null;

        try {
            // Jalankan musik
            if (!bgMusic) {
                bgMusic = new Audio('assets/music/bg-music.mp3');
                bgMusic.loop = true;
                bgMusic.volume = 0.4;
            }
            bgMusic.play().catch(()=>{});

            // Sembunyikan countdown karena mode normal tidak ada batas waktu
            const cdBox = document.getElementById('countdown-box');
            if (cdBox) cdBox.style.display = 'none';

            setupRealTimeListener();

            switchScreen('leaderboard');
            elements.displayRoom.textContent = '🌐 GLOBAL (NORMAL)';

            addComment(`🌐 Membuka RANKING GLOBAL mode NORMAL`, 'info');
            addComment(`👀 Menampilkan skor tertinggi seluruh pemain...`, 'info');

        } catch (err) {
            alert(err.message);
        }
        return; // Stop di sini, jangan lanjut ke proses turnamen
    }

    // 🏆 KONDISI B: JIKA ROOM ID DIISI -> BUKA MODE TURNAMEN
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) {
        alert("Format Room ID salah. Contoh: ABCD-1234");
        return;
    }

    currentRoomId = id;
    currentMode = 'TURNAMEN';

    try {
        await verifyRoomExists();

        // Ambil expiresAt untuk countdown
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists() && roomSnap.data().expiresAt) {
            startCountdown(roomSnap.data().expiresAt);
        } else {
            const cdBox = document.getElementById('countdown-box');
            if (cdBox) cdBox.style.display = 'none';
        }

        // Jalankan musik
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
// ========================================
// VERIFY ROOM (baru: hanya cek format & room resmi)
// ========================================
async function verifyRoomExists() {
    
    // Cek format Room ID valid (4 karakter - 4 karakter)
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(currentRoomId)) {
        throw new Error("Format Room ID salah. Contoh: ABCD-1234");
    }
    
    // Coba cek apakah room ini ROOM RESMI (terdaftar di collection 'rooms')
    try {
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
            // Room resmi ada, cek statusnya
            const data = roomSnap.data();
            
            if (data.status === "CLOSED") {
                throw new Error("Turnamen ini sudah ditutup.");
            }
            
            if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
                throw new Error("Turnamen ini sudah berakhir.");
            }
            
            // Room resmi valid & aktif
            return true;
        }
        
        // Room tidak ada di collection 'rooms' = room spontan
        // Tetap izinkan masuk (siswa bisa buat room sendiri)
        return true;
        
    } catch (err) {
        // Kalau error dari kita sendiri (throw di atas), lempar lagi
        if (err.message.includes("Turnamen") || err.message.includes("Format")) {
            throw err;
        }
        // Kalau error lain (misal network), tetap izinkan masuk
        console.warn("Tidak bisa cek room, tapi tetap dibuka:", err);
        return true;
    }
}

// ========================================
// REAL-TIME LISTENER
// ========================================
function setupRealTimeListener() {
    let q;

    if (currentMode === 'NORMAL') {
        // 🌐 Query Mode Normal (Tanpa limit agar tidak memicu error import)
        q = query(
            collection(db, 'leaderboard'),
            where('gameMode', '==', 'NORMAL'),
            orderBy('score', 'desc')
        );
    } else {
        // 🏆 Query Mode Turnamen berdasarkan Room ID
        q = query(
            collection(db, 'leaderboard'),
            where('roomId', '==', currentRoomId),
            where('gameMode', '==', 'TURNAMEN'),
            orderBy('score', 'desc')
        );
    }

    unsubscribeSnapshot = onSnapshot(q, snap => {
        const rawData = [];
        snap.forEach(d => rawData.push({ id: d.id, ...d.data() }));

        // Deduplikasi: Hanya ambil skor tertinggi per nama pemain
        // Cari bagian ini di dalam setupRealTimeListener
const bestScoreMap = new Map();
rawData.forEach(player => {
    // ✅ PERBAIKAN: Ubah nama menjadi huruf kecil untuk dijadikan "Kunci" unik
    // .trim() digunakan untuk menghapus spasi tidak sengaja di depan/belakang nama
    const searchKey = player.name.toLowerCase().trim(); 
    
    const existing = bestScoreMap.get(searchKey);
    if (!existing || player.score > existing.score) {
        // Jika belum ada atau score baru lebih tinggi, simpan ke Map
        bestScoreMap.set(searchKey, player);
    }
});

        const newData = Array.from(bestScoreMap.values())
            .sort((a, b) => b.score - a.score);

        // Deteksi Juara Baru
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

    }, error => {
        // 🚨 MENANGKAP ERROR FIRESTORE (Sangat Penting!)
        console.error("Firestore Error:", error);
        
        if (error.message.includes("index")) {
            alert("Firestore membutuhkan INDEX tambahan untuk Mode Normal.\n\nSilakan buka Developer Console (F12) pada browser Anda, lalu klik LINK BIRU di dalam error merah untuk membuat index otomatis.");
        } else {
            alert("Gagal memuat data dari database:\n" + error.message);
        }
    });
}

// ========================================
// RENDER LEADERBOARD
// ========================================
function renderLeaderboard() {

    playersData.sort((a, b) => b.score - a.score);
    
    // ✅ Kalau belum ada peserta, tampilkan pesan menunggu
    if (playersData.length === 0) {
        elements.podiumContainer.style.display = 'none';
        elements.leaderboardList.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#8DEBFF;">
                <div style="font-size:60px; margin-bottom:16px;">⏳</div>
                <div style="font-size:20px; font-weight:bold; margin-bottom:8px;">
                    Menunggu Peserta...
                </div>
                <div style="font-size:14px; opacity:0.7;">
                    Room ID: ${currentRoomId}<br>
                    Bagikan kode ini ke peserta turnamen
                </div>
            </div>
        `;
        return;
    }

    // Podium top 3
    const top3 = playersData.slice(0, 3);
    elements.podiumContainer.innerHTML = '';
    elements.podiumContainer.style.display = top3.length ? 'grid' : 'none';

    const positions = [
    { idx: 1, cls: 'second', medal: '🥈' },
    { idx: 0, cls: 'first', medal: '🥇', crown: true },
    { idx: 2, cls: 'third', medal: '🥉' }
];

positions.forEach(pos => {
    if (!top3[pos.idx]) return;
    const p = top3[pos.idx];

    const div = document.createElement('div');
    div.className = `podium-place ${pos.cls}`;

    div.innerHTML = `
        ${pos.crown ? '<div class="crown-icon">👑</div>' : ''}
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
            el.textContent = "⛔ SELESAI";
            return;
        }
        const h = Math.floor(distance / 3600000);
        const m = Math.floor((distance % 3600000) / 60000);
        const s = Math.floor((distance % 60000) / 1000);
        el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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

    // Reset countdown box
    const countdownBox = document.getElementById('countdown-box');
    if (countdownBox) countdownBox.style.display = 'block';

    // Reset mode
    currentMode = 'tournament';
    currentChampion = null;

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

function setupTvModeControls(){
  const btnTv = document.getElementById('btn-tv-mode');
  const btnFs = document.getElementById('btn-fullscreen');

  // Apply saved state
  const saved = localStorage.getItem('tv-mode') === '1';
  setTvMode(saved);

  if (btnTv){
    btnTv.addEventListener('click', () => {
      const isOn = !document.body.classList.contains('tv-mode');
      setTvMode(isOn);
    });
  }

  if (btnFs){
    btnFs.addEventListener('click', async () => {
      try{
        if (!document.fullscreenElement){
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch(e){
        console.log('Fullscreen error:', e);
      }
    });
  }

  function setTvMode(on){
    document.body.classList.toggle('tv-mode', on);
    localStorage.setItem('tv-mode', on ? '1' : '0');
    if (btnTv) btnTv.textContent = on ? '🧩 NORMAL' : '📺 TV MODE';
  }
}