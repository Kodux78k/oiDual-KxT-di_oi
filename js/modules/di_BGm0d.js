// di-bg.module.js
// DUAL.INFODOSE — DI Background Manager (IndexedDB-backed)
// Export: init()
// Also exposes globals for backward compatibility: window.di_* functions.

const STORAGE_KEY = 'di_bgImages';
const IDB = { name: 'InfodoseBG', store: 'bgAssets', version: 1 };

/* ---------------------------
   IndexedDB helpers
   --------------------------- */
function idbOpen() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(IDB.name, IDB.version);
    rq.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB.store)) {
        db.createObjectStore(IDB.store, { keyPath: 'id' });
      }
    };
    rq.onsuccess = (e) => res(e.target.result);
    rq.onerror = (e) => rej(e.target.error);
  });
}
async function idbPut(record) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction([IDB.store], 'readwrite');
    const store = tx.objectStore(IDB.store);
    const r = store.put(record);
    r.onsuccess = () => res(record);
    r.onerror = (e) => rej(e.target.error);
  });
}
async function idbGet(id) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction([IDB.store], 'readonly');
    const store = tx.objectStore(IDB.store);
    const r = store.get(id);
    r.onsuccess = (e) => res(e.target.result);
    r.onerror = (e) => rej(e.target.error);
  });
}
async function idbGetAll() {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction([IDB.store], 'readonly');
    const store = tx.objectStore(IDB.store);
    const r = store.getAll();
    r.onsuccess = (e) => res(e.target.result);
    r.onerror = (e) => rej(e.target.error);
  });
}
async function idbDelete(id) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction([IDB.store], 'readwrite');
    const store = tx.objectStore(IDB.store);
    const r = store.delete(id);
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}

/* ---------------------------
   Metadata in localStorage
   --------------------------- */
export function di_getBgImages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('di_getBgImages parse error', e);
    return [];
  }
}
export function di_saveBgImages(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.warn('di_saveBgImages', e);
  }
}

/* ---------------------------
   Utility: dataURL -> Blob
   --------------------------- */
async function dataUrlToBlob(dataUrl) {
  // fetch works for data URLs in browsers
  const r = await fetch(dataUrl);
  return await r.blob();
}

/* ---------------------------
   Migration from legacy data URLs in metadata
   - Converts entries with `.data` (data URL) into IDB blobs
   - Also migrates single legacy key 'di_bgImage' -> metadata+IDB
   --------------------------- */
async function migrateLegacyMetaToIDB() {
  try {
    const meta = di_getBgImages();
    let changed = false;
    for (let i = 0; i < meta.length; i++) {
      const item = meta[i];
      if (item && item.data && typeof item.data === 'string' && item.data.startsWith('data:')) {
        const id = 'bg_' + Date.now() + '_' + Math.floor(Math.random() * 9000 + 1000);
        const blob = await dataUrlToBlob(item.data);
        await idbPut({ id, name: item.name || 'migrated-bg', blob, created: item.created || Date.now() });
        meta[i] = { id, name: item.name || 'migrated-bg', active: !!item.active, created: item.created || Date.now() };
        changed = true;
      }
    }
    if (changed) di_saveBgImages(meta);
  } catch (e) {
    console.warn('migrateLegacyMetaToIDB', e);
  }

  // migrate single legacy key
  try {
    const single = localStorage.getItem('di_bgImage');
    const meta = di_getBgImages();
    if (single && (!meta || meta.length === 0)) {
      const id = 'bg_' + Date.now();
      const blob = await dataUrlToBlob(single);
      await idbPut({ id, name: 'migrated-bg', blob, created: Date.now() });
      di_saveBgImages([{ id, name: 'migrated-bg', active: true, created: Date.now() }]);
    }
  } catch (e) {
    console.warn('migrate single legacy', e);
  }
}

/* ---------------------------
   Apply background to DOM element
   Accepts: Blob | dataURL string | URL string | null
   --------------------------- */
export async function di_applyBackground(dataOrBlob) {
  const el = document.getElementById('bg-fake-custom');
  if (!el) return;
  el.style.transition = 'opacity 450ms ease, background-image 300ms ease';

  // revoke old objectURL if any
  if (el._diBlobUrl) {
    try { URL.revokeObjectURL(el._diBlobUrl); } catch (e) {}
    el._diBlobUrl = null;
  }

  if (!dataOrBlob) {
    el.style.backgroundImage = '';
    el.style.opacity = '0';
    const s = document.getElementById('bgStatusText');
    if (s) s.textContent = 'Nenhum';
    return;
  }

  try {
    if (dataOrBlob instanceof Blob) {
      const url = URL.createObjectURL(dataOrBlob);
      el._diBlobUrl = url;
      el.style.backgroundImage = `url("${url}")`;
    } else if (typeof dataOrBlob === 'string') {
      el.style.backgroundImage = `url("${dataOrBlob}")`;
    } else {
      console.warn('di_applyBackground unknown type', dataOrBlob);
      return;
    }
    el.style.opacity = '0.25';
    const s = document.getElementById('bgStatusText');
    if (s) s.textContent = 'Ativo';
  } catch (e) {
    console.warn('di_applyBackground error', e);
  }
}

/* ---------------------------
   Set active in metadata, apply blob from IDB
   --------------------------- */
export async function di_setActiveBg(id) {
  const meta = di_getBgImages().map(m => ({ ...m, active: m.id === id }));
  di_saveBgImages(meta);

  try {
    const rec = await idbGet(id);
    if (rec?.blob) {
      await di_applyBackground(rec.blob);
    } else {
      // fallback: metadata entry may have srcUrl or data
      const active = meta.find(m => m.id === id);
      if (active?.srcUrl) await di_applyBackground(active.srcUrl);
      else if (active?.data) await di_applyBackground(active.data);
    }
  } catch (e) {
    console.warn('di_setActiveBg error', e);
  }

  di_renderBgPanel();
}

/* ---------------------------
   Remove bg: delete meta + blob
   --------------------------- */
export async function di_removeBg(id) {
  try {
    await idbDelete(id);
  } catch (e) {
    console.warn('idb delete', e);
  }
  let meta = di_getBgImages().filter(b => b.id !== id);

  if (!meta.some(b => b.active) && meta[0]) {
    meta[0].active = true;
    const rec = await idbGet(meta[0].id);
    if (rec?.blob) await di_applyBackground(rec.blob);
    else if (meta[0].srcUrl) await di_applyBackground(meta[0].srcUrl);
  }
  if (meta.length === 0) await di_applyBackground(null);

  di_saveBgImages(meta);
  di_renderBgPanel();
}

/* ---------------------------
   Render thumbnail panel (tries to load blob async)
   --------------------------- */
export function di_renderBgPanel() {
  const panel = document.getElementById('bgThumbPanel');
  if (!panel) return;
  const meta = di_getBgImages();
  panel.innerHTML = '';

  if (!meta || meta.length === 0) {
    panel.innerHTML = '<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;font-size:0.85rem">Nenhum background salvo. Faça upload.</div>';
    return;
  }

  meta.forEach(m => {
    const wrapper = document.createElement('div');
    wrapper.className = 'di-bg-thumb';
    wrapper.style.position = 'relative';
    wrapper.style.height = '70px';
    wrapper.style.borderRadius = '8px';
    wrapper.style.cursor = 'pointer';
    wrapper.style.overflow = 'hidden';
    wrapper.style.border = m.active ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)';
    wrapper.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))';
    wrapper.title = (m.name || m.id) + (m.created ? ' · ' + new Date(m.created).toLocaleString() : '');
    wrapper.innerText = m.name || 'bg';

    // overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0))';
    wrapper.appendChild(overlay);

    // buttons
    const btns = document.createElement('div');
    btns.style.position = 'absolute';
    btns.style.right = '6px';
    btns.style.top = '6px';
    btns.style.display = 'flex';
    btns.style.gap = '6px';
    wrapper.appendChild(btns);

    const btnRemove = document.createElement('button');
    btnRemove.innerText = '✕';
    Object.assign(btnRemove.style, { background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '6px', padding: '4px 6px' });
    btns.appendChild(btnRemove);

    const btnApply = document.createElement('button');
    btnApply.innerText = '▶';
    Object.assign(btnApply.style, { background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '6px', padding: '4px 6px' });
    btns.appendChild(btnApply);

    wrapper.addEventListener('click', (e) => { if (e.target === btnRemove) return; di_setActiveBg(m.id); });
    btnApply.addEventListener('click', (e) => { e.stopPropagation(); di_setActiveBg(m.id); });
    btnRemove.addEventListener('click', (e) => { e.stopPropagation(); if (!confirm('Remover background?')) return; di_removeBg(m.id); });

    panel.appendChild(wrapper);

    // load blob async
    (async () => {
      try {
        const rec = await idbGet(m.id);
        if (rec?.blob) {
          const url = URL.createObjectURL(rec.blob);
          wrapper.style.backgroundImage = `url("${url}")`;
          wrapper.style.backgroundSize = 'cover';
          wrapper.style.backgroundPosition = 'center';
          wrapper.innerText = '';
          // store url for potential revoke
          wrapper._diBlobUrls = wrapper._diBlobUrls || [];
          wrapper._diBlobUrls.push(url);
        } else if (m.srcUrl) {
          wrapper.style.backgroundImage = `url("${m.srcUrl}")`;
          wrapper.style.backgroundSize = 'cover';
          wrapper.style.backgroundPosition = 'center';
          wrapper.innerText = '';
        } else if (m.data) {
          // legacy fallback
          wrapper.style.backgroundImage = `url("${m.data}")`;
          wrapper.style.backgroundSize = 'cover';
          wrapper.style.backgroundPosition = 'center';
          wrapper.innerText = '';
        }
      } catch (e) {
        console.warn('thumb load err', e);
      }
    })();
  });
}

/* ---------------------------
   Bind upload input (chains existing onchange if present)
   - saves blob to IDB and pushes new metadata
   --------------------------- */
function bindUploadInput() {
  const inp = document.getElementById('bgUploadInput');
  if (!inp) return;
  if (inp._diBound) return;
  inp._diBound = true;

  const diHandler = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const id = 'bg_' + Date.now() + '_' + Math.floor(Math.random() * 9000 + 1000);
      const blob = file;
      await idbPut({ id, name: file.name || 'bg', blob, created: Date.now() });

      const meta = di_getBgImages().map(x => ({ ...x, active: false })) || [];
      meta.unshift({ id, name: file.name || 'bg', active: true, created: Date.now() });
      di_saveBgImages(meta);

      await di_applyBackground(blob);
      di_renderBgPanel();
      try { inp.value = ''; } catch (err) {}
    } catch (err) {
      console.warn('diHandler upload error', err);
    }
  };

  if (typeof inp.onchange === 'function') {
    const old = inp.onchange;
    inp.addEventListener('change', (e) => {
      try { old.call(inp, e); } catch (err) { console.warn('old onchange error', err); }
      try { diHandler(e); } catch (err) { console.warn('di handler error', err); }
    });
  } else {
    inp.addEventListener('change', diHandler);
  }
}

/* ---------------------------
   Import from manifest (repo folder)
   manifest format: { images: [ { name, url }, ... ] }
   --------------------------- */
export async function di_importFromManifest(manifestUrl, { storeBlobs = true, applyFirst = true } = {}) {
  try {
    const r = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Manifest fetch failed: ' + r.status);
    const manifest = await r.json();
    if (!Array.isArray(manifest.images)) throw new Error('Manifest inválido: precisa de images[]');

    const meta = di_getBgImages().map(m => ({ ...m, active: false })) || [];

    for (const item of manifest.images) {
      try {
        const name = item.name || item.url.split('/').pop();
        const id = 'bg_' + Date.now() + '_' + Math.floor(Math.random() * 9000 + 1000);

        if (storeBlobs) {
          const imgRes = await fetch(item.url, { mode: 'cors' });
          if (!imgRes.ok) { console.warn('image fetch fail', item.url); continue; }
          const blob = await imgRes.blob();
          await idbPut({ id, name, blob, created: Date.now() });
        }

        meta.unshift({ id, name, active: false, created: Date.now(), srcUrl: item.url });
      } catch (e) {
        console.warn('import item err', item, e);
        continue;
      }
    }

    if (meta.length && applyFirst) {
      meta[0].active = true;
      const rec = await idbGet(meta[0].id);
      if (rec?.blob) await di_applyBackground(rec.blob);
      else if (meta[0].srcUrl) await di_applyBackground(meta[0].srcUrl);
    }

    di_saveBgImages(meta);
    di_renderBgPanel();
    return { success: true, count: meta.length };
  } catch (err) {
    console.error('di_importFromManifest error', err);
    return { success: false, error: err.message || err };
  }
}

/* ---------------------------
   Init: inject styles, migrate legacy, render, bind
   Exports: init()
   Also attaches globals for backward compat
   --------------------------- */
export async function init() {
  if (window.diBgModuleInitialized) return;
  window.diBgModuleInitialized = true;

  // inject small styles
  if (!document.getElementById('di-bg-thumb-styles')) {
    const s = document.createElement('style');
    s.id = 'di-bg-thumb-styles';
    s.innerHTML = `
      #bgThumbPanel .di-bg-thumb{ box-shadow: 0 6px 18px rgba(0,0,0,0.35); transition: transform .15s ease, box-shadow .15s ease; }
      #bgThumbPanel .di-bg-thumb:hover{ transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.45); }
      .di-bg-thumb .di-meta { position:absolute; left:8px; bottom:6px; color: rgba(255,255,255,0.85); font-size:10px; background:rgba(0,0,0,0.25); padding:2px 6px; border-radius:4px; }
    `;
    document.head.appendChild(s);
  }

  // attach globals for compatibility
  window.di_getBgImages = di_getBgImages;
  window.di_saveBgImages = di_saveBgImages;
  window.di_applyBackground = di_applyBackground;
  window.di_setActiveBg = di_setActiveBg;
  window.di_removeBg = di_removeBg;
  window.di_renderBgPanel = di_renderBgPanel;
  window.di_importFromManifest = di_importFromManifest;
  window.di_initBackgrounds = init;

  // migrate legacy base64 metadata to IDB
  try { await migrateLegacyMetaToIDB(); } catch (e) { console.warn('migration failed', e); }

  // render and bind
  di_renderBgPanel();
  bindUploadInput();

  // apply active if any
  const meta = di_getBgImages();
  const active = meta.find(m => m.active);
  if (active) {
    const rec = await idbGet(active.id);
    if (rec?.blob) await di_applyBackground(rec.blob);
    else if (active.srcUrl) await di_applyBackground(active.srcUrl);
    else if (active.data) await di_applyBackground(active.data);
  }
}

/* Auto-init after DOMContentLoaded so module works when added directly */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { init().catch(e => console.warn('di init error', e)); });
} else {
  // small async kick
  setTimeout(() => { init().catch(e => console.warn('di init error', e)); }, 0);
}

// default export convenience
export default { init, di_getBgImages, di_saveBgImages, di_setActiveBg, di_removeBg, di_importFromManifest };