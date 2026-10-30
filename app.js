document.getElementById('year').textContent = new Date().getFullYear();

/* ========== Animasi muncul saat scroll ========== */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('show');
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ========== Navbar + progress bar ========== */
const nav = document.getElementById('nav');
const bar = document.getElementById('progress');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
  const h = document.documentElement.scrollHeight - innerHeight;
  bar.style.width = (scrollY / h * 100) + '%';
}, { passive: true });

/* ========== Menu mobile ========== */
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
burger.addEventListener('click', () => menu.classList.toggle('open'));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

/* ========== Parallax halus logo hero ========== */
const heroLogo = document.querySelector('.hero-logo');
window.addEventListener('scroll', () => {
  if (scrollY < innerHeight) heroLogo.style.translate = `0 ${scrollY * 0.12}px`;
}, { passive: true });

/* ========== Form ========== */
const isi = document.getElementById('isi');
const count = document.getElementById('count');
isi.addEventListener('input', () => count.textContent = isi.value.length);

const anonim = document.getElementById('anonim');
const nama = document.getElementById('nama');
anonim.addEventListener('change', () => {
  nama.disabled = anonim.checked;
  if (anonim.checked) nama.value = '';
});

const form = document.getElementById('formAspirasi');
const alertBox = document.getElementById('alert');
const btn = document.getElementById('btnKirim');

function show(msg, ok) {
  alertBox.textContent = msg;
  alertBox.className = 'alert ' + (ok ? 'ok' : 'err');
}

/* Pembatas kiriman sederhana per perangkat */
function bolehKirim() {
  try {
    const batas = window.APP_CONFIG.MAX_PER_JAM || 5;
    const sejam = Date.now() - 3600000;
    const log = JSON.parse(localStorage.getItem('aspirasi_log') || '[]').filter(t => t > sejam);
    localStorage.setItem('aspirasi_log', JSON.stringify(log));
    return log.length < batas;
  } catch { return true; }
}
function catatKirim() {
  try {
    const log = JSON.parse(localStorage.getItem('aspirasi_log') || '[]');
    log.push(Date.now());
    localStorage.setItem('aspirasi_log', JSON.stringify(log));
  } catch {}
}

const cfg = window.APP_CONFIG;
let sb = null;
let pesanConfig = '';

if (!cfg || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('XXXX') || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes('ISI_DENGAN')) {
  pesanConfig = 'Database belum dikonfigurasi. Isi config.js terlebih dahulu.';
} else if (!window.supabase) {
  pesanConfig = 'Library Supabase gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.';
} else {
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.className = 'alert';

  if (form.kontak_extra.value) return show('Terima kasih!', true);   // honeypot (bot)
  if (!sb) return show(pesanConfig, false);
  if (!form.kategori.value) return show('Pilih kategori terlebih dahulu.', false);

  const teks = form.isi.value.trim();
  if (teks.length < 10) return show('Aspirasi minimal 10 karakter.', false);
  if (!bolehKirim()) return show('Terlalu banyak kiriman. Coba lagi nanti.', false);

  const namaFinal = (anonim.checked || !nama.value.trim()) ? 'Anonim' : nama.value.trim();

  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  try {
    const { error } = await sb.from('aspirasi').insert({
      nama: namaFinal,
      kelas: form.kelas.value.trim() || null,
      kategori: form.kategori.value,
      isi: teks
    });

    if (error) {
      console.error('Supabase error:', error);
      show('Gagal mengirim: ' + error.message, false);
    } else {
      catatKirim();
      show('Aspirasimu berhasil dikirim. Terima kasih!', true);
      form.reset();
      count.textContent = 0;
      nama.disabled = false;
    }
  } catch (err) {
    console.error(err);
    show('Gagal terhubung ke database: ' + err.message, false);
  }

  btn.disabled = false;
  btn.textContent = 'Kirim Aspirasi';
});

 
/* ========== Smooth scroll animasi untuk menu ========== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let scrollAnim = null;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothScrollTo(targetY, onDone) {
  cancelAnimationFrame(scrollAnim);
  const startY = window.scrollY;
  const dist = targetY - startY;

  if (reduceMotion || Math.abs(dist) < 2) {
    window.scrollTo(0, targetY);
    if (onDone) onDone();
    return;
  }

  // durasi menyesuaikan jarak: 700ms - 1500ms
  const duration = Math.min(1500, Math.max(700, Math.abs(dist) * 0.45));
  const t0 = performance.now();

  function step(now) {
    const p = Math.min((now - t0) / duration, 1);
    window.scrollTo(0, startY + dist * easeInOutCubic(p));
    if (p < 1) {
      scrollAnim = requestAnimationFrame(step);
    } else if (onDone) {
      onDone();
    }
  }
  scrollAnim = requestAnimationFrame(step);
}

// Hentikan animasi kalau pengguna scroll sendiri
['wheel', 'touchstart', 'keydown'].forEach(ev =>
  window.addEventListener(ev, () => cancelAnimationFrame(scrollAnim), { passive: true })
);

// Semua link yang menuju #bagian (menu, tombol hero, panah scroll)
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();

    const navH = nav.offsetHeight;
    const y = id === '#beranda'
      ? 0
      : target.getBoundingClientRect().top + window.scrollY - navH + 1;

    smoothScrollTo(y, () => {
      history.replaceState(null, '', id);
      const judul = target.querySelector('.title');
      if (judul) {
        judul.classList.remove('pop');
        void judul.offsetWidth;          // restart animasi
        judul.classList.add('pop');
      }
    });
  });
});

/* ========== Menu aktif mengikuti posisi scroll ========== */
const sections = [...document.querySelectorAll('main section[id], section[id]')];
const menuLinks = [...document.querySelectorAll('#menu a[href^="#"]')];

function updateActive() {
  const pos = window.scrollY + nav.offsetHeight + 80;
  let current = sections[0].id;
  sections.forEach(s => { if (s.offsetTop <= pos) current = s.id; });
  menuLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
}
window.addEventListener('scroll', updateActive, { passive: true });
updateActive();