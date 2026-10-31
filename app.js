// ==========================================================================
// LOGIKA INTERAKTIF E-PORTOFOLIO PPL MANDIRI ("PEACOCK REYOG")
// Mendukung Navigasi Multi-Halaman, Sub-Tab Siklus, Filter E-Portofolio 1 & 2,
// Modal Preview (PDF Lokal & Google Drive, Simulator HTML5, Video, PPM),
// Folder Dokumentasi Per Pertemuan, & Fitur Upload/Kelola Artefak
// ==========================================================================

(function () {
  const STORAGE_KEY = "FAHRI_EPORTOFOLIO_CUSTOM_ARTEFAKS_V1";

  let currentPage = "beranda"; // beranda | profil | siklus-1 | siklus-2 | siklus-3 | siklus-4 | model-guru | lampiran
  let currentSiklusSubtab = {
    "siklus-1": "perangkat",
    "siklus-2": "perangkat",
    "siklus-3": "perangkat",
    "siklus-4": "perangkat"
  };
  let currentPertemuanFilter = {
    "siklus-1": "all",
    "siklus-2": "all",
    "siklus-3": "all",
    "siklus-4": "all"
  };
  let currentScopeMode = "all"; // all | ep1 | ep2

  // Muat artefak tambahan yang di-upload/ditambahkan oleh user dari localStorage
  function loadCustomArtefaks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  function saveCustomArtefaks(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function getMergedSiklusData(siklusId) {
    const base = window.PORTFOLIO_DATA.siklusList.find((s) => s.id === siklusId);
    if (!base) return null;
    const copy = JSON.parse(JSON.stringify(base));
    const customs = loadCustomArtefaks().filter((c) => c.siklusId === siklusId);

    customs.forEach((item) => {
      if (item.kategori === "video") {
        copy.videoPraktikMengajar.push({
          judul: item.judul,
          jenis: item.tipe || "Video Pelaksanaan Praktik Mengajar Mandiri",
          url: item.fileUrl,
          localVideo: item.fileUrl.endsWith(".mp4") ? item.fileUrl : "",
          deskripsi: item.deskripsi,
          isCustom: true,
          customId: item.id
        });
      } else {
        let targetPert = copy.pertemuanList.find((p) => p.id === item.pertemuanId);
        if (!targetPert && copy.pertemuanList.length > 0) {
          targetPert = copy.pertemuanList[copy.pertemuanList.length - 1];
        }
        if (targetPert) {
          if (targetPert.id === "s4-pert13") {
            targetPert.artefakItems = targetPert.artefakItems.filter(
              (a) => a.previewType !== "upload-trigger"
            );
          }
          targetPert.artefakItems.push({
            judul: item.judul,
            tipe: item.tipe,
            deskripsi: item.deskripsi,
            fileUrl: item.fileUrl,
            previewType: item.previewType || detectPreviewType(item.fileUrl),
            isCustom: true,
            customId: item.id
          });
        }
      }
    });

    return copy;
  }

  function detectPreviewType(url) {
    if (!url) return "external";
    const lower = url.toLowerCase();
    if (lower.includes("drive.google.com/drive/folders/")) return "drive-folder";
    if (lower.endsWith(".pdf") || lower.includes("drive.google.com/file")) return "pdf";
    if (lower.endsWith(".html")) return "simulator";
    if (lower.endsWith(".mp4") || lower.endsWith(".webm")) return "video";
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) return "image";
    if (lower.endsWith(".docx") || lower.endsWith(".xlsx") || lower.endsWith(".pptx")) return "docx";
    return "external";
  }

  // Konversi otomatis link Google Drive /view menjadi /preview, folder Drive menjadi embeddedfolderview, & Instagram Reel menjadi /embed/
  function normalizeEmbedUrl(url) {
    if (!url) return "";
    if (url.includes("drive.google.com/drive/folders/")) {
      const mf = url.match(/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)/);
      if (mf && mf[1]) {
        return `https://drive.google.com/embeddedfolderview?id=${mf[1]}#grid`;
      }
    }
    if (url.includes("drive.google.com/file/d/")) {
      return url.replace(/\/view(\?.*)?$/, "/preview");
    }
    if (url.includes("instagram.com/reel/")) {
      const m = url.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/);
      if (m && m[1]) {
        return `https://www.instagram.com/reel/${m[1]}/embed/`;
      }
    }
    return url;
  }

  // Navigasi utama
  window.navigateTo = function (pageId, subtab) {
    currentPage = pageId;
    if (subtab && currentSiklusSubtab[pageId] !== undefined) {
      currentSiklusSubtab[pageId] = subtab;
    }
    document.querySelectorAll(".nav-link").forEach((el) => {
      const target = el.getAttribute("data-page");
      el.classList.toggle("active", target === pageId);
    });
    const navMenu = document.getElementById("main-nav-menu");
    if (navMenu) navMenu.classList.remove("mobile-open");

    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.setScopeMode = function (mode) {
    currentScopeMode = mode;
    document.querySelectorAll(".scope-pill").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-scope") === mode);
    });
    if (mode === "ep1" && ["siklus-2", "siklus-3", "siklus-4"].includes(currentPage)) {
      navigateTo("siklus-1");
      return;
    }
    if (mode === "ep2" && currentPage === "siklus-1") {
      navigateTo("siklus-2");
      return;
    }
    renderCurrentPage();
  };

  window.switchSiklusSubtab = function (siklusId, subtab) {
    currentSiklusSubtab[siklusId] = subtab;
    renderCurrentPage();
  };

  window.setPertemuanFilter = function (siklusId, pertId) {
    currentPertemuanFilter[siklusId] = pertId;
    renderCurrentPage();
  };

  // ==========================================================================
  // RENDERER UTAMA PER HALAMAN
  // ==========================================================================
  function renderCurrentPage() {
    const mainEl = document.getElementById("app-main-content");
    if (!mainEl) return;

    if (currentPage === "beranda") {
      mainEl.innerHTML = renderBeranda();
    } else if (currentPage === "profil") {
      mainEl.innerHTML = renderProfilDanOrientasi();
    } else if (currentPage.startsWith("siklus-")) {
      mainEl.innerHTML = renderHalamanSiklus(currentPage);
    } else if (currentPage === "model-guru") {
      mainEl.innerHTML = renderModelGuruDanRefleksiAkhir();
    } else if (currentPage === "lampiran") {
      mainEl.innerHTML = renderLampiran();
    } else {
      mainEl.innerHTML = renderBeranda();
    }
  }

  // --------------------------------------------------------------------------
  // 1. HALAMAN BERANDA
  // --------------------------------------------------------------------------
  function renderBeranda() {
    const d = window.PORTFOLIO_DATA;
    const s = d.student;
    const siklusFiltered = d.siklusList.filter((sk) => {
      if (currentScopeMode === "ep1") return sk.scopeCode === "ep1";
      if (currentScopeMode === "ep2") return sk.scopeCode === "ep2";
      return true;
    });

    const scopeBannerHtml =
      currentScopeMode === "ep1"
        ? `<div style="background:linear-gradient(90deg,#004d4f,#006d6f);color:#fff;padding:0.9rem 1.25rem;border-radius:10px;border:1.5px solid var(--reyog-gold);margin-bottom:1.65rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.85rem;">
            <div>
              <strong style="color:var(--reyog-gold-bright);">📌 Tampilan Saat Ini: Fokus E-Portofolio 1 (UTS — Siklus 1 Mandiri)</strong>
              <p style="font-size:0.84rem;opacity:0.92;margin-top:0.15rem;">Menampilkan perangkat pembelajaran, video mengajar, analisis 6 komponen, serta refleksi saya pada <strong>Siklus 1 (Pertemuan 3 sampai 5)</strong>.</p>
            </div>
            <button class="btn btn-gold" onclick="navigateTo('siklus-1')">Buka Siklus 1 →</button>
          </div>`
        : currentScopeMode === "ep2"
        ? `<div style="background:linear-gradient(90deg,#00383a,#00595b);color:#fff;padding:0.9rem 1.25rem;border-radius:10px;border:1.5px solid var(--reyog-gold);margin-bottom:1.65rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.85rem;">
            <div>
              <strong style="color:var(--reyog-gold-bright);">📌 Tampilan Saat Ini: Fokus E-Portofolio 2 (UAS — Siklus 2 s.d. Siklus 4 Mandiri)</strong>
              <p style="font-size:0.84rem;opacity:0.92;margin-top:0.15rem;">Menampilkan perangkat pembelajaran terbaik, media kuis & simulator buatan sendiri, video mengajar, serta analisis dan refleksi dari <strong>Siklus 2 (Pert. 6–8), Siklus 3 (Pert. 9–11), dan Siklus 4 (Pert. 12–13)</strong>.</p>
            </div>
            <button class="btn btn-gold" onclick="navigateTo('siklus-2')">Buka Siklus 2–4 →</button>
          </div>`
        : "";

    return `
      <!-- HERO BANNER PEACOCK REYOG -->
      <header class="hero-banner">
        <img src="assets/img/ornamen_merak_emas.png" alt="" class="hero-peacock-watermark" />
        <div class="hero-inner">
          <div class="hero-eyebrow">
            <span>🦚</span> E-PORTOFOLIO PPL II SEMESTER 2 (GABUNGAN SIKLUS 1 S.D. 4)
          </div>
          <h1 class="hero-title">E-Portofolio Praktik Mengajar Mandiri</h1>
          <p class="hero-subtitle">Catatan Perjalanan Mengajar, Media Pembelajaran IPA, dan Refleksi Diri di UPTD SMPN 1 Burneh</p>
          <div class="hero-divider">
            <span class="hero-divider-line"></span>
            <span class="hero-divider-diamond">❖</span>
            <span class="hero-divider-line"></span>
          </div>
          <p style="max-width:820px;margin:0 auto;font-size:0.94rem;color:rgba(247,250,250,0.92);line-height:1.75;">
            ${s.pengantarBeranda}
          </p>
          <div class="hero-meta-badges">
            <div class="hero-badge">👤 <strong>Mahasiswa:</strong> ${s.nama} (${s.nim})</div>
            <div class="hero-badge">🏫 <strong>Sekolah PPL:</strong> ${s.sekolahPPL}</div>
            <div class="hero-badge">🎓 <strong>LPTK:</strong> ${s.kampus}</div>
            <div class="hero-badge">✉️ <strong>Email:</strong> ${s.email}</div>
          </div>
          <div style="margin-top:1.4rem;display:flex;justify-content:center;gap:0.65rem;flex-wrap:wrap;">
            <button class="btn btn-gold" onclick="navigateTo('profil')">👤 Profil & Pra-Siklus</button>
            <button class="btn btn-primary" onclick="navigateTo('siklus-1')">📘 Siklus 1 (E-Portofolio 1)</button>
            <button class="btn btn-primary" onclick="navigateTo('siklus-2')">📗 Siklus 2–4 (E-Portofolio 2)</button>
            <button class="btn btn-outline" style="background:rgba(0,0,0,0.25);color:var(--reyog-gold-light);border-color:var(--reyog-gold);" onclick="navigateTo('model-guru')">🌟 Model Guru & RTL</button>
          </div>
        </div>
      </header>

      <!-- ALUR PERJALANAN PPL SEMESTER 2 -->
      <section class="section-block">
        <div class="container">
          ${scopeBannerHtml}

          <div class="section-header">
            <span class="section-kicker">Isi E-Portofolio</span>
            <h2 class="section-title">Urutan Perjalanan PPL Saya di Semester 2</h2>
            <p class="section-desc">Saya menyusun halaman ini secara berurutan dari masa awal observasi sekolah dan mengajar terbimbing sampai ke praktik mengajar mandiri Siklus 1 hingga Siklus 4 supaya mudah diikuti.</p>
            <div class="ornament-divider"><span>✦</span></div>
          </div>

          <!-- RINGKASAN 4 TAHAP -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:0.9rem;margin-bottom:2.4rem;">
            <div class="siklus-nav-card" style="padding:1.15rem;">
              <div>
                <span class="ep-tag">TAHAP AWAL</span>
                <h3 style="font-family:var(--font-serif);font-size:1.02rem;margin:0.5rem 0 0.35rem;color:var(--reyog-dark);">Orientasi, Observasi & Pemetaan Profil VII B</h3>
                <p style="font-size:0.82rem;color:var(--text-secondary);">Hasil pengamatan manajemen sekolah (LK 1), lingkungan belajar (LK 2), dan pemetaan profil belajar 21 murid Kelas VII B.</p>
              </div>
              <button class="btn btn-outline" style="margin-top:0.85rem;width:100%;" onclick="navigateTo('profil')">Lihat Orientasi & Profil Murid →</button>
            </div>

            <div class="siklus-nav-card" style="padding:1.15rem;">
              <div>
                <span class="ep-tag">PRA-MANDIRI</span>
                <h3 style="font-family:var(--font-serif);font-size:1.02rem;margin:0.5rem 0 0.35rem;color:var(--reyog-dark);">Mengajar Terbimbing (Pert. 1 – 2)</h3>
                <p style="font-size:0.82rem;color:var(--text-secondary);">Materi Wujud Zat & Titik Leleh-Didih lengkap dengan simulator partikel dan refleksi mengajar terbimbing (LK 3).</p>
              </div>
              <button class="btn btn-outline" style="margin-top:0.85rem;width:100%;" onclick="navigateTo('profil')">Lihat Pertemuan 1–2 →</button>
            </div>

            <div class="siklus-nav-card featured-gold" style="padding:1.15rem;">
              <div>
                <span class="ep-tag ep1">E-PORTOFOLIO 1 (UTS)</span>
                <h3 style="font-family:var(--font-serif);font-size:1.02rem;margin:0.5rem 0 0.35rem;color:var(--reyog-dark);">Siklus 1 Mandiri (Pert. 3 – 5)</h3>
                <p style="font-size:0.82rem;color:var(--text-secondary);">Perubahan Fisika-Kimia, Massa Jenis, & Suhu (Video animasi dapur, percobaan alat dari rumah, LKM, & Refleksi LK 4.1).</p>
              </div>
              <button class="btn btn-primary" style="margin-top:0.85rem;width:100%;" onclick="navigateTo('siklus-1')">Buka Siklus 1 →</button>
            </div>

            <div class="siklus-nav-card featured-gold" style="padding:1.15rem;">
              <div>
                <span class="ep-tag ep2">E-PORTOFOLIO 2 (UAS)</span>
                <h3 style="font-family:var(--font-serif);font-size:1.02rem;margin:0.5rem 0 0.35rem;color:var(--reyog-dark);">Siklus 2 – 4 Mandiri (Pert. 6 – 13)</h3>
                <p style="font-size:0.82rem;color:var(--text-secondary);">Kalor (Kuis AI 'Clash of Calor' di IFP), Pemuaian (Video Stasiun Gubeng), Gerak, & Gaya ('Detektif Gaya') + LK 4.2–4.4.</p>
              </div>
              <button class="btn btn-gold" style="margin-top:0.85rem;width:100%;" onclick="navigateTo('siklus-2')">Buka Siklus 2–4 →</button>
            </div>
          </div>

          <!-- KARTU DETAIL 4 SIKLUS PPL MANDIRI -->
          <div class="section-header" style="margin-top:0.5rem;">
            <span class="section-kicker">Rincian Per Siklus</span>
            <h2 class="section-title">Daftar Siklus Praktik Mengajar Mandiri</h2>
            <p class="section-desc">Setiap siklus dibagi menjadi 3 bagian: (1) Rencana & Perangkat Pembelajaran + Video Mengajar, (2) Analisis 6 Komponen & Kajian Teori, serta (3) Catatan Refleksi LK 4.</p>
          </div>

          <div class="siklus-cards-grid">
            ${siklusFiltered
              .map(
                (sk) => `
              <article class="siklus-nav-card featured-gold">
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem;margin-bottom:0.65rem;">
                    <span class="crest-badge" style="margin-bottom:0;">🦚 ${sk.badgeText}</span>
                    <span class="ep-tag ${sk.scopeCode}">${sk.kategoriPortofolio}</span>
                  </div>
                  <div style="font-size:0.76rem;font-weight:700;color:var(--reyog-teal);margin-bottom:0.2rem;">
                    📅 ${sk.rentangPertemuan} (${sk.tanggalSiklus})
                  </div>
                  <h3 style="font-family:var(--font-serif);font-size:1.12rem;color:var(--reyog-dark);margin-bottom:0.5rem;line-height:1.35;">
                    ${sk.topikUtama}
                  </h3>
                  <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:0.85rem;">
                    ${sk.ringkasanEksekutif}
                  </p>
                  <div style="background:var(--reyog-mint);padding:0.65rem 0.8rem;border-radius:8px;border:1px solid var(--reyog-mint-border);margin-bottom:1rem;font-size:0.78rem;">
                    <strong style="color:var(--reyog-dark);display:block;margin-bottom:0.15rem;">⭐ Perangkat Pilihan di Siklus ${sk.nomor}:</strong>
                    <span style="color:var(--text-secondary);">${sk.produkTerbaikHighlight.judul}</span>
                  </div>
                </div>
                <div style="display:grid;gap:0.4rem;">
                  <button class="btn btn-primary" onclick="navigateTo('${sk.id}', 'perangkat')">📂 1. Perangkat, Media & Video Siklus ${sk.nomor}</button>
                  <button class="btn btn-outline" onclick="navigateTo('${sk.id}', 'analisis')">🔬 2. Analisis 6 Komponen & Kajian Teori ${sk.nomor}</button>
                  <button class="btn btn-outline" onclick="navigateTo('${sk.id}', 'refleksi')">📝 3. Refleksi LK 4.${sk.nomor}</button>
                </div>
              </article>
            `
              )
              .join("")}
          </div>
        </div>
      </section>

      <!-- ENAM KOMPONEN YANG DIANALISIS DI TIAP SIKLUS -->
      <section class="section-block bg-dark-reyog">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Kelengkapan Isi Portofolio</span>
            <h2 class="section-title">Enam Komponen yang Dibahas pada Setiap Siklus</h2>
            <p class="section-desc">Sesuai ketentuan tugas E-Portofolio, setiap siklus dilengkapi dengan perangkat pembelajaran, dokumentasi video, dan analisis di enam komponen berikut.</p>
            <div class="ornament-divider"><span>❖</span></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1rem;">
            <div class="timeline-card">
              <div class="timeline-card-title"><span>1. Rancangan Pembelajaran (PPM)</span> <span>📋</span></div>
              <div class="timeline-card-body">Membahas perencanaan pembelajaran (PPM) yang saya susun untuk kelas VII B, mulai dari alasan pemilihan model belajar, apa yang berjalan lancar, hingga bagian mana yang masih perlu diperbaiki.</div>
            </div>
            <div class="timeline-card">
              <div class="timeline-card-title"><span>2. Materi Pembelajaran</span> <span>📚</span></div>
              <div class="timeline-card-body">Membahas materi IPA yang diajarkan (Zat & Perubahannya, Suhu & Kalor, Pemuaian, serta Gerak & Gaya), cara mengaitkannya dengan kejadian sehari-hari, serta kendala saat masuk ke materi hitungan.</div>
            </div>
            <div class="timeline-card">
              <div class="timeline-card-title"><span>3. Media Pembelajaran</span> <span>🎮</span></div>
              <div class="timeline-card-body">Membahas media yang saya gunakan di kelas: video animasi, alat percobaan dari rumah, kuis buatan sendiri di layar IFP (<em>Clash of Calor</em>), video Stasiun Gubeng, mainan lato-lato, dan simulator web interaktif.</div>
            </div>
            <div class="timeline-card">
              <div class="timeline-card-title"><span>4. Video Praktik Mengajar Mandiri</span> <span>🎥</span></div>
              <div class="timeline-card-body">Menampilkan dokumentasi video saat saya mengajar mandiri di kelas beserta evaluasi dari kegiatan pembukaan, kegiatan inti, pengondisian kelas, sampai penutupan.</div>
            </div>
            <div class="timeline-card">
              <div class="timeline-card-title"><span>5. Kegiatan Non-Mengajar</span> <span>🤝</span></div>
              <div class="timeline-card-body">Mencatat kegiatan saya di luar jam mengajar di UPTD SMPN 1 Burneh, seperti piket, kegiatan pagi, diskusi bersama Guru Pamong dan DPL, serta pembuatan gantungan kunci kenang-kenangan untuk murid kelas VII B.</div>
            </div>
            <div class="timeline-card">
              <div class="timeline-card-title"><span>6. Instrumen Penilaian & Analisisnya</span> <span>📊</span></div>
              <div class="timeline-card-body">Memuat LKM, soal kuis, rekap nilai, lembar penilaian dari Guru Pamong (Lampiran 7 & 8), serta rencana penggunaan <em>Tiket Keluar</em> latihan berhitung dasar sebagai asesmen formatif.</div>
            </div>
          </div>

          <!-- KUTIPAN UTAMA -->
          <div class="royal-quote-box" style="margin-top:2.25rem;margin-bottom:0;">
            <div style="font-size:1.3rem;color:var(--reyog-gold-dark);">🦚</div>
            <p class="royal-quote-text" style="font-size:1.1rem;font-weight:600;">
              ${s.quoteUtama}
            </p>
            <div class="royal-quote-author">— ${s.nama}, 2026 | ${s.sekolahPPL} —</div>
          </div>

          <div class="page-turn-nav" style="border-top-color:rgba(200,169,81,0.3);">
            <span></span>
            <button class="btn btn-gold" onclick="navigateTo('profil')">Profil & Pra-Siklus >></button>
          </div>
        </div>
      </section>
    `;
  }

  // --------------------------------------------------------------------------
  // 2. HALAMAN PROFIL SAYA, ORIENTASI, PROFILING VII B, & PPL TERBIMBING SMT 2
  // --------------------------------------------------------------------------
  function renderProfilDanOrientasi() {
    const d = window.PORTFOLIO_DATA;
    const s = d.student;
    const op = d.orientasiDanProfiling;

    return `
      <section class="section-block bg-parchment">
        <div class="container">
          <!-- BANNER IDENTITAS MAHASISWA -->
          <div class="identity-banner">
            <div class="identity-header-pill">IDENTITAS MAHASISWA</div>
            <div class="identity-grid">
              <div class="identity-photo-frame">
                <img src="${s.fotoProfil}" alt="${s.nama}" />
                <div class="identity-photo-caption">${s.kampus}</div>
              </div>
              <div class="identity-fields-grid">
                <div class="identity-field-card">
                  <span class="identity-field-label">NAMA</span>
                  <div class="identity-field-value">${s.nama}</div>
                </div>
                <div class="identity-field-card">
                  <span class="identity-field-label">NIM</span>
                  <div class="identity-field-value">${s.nim}</div>
                </div>
                <div class="identity-field-card">
                  <span class="identity-field-label">ASAL DAERAH</span>
                  <div class="identity-field-value">${s.asalDaerah}</div>
                </div>
                <div class="identity-field-card">
                  <span class="identity-field-label">SEKOLAH PPL</span>
                  <div class="identity-field-value">${s.sekolahPPL}</div>
                </div>
                <div class="identity-field-card">
                  <span class="identity-field-label">MATA PELAJARAN</span>
                  <div class="identity-field-value">${s.mataPelajaran}</div>
                </div>
                <div class="identity-field-card">
                  <span class="identity-field-label">LPTK</span>
                  <div class="identity-field-value">${s.kampus}</div>
                </div>
              </div>
            </div>
            <div style="margin-top:1.25rem;padding-top:0.9rem;border-top:1px solid rgba(200,169,81,0.35);display:flex;justify-content:space-around;flex-wrap:wrap;gap:0.75rem;font-size:0.82rem;color:var(--reyog-gold-light);">
              <div>👩‍🏫 <strong>Guru Pamong:</strong> ${s.guruPamong}</div>
              <div>👨‍🏫 <strong>Dosen Pembimbing Lapangan:</strong> ${s.dpl}</div>
              <div>🏫 <strong>Kepala Sekolah Mitra:</strong> ${s.kepalaSekolah}</div>
            </div>
          </div>

          <!-- KOTAK FILOSOFI & SOSOK GURU INSPIRASI -->
          <div class="royal-quote-box">
            <div class="section-kicker" style="margin-bottom:0.4rem;">Pandangan Saya tentang Menjadi Guru</div>
            <p class="royal-quote-text">
              "${s.filosofiMengajar}"
            </p>
            <div class="royal-quote-author">— ${s.nama} —</div>
          </div>
        </div>
      </section>

      <!-- MATA KULIAH TERINTEGRASI -->
      <section class="section-block">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Bekal Perkuliahan PPG (Semester 1 & Semester 2)</span>
            <h2 class="section-title">Mata Kuliah yang Saya Terapkan Selama PPL</h2>
            <p class="section-desc">Perpaduan mata kuliah lanjutan di Semester 2 (PMAL, PSE, Etnopedagogi Kemaduraan, Pendidikan Inklusif, Projek Kepemimpinan & Seminar PPG) serta fondasi mata kuliah Semester 1 yang menjadi acuan saya di UPTD SMPN 1 Burneh.</p>
            <div class="ornament-divider"><span>✦</span></div>
          </div>

          <div class="siklus-cards-grid">
            ${d.mataKuliahTerintegrasi
              .map(
                (mk) => `
              <div class="siklus-nav-card ${mk.semester === "Semester 2" ? "featured-gold" : ""}">
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem;margin-bottom:0.6rem;">
                    <span class="crest-badge" style="margin-bottom:0;">${mk.ikon} ${mk.kode}</span>
                    ${
                      mk.semester
                        ? `<span class="ep-tag ${mk.semester === "Semester 2" ? "ep2" : "ep1"}">${mk.semester}</span>`
                        : ""
                    }
                  </div>
                  <h3 style="font-family:var(--font-serif);font-size:1.05rem;color:var(--reyog-dark);margin-bottom:0.45rem;">${mk.nama}</h3>
                  <p style="font-size:0.84rem;color:var(--text-secondary);">${mk.deskripsi}</p>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </section>

      <!-- HASIL ORIENTASI (LK 1), OBSERVASI (LK 2), & PEMETAAN PROFIL PESERTA DIDIK KELAS VII B -->
      <section class="section-block bg-mint">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Tahap Pengenalan Sekolah & Murid</span>
            <h2 class="section-title">Orientasi Sekolah, Observasi, & Pemetaan Profil Kelas VII B</h2>
            <p class="section-desc">Sebelum mulai mengajar, saya melakukan orientasi manajemen sekolah (LK 1), observasi lingkungan belajar (LK 2), serta memetakan profil belajar 21 murid Kelas VII B.</p>
            <div class="ornament-divider"><span>❖</span></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:1.15rem;margin-bottom:2rem;">
            <!-- LK 1 -->
            <div class="artefak-card">
              <div class="artefak-card-header">
                <div>
                  <span class="artefak-type-badge">📄 Lembar Kerja (LK) 1</span>
                  <h3 class="artefak-card-title">Orientasi & Observasi Manajemen Sekolah</h3>
                </div>
              </div>
              <div class="artefak-card-body">
                <p style="margin-bottom:0.5rem;"><strong>Tanggal:</strong> ${op.ringkasanOrientasi.tanggal}</p>
                <p style="margin-bottom:0.5rem;"><strong>Visi UPTD SMPN 1 Burneh:</strong> <em>"${op.ringkasanOrientasi.visiSekolah}"</em></p>
                <ul style="padding-left:1.15rem;display:grid;gap:0.35rem;font-size:0.83rem;">
                  ${op.ringkasanOrientasi.temuanUtama.map((t) => `<li>${t}</li>`).join("")}
                </ul>
              </div>
              <div class="artefak-card-footer">
                <button class="btn btn-primary" onclick="openMediaModal('LK 1 — Orientasi & Observasi Manajemen Sekolah', '${op.ringkasanOrientasi.pdfPath}', 'pdf')">👁️ Buka PDF LK 1</button>
                <a class="btn btn-outline" href="${op.ringkasanOrientasi.pdfPath}" download>⬇️ Unduh PDF</a>
              </div>
            </div>

            <!-- LK 2 -->
            <div class="artefak-card">
              <div class="artefak-card-header">
                <div>
                  <span class="artefak-type-badge">📄 Lembar Kerja (LK) 2</span>
                  <h3 class="artefak-card-title">Observasi Lingkungan Belajar & Layanan Inklusif</h3>
                </div>
              </div>
              <div class="artefak-card-body">
                <p style="margin-bottom:0.5rem;"><strong>Tanggal:</strong> ${op.ringkasanObservasi.tanggal}</p>
                <ul style="padding-left:1.15rem;display:grid;gap:0.4rem;font-size:0.83rem;">
                  ${op.ringkasanObservasi.temuanUtama.map((t) => `<li>${t}</li>`).join("")}
                </ul>
              </div>
              <div class="artefak-card-footer">
                <button class="btn btn-primary" onclick="openMediaModal('LK 2 — Observasi Lingkungan Belajar', '${op.ringkasanObservasi.pdfPath}', 'pdf')">👁️ Buka PDF LK 2</button>
                <a class="btn btn-outline" href="${op.ringkasanObservasi.pdfPath}" download>⬇️ Unduh PDF</a>
              </div>
            </div>
          </div>

          <!-- PEMETAAN PROFIL KELAS VII B -->
          <div style="background:#fff;border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow-soft);">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.85rem;margin-bottom:1.1rem;padding-bottom:0.85rem;border-bottom:1px solid var(--reyog-mint-border);">
              <div>
                <span class="section-kicker" style="margin-bottom:0.25rem;">Pemetaan Karakteristik Murid</span>
                <h3 style="font-family:var(--font-serif);font-size:1.28rem;color:var(--reyog-dark);">Hasil Pemetaan Profil Belajar Murid Kelas VII B (N = 21)</h3>
                <p style="font-size:0.84rem;color:var(--text-secondary);">${op.profilingKelas7B.responden}</p>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-gold" onclick="openMediaModal('Kartu Profil Belajar — Kelas VII B', '${op.profilingKelas7B.pdfKartu}', 'pdf')">🗂️ Lihat Kartu Profil Belajar 7B (PDF)</button>
                <a class="btn btn-primary" href="${op.profilingKelas7B.docxLaporan}" download>📄 Laporan Analisis Profil Belajar (.docx)</a>
                <a class="btn btn-outline" href="${op.profilingKelas7B.xlsxResponses}" download>📊 Data Respons Angket (.xlsx)</a>
              </div>
            </div>

            <div style="overflow-x:auto;margin-bottom:1.25rem;">
              <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
                <thead>
                  <tr style="background:var(--reyog-dark);color:var(--reyog-gold-light);text-align:left;">
                    <th style="padding:0.65rem 0.85rem;border:1px solid rgba(200,169,81,0.3);">Aspek yang Diamati</th>
                    <th style="padding:0.65rem 0.85rem;border:1px solid rgba(200,169,81,0.3);">Rata-rata (1–4)</th>
                    <th style="padding:0.65rem 0.85rem;border:1px solid rgba(200,169,81,0.3);">SD</th>
                    <th style="padding:0.65rem 0.85rem;border:1px solid rgba(200,169,81,0.3);">% Capaian</th>
                    <th style="padding:0.65rem 0.85rem;border:1px solid rgba(200,169,81,0.3);">Catatan untuk Pembelajaran di Kelas</th>
                  </tr>
                </thead>
                <tbody>
                  ${op.profilingKelas7B.aspekSkor
                    .map(
                      (a, idx) => `
                    <tr style="background:${idx % 2 === 0 ? "#ffffff" : "var(--reyog-mint)"};">
                      <td style="padding:0.55rem 0.85rem;border:1px solid var(--reyog-mint-border);font-weight:700;color:var(--reyog-dark);">${a.nama}</td>
                      <td style="padding:0.55rem 0.85rem;border:1px solid var(--reyog-mint-border);font-weight:700;">${a.mean}</td>
                      <td style="padding:0.55rem 0.85rem;border:1px solid var(--reyog-mint-border);">${a.sd}</td>
                      <td style="padding:0.55rem 0.85rem;border:1px solid var(--reyog-mint-border);color:var(--reyog-teal);font-weight:700;">${a.capaian}</td>
                      <td style="padding:0.55rem 0.85rem;border:1px solid var(--reyog-mint-border);color:var(--text-secondary);">${a.ket}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:0.85rem;">
              ${op.profilingKelas7B.charts
                .map(
                  (c) => `
                <div style="border:1px solid var(--reyog-mint-border);border-radius:8px;padding:0.55rem;background:var(--reyog-white);text-align:center;cursor:pointer;" onclick="openMediaModal('${c.title}', '${c.img}', 'image')">
                  <img src="${c.img}" alt="${c.title}" style="width:100%;height:115px;object-fit:contain;border-radius:6px;background:#fff;" />
                  <div style="font-size:0.75rem;font-weight:700;color:var(--reyog-dark);margin-top:0.35rem;">🔍 ${c.title}</div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- PPL TERBIMBING SEMESTER 2 (PERTEMUAN 1 & 2 + LK 3 REFLEKSI) -->
      <section class="section-block bg-dark-reyog">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Tahap Sebelum Mengajar Mandiri</span>
            <h2 class="section-title">${op.pplTerbimbingSmt2.judul}</h2>
            <p class="section-desc">${op.pplTerbimbingSmt2.deskripsi}</p>
            <div class="ornament-divider"><span>✦</span></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:1.15rem;margin-bottom:1.65rem;">
            ${op.pplTerbimbingSmt2.pertemuanList
              .map(
                (pt) => `
              <div class="timeline-card">
                <div class="timeline-card-title">
                  <span>📘 ${pt.nama}</span>
                  <span class="ep-tag">PPL Terbimbing</span>
                </div>
                <div class="timeline-card-body">
                  <p style="font-size:0.83rem;color:var(--reyog-gold-light);margin-bottom:0.45rem;"><strong>Topik:</strong> ${pt.topik}</p>
                  <p style="font-size:0.78rem;color:rgba(247,250,250,0.8);margin-bottom:0.75rem;">📸 <strong>Folder Dokumentasi:</strong> <code>${pt.folderDokumentasi}/</code></p>
                  <div style="display:grid;gap:0.65rem;">
                    ${pt.artefak
                      .map(
                        (ar) => `
                      <div style="background:rgba(0,22,24,0.6);border:1px solid rgba(200,169,81,0.35);border-radius:8px;padding:0.75rem 0.9rem;display:flex;align-items:center;justify-content:space-between;gap:0.65rem;flex-wrap:wrap;">
                        <div style="flex:1;min-width:170px;">
                          <div style="font-size:0.68rem;color:var(--reyog-gold-light);font-weight:700;text-transform:uppercase;">${ar.tipe}</div>
                          <div style="font-weight:700;font-size:0.86rem;color:#fff;">${ar.judul}</div>
                          <div style="font-size:0.76rem;color:rgba(247,250,250,0.78);margin-top:0.15rem;">${ar.deskripsi}</div>
                        </div>
                        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                          <button class="btn btn-gold" onclick="openMediaModal('${ar.judul}', '${ar.fileUrl}', '${ar.previewType}')">
                            ${ar.previewType === "simulator" ? "🕹️ Coba Simulator" : ar.previewType === "drive-folder" ? "✍️ Lihat Hasil Kerja" : "👁️ Buka Berkas"}
                          </button>
                          ${
                            ar.previewType === "drive-folder"
                              ? `<a class="btn btn-outline" style="background:transparent;color:#fff;border-color:var(--reyog-gold);" href="${ar.fileUrl}" target="_blank" rel="noopener">🔗 Drive ↗</a>`
                              : ""
                          }
                        </div>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                  ${renderPertemuanPhotoGallery(pt.id, pt.nama, true)}
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <!-- VIDEO UTAMA PPL TERBIMBING (GOOGLE DRIVE EMBED) -->
          ${
            op.pplTerbimbingSmt2.videoUtama
              ? `
          <div class="timeline-card" style="max-width:980px;margin:0 auto 1.65rem;">
            <div class="timeline-card-title">
              <span>🎬 ${op.pplTerbimbingSmt2.videoUtama.judul}</span>
              <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
                <button class="btn btn-gold" onclick="openMediaModal('${op.pplTerbimbingSmt2.videoUtama.judul}', '${op.pplTerbimbingSmt2.videoUtama.url}', 'video')">▶️ Layar Lebar</button>
                <a class="btn btn-outline" style="background:transparent;color:#fff;border-color:var(--reyog-gold);" href="${op.pplTerbimbingSmt2.videoUtama.url}" target="_blank" rel="noopener">🔗 Buka di Google Drive ↗</a>
              </div>
            </div>
            <div class="timeline-card-body">
              <p style="margin-bottom:0.85rem;">${op.pplTerbimbingSmt2.videoUtama.deskripsi}</p>
              <div style="width:100%;height:420px;border-radius:10px;overflow:hidden;border:2px solid var(--reyog-gold);background:#001213;">
                <iframe src="${op.pplTerbimbingSmt2.videoUtama.embedUrl}" style="width:100%;height:100%;border:none;" allow="autoplay; fullscreen" title="${op.pplTerbimbingSmt2.videoUtama.judul}"></iframe>
              </div>
            </div>
          </div>
          `
              : ""
          }

          <!-- RINGKASAN LK 3 REFLEKSI PPL TERBIMBING -->
          <div class="timeline-card" style="max-width:980px;margin:0 auto;">
            <div class="timeline-card-title">
              <span>📝 Refleksi Praktik Mengajar Terbimbing (LK 3 — Disahkan ${op.pplTerbimbingSmt2.tanggalPengesahan})</span>
              <button class="btn btn-gold" onclick="openMediaModal('LK 3 — Refleksi Praktik Mengajar Terbimbing', '${op.pplTerbimbingSmt2.refleksiLK3.pdfPath}', 'pdf')">👁️ Buka PDF LK 3</button>
            </div>
            <div class="timeline-card-body">
              <div class="analysis-aspect-grid">
                <div class="aspect-pill-box">
                  <div class="aspect-label">✅ Hal yang Sudah Berjalan Baik</div>
                  <div class="aspect-text">${op.pplTerbimbingSmt2.refleksiLK3.keberhasilan}</div>
                </div>
                <div class="aspect-pill-box">
                  <div class="aspect-label">⚠️ Kendala yang Ditemukan</div>
                  <div class="aspect-text">${op.pplTerbimbingSmt2.refleksiLK3.kendala}</div>
                </div>
                <div class="aspect-pill-box full-span">
                  <div class="aspect-label">💡 Masukan Guru Pamong & Perbaikan ke Siklus 1 Mandiri</div>
                  <div class="aspect-text">${op.pplTerbimbingSmt2.refleksiLK3.umpanBalikGP}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="page-turn-nav" style="border-top-color:rgba(200,169,81,0.3);">
            <button class="btn btn-outline" style="background:transparent;color:#fff;border-color:var(--reyog-gold);" onclick="navigateTo('beranda')"><< Beranda</button>
            <button class="btn btn-gold" onclick="navigateTo('siklus-1')">Siklus 1 (E-Portofolio 1) >></button>
          </div>
        </div>
      </section>
    `;
  }

  // --------------------------------------------------------------------------
  // 3. HALAMAN SIKLUS 1 S.D. SIKLUS 4 (DENGAN 3 SUB-HALAMAN)
  // --------------------------------------------------------------------------
  function renderHalamanSiklus(siklusId) {
    const sk = getMergedSiklusData(siklusId);
    if (!sk) return "";
    const activeTab = currentSiklusSubtab[siklusId] || "perangkat";

    const prevPageMap = {
      "siklus-1": { id: "profil", label: "Profil & Pra-Siklus" },
      "siklus-2": { id: "siklus-1", label: "Siklus 1" },
      "siklus-3": { id: "siklus-2", label: "Siklus 2" },
      "siklus-4": { id: "siklus-3", label: "Siklus 3" }
    };
    const nextPageMap = {
      "siklus-1": { id: "siklus-2", label: "Siklus 2" },
      "siklus-2": { id: "siklus-3", label: "Siklus 3" },
      "siklus-3": { id: "siklus-4", label: "Siklus 4" },
      "siklus-4": { id: "model-guru", label: "Model Guru & RTL" }
    };

    const prevInfo = prevPageMap[siklusId];
    const nextInfo = nextPageMap[siklusId];

    return `
      <!-- HEADER SIKLUS -->
      <header class="hero-banner" style="padding:2.2rem 1.25rem 1.9rem;">
        <div class="hero-inner">
          <div style="display:flex;align-items:center;justify-content:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.65rem;">
            <span class="crest-badge" style="margin-bottom:0;font-size:0.78rem;">🦚 ${sk.badgeText} — ${sk.rentangPertemuan}</span>
            <span class="hero-eyebrow" style="margin-bottom:0;">${sk.kategoriPortofolio}</span>
          </div>
          <h1 class="hero-title" style="font-size:clamp(1.5rem,2.8vw,2.25rem);">${sk.topikUtama}</h1>
          <p style="max-width:820px;margin:0.5rem auto 0;color:rgba(247,250,250,0.9);font-size:0.92rem;">
            ${sk.ringkasanEksekutif}
          </p>
        </div>
      </header>

      <section class="section-block" style="padding-top:1.85rem;">
        <div class="container">
          <!-- 3 SUB-TABS SIKLUS -->
          <div class="siklus-subtabs">
            <button class="siklus-subtab-btn ${activeTab === "perangkat" ? "active" : ""}" onclick="switchSiklusSubtab('${sk.id}', 'perangkat')">
              📂 1. Rencana & Perangkat Siklus ${sk.nomor}
            </button>
            <button class="siklus-subtab-btn ${activeTab === "analisis" ? "active" : ""}" onclick="switchSiklusSubtab('${sk.id}', 'analisis')">
              🔬 2. Analisis 6 Komponen & Kajian Teori ${sk.nomor}
            </button>
            <button class="siklus-subtab-btn ${activeTab === "refleksi" ? "active" : ""}" onclick="switchSiklusSubtab('${sk.id}', 'refleksi')">
              📝 3. Refleksi LK 4.${sk.nomor}
            </button>
          </div>

          <!-- ISI SUB-HALAMAN -->
          ${
            activeTab === "perangkat"
              ? renderSiklusPerangkatTab(sk)
              : activeTab === "analisis"
              ? renderSiklusAnalisisTab(sk)
              : renderSiklusRefleksiTab(sk)
          }

          <!-- NAVIGASI ANTAR SUB-HALAMAN & SIKLUS -->
          <div class="page-turn-nav">
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <button class="btn btn-outline" onclick="navigateTo('${prevInfo.id}')"><< ${prevInfo.label}</button>
              ${
                activeTab === "analisis"
                  ? `<button class="btn btn-primary" onclick="switchSiklusSubtab('${sk.id}', 'perangkat')"><< Rencana & Perangkat ${sk.nomor}</button>`
                  : activeTab === "refleksi"
                  ? `<button class="btn btn-primary" onclick="switchSiklusSubtab('${sk.id}', 'analisis')"><< Analisis Artefak ${sk.nomor}</button>`
                  : ""
              }
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              ${
                activeTab === "perangkat"
                  ? `<button class="btn btn-gold" onclick="switchSiklusSubtab('${sk.id}', 'analisis')">Analisis Artefak ${sk.nomor} >></button>`
                  : activeTab === "analisis"
                  ? `<button class="btn btn-gold" onclick="switchSiklusSubtab('${sk.id}', 'refleksi')">Refleksi LK 4.${sk.nomor} >></button>`
                  : `<button class="btn btn-gold" onclick="navigateTo('${nextInfo.id}')">${nextInfo.label} >></button>`
              }
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // SUB-TAB 1: RENCANA, PERANGKAT, SIMULATOR, & VIDEO PELAKSANAAN
  function renderSiklusPerangkatTab(sk) {
    const selectedPert = currentPertemuanFilter[sk.id] || "all";
    const pertFiltered =
      selectedPert === "all"
        ? sk.pertemuanList
        : sk.pertemuanList.filter((p) => p.id === selectedPert);

    return `
      <!-- HIGHLIGHT PRODUK TERBAIK SIKLUS -->
      <div style="background:linear-gradient(135deg,#002b2d 0%,#00494b 100%);border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.35rem 1.65rem;color:#fff;margin-bottom:1.75rem;box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
        <div style="flex:1;min-width:240px;">
          <div style="display:inline-flex;align-items:center;gap:0.4rem;background:var(--grad-gold);color:var(--reyog-night);font-weight:800;font-size:0.7rem;padding:0.2rem 0.7rem;border-radius:99px;margin-bottom:0.5rem;">
            ⭐ PERANGKAT PEMBELAJARAN PILIHAN DI SIKLUS ${sk.nomor}
          </div>
          <h3 style="font-family:var(--font-serif);font-size:1.18rem;color:var(--reyog-gold-bright);margin-bottom:0.35rem;">
            ${sk.produkTerbaikHighlight.judul}
          </h3>
          <p style="font-size:0.85rem;color:rgba(247,250,250,0.9);">
            ${sk.produkTerbaikHighlight.alasanPemilihan}
          </p>
        </div>
        <button class="btn btn-gold" onclick="openArtefakManager('${sk.id}')">➕ Tambah Berkas / Dokumentasi Siklus ${sk.nomor}</button>
      </div>

      <!-- FILTER PERTEMUAN DALAM SIKLUS -->
      <div class="pertemuan-selector">
        <button class="pertemuan-pill ${selectedPert === "all" ? "active" : ""}" onclick="setPertemuanFilter('${sk.id}', 'all')">
          📚 Semua Pertemuan (${sk.rentangPertemuan})
        </button>
        ${sk.pertemuanList
          .map(
            (pt) => `
          <button class="pertemuan-pill ${selectedPert === pt.id ? "active" : ""}" onclick="setPertemuanFilter('${sk.id}', '${pt.id}')">
            <span>Pertemuan ${pt.nomorPertemuan}</span>
            ${pt.isBestProduct ? `<span class="best-star">★ Pilihan</span>` : ""}
          </button>
        `
          )
          .join("")}
      </div>

      <!-- DAFTAR PERTEMUAN & ARTEFAK PERANGKAT -->
      ${pertFiltered
        .map(
          (pt) => `
        <div style="margin-bottom:2.25rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.65rem;margin-bottom:1rem;padding-bottom:0.65rem;border-bottom:2px solid var(--reyog-mint-border);">
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <h3 style="font-family:var(--font-serif);font-size:1.22rem;color:var(--reyog-dark);">${pt.judul}</h3>
                ${
                  pt.isBestProduct
                    ? `<span style="background:var(--grad-gold);color:var(--reyog-night);font-size:0.68rem;font-weight:800;padding:0.16rem 0.6rem;border-radius:99px;">⭐ Perangkat Pilihan</span>`
                    : ""
                }
              </div>
              <p style="font-size:0.84rem;color:var(--text-secondary);margin-top:0.15rem;">${pt.subtopik}</p>
              ${
                pt.folderDokumentasi
                  ? `<div style="margin-top:0.35rem;font-size:0.78rem;color:var(--reyog-teal);font-weight:600;">
                      📸 Folder Dokumentasi Pertemuan Ini: <code>${pt.folderDokumentasi}/</code>
                    </div>`
                  : ""
              }
            </div>
            <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
              <button class="btn btn-outline" onclick="openPpmSummaryModal('${sk.id}', '${pt.id}')">📖 Ringkasan PPM</button>
              <button class="btn btn-primary" onclick="openArtefakManager('${sk.id}', '${pt.id}')">📸 + Foto/Berkas Pertemuan ${pt.nomorPertemuan}</button>
            </div>
          </div>

          <div class="artefak-grid">
            ${pt.artefakItems
              .map(
                (item) => `
              <div class="artefak-card">
                <div class="artefak-card-header">
                  <div>
                    <span class="artefak-type-badge">${getArtefakIcon(item.previewType)} ${item.tipe}</span>
                    <h4 class="artefak-card-title">${item.judul}</h4>
                  </div>
                </div>
                <div class="artefak-card-body">
                  <p>${item.deskripsi}</p>
                </div>
                <div class="artefak-card-footer">
                  ${renderArtefakActionButtons(sk.id, pt.id, item)}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          ${renderPertemuanPhotoGallery(pt.id, pt.judul, false)}
        </div>
      `
        )
        .join("")}

      <!-- BAGIAN VIDEO PELAKSANAAN PRAKTIK MENGAJAR MANDIRI & NON-MENGAJAR -->
      <div style="background:var(--reyog-mint);border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.5rem;margin-top:0.75rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.85rem;margin-bottom:1.15rem;">
          <div>
            <span class="section-kicker" style="margin-bottom:0.25rem;">Dokumentasi Video</span>
            <h3 style="font-family:var(--font-serif);font-size:1.25rem;color:var(--reyog-dark);">Video Praktik Mengajar Mandiri & Kegiatan Non-Mengajar — Siklus ${sk.nomor}</h3>
            <p style="font-size:0.84rem;color:var(--text-secondary);">Video utama pelaksanaan pembelajaran di Siklus ${sk.nomor} (dapat langsung diputar di bawah ini) beserta dokumentasi video pendek dan kegiatan non-mengajar.</p>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            ${
              sk.refleksiLK4.pdfDokumentasi
                ? `<button class="btn btn-primary" onclick="openMediaModal('Lembar Tautan Video — Siklus ${sk.nomor}', '${sk.refleksiLK4.pdfDokumentasi}', 'pdf')">📄 Lembar Tautan Video (PDF)</button>`
                : ""
            }
            <button class="btn btn-gold" onclick="navigateTo('lampiran')">📱 Lihat 6 Video Kegiatan Non-Mengajar →</button>
          </div>
        </div>

        ${
          sk.videoUtamaSiklus
            ? `
        <div style="background:linear-gradient(135deg,#002628 0%,#004244 100%);border:2px solid var(--reyog-gold);border-radius:12px;padding:1.25rem;margin-bottom:1.35rem;color:#fff;box-shadow:var(--shadow-soft);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.8rem;">
            <div>
              <span class="crest-badge" style="margin-bottom:0.35rem;">🎬 VIDEO UTAMA SIKLUS ${sk.nomor} (${sk.videoUtamaSiklus.namaFile})</span>
              <h4 style="font-family:var(--font-serif);font-size:1.12rem;color:var(--reyog-gold-bright);">${sk.videoUtamaSiklus.judul}</h4>
              <p style="font-size:0.83rem;color:rgba(247,250,250,0.88);margin-top:0.2rem;">${sk.videoUtamaSiklus.deskripsi}</p>
            </div>
            <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
              <button class="btn btn-gold" onclick="openMediaModal('${sk.videoUtamaSiklus.judul}', '${sk.videoUtamaSiklus.url}', 'video')">▶️ Buka Layar Lebar</button>
              <a class="btn btn-outline" style="background:transparent;color:#fff;border-color:var(--reyog-gold);" href="${sk.videoUtamaSiklus.url}" target="_blank" rel="noopener">🔗 Buka di Google Drive ↗</a>
            </div>
          </div>
          <div style="width:100%;height:430px;border-radius:10px;overflow:hidden;border:1.5px solid var(--reyog-gold);background:#001213;">
            <iframe src="${sk.videoUtamaSiklus.embedUrl}" style="width:100%;height:100%;border:none;" allow="autoplay; fullscreen" title="${sk.videoUtamaSiklus.judul}"></iframe>
          </div>
        </div>
        `
            : ""
        }

        <div class="artefak-grid">
          ${sk.videoPraktikMengajar
            .map(
              (v) => `
            <div class="artefak-card">
              <div class="artefak-card-header">
                <div>
                  <span class="artefak-type-badge">🎥 ${v.jenis}</span>
                  <h4 class="artefak-card-title">${v.judul}</h4>
                </div>
              </div>
              <div class="artefak-card-body">
                <p>${v.deskripsi}</p>
              </div>
              <div class="artefak-card-footer">
                ${
                  v.localVideo
                    ? `<button class="btn btn-gold" onclick="openMediaModal('${v.judul}', '${v.localVideo}', 'video')">▶️ Putar Video</button>`
                    : ""
                }
                ${
                  v.url
                    ? `<a class="btn btn-primary" href="${v.url}" target="_blank" rel="noopener">🔗 Buka Video ↗</a>`
                    : `<button class="btn btn-outline" onclick="openArtefakManager('${sk.id}')">➕ Tambahkan Tautan Video</button>`
                }
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderPertemuanPhotoGallery(pertId, pertTitle, isDark) {
    const galeriMap = window.PORTFOLIO_DATA.galeriDokumentasi || {};
    const photos = galeriMap[pertId] || [];
    if (!photos || photos.length === 0) return "";

    const bgStyle = isDark
      ? "background:rgba(0,22,24,0.65);border:1px solid rgba(200,169,81,0.4);"
      : "background:var(--reyog-mint);border:1.5px solid var(--reyog-mint-border);";
    const titleColor = isDark ? "var(--reyog-gold-light)" : "var(--reyog-dark)";

    return `
      <div style="${bgStyle}border-radius:10px;padding:1rem 1.15rem;margin-top:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
          <div style="font-weight:700;font-size:0.88rem;color:${titleColor};">
            📸 Galeri Dokumentasi Foto — ${pertTitle} (${photos.length} Foto)
          </div>
          <span style="font-size:0.75rem;color:${isDark ? "rgba(247,250,250,0.75)" : "var(--text-muted)"};">
            Klik foto untuk memperbesar
          </span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:0.65rem;">
          ${photos
            .map(
              (imgPath, idx) => `
            <div style="border-radius:8px;overflow:hidden;border:1.5px solid var(--reyog-gold);cursor:pointer;background:#00181a;height:96px;position:relative;" onclick="openMediaModal('Dokumentasi ${pertTitle} — Foto ${idx + 1}', '${imgPath}', 'image')">
              <img src="${imgPath}" alt="Dokumentasi ${pertTitle} (${idx + 1})" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'" />
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function getArtefakIcon(previewType) {
    switch (previewType) {
      case "pdf":
        return "📕";
      case "simulator":
        return "🕹️";
      case "video":
        return "🎬";
      case "image":
        return "🖼️";
      case "ppm-summary":
      case "docx":
        return "📘";
      case "drive-folder":
        return "✍️";
      case "upload-trigger":
        return "➕";
      default:
        return "🔗";
    }
  }

  function renderArtefakActionButtons(siklusId, pertId, item) {
    if (item.previewType === "upload-trigger") {
      return `<button class="btn btn-gold" onclick="openArtefakManager('${siklusId}', '${pertId}')">➕ Tambah Berkas / Tautan Pertemuan 13</button>`;
    }
    let btns = "";
    if (item.previewType === "ppm-summary") {
      btns += `<button class="btn btn-gold" onclick="openPpmSummaryModal('${siklusId}', '${item.pertemuanRef || pertId}')">👁️ Ringkasan Isi PPM</button>`;
      btns += `<a class="btn btn-outline" href="${item.fileUrl}" download>⬇️ Unduh Berkas (.docx)</a>`;
    } else if (item.previewType === "simulator") {
      btns += `<button class="btn btn-gold" onclick="openMediaModal('${item.judul}', '${item.fileUrl}', 'simulator')">🕹️ Coba Simulator</button>`;
      btns += `<a class="btn btn-outline" href="${item.fileUrl}" target="_blank" rel="noopener">↗ Layar Penuh</a>`;
    } else if (item.previewType === "drive-folder") {
      btns += `<button class="btn btn-gold" onclick="openMediaModal('${item.judul}', '${item.fileUrl}', 'drive-folder')">✍️ Pratinjau Hasil Kerja</button>`;
      btns += `<a class="btn btn-primary" href="${item.fileUrl}" target="_blank" rel="noopener">🔗 Buka Google Drive ↗</a>`;
    } else if (item.previewType === "pdf") {
      btns += `<button class="btn btn-primary" onclick="openMediaModal('${item.judul}', '${item.fileUrl}', 'pdf')">👁️ Lihat PDF</button>`;
      btns += `<a class="btn btn-outline" href="${item.fileUrl}" download>⬇️ Unduh</a>`;
    } else if (item.previewType === "video") {
      btns += `<button class="btn btn-gold" onclick="openMediaModal('${item.judul}', '${item.fileUrl}', 'video')">▶️ Putar Video</button>`;
    } else if (item.previewType === "image") {
      btns += `<button class="btn btn-primary" onclick="openMediaModal('${item.judul}', '${item.fileUrl}', 'image')">🖼️ Lihat Gambar</button>`;
      btns += `<a class="btn btn-outline" href="${item.fileUrl}" download>⬇️ Unduh</a>`;
    } else if (item.previewType === "docx") {
      btns += `<a class="btn btn-primary" href="${item.fileUrl}" download>⬇️ Unduh Berkas Asli</a>`;
    } else {
      btns += `<a class="btn btn-primary" href="${item.fileUrl}" target="_blank" rel="noopener">🔗 Buka Tautan ↗</a>`;
    }

    if (item.isCustom && item.customId) {
      btns += `<button class="btn btn-outline" style="border-color:#c0392b;color:#c0392b;" onclick="deleteCustomArtefak('${item.customId}')">🗑️ Hapus</button>`;
    }
    return btns;
  }

  // SUB-TAB 2: ANALISIS ARTEFAK (KAJIAN TEORI + 6 KOMPONEN WAJIB + POSTER ANALISIS PRODUK)
  function renderSiklusAnalisisTab(sk) {
    return `
      <!-- POSTER 1: KAJIAN TEORI -->
      <div class="poster-board">
        <div class="poster-header">
          <div class="hero-eyebrow" style="margin-bottom:0.5rem;">🦚 KAJIAN TEORI SIKLUS ${sk.nomor}</div>
          <h2 class="poster-title">Kajian Teori</h2>
          <p class="poster-subtitle">Kaitan Pengalaman Mengajar dengan Mata Kuliah PPG | ${sk.badgeText} (${sk.rentangPertemuan})</p>
          <div class="ornament-divider"><span>❖</span></div>
        </div>

        <div class="timeline-vertical">
          ${sk.kajianTeori
            .map(
              (kt) => `
            <div class="timeline-item">
              <div class="timeline-node">${kt.nomor}</div>
              <div class="timeline-card">
                <div class="timeline-card-title">
                  <span>${kt.mataKuliah}</span>
                </div>
                <div class="timeline-card-body">
                  <p>${kt.uraian}</p>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="poster-references">
          <h4>Daftar Pustaka (Format APA)</h4>
          <ul>
            ${sk.referensiAPA.map((ref) => `<li>${ref}</li>`).join("")}
          </ul>
        </div>
      </div>

      <!-- POSTER 2: ANALISIS 6 KOMPONEN PEMBELAJARAN -->
      <div class="poster-board">
        <div class="poster-header">
          <div class="hero-eyebrow" style="margin-bottom:0.5rem;">🔬 ANALISIS TIAP KOMPONEN</div>
          <h2 class="poster-title">Analisis 6 Komponen Pembelajaran | Siklus ${sk.nomor}</h2>
          <p class="poster-subtitle">Uraian Konteks, Tujuan, Hal yang Sudah Baik, Kekurangan, dan Rencana Perbaikan pada Siklus ${sk.nomor}</p>
          <div class="ornament-divider"><span>✦</span></div>
        </div>

        <div class="timeline-vertical">
          ${sk.analisisEnamKomponen
            .map(
              (ak) => `
            <div class="timeline-item">
              <div class="timeline-node">${ak.nomor}</div>
              <div class="timeline-card">
                <div class="timeline-card-title">
                  <span>${ak.komponen}</span>
                  <span style="font-size:1.2rem;">${ak.ikon}</span>
                </div>
                <div class="timeline-card-body">
                  <div class="analysis-aspect-grid">
                    <div class="aspect-pill-box">
                      <div class="aspect-label">📍 Latar Belakang / Konteks</div>
                      <div class="aspect-text">${ak.konteks}</div>
                    </div>
                    <div class="aspect-pill-box">
                      <div class="aspect-label">🎯 Tujuan</div>
                      <div class="aspect-text">${ak.tujuan}</div>
                    </div>
                    <div class="aspect-pill-box">
                      <div class="aspect-label">✅ Hal yang Sudah Berjalan Baik (Kelebihan)</div>
                      <div class="aspect-text">${ak.kelebihan}</div>
                    </div>
                    <div class="aspect-pill-box">
                      <div class="aspect-label">⚠️ Kendala / Kekurangan</div>
                      <div class="aspect-text">${ak.kekurangan}</div>
                    </div>
                    <div class="aspect-pill-box full-span">
                      <div class="aspect-label">💡 Kaitan Teori & Langkah Perbaikan</div>
                      <div class="aspect-text">${ak.solusiTeori}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- POSTER 3: ANALISIS PRODUK PEMBELAJARAN 4 POIN (SESUAI FORMAT SEMESTER 1) -->
      <div class="poster-board" style="margin-bottom:0.75rem;">
        <div class="poster-header">
          <div class="hero-eyebrow" style="margin-bottom:0.5rem;">📊 RINGKASAN EVALUASI SIKLUS ${sk.nomor}</div>
          <h2 class="poster-title">Analisis Produk Pembelajaran | Siklus ${sk.nomor}</h2>
          <p class="poster-subtitle">${sk.topikUtama}</p>
          <div class="ornament-divider"><span>❖</span></div>
        </div>

        <div class="timeline-vertical">
          ${sk.analisisProdukPoster
            .map(
              (ap) => `
            <div class="timeline-item">
              <div class="timeline-node">${ap.nomor}</div>
              <div class="timeline-card">
                <div class="timeline-card-title">
                  <span>${ap.judul}</span>
                </div>
                <div class="timeline-card-body">
                  <p>${ap.isi}</p>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  // SUB-TAB 3: REFLEKSI (LK 4)
  function renderSiklusRefleksiTab(sk) {
    const r = sk.refleksiLK4;
    const s = window.PORTFOLIO_DATA.student;

    return `
      <div class="poster-board" style="margin-bottom:1.65rem;">
        <div class="poster-header">
          <div class="hero-eyebrow" style="margin-bottom:0.5rem;">📝 LEMBAR KERJA REFLEKSI (LK 4.${sk.nomor})</div>
          <h2 class="poster-title">Refleksi Praktik Pembelajaran Mandiri — Siklus ${sk.nomor}</h2>
          <p class="poster-subtitle">Disahkan pada ${r.tanggalPengesahan} oleh Guru Pamong (${s.guruPamong}) & DPL (${s.dpl})</p>
          <div style="margin-top:1rem;display:flex;justify-content:center;gap:0.65rem;flex-wrap:wrap;">
            <button class="btn btn-gold" onclick="openMediaModal('LK 4.${sk.nomor} — Refleksi Siklus ${sk.nomor}', '${r.pdfRefleksi}', 'pdf')">
              👁️ Buka Dokumen Asli LK 4.${sk.nomor} (PDF)
            </button>
            <a class="btn btn-outline" style="background:transparent;color:#fff;border-color:var(--reyog-gold);" href="${r.pdfRefleksi}" download>
              ⬇️ Unduh PDF LK 4.${sk.nomor}
            </a>
            <button class="btn btn-primary" onclick="openMediaModal('Instrumen Penilaian Guru Pamong (Lampiran 7 & 8)', 'https://drive.google.com/drive/folders/1GW8pHwxEDo0grFXowpb6IZavRUB-vbrs?usp=sharing', 'drive-folder')">
              📋 Penilaian GP (Lampiran 7 & 8)
            </button>
          </div>
          <div style="margin-top:0.75rem;text-align:center;">
            <span style="display:inline-block;font-size:0.78rem;color:var(--reyog-gold-light);background:rgba(0,25,27,0.7);padding:0.3rem 0.85rem;border-radius:20px;border:1px solid rgba(200,169,81,0.35);">
              ℹ️ Penilaian Guru Pamong (Lampiran 7 & 8) berlaku komprehensif untuk seluruh siklus (Siklus 1 s.d. 4)
            </span>
          </div>
        </div>

        <!-- BAGIAN A: REFLEKSI KEGIATAN PRAKTIK PEMBELAJARAN MANDIRI -->
        <div style="max-width:980px;margin:0 auto 1.65rem;">
          <h3 style="font-family:var(--font-serif);color:var(--reyog-gold-bright);font-size:1.18rem;margin-bottom:0.85rem;padding-bottom:0.45rem;border-bottom:1px solid rgba(200,169,81,0.35);">
            A. Refleksi Kegiatan Praktik Pembelajaran Mandiri
          </h3>
          <div style="display:grid;gap:0.95rem;">
            ${r.poinA
              .map(
                (item) => `
              <div class="timeline-card">
                <div class="timeline-card-title" style="font-size:0.98rem;">${item.tanya}</div>
                <div class="timeline-card-body"><p>${item.jawab}</p></div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- BAGIAN B: REFLEKSI PENGALAMAN BELAJAR & UMPAN BALIK GURU PAMONG -->
        <div style="max-width:980px;margin:0 auto;">
          <h3 style="font-family:var(--font-serif);color:var(--reyog-gold-bright);font-size:1.18rem;margin-bottom:0.85rem;padding-bottom:0.45rem;border-bottom:1px solid rgba(200,169,81,0.35);">
            B. Umpan Balik Guru Pamong / DPL & Rencana Perubahan
          </h3>
          <div style="display:grid;gap:0.95rem;">
            ${r.poinB
              .map(
                (item) => `
              <div class="timeline-card">
                <div class="timeline-card-title" style="font-size:0.98rem;">${item.tanya}</div>
                <div class="timeline-card-body"><p>${item.jawab}</p></div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>

      <!-- EMBED LANGSUNG PDF LK 4 DI HALAMAN -->
      <div style="background:#fff;border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.25rem;box-shadow:var(--shadow-soft);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.85rem;margin-bottom:0.85rem;">
          <h3 style="font-family:var(--font-serif);font-size:1.12rem;color:var(--reyog-dark);">📄 Tampilan Dokumen Asli LK 4.${sk.nomor} (Bertanda Tangan)</h3>
          <a class="btn btn-primary" href="${r.pdfRefleksi}" target="_blank" rel="noopener">↗ Buka PDF di Tab Baru</a>
        </div>
        <div style="width:100%;height:500px;border:1px solid var(--reyog-mint-border);border-radius:8px;overflow:hidden;">
          <iframe src="${r.pdfRefleksi}" style="width:100%;height:100%;border:none;" title="LK 4 Refleksi Siklus ${sk.nomor}"></iframe>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 4. HALAMAN MODEL GURU YANG DITUJU & REFLEKSI AKHIR
  // --------------------------------------------------------------------------
  function renderModelGuruDanRefleksiAkhir() {
    const mg = window.PORTFOLIO_DATA.modelGuruDanRefleksiAkhir;

    return `
      <header class="hero-banner" style="padding:2.2rem 1.25rem 1.9rem;">
        <div class="hero-inner">
          <div class="hero-eyebrow">🦚 SOSOK GURU YANG INGIN SAYA BANGUN & REFLEKSI AKHIR</div>
          <h1 class="hero-title" style="font-size:clamp(1.55rem,3vw,2.35rem);">Model Guru yang Dituju & Rencana Tindak Lanjut</h1>
          <p class="hero-subtitle">Harapan Saya sebagai Calon Guru IPA, Evaluasi Kelebihan & Kekurangan Diri, serta Langkah Perbaikan ke Depan</p>
        </div>
      </header>

      <!-- EMPAT KARAKTER YANG INGIN DIWUJUDKAN -->
      <section class="section-block bg-parchment">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Sosok Guru Impian</span>
            <h2 class="section-title">Karakter Guru yang Ingin Saya Wujudkan</h2>
            <p class="section-desc">Empat sifat utama yang terus saya pelajari dan bangun selama mendampingi murid-murid di UPTD SMPN 1 Burneh.</p>
            <div class="ornament-divider"><span>❖</span></div>
          </div>

          <div class="karakter-grid">
            ${mg.karakterEmpat
              .map(
                (k) => `
              <div class="karakter-card ${k.varian}">
                <div class="karakter-icon-circle">${k.ikon}</div>
                <h3>${k.judul}</h3>
                <p>${k.deskripsi}</p>
              </div>
            `
              )
              .join("")}
          </div>

          <!-- DOKUMENTASI FOTO MENGAJAR DI KELAS -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1.25rem;margin-top:2rem;">
            <div style="border:2.5px solid var(--reyog-gold);border-radius:var(--radius-md);overflow:hidden;background:var(--reyog-dark);box-shadow:var(--shadow-card);">
              <img src="assets/img/foto_mengajar_ifp.png" alt="Mengajar dengan IFP" style="width:100%;height:230px;object-fit:cover;display:block;" />
              <div style="padding:0.75rem 1rem;color:var(--reyog-gold-light);font-size:0.82rem;font-weight:600;text-align:center;">
                Mendampingi Diskusi & Kuis Interaktif Menggunakan Layar IFP di UPTD SMPN 1 Burneh
              </div>
            </div>
            <div style="border:2.5px solid var(--reyog-gold);border-radius:var(--radius-md);overflow:hidden;background:var(--reyog-dark);box-shadow:var(--shadow-card);">
              <img src="assets/img/foto_praktikum_siswa.png" alt="Pendampingan Percobaan Siswa" style="width:100%;height:230px;object-fit:cover;display:block;" />
              <div style="padding:0.75rem 1rem;color:var(--reyog-gold-light);font-size:0.82rem;font-weight:600;text-align:center;">
                Berkeliling Mendampingi Kelompok Murid Saat Melakukan Percobaan dan Mengisi LKM
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- EMPAT KOMPETENSI YANG INGIN DIBANGUN -->
      <section class="section-block">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Empat Kompetensi Guru</span>
            <h2 class="section-title">Kompetensi yang Terus Saya Bangun</h2>
            <div class="ornament-divider"><span>✦</span></div>
          </div>

          <div class="kompetensi-grid">
            ${mg.kompetensiEmpat
              .map(
                (kp) => `
              <div class="kompetensi-card ${kp.varian}">
                <h3>${kp.judul}</h3>
                <p style="font-size:0.9rem;line-height:1.65;color:rgba(255,255,255,0.93);">${kp.deskripsi}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </section>

      <!-- PERKEMBANGAN DARI PRA-SIKLUS KE SIKLUS 4 -->
      <section class="section-block bg-dark-reyog">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Catatan Perkembangan</span>
            <h2 class="section-title">Perjalanan Belajar Saya dari Pra-Siklus sampai Siklus 4</h2>
            <p class="section-desc">Ringkasan tentang apa yang saya pelajari dan perbaiki dari satu siklus ke siklus berikutnya selama PPL.</p>
            <div class="ornament-divider"><span>❖</span></div>
          </div>

          <div class="timeline-vertical">
            ${mg.evolusiLintasSiklus
              .map(
                (ev, idx) => `
              <div class="timeline-item">
                <div class="timeline-node">${idx + 1}</div>
                <div class="timeline-card">
                  <div class="timeline-card-title">
                    <span>${ev.tahap}</span>
                    <span class="ep-tag" style="background:rgba(200,169,81,0.2);color:var(--reyog-gold-bright);border-color:var(--reyog-gold);">${ev.fokus}</span>
                  </div>
                  <div class="timeline-card-body">
                    <p>${ev.capaian}</p>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </section>

      <!-- REFLEKSI AKHIR: KELEBIHAN, KEKURANGAN, & RENCANA TINDAK LANJUT -->
      <section class="section-block bg-mint">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Refleksi Akhir Keseluruhan</span>
            <h2 class="section-title">Evaluasi Diri (Kelebihan & Kekurangan) serta Rencana Tindak Lanjut</h2>
            <p class="section-desc">Catatan jujur mengenai hal-hal yang sudah cukup berhasil saya lakukan, hal-hal yang masih kurang, dan rencana perbaikan saya ke depannya.</p>
            <div class="ornament-divider"><span>✦</span></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1.25rem;margin-bottom:2rem;">
            <!-- KELEBIHAN -->
            <div class="artefak-card">
              <div class="artefak-card-header" style="background:linear-gradient(135deg,#004d4f,#006d6f);">
                <div>
                  <span class="artefak-type-badge">✅ Hal yang Sudah Cukup Baik</span>
                  <h3 class="artefak-card-title">Kelebihan Selama Praktik Mengajar</h3>
                </div>
              </div>
              <div class="artefak-card-body">
                <ul style="padding-left:1.15rem;display:grid;gap:0.65rem;font-size:0.88rem;color:var(--text-primary);">
                  ${mg.refleksiAkhirMendalam.kekuatan.map((item) => `<li>${item}</li>`).join("")}
                </ul>
              </div>
            </div>

            <!-- KEKURANGAN -->
            <div class="artefak-card">
              <div class="artefak-card-header" style="background:linear-gradient(135deg,#5a3e12,#8c6421);">
                <div>
                  <span class="artefak-type-badge">⚠️ Hal yang Masih Perlu Diperbaiki</span>
                  <h3 class="artefak-card-title">Kekurangan / Kendala yang Saya Rasakan</h3>
                </div>
              </div>
              <div class="artefak-card-body">
                <ul style="padding-left:1.15rem;display:grid;gap:0.65rem;font-size:0.88rem;color:var(--text-primary);">
                  ${mg.refleksiAkhirMendalam.kelemahan.map((item) => `<li>${item}</li>`).join("")}
                </ul>
              </div>
            </div>
          </div>

          <!-- RENCANA TINDAK LANJUT (RTL) -->
          <div style="background:#fff;border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.75rem;box-shadow:var(--shadow-card);">
            <div style="text-align:center;margin-bottom:1.35rem;">
              <span class="section-kicker">Langkah Perbaikan ke Depan</span>
              <h3 style="font-family:var(--font-serif);font-size:1.35rem;color:var(--reyog-dark);">Rencana Tindak Lanjut (RTL) Saya</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;">
              ${mg.refleksiAkhirMendalam.rencanaTindakLanjut
                .map(
                  (rtl) => `
                <div style="background:var(--reyog-mint);border:1.5px solid var(--reyog-gold);border-radius:10px;padding:1.15rem;">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem;margin-bottom:0.45rem;">
                    <span class="crest-badge" style="margin-bottom:0;font-size:0.68rem;">🚀 ${rtl.kode}</span>
                    <span style="font-size:0.7rem;font-weight:700;color:var(--reyog-teal);">${rtl.targetWaktu}</span>
                  </div>
                  <h4 style="font-family:var(--font-serif);font-size:1rem;color:var(--reyog-dark);margin-bottom:0.4rem;">${rtl.judul}</h4>
                  <p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.6;">${rtl.langkahKonkret}</p>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="page-turn-nav">
            <button class="btn btn-outline" onclick="navigateTo('siklus-4')"><< Siklus 4</button>
            <button class="btn btn-gold" onclick="navigateTo('lampiran')">Lampiran & Kegiatan Non-Mengajar >></button>
          </div>
        </div>
      </section>
    `;
  }

  // --------------------------------------------------------------------------
  // 5. HALAMAN LAMPIRAN (INSTRUMEN PENILAIAN GP LAMPIRAN 7 & 8 + NON-MENGAJAR)
  // --------------------------------------------------------------------------
  function renderLampiran() {
    const s = window.PORTFOLIO_DATA.student;

    return `
      <header class="hero-banner" style="padding:2.2rem 1.25rem 1.9rem;">
        <div class="hero-inner">
          <div class="hero-eyebrow">📎 LAMPIRAN DOKUMEN & KEGIATAN SEKOLAH</div>
          <h1 class="hero-title" style="font-size:clamp(1.55rem,3vw,2.35rem);">Lampiran Penilaian & Kegiatan Non-Mengajar</h1>
          <p class="hero-subtitle">Instrumen Penilaian Guru Pamong (Lampiran 7 & 8), Daftar Hadir Kelas VII B, dan Dokumentasi Tambahan</p>
        </div>
      </header>

      <section class="section-block">
        <div class="container">
          <div class="section-header">
            <span class="section-kicker">Berkas Lampiran PPL</span>
            <h2 class="section-title">Instrumen Penilaian Guru Pamong & Administrasi Kelas VII B</h2>
            <p class="section-desc">Berisi format penilaian perangkat pembelajaran (Lampiran 7), format penilaian praktik mengajar (Lampiran 8), daftar hadir murid kelas VII B, serta kumpulan lembar kerja refleksi yang telah disahkan oleh Ibu ${s.guruPamong} dan Bapak ${s.dpl}.</p>
            <div class="ornament-divider"><span>❖</span></div>
          </div>

          <div class="artefak-grid" style="margin-bottom:2.25rem;">
            <div class="artefak-card">
              <div class="artefak-card-header">
                <div>
                  <span class="artefak-type-badge">📋 Lampiran 7 & 8 • Berlaku Seluruh Siklus</span>
                  <h3 class="artefak-card-title">Instrumen Penilaian Guru Pamong (Lampiran 7 & 8 — Terisi &amp; Disahkan)</h3>
                </div>
              </div>
              <div class="artefak-card-body">
                <p>Dokumen penilaian resmi yang telah diisi dan disahkan oleh Guru Pamong (Ibu ${s.guruPamong}) untuk menilai kelengkapan perencanaan pembelajaran (Lampiran 7) serta pelaksanaan praktik mengajar di kelas (Lampiran 8). Penilaian ini berlaku secara komprehensif dan kumulatif untuk seluruh Siklus 1 sampai Siklus 4.</p>
              </div>
              <div class="artefak-card-footer" style="display:flex;gap:0.45rem;flex-wrap:wrap;">
                <button class="btn btn-gold" onclick="openMediaModal('Instrumen Penilaian Guru Pamong (Lampiran 7 & 8)', 'https://drive.google.com/drive/folders/1GW8pHwxEDo0grFXowpb6IZavRUB-vbrs?usp=sharing', 'drive-folder')">👁️ Pratinjau Berkas Penilaian</button>
                <a class="btn btn-primary" href="https://drive.google.com/drive/folders/1GW8pHwxEDo0grFXowpb6IZavRUB-vbrs?usp=sharing" target="_blank" rel="noopener">🔗 Buka di Google Drive ↗</a>
                <a class="btn btn-outline" href="assets/docs/Lampiran_7_dan_8_Penilaian_GP.docx" download>⬇️ Unduh Format (.docx)</a>
              </div>
            </div>

            <div class="artefak-card">
              <div class="artefak-card-header">
                <div>
                  <span class="artefak-type-badge">📊 Administrasi Kelas VII B</span>
                  <h3 class="artefak-card-title">Format Asesmen & Daftar Hadir Murid Kelas VII B</h3>
                </div>
              </div>
              <div class="artefak-card-body">
                <p>Daftar hadir 21 murid Kelas VII B (Wali Kelas: Ibu Siti Aisyah, S.Pd) beserta format rekap nilai asesmen per materi di UPTD SMPN 1 Burneh.</p>
              </div>
              <div class="artefak-card-footer">
                <button class="btn btn-primary" onclick="openMediaModal('Format Asesmen Kelas VII B', 'assets/docs/Assesmen_Peserta_Didik_7B.pdf', 'pdf')">👁️ Lihat Format Asesmen</button>
                <button class="btn btn-outline" onclick="openMediaModal('Daftar Hadir Kelas VII B', 'assets/docs/Absen_Kelas_VII_B.pdf', 'pdf')">👁️ Daftar Hadir VII B</button>
              </div>
            </div>

            <div class="artefak-card">
              <div class="artefak-card-header">
                <div>
                  <span class="artefak-type-badge">🗂️ Bundel LK 1 s.d. LK 4</span>
                  <h3 class="artefak-card-title">Kumpulan Lembar Refleksi Bertanda Tangan (Siklus 1 s.d. Siklus 4)</h3>
                </div>
              </div>
              <div class="artefak-card-body">
                <p>Tombol cepat untuk membuka dokumen PDF asli LK 4.1 (Siklus 1), LK 4.2 (Siklus 2), LK 4.3 (Siklus 3), dan LK 4.4 (Siklus 4) yang sudah ditandatangani Guru Pamong dan DPL.</p>
              </div>
              <div class="artefak-card-footer">
                <button class="btn btn-outline" onclick="openMediaModal('LK 4.1 Siklus 1', 'assets/docs/LK4_Refleksi_Siklus_1.pdf', 'pdf')">LK 4.1</button>
                <button class="btn btn-outline" onclick="openMediaModal('LK 4.2 Siklus 2', 'assets/docs/LK4_Refleksi_Siklus_2.pdf', 'pdf')">LK 4.2</button>
                <button class="btn btn-outline" onclick="openMediaModal('LK 4.3 Siklus 3', 'assets/docs/LK4_Refleksi_Siklus_3.pdf', 'pdf')">LK 4.3</button>
                <button class="btn btn-outline" onclick="openMediaModal('LK 4.4 Siklus 4', 'assets/docs/LK4_Refleksi_Siklus_4.pdf', 'pdf')">LK 4.4</button>
              </div>
            </div>
          </div>

          <!-- REKAPITULASI BUKTI HASIL KERJA MURID KELAS VII B (PERTEMUAN 1 S.D. 12) -->
          <div style="background:#fff;border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.65rem;margin-bottom:2.25rem;box-shadow:var(--shadow-soft);">
            <div style="text-align:center;margin-bottom:1.35rem;">
              <span class="section-kicker">Bukti Hasil Belajar Murid</span>
              <h3 style="font-family:var(--font-serif);font-size:1.35rem;color:var(--reyog-dark);">✍️ Kumpulan Hasil Kerja Murid Kelas VII B per Pertemuan</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);max-width:740px;margin:0.35rem auto 0;">
                Rekapitulasi folder dokumentasi hasil pengerjaan Lembar Kerja Murid (LKM) dan tugas kelompok murid Kelas VII B di setiap pertemuan (juga tersedia pada halaman masing-masing siklus).
              </p>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(265px,1fr));gap:0.9rem;">
              ${(window.PORTFOLIO_DATA.hasilKerjaMuridList || [])
                .map(
                  (hk) => `
                <div style="background:var(--reyog-mint);border:1.5px solid var(--reyog-mint-border);border-radius:10px;padding:0.95rem 1.1rem;display:flex;flex-direction:column;justify-content:space-between;gap:0.75rem;">
                  <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem;margin-bottom:0.35rem;">
                      <span class="crest-badge" style="margin-bottom:0;font-size:0.68rem;">✍️ ${hk.pertemuan}</span>
                      <span style="font-size:0.72rem;font-weight:700;color:var(--reyog-teal);">${hk.siklus}</span>
                    </div>
                    <div style="font-family:var(--font-serif);font-weight:700;font-size:0.95rem;color:var(--reyog-dark);">${hk.topik}</div>
                  </div>
                  <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
                    <button class="btn btn-gold" style="padding:0.38rem 0.75rem;font-size:0.76rem;" onclick="openMediaModal('Hasil Kerja Murid — ${hk.pertemuan}: ${hk.topik}', '${hk.url}', 'drive-folder')">👁️ Pratinjau</button>
                    <a class="btn btn-primary" style="padding:0.38rem 0.75rem;font-size:0.76rem;" href="${hk.url}" target="_blank" rel="noopener">🔗 Buka Google Drive ↗</a>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- GALERI 6 VIDEO REELS KEGIATAN NON-MENGAJAR -->
          <div style="background:var(--reyog-mint);border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.65rem;margin-bottom:2.25rem;box-shadow:var(--shadow-soft);">
            <div style="text-align:center;margin-bottom:1.35rem;">
              <span class="section-kicker">Dokumentasi Video Non-Mengajar</span>
              <h3 style="font-family:var(--font-serif);font-size:1.35rem;color:var(--reyog-dark);">6 Video Kegiatan Non-Mengajar di UPTD SMPN 1 Burneh</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);max-width:720px;margin:0.35rem auto 0;">
                Kumpulan 6 dokumentasi video pada akun Instagram resmi (<code>@ppgsmpn1burneh_2026</code>) yang merekam keikutsertaan kami dalam kegiatan non-mengajar di sekolah mitra.
              </p>
            </div>
            <div class="artefak-grid">
              ${(window.PORTFOLIO_DATA.kegiatanNonMengajarReels || [])
                .map(
                  (reel) => `
                <div class="artefak-card">
                  <div class="artefak-card-header">
                    <div>
                      <span class="artefak-type-badge">📱 Video Non-Mengajar #${reel.nomor} • ${reel.siklusTerkait}</span>
                      <h4 class="artefak-card-title">${reel.judul}</h4>
                    </div>
                  </div>
                  <div class="artefak-card-body">
                    <p style="margin-bottom:0.75rem;">${reel.deskripsi}</p>
                    <div style="width:100%;height:360px;border-radius:8px;overflow:hidden;border:1.5px solid var(--reyog-gold);background:#fff;">
                      <iframe src="${reel.embedUrl}" style="width:100%;height:100%;border:none;" allowtransparency="true" allowfullscreen="true" scrolling="no" title="${reel.judul}"></iframe>
                    </div>
                  </div>
                  <div class="artefak-card-footer">
                    <button class="btn btn-gold" onclick="openMediaModal('${reel.judul}', '${reel.url}', 'video')">▶️ Buka Pratinjau Lebar</button>
                    <a class="btn btn-primary" href="${reel.url}" target="_blank" rel="noopener">🔗 Buka di Instagram ↗</a>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- GALERI NON-MENGAJAR & KENANG-KENANGAN GANTUNGAN KUNCI CHIBI SISWA VII B -->
          <div style="background:linear-gradient(135deg,#00292b 0%,#00494b 100%);border:2px solid var(--reyog-gold);border-radius:var(--radius-lg);padding:1.75rem;color:#fff;box-shadow:var(--shadow-card);">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1.5rem;align-items:center;">
              <div>
                <span class="hero-eyebrow" style="margin-bottom:0.55rem;">🎁 KENANG-KENANGAN UNTUK KELAS VII B</span>
                <h3 style="font-family:var(--font-serif);font-size:1.35rem;color:var(--reyog-gold-bright);margin-bottom:0.6rem;">
                  Gantungan Kunci Karakter untuk Murid-Murid Kelas VII B
                </h3>
                <p style="font-size:0.88rem;color:rgba(247,250,250,0.92);line-height:1.7;margin-bottom:0.85rem;">
                  Selain kegiatan mengajar di kelas, saya juga membuatkan desain gantungan kunci bergambar karakter untuk masing-masing murid di Kelas VII B (Fajrin, Azmina, Claudia, Faizah, Fariz, Fatima, Habil, Irfan, Akbar, Fia, Hanafi, Mila, Rafli, Hera, Firdi, Novi, Anis, Rizky, Putri, Refan, Rehan, Safira, Sandi, dan Nisa) sebagai bentuk apresiasi atas semangat belajar mereka selama satu semester.
                </p>
                <p style="font-size:0.84rem;color:var(--reyog-gold-light);font-style:italic;">
                  "Hadiah sederhana supaya adik-adik Kelas VII B selalu ingat bahwa usaha mereka di kelas sangat dihargai."
                </p>
              </div>
              <div style="text-align:center;">
                <div style="background:rgba(255,255,255,0.08);border:2px solid var(--reyog-gold);border-radius:14px;padding:0.85rem;display:inline-block;max-width:260px;">
                  <img src="assets/img/ganci_chibi_sample.png" alt="Desain Gantungan Kunci Kelas VII B" style="width:100%;height:auto;border-radius:8px;" />
                  <div style="font-size:0.76rem;color:var(--reyog-gold-bright);font-weight:700;margin-top:0.5rem;">
                    Contoh Desain Gantungan Kunci Murid Kelas VII B
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="page-turn-nav">
            <button class="btn btn-outline" onclick="navigateTo('model-guru')"><< Model Guru & RTL</button>
            <button class="btn btn-gold" onclick="navigateTo('beranda')">Kembali ke Beranda >></button>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================================================
  // MODAL PREVIEWER (MENDUKUNG FILE LOKAL MAUPUN LINK GOOGLE DRIVE ONLINE)
  // ==========================================================================
  window.openMediaModal = function (title, url, type) {
    const modal = document.getElementById("universal-modal");
    const titleEl = document.getElementById("modal-title-text");
    const bodyEl = document.getElementById("modal-body-content");
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = title;
    const embedUrl = normalizeEmbedUrl(url);

    if (type === "simulator") {
      bodyEl.innerHTML = `
        <div style="margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <span style="font-size:0.84rem;color:var(--text-secondary);">🕹️ <strong>Simulator Interaktif:</strong> Bisa langsung dimainkan di kotak bawah ini atau dibuka layar penuh.</span>
          <a class="btn btn-gold" href="${url}" target="_blank" rel="noopener">↗ Buka Layar Penuh di Tab Baru</a>
        </div>
        <div class="modal-iframe-container">
          <iframe src="${embedUrl}" allow="autoplay; fullscreen"></iframe>
        </div>
      `;
    } else if (type === "drive-folder") {
      bodyEl.innerHTML = `
        <div style="margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <span style="font-size:0.84rem;color:var(--text-secondary);">✍️ <strong>Bukti Hasil Kerja Murid:</strong> Klik berkas di dalam kotak di bawah ini untuk melihat hasil pekerjaan murid, atau buka langsung di Google Drive.</span>
          <a class="btn btn-gold" href="${url}" target="_blank" rel="noopener">🔗 Buka Folder Penuh di Google Drive ↗</a>
        </div>
        <div class="modal-iframe-container" style="background:#ffffff;">
          <iframe src="${embedUrl}" allow="autoplay"></iframe>
        </div>
      `;
    } else if (type === "pdf") {
      bodyEl.innerHTML = `
        <div style="margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <span style="font-size:0.84rem;color:var(--text-secondary);">📕 <strong>Pratinjau Dokumen PDF:</strong> Gulir ke bawah untuk membaca dokumen.</span>
          <div style="display:flex;gap:0.45rem;">
            <a class="btn btn-primary" href="${url}" target="_blank" rel="noopener">↗ Buka di Tab Baru</a>
            <a class="btn btn-gold" href="${url}" download>⬇️ Unduh PDF</a>
          </div>
        </div>
        <div class="modal-iframe-container">
          <iframe src="${embedUrl}" allow="autoplay"></iframe>
        </div>
      `;
    } else if (type === "video") {
      if (url.includes("drive.google.com") || url.includes("instagram.com/reel/")) {
        bodyEl.innerHTML = `
          <div style="margin-bottom:0.65rem;display:flex;justify-content:flex-end;">
            <a class="btn btn-primary" href="${url}" target="_blank" rel="noopener">↗ Buka di Tab Baru</a>
          </div>
          <div class="modal-iframe-container">
            <iframe src="${embedUrl}" allow="autoplay; fullscreen"></iframe>
          </div>
        `;
      } else {
        bodyEl.innerHTML = `
          <div style="text-align:center;background:#071314;padding:1rem;border-radius:10px;border:1px solid var(--reyog-gold);">
            <video src="${url}" controls autoplay style="max-width:100%;max-height:68vh;border-radius:8px;"></video>
          </div>
        `;
      }
    } else if (type === "image") {
      bodyEl.innerHTML = `
        <div style="text-align:center;">
          <img src="${url}" alt="${title}" style="max-width:100%;max-height:74vh;border-radius:8px;border:2px solid var(--reyog-gold);" />
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div style="text-align:center;padding:1.75rem;">
          <p style="margin-bottom:1.1rem;">Dokumen atau tautan ini dapat dibuka atau diunduh melalui tombol berikut:</p>
          <a class="btn btn-gold" href="${url}" target="_blank" rel="noopener">🔗 Buka / Unduh Berkas Sekarang</a>
        </div>
      `;
    }

    modal.classList.add("open");
  };

  window.openPpmSummaryModal = function (siklusId, pertId) {
    const sk = getMergedSiklusData(siklusId);
    if (!sk) return;
    const pt = sk.pertemuanList.find((p) => p.id === pertId);
    if (!pt || !pt.ringkasanPPM) return;

    const modal = document.getElementById("universal-modal");
    const titleEl = document.getElementById("modal-title-text");
    const bodyEl = document.getElementById("modal-body-content");
    if (!modal || !titleEl || !bodyEl) return;

    const ppm = pt.ringkasanPPM;
    const docArtefak = pt.artefakItems.find(
      (a) => a.previewType === "ppm-summary" || a.previewType === "docx" || a.previewType === "pdf"
    );

    titleEl.textContent = `Ringkasan PPM — ${pt.judul}`;
    bodyEl.innerHTML = `
      <div style="background:var(--reyog-mint);border:1.5px solid var(--reyog-gold);border-radius:10px;padding:1.25rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.65rem;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--reyog-mint-border);">
          <div>
            <span class="crest-badge" style="margin-bottom:0.3rem;">📋 PERENCANAAN PEMBELAJARAN MENDALAM (PPM)</span>
            <h3 style="font-family:var(--font-serif);font-size:1.2rem;color:var(--reyog-dark);">${pt.judul}</h3>
          </div>
          ${
            docArtefak
              ? `<a class="btn btn-gold" href="${docArtefak.fileUrl}" download>⬇️ Unduh Berkas Dokumen PPM Lengkap</a>`
              : ""
          }
        </div>

        <div style="display:grid;gap:0.85rem;font-size:0.88rem;">
          <div style="background:#fff;padding:0.85rem 1rem;border-radius:8px;border:1px solid var(--reyog-mint-border);">
            <strong style="color:var(--reyog-teal);display:block;margin-bottom:0.2rem;">📌 Identitas Pembelajaran:</strong>
            <span>${ppm.identitas}</span>
          </div>
          <div style="background:#fff;padding:0.85rem 1rem;border-radius:8px;border:1px solid var(--reyog-mint-border);">
            <strong style="color:var(--reyog-teal);display:block;margin-bottom:0.2rem;">🎓 Dimensi Profil Lulusan:</strong>
            <span>${ppm.profilLulusan}</span>
          </div>
          <div style="background:#fff;padding:0.85rem 1rem;border-radius:8px;border:1px solid var(--reyog-mint-border);">
            <strong style="color:var(--reyog-teal);display:block;margin-bottom:0.2rem;">🧭 Capaian Pembelajaran (CP):</strong>
            <span>${ppm.capaianPembelajaran}</span>
          </div>
          <div style="background:#fff;padding:0.85rem 1rem;border-radius:8px;border:1px solid var(--reyog-mint-border);">
            <strong style="color:var(--reyog-teal);display:block;margin-bottom:0.2rem;">🎯 Tujuan Pembelajaran:</strong>
            <span>${ppm.tujuanPembelajaran}</span>
          </div>
          <div style="background:#fff;padding:0.85rem 1rem;border-radius:8px;border:1px solid var(--reyog-mint-border);">
            <strong style="color:var(--reyog-teal);display:block;margin-bottom:0.2rem;">🔬 Langkah Kegiatan Pembelajaran (Pembuka — Inti — Penutup):</strong>
            <p style="line-height:1.7;margin-top:0.2rem;">${ppm.langkahPembelajaran}</p>
          </div>
        </div>
      </div>
    `;

    modal.classList.add("open");
  };

  window.closeUniversalModal = function () {
    const modal = document.getElementById("universal-modal");
    const bodyEl = document.getElementById("modal-body-content");
    if (modal) modal.classList.remove("open");
    if (bodyEl) bodyEl.innerHTML = "";
  };

  // ==========================================================================
  // MODAL PENGELOLA / UPLOAD ARTEFAK BARU & DOKUMENTASI
  // ==========================================================================
  window.openArtefakManager = function (defaultSiklusId, defaultPertId) {
    const modal = document.getElementById("universal-modal");
    const titleEl = document.getElementById("modal-title-text");
    const bodyEl = document.getElementById("modal-body-content");
    if (!modal || !titleEl || !bodyEl) return;

    const targetSiklus = defaultSiklusId || "siklus-4";
    const targetPert = defaultPertId || (targetSiklus === "siklus-4" ? "s4-pert13" : "");
    const customList = loadCustomArtefaks();

    titleEl.textContent = "⚙️ Tambah / Kelola Artefak & Dokumentasi (Termasuk Pertemuan 13)";
    bodyEl.innerHTML = `
      <div style="display:grid;gap:1.25rem;">
        <div style="background:var(--reyog-mint);border:1.5px solid var(--reyog-gold);border-radius:10px;padding:1.15rem;">
          <h4 style="font-family:var(--font-serif);color:var(--reyog-dark);font-size:1.05rem;margin-bottom:0.3rem;">
            ➕ Tambahkan Berkas / Tautan Google Drive / Dokumentasi Pertemuan
          </h4>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.9rem;">
            Gunakan formulir ini untuk menambahkan perangkat <strong>Pertemuan 13</strong>, foto/video dokumentasi tiap pertemuan, atau menempelkan tautan Google Drive agar bisa diakses secara daring dari mana saja.
          </p>

          <form id="form-add-artefak" onsubmit="submitCustomArtefak(event)">
            <div class="form-grid">
              <div class="form-group">
                <label>Pilih Siklus</label>
                <select id="input-siklus" class="form-control" onchange="updatePertemuanDropdown()" required>
                  <option value="siklus-1" ${targetSiklus === "siklus-1" ? "selected" : ""}>Siklus 1 (Pertemuan 3–5 / E-Portofolio 1)</option>
                  <option value="siklus-2" ${targetSiklus === "siklus-2" ? "selected" : ""}>Siklus 2 (Pertemuan 6–8 / E-Portofolio 2)</option>
                  <option value="siklus-3" ${targetSiklus === "siklus-3" ? "selected" : ""}>Siklus 3 (Pertemuan 9–11 / E-Portofolio 2)</option>
                  <option value="siklus-4" ${targetSiklus === "siklus-4" ? "selected" : ""}>Siklus 4 (Pertemuan 12–13 / E-Portofolio 2)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Pilih Pertemuan / Bagian</label>
                <select id="input-pertemuan" class="form-control" required></select>
              </div>

              <div class="form-group">
                <label>Jenis Berkas / Artefak</label>
                <select id="input-tipe" class="form-control" required>
                  <option value="Produk Rancangan Pembelajaran (PPM)">Rancangan Pembelajaran (PPM / Modul Ajar)</option>
                  <option value="Lembar Kerja Murid (LKM)">Lembar Kerja Murid (LKM)</option>
                  <option value="Media Pembelajaran Interaktif (Simulator)">Media Pembelajaran / Simulator HTML</option>
                  <option value="Dokumentasi Praktik Mengajar">Foto / Video Dokumentasi Pertemuan</option>
                  <option value="Video Pelaksanaan Praktik Mengajar Mandiri">Video Pelaksanaan Praktik Mengajar Mandiri</option>
                  <option value="Instrumen Penilaian & Asesmen">Instrumen Penilaian & Asesmen</option>
                  <option value="Dokumentasi Kegiatan Non-Mengajar">Dokumentasi Kegiatan Non-Mengajar</option>
                </select>
              </div>

              <div class="form-group">
                <label>Judul Artefak / Dokumentasi</label>
                <input type="text" id="input-judul" class="form-control" placeholder="Contoh: Dokumentasi Diskusi Kelompok Pertemuan 4" required />
              </div>

              <div class="form-group full">
                <label>Keterangan Singkat</label>
                <textarea id="input-deskripsi" class="form-control" rows="2" placeholder="Tuliskan penjelasan singkat tentang berkas atau dokumentasi ini..." required></textarea>
              </div>

              <div class="form-group">
                <label>Tautan Google Drive / Instagram / Jalur Folder Lokal</label>
                <input type="text" id="input-url" class="form-control" placeholder="https://drive.google.com/... atau dokumentasi/Pertemuan_4/foto1.jpg" />
              </div>

              <div class="form-group">
                <label>Atau Pilih Berkas dari Komputer</label>
                <input type="file" id="input-file-picker" class="form-control" onchange="handleLocalFileSelect(event)" />
              </div>
            </div>

            <div style="margin-top:1rem;display:flex;gap:0.65rem;flex-wrap:wrap;">
              <button type="submit" class="btn btn-gold">💾 Simpan ke Portofolio</button>
              <button type="button" class="btn btn-primary" onclick="exportUpdatedDataJs()">📦 Unduh Berkas data.js Permanen (Untuk Diunggah Daring)</button>
            </div>
          </form>
        </div>

        <!-- DAFTAR ARTEFAK TAMBAHAN YANG SUDAH DIINPUT -->
        <div style="background:#fff;border:1px solid var(--reyog-mint-border);border-radius:10px;padding:1.1rem;">
          <h4 style="font-family:var(--font-serif);color:var(--reyog-dark);margin-bottom:0.6rem;">
            📋 Daftar Berkas Tambahan Anda (${customList.length} berkas)
          </h4>
          ${
            customList.length === 0
              ? `<p style="font-size:0.82rem;color:var(--text-muted);">Belum ada berkas tambahan manual. Semua perangkat Pertemuan 1 s.d. 12 sudah terpasang otomatis.</p>`
              : `<div style="display:grid;gap:0.5rem;">
                  ${customList
                    .map(
                      (c) => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.55rem 0.8rem;background:var(--reyog-mint);border-radius:8px;font-size:0.82rem;">
                      <div>
                        <strong>[${c.siklusId.toUpperCase()}] ${c.judul}</strong> — <span style="color:var(--reyog-teal);">${c.tipe}</span>
                      </div>
                      <button class="btn btn-outline" style="padding:0.2rem 0.6rem;font-size:0.74rem;border-color:#c0392b;color:#c0392b;" onclick="deleteCustomArtefak('${c.id}')">Hapus</button>
                    </div>
                  `
                    )
                    .join("")}
                </div>`
          }
        </div>
      </div>
    `;

    modal.classList.add("open");
    window.updatePertemuanDropdown(targetPert);
  };

  window.updatePertemuanDropdown = function (preselectPertId) {
    const siklusSel = document.getElementById("input-siklus");
    const pertSel = document.getElementById("input-pertemuan");
    if (!siklusSel || !pertSel) return;

    const sk = window.PORTFOLIO_DATA.siklusList.find((s) => s.id === siklusSel.value);
    if (!sk) return;

    let html = sk.pertemuanList
      .map(
        (p) =>
          `<option value="${p.id}" ${preselectPertId === p.id ? "selected" : ""}>${p.judul}</option>`
      )
      .join("");
    html += `<option value="video-section">🎥 Bagian Video Mengajar / Non-Mengajar Siklus ${sk.nomor}</option>`;
    pertSel.innerHTML = html;
  };

  window.handleLocalFileSelect = function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const urlInput = document.getElementById("input-url");
    const judulInput = document.getElementById("input-judul");

    if (judulInput && !judulInput.value) {
      judulInput.value = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    }

    if (file.size <= 3500000 && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        if (urlInput) urlInput.value = ev.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      if (urlInput) {
        urlInput.value = `assets/docs/${file.name}`;
      }
    }
  };

  window.submitCustomArtefak = function (e) {
    e.preventDefault();
    const siklusId = document.getElementById("input-siklus").value;
    const pertVal = document.getElementById("input-pertemuan").value;
    const tipe = document.getElementById("input-tipe").value;
    const judul = document.getElementById("input-judul").value.trim();
    const deskripsi = document.getElementById("input-deskripsi").value.trim();
    const fileUrl = document.getElementById("input-url").value.trim() || "#";

    const list = loadCustomArtefaks();
    list.push({
      id: "cust-" + Date.now(),
      siklusId,
      pertemuanId: pertVal,
      kategori: pertVal === "video-section" || tipe.includes("Video Pelaksanaan") ? "video" : "perangkat",
      tipe,
      judul,
      deskripsi,
      fileUrl,
      previewType: fileUrl.startsWith("data:application/pdf")
        ? "pdf"
        : fileUrl.startsWith("data:image/")
        ? "image"
        : detectPreviewType(fileUrl)
    });

    saveCustomArtefaks(list);
    closeUniversalModal();
    navigateTo(siklusId, "perangkat");
  };

  window.deleteCustomArtefak = function (customId) {
    const list = loadCustomArtefaks().filter((c) => c.id !== customId);
    saveCustomArtefaks(list);
    renderCurrentPage();
  };

  window.exportUpdatedDataJs = function () {
    const mergedPortfolio = JSON.parse(JSON.stringify(window.PORTFOLIO_DATA));
    mergedPortfolio.siklusList = mergedPortfolio.siklusList.map((sk) => getMergedSiklusData(sk.id));
    const content = "window.PORTFOLIO_DATA = " + JSON.stringify(mergedPortfolio, null, 2) + ";\n";
    const blob = new Blob([content], { type: "application/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.js";
    a.click();
  };

  // Toggle mobile menu
  window.toggleMobileMenu = function () {
    const navMenu = document.getElementById("main-nav-menu");
    if (navMenu) navMenu.classList.toggle("mobile-open");
  };

  // Inisialisasi saat halaman dimuat
  document.addEventListener("DOMContentLoaded", function () {
    renderCurrentPage();
  });
})();
