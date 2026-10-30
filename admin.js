const cfg = window.APP_CONFIG;
if (!cfg || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('https://wrxqukeebyhoniowlkiv.supabase.co')) {
  document.body.textContent = 'config.js belum diisi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY terlebih dahulu.';
  throw new Error('Config belum diisi');
}
const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const loginView = $('loginView');
const dashView = $('dashView');
const STATUS = ['baru', 'dibaca', 'diproses', 'selesai'];

let semuaData = [];

/* ========== Login / Logout ========== */
async function cekSesi() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    loginView.hidden = true;
    dashView.hidden = false;
    muatData();
  } else {
    loginView.hidden = false;
    dashView.hidden = true;
  }
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginErr').textContent = '';
  const { error } = await sb.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value
  });
  if (error) {
    $('loginErr').textContent = 'Email atau password salah.';
    return;
  }
  $('password').value = '';
  cekSesi();
});

$('btnLogout').addEventListener('click', async () => {
  await sb.auth.signOut();
  semuaData = [];
  cekSesi();
});

/* ========== Muat data ========== */
async function muatData() {
  const { data, error } = await sb
    .from('aspirasi')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    $('list').textContent = 'Gagal memuat data: ' + error.message;
    return;
  }
  semuaData = data;
  render();
}

/* ========== Tampilkan ========== */
function render() {
  const fs = $('filterStatus').value;
  const fk = $('filterKategori').value;
  const q = $('cari').value.trim().toLowerCase();

  const data = semuaData.filter(r =>
    (!fs || r.status === fs) &&
    (!fk || r.kategori === fk) &&
    (!q || r.isi.toLowerCase().includes(q) || r.nama.toLowerCase().includes(q))
  );

  renderStats();

  const list = $('list');
  list.replaceChildren();

  if (!data.length) {
    const p = document.createElement('p');
    p.className = 'a-empty';
    p.textContent = 'Tidak ada aspirasi.';
    list.append(p);
    return;
  }
  data.forEach(r => list.append(buatKartu(r)));
}

function renderStats() {
  const stats = $('stats');
  stats.replaceChildren();
  const items = [['Total', semuaData.length]];
  STATUS.forEach(s => items.push([s[0].toUpperCase() + s.slice(1), semuaData.filter(r => r.status === s).length]));
  items.forEach(([label, n]) => {
    const d = document.createElement('div');
    d.className = 'a-stat';
    const b = document.createElement('b');
    b.textContent = n;
    d.append(b, label);
    stats.append(d);
  });
}

function buatKartu(r) {
  const el = document.createElement('article');
  el.className = 'a-item';

  const meta = document.createElement('div');
  meta.className = 'a-meta';

  const tag = document.createElement('span');
  tag.className = 'a-tag';
  tag.textContent = r.kategori;

  const siapa = document.createElement('span');
  const nm = document.createElement('b');
  nm.textContent = r.nama;
  siapa.append(nm, r.kelas ? ' • ' + r.kelas : '');

  const waktu = document.createElement('span');
  waktu.textContent = new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  const st = document.createElement('span');
  st.className = 'a-status s-' + r.status;
  st.textContent = r.status;

  meta.append(tag, siapa, waktu, st);

  const isi = document.createElement('p');
  isi.className = 'a-isi';
  isi.textContent = r.isi;

  const aksi = document.createElement('div');
  aksi.className = 'a-actions';

  const sel = document.createElement('select');
  STATUS.forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s[0].toUpperCase() + s.slice(1);
    if (s === r.status) o.selected = true;
    sel.append(o);
  });
  sel.addEventListener('change', () => ubahStatus(r.id, sel.value));

  const del = document.createElement('button');
  del.className = 'a-btn danger small';
  del.textContent = 'Hapus';
  del.addEventListener('click', () => hapus(r.id));

  aksi.append(sel, del);
  el.append(meta, isi, aksi);
  return el;
}

/* ========== Aksi ========== */
async function ubahStatus(id, status) {
  const { error } = await sb.from('aspirasi').update({ status }).eq('id', id);
  if (error) return alert('Gagal mengubah status: ' + error.message);
  const row = semuaData.find(r => r.id === id);
  if (row) row.status = status;
  render();
}

async function hapus(id) {
  if (!confirm('Hapus aspirasi ini secara permanen?')) return;
  const { error } = await sb.from('aspirasi').delete().eq('id', id);
  if (error) return alert('Gagal menghapus: ' + error.message);
  semuaData = semuaData.filter(r => r.id !== id);
  render();
}

/* ========== Unduh CSV ========== */
$('btnExport').addEventListener('click', () => {
  const esc = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;       // cegah formula injection di Excel
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const baris = [['Tanggal', 'Nama', 'Kelas', 'Kategori', 'Status', 'Aspirasi']];
  semuaData.forEach(r => baris.push([r.created_at, r.nama, r.kelas, r.kategori, r.status, r.isi]));
  const csv = '\uFEFF' + baris.map(b => b.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'aspirasi-osis.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});

['filterStatus', 'filterKategori'].forEach(id => $(id).addEventListener('change', render));
$('cari').addEventListener('input', render);

cekSesi();