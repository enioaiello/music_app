// ─── State ───────────────────────────────────────────────────────────────────
let library = [];
let selectedArtist = null;
let selectedAlbum = null;
let searchQuery = '';
let coverCache = {};

// ─── MusicBrainz + Cover Art Archive (free, no API key) ──────────────────────
async function fetchCoverArt(artist, album) {
  const cacheKey = `${artist}__${album}`;
  if (coverCache[cacheKey] !== undefined) return coverCache[cacheKey];

  try {
    // Step 1 – search release on MusicBrainz
    const q = encodeURIComponent(`artist:"${artist}" AND release:"${album}"`);
    const mbRes = await fetch(
      `https://musicbrainz.org/ws/2/release/?query=${q}&limit=1&fmt=json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!mbRes.ok) throw new Error('MB request failed');
    const mbData = await mbRes.json();

    const release = mbData.releases?.[0];
    if (!release) throw new Error('No release found');
    const mbid = release.id;

    // Step 2 – fetch cover from Cover Art Archive
    const caRes = await fetch(`https://coverartarchive.org/release/${mbid}/front-250`);
    if (!caRes.ok) throw new Error('No cover found');
    const url = caRes.url; // redirected blob URL

    coverCache[cacheKey] = url;
    return url;
  } catch {
    coverCache[cacheKey] = null;
    return null;
  }
}

// ─── Fetch metadata from MusicBrainz (duration, isrc, etc.) ──────────────────
async function fetchTrackMetadata(artist, album) {
  const cacheKey = `meta__${artist}__${album}`;
  if (coverCache[cacheKey] !== undefined) return coverCache[cacheKey];

  try {
    const q = encodeURIComponent(`artist:"${artist}" AND release:"${album}"`);
    const mbRes = await fetch(
      `https://musicbrainz.org/ws/2/release/?query=${q}&limit=1&fmt=json&inc=recordings`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!mbRes.ok) throw new Error();
    const mbData = await mbRes.json();
    const mbid = mbData.releases?.[0]?.id;
    if (!mbid) throw new Error();

    // fetch release with recordings
    const recRes = await fetch(
      `https://musicbrainz.org/ws/2/release/${mbid}?inc=recordings&fmt=json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!recRes.ok) throw new Error();
    const recData = await recRes.json();

    // Build a map: title -> duration (ms)
    const map = {};
    for (const medium of recData.media || []) {
      for (const track of medium.tracks || []) {
        map[track.title] = track.length; // ms or null
      }
    }
    coverCache[cacheKey] = map;
    return map;
  } catch {
    coverCache[cacheKey] = {};
    return {};
  }
}

function formatDuration(ms) {
  if (!ms) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Load JSON ────────────────────────────────────────────────────────────────
async function loadLibrary() {
  try {
    const res = await fetch('assets/data/library.json');
    library = await res.json();
  } catch {
    library = [];
    showToast('Impossible de charger music_library.json', 'danger');
  }
  renderAll();
}

// ─── Filtering helpers ────────────────────────────────────────────────────────
function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchesSearch(item) {
  if (!searchQuery) return true;
  const q = normalize(searchQuery);
  return (
    normalize(item.artist).includes(q) ||
    normalize(item.album).includes(q) ||
    normalize(item.genre).includes(q) ||
    normalize(item.year).includes(q) ||
    (item.titles || []).some(t => normalize(t).includes(q))
  );
}

function getFilteredLibrary() {
  return library.filter(matchesSearch);
}

function getArtists() {
  const filtered = getFilteredLibrary();
  const seen = new Set();
  return filtered
    .map(i => i.artist)
    .filter(a => { if (seen.has(a)) return false; seen.add(a); return true; })
    .sort((a, b) => a.localeCompare(b));
}

function getAlbumsForArtist(artist) {
  return getFilteredLibrary().filter(i => i.artist === artist);
}

// ─── Render sidebar (artist list) ─────────────────────────────────────────────
function renderArtists() {
  const artists = getArtists();
  const container = document.getElementById('artist-list');
  container.innerHTML = '';

  // "All" entry
  const allItem = document.createElement('li');
  allItem.className = 'artist-item' + (!selectedArtist ? ' active' : '');
  allItem.innerHTML = `<span class="artist-name">Tous les artistes</span><span class="badge bg-secondary">${library.length}</span>`;
  allItem.addEventListener('click', () => {
    selectedArtist = null;
    selectedAlbum = null;
    renderAll();
  });
  container.appendChild(allItem);

  if (artists.length === 0) {
    container.innerHTML += '<li class="text-muted px-3 py-2 small">Aucun résultat</li>';
    return;
  }

  artists.forEach(artist => {
    const count = getAlbumsForArtist(artist).length;
    const li = document.createElement('li');
    li.className = 'artist-item' + (selectedArtist === artist ? ' active' : '');
    li.innerHTML = `
      <span class="artist-name">${escapeHtml(artist)}</span>
      <span class="badge bg-secondary">${count}</span>`;
    li.addEventListener('click', () => {
      selectedArtist = artist;
      selectedAlbum = null;
      renderAll();
    });
    container.appendChild(li);
  });
}

// ─── Render album grid ────────────────────────────────────────────────────────
function renderAlbums() {
  const items = selectedArtist
    ? getAlbumsForArtist(selectedArtist)
    : getFilteredLibrary();

  const container = document.getElementById('album-grid');
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = '<p class="text-muted p-4">Aucun album trouvé.</p>';
    return;
  }

  items.forEach(item => {
    const isSelected = selectedAlbum === item;
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3 col-xl-2 mb-3';

    col.innerHTML = `
      <div class="album-card ${isSelected ? 'selected' : ''}" data-artist="${escapeHtml(item.artist)}" data-album="${escapeHtml(item.album)}">
        <div class="album-cover-wrap">
          <img src="assets/images/default_cover.svg" class="album-cover" alt="${escapeHtml(item.album)}" loading="lazy" />
          <div class="album-cover-overlay">
            <i class="bi bi-music-note-list"></i>
          </div>
        </div>
        <div class="album-info">
          <div class="album-title">${escapeHtml(item.album)}</div>
          <div class="album-artist">${escapeHtml(item.artist)}</div>
          <div class="album-meta">${item.year}${item.genre ? ' · ' + escapeHtml(item.genre) : ''}</div>
        </div>
      </div>`;

    col.querySelector('.album-card').addEventListener('click', () => {
      selectedAlbum = item;
      renderAll();
    });

    container.appendChild(col);

    // async cover fetch
    loadCoverForCard(col.querySelector('.album-cover'), item.artist, item.album);
  });
}

async function loadCoverForCard(imgEl, artist, album) {
  const url = await fetchCoverArt(artist, album);
  if (url && imgEl) {
    imgEl.src = url;
    imgEl.classList.add('loaded');
  }
}

// ─── Render track panel ────────────────────────────────────────────────────────
async function renderTracks() {
  const panel = document.getElementById('track-panel');
  const item = selectedAlbum;

  if (!item) {
    panel.innerHTML = `
      <div class="track-panel-empty">
        <i class="bi bi-vinyl"></i>
        <p>Sélectionne un album pour voir les pistes</p>
      </div>`;
    return;
  }

  // Skeleton
  panel.innerHTML = `
    <div class="track-panel-header">
      <img src="assets/images/default_cover.svg" id="tp-cover" class="tp-cover" />
      <div class="tp-meta">
        <div class="tp-album">${escapeHtml(item.album)}</div>
        <div class="tp-artist">${escapeHtml(item.artist)}</div>
        <div class="tp-year-genre">${item.year}${item.genre ? ' · ' + escapeHtml(item.genre) : ''}</div>
        <div class="tp-count">${item.titles.length} piste${item.titles.length > 1 ? 's' : ''}</div>
      </div>
    </div>
    <div id="track-list-wrap">
      <table class="table table-hover track-table">
        <thead>
          <tr>
            <th class="text-center">#</th>
            <th>Titre</th>
            <th class="text-end">Durée</th>
          </tr>
        </thead>
        <tbody id="track-tbody">
          ${item.titles.map((t, i) => `
            <tr class="track-row" data-idx="${i}">
              <td class="track-num text-center">${i + 1}</td>
              <td class="track-title">${escapeHtml(t)}</td>
              <td class="track-duration text-end" id="dur-${i}"><span class="skeleton-dur">—</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  // async cover
  const coverUrl = await fetchCoverArt(item.artist, item.album);
  const tpCover = document.getElementById('tp-cover');
  if (coverUrl && tpCover) {
    tpCover.src = coverUrl;
    tpCover.classList.add('loaded');
  }

  // async durations
  const meta = await fetchTrackMetadata(item.artist, item.album);
  item.titles.forEach((title, i) => {
    const cell = document.getElementById(`dur-${i}`);
    if (cell) {
      const dur = meta[title] ?? null;
      cell.innerHTML = formatDuration(dur);
    }
  });
}

// ─── Master render ─────────────────────────────────────────────────────────────
function renderAll() {
  renderArtists();
  renderAlbums();
  renderTracks();
  updateStats();
}

function updateStats() {
  const filtered = getFilteredLibrary();
  const total = filtered.reduce((s, i) => s + i.titles.length, 0);
  document.getElementById('stats-bar').textContent =
    `${filtered.length} album${filtered.length !== 1 ? 's' : ''} · ${total} piste${total !== 1 ? 's' : ''}`;
}

// ─── Search ────────────────────────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');

  input.addEventListener('input', () => {
    searchQuery = input.value.trim();
    clear.style.display = searchQuery ? 'block' : 'none';
    // Reset selections only if they no longer match
    if (selectedArtist && !getArtists().includes(selectedArtist)) {
      selectedArtist = null;
      selectedAlbum = null;
    }
    renderAll();
  });

  clear.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    clear.style.display = 'none';
    renderAll();
    input.focus();
  });
}

// ─── Toast helper ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const id = 'toast-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = `toast align-items-center text-bg-${type} border-0 show`;
  div.setAttribute('role', 'alert');
  div.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// ─── Utils ─────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  loadLibrary();
});
