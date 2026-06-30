# math-legends-arena-live
Live Arena Untuk Turnamen Math Legends
# 🏆 Math Legends Arena Live

> **Pusat siaran langsung turnamen Math Legends** — Real-time leaderboard untuk pertandingan game edukasi matematika berbasis Android.

![Status](https://img.shields.io/badge/status-live-success)
![Platform](https://img.shields.io/badge/platform-web-blue)
![Firebase](https://img.shields.io/badge/firebase-firestore-orange)
![License](https://img.shields.io/badge/license-MIT-green)

🌐 **Live Demo:** [https://expert-zealous.github.io/math-legends-arena-live/](https://expert-zealous.github.io/math-legends-arena-live/)

---

## 📖 Tentang Project

**Math Legends Arena Live** adalah web companion untuk game **Math Legends** (Android) yang menampilkan **leaderboard turnamen secara real-time**. 

Cocok digunakan untuk:
- 🏫 **Turnamen sekolah** — tampilkan ranking peserta di proyektor
- 👨‍🏫 **Guru** — monitor progress siswa secara live
- 📺 **Operator turnamen** — siaran langsung dengan tampilan profesional
- 📱 **Penonton** — lihat hasil dari HP, kapan saja & di mana saja

---

## ✨ Fitur Utama

- 🔴 **Live Real-time Update** — Skor pemain otomatis muncul tanpa refresh manual
- 👑 **Podium Top 3** — Tampilan juara dengan medali Gold, Silver, Bronze
- 🎤 **Commentator Feed** — Pesan otomatis untuk setiap aktivitas pemain
- 📊 **Statistik Live** — Pemain aktif, skor tertinggi, sekolah terlibat
- ⏰ **Live Clock** — Jam digital real-time
- 📱 **Fully Responsive** — Tampil bagus di HP, tablet, laptop, dan TV
- 🎨 **Tema Cyberpunk Gaming** — Match dengan visual game Math Legends
- 🌐 **Tanpa Login** — Cukup masukkan Room ID untuk join

---

## 🎮 Cara Menggunakan

### Untuk Penonton/Operator:

1. Buka web: [https://expert-zealous.github.io/math-legends-arena-live/](https://expert-zealous.github.io/math-legends-arena-live/)
2. Masukkan **Room ID** turnamen (format: `XXXX-XXXX`, contoh: `BTYB-9001`)
3. Klik **"BUKA LIVE ARENA"**
4. Nikmati siaran langsung leaderboard turnamen! 🏆

### Untuk Peserta Turnamen:

1. Buka game **Math Legends** di Android
2. Pilih **Mode Turnamen**
3. Masukkan Room ID atau buat baru (klik "Buat ID Baru")
4. Main sampai selesai → skor otomatis terkirim ke web live
5. Buka web Arena Live untuk lihat posisi kamu di leaderboard

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Database** | Firebase Firestore (Real-time) |
| **Hosting** | GitHub Pages |
| **Fonts** | Russo One, Orbitron (Google Fonts) |
| **Modules** | ES6 Modules (Firebase v12.15.0) |

---

## 📁 Struktur Project
math-legends-arena-live/
├── assets/
│ └── logo.png # Logo Math Legends
├── index.html # Halaman utama (Lobby + Arena)
├── style.css # Styling cyberpunk gaming
├── app.js # Logic real-time + Firebase
├── firebase-config.js # Konfigurasi Firebase
└── README.md # Dokumentasi ini

---

## 🔧 Setup untuk Development Lokal

### Prerequisites:
- Browser modern (Chrome, Edge, Firefox)
- VS Code + Extension **Live Server**
- Git + GitHub Desktop (opsional)

### Langkah:

1. Clone repository ini:
   ```bash
   git clone https://github.com/expert-zealous/math-legends-arena-live.git
   🔥 Struktur Data Firestore
Web ini mengambil data dari collection leaderboard dengan struktur:
{
    gameMode: "TURNAMEN",        // string
    name: "Arrahman",            // string
    roomId: "BTYB-9001",         // string (format: XXXX-XXXX)
    school: "SMPN 1 Kademangan", // string
    score: 1870,                 // number
    timestamp: 1782811622798     // number (epoch milliseconds)
}
Query yang digunakan:

Filter: roomId == [user input] AND gameMode == "TURNAMEN"
Sort: score (descending)
Listener: onSnapshot (real-time)
🎨 Color Palette
Warna	Hex	Kegunaan
🔵 Cyan	#00d4ff	Aksen utama, highlight
🟡 Gold	#ffb347	Juara, status premium
🌑 Navy Dark	#0a0e27	Background utama
🟦 Card BG	#111633	Background card
⚪ White	#ffffff	Text primary

📌 Roadmap
 Live leaderboard real-time
 Podium Top 3 dengan medali
 Commentator feed otomatis
 Responsive mobile + desktop
 Deploy ke GitHub Pages
 Favicon (logo di tab browser)
 Sound effect saat ada update
 Konfeti animation untuk juara baru
 QR Code generator built-in
 Mode TV/Proyektor (fullscreen)
 Filter leaderboard by sekolah
 Toggle dark/light theme

 👨‍💻 Pengembang
Project oleh: @expert-zealous

Untuk pertanyaan, saran, atau kolaborasi, silakan buka Issues di repository ini.

📄 Lisensi
Project ini dibuat untuk keperluan edukasi. Bebas digunakan dan dimodifikasi untuk kebutuhan sekolah atau turnamen non-komersial.

🙏 Acknowledgments
🎮 Game Math Legends — Game edukasi matematika berbasis Android
🔥 Firebase — Real-time database infrastructure
🌐 GitHub Pages — Free hosting platform
🎨 Google Fonts — Russo One & Orbitron typography

⭐ Jika project ini berguna, jangan lupa kasih star di GitHub! ⭐

Dikembangkan oleh: Nur Santoso, S.Pd.