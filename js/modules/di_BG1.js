/* di_BG_unified.js
   Unified BG Panel UI + IndexedDB engine (non-module, global IIFE)
   Usage: <script src=".../di_BG_unified.js"></script>
*/
(function(){
  if (window.diBgUnifiedInitialized) return;
  window.diBgUnifiedInitialized = true;

  const STORAGE_KEY = 'di_bgImages';
  const IDB = { name: 'InfodoseBG', store: 'bgAssets', version: 1 };

  /* ---------------- IDB helpers ---------------- */
  function idbOpen() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open(IDB.name, IDB.version);
      rq.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB.store)) db.createObjectStore(IDB.store, { keyPath: 'id' });
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

  /* -------------- localStorage helpers -------------- */
  function di_getBgImages_local() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn('di_getBgImages parse error', e);
      return [];
    }
  }
  function di_saveBgImages_local(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
    } catch (e) {
      console.warn('di_saveBgImages', e);
    }
  }

  /* --------- utility: dataURL -> Blob --------- */
  async function dataUrlToBlob(dataUrl) {
    const r = await fetch(dataUrl);
    return await r.blob();
  }

  /* --------- migration: legacy base64/meta -> IDB --------- */
  async function migrateLegacyMetaToIDB() {
    try {
      const meta = di_getBgImages_local();
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
      if (changed) di_saveBgImages_local(meta);
    } catch (e) {
      console.warn('migrateLegacyMetaToIDB', e);
    }

    // single legacy key
    try {
      const single = localStorage.getItem('di_bgImage');
      const current = di_getBgImages_local();
      if (single && (!current || current.length === 0)) {
        const id = 'bg_' + Date.now();
        const blob = await dataUrlToBlob(single);
        await idbPut({ id, name: 'migrated-bg', blob, created: Date.now() });
        di_saveBgImages_local([{ id, name: 'migrated-bg', active: true, created: Date.now() }]);
      }
    } catch (e) {
      console.warn('migrate single legacy', e);
    }
  }

  /* -------------- UI helper: revoke old thumb URLs -------------- */
  function revokeThumbUrls(panel) {
    try {
      const thumbs = panel?.querySelectorAll('.di-bg-thumb');
      if (!thumbs) return;
      thumbs.forEach(t => {
        if (t._diBlobUrls && t._diBlobUrls.length) {
          t._diBlobUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(_){} });
          t._diBlobUrls = [];
        }
      });
    } catch (_) {}
  }

  /* ---------------- apply background ---------------- */
  async function di_applyBackground_impl(dataOrBlob) {
    const el = document.getElementById('bg-fake-custom');
    if (!el) return;
    el.style.transition = 'opacity 450ms ease, background-image 300ms ease';

    if (el._diBlobUrl) { try { URL.revokeObjectURL(el._diBlobUrl); } catch(_){} el._diBlobUrl = null; }

    if (!dataOrBlob) {
      el.style.backgroundImage = '';
      el.style.opacity = '0';
      const s = document.getElementById('bgStatusText'); if (s) s.textContent = 'Nenhum';
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
      const s = document.getElementById('bgStatusText'); if (s) s.textContent = 'Ativo';
    } catch (e) {
      console.warn('di_applyBackground error', e);
    }
  }

  /* --------------- set active --------------- */
  async function di_setActiveBg_impl(id) {
    const meta = di_getBgImages_local().map(m => ({ ...m, active: m.id === id }));
    di_saveBgImages_local(meta);

    try {
      const rec = await idbGet(id);
      if (rec?.blob) {
        await di_applyBackground_impl(rec.blob);
      } else {
        const active = meta.find(m => m.id === id);
        if (active?.srcUrl) await di_applyBackground_impl(active.srcUrl);
        else if (active?.data) await di_applyBackground_impl(active.data);
      }
    } catch (e) {
      console.warn('di_setActiveBg error', e);
    }
    di_renderBgPanel_impl();
  }

  /* --------------- remove bg --------------- */
  async function di_removeBg_impl(id) {
    try { await idbDelete(id); } catch (e) { console.warn('idb delete err', e); }
    let meta = di_getBgImages_local().filter(b => b.id !== id);

    if (!meta.some(b => b.active) && meta[0]) {
      meta[0].active = true;
      const rec = await idbGet(meta[0].id);
      if (rec?.blob) await di_applyBackground_impl(rec.blob);
      else if (meta[0].srcUrl) await di_applyBackground_impl(meta[0].srcUrl);
      else if (meta[0].data) await di_applyBackground_impl(meta[0].data);
    }
    if (meta.length === 0) await di_applyBackground_impl(null);

    di_saveBgImages_local(meta);
    di_renderBgPanel_impl();
  }

  /* --------------- render panel --------------- */
  function di_renderBgPanel_impl() {
    const panel = document.getElementById('bgThumbPanel');
    if (!panel) return;

    // revoke old URLs
    revokeThumbUrls(panel);

    const meta = di_getBgImages_local();
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
      btnRemove.className = 'di-bg-btn di-bg-remove';
      // Object.assign(btnRemove.style, { background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '6px', padding: '4px 6px' });
      btns.appendChild(btnRemove);

      const btnApply = document.createElement('button');
btnApply.innerText = '▶';
btnApply.className = 'di-bg-btn di-bg-apply';
      // Object.assign(btnApply.style, { background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', fontSize: '11px', borderRadius: '6px', padding: '4px 6px' });
      btns.appendChild(btnApply);

      wrapper.addEventListener('click', (e) => { if (e.target === btnRemove) return; di_setActiveBg_impl(m.id); });
      btnApply.addEventListener('click', (e) => { e.stopPropagation(); di_setActiveBg_impl(m.id); });
      btnRemove.addEventListener('click', (e) => { e.stopPropagation(); if (!confirm('Remover background?')) return; di_removeBg_impl(m.id); });

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
            wrapper._diBlobUrls = wrapper._diBlobUrls || [];
            wrapper._diBlobUrls.push(url);
          } else if (m.srcUrl) {
            wrapper.style.backgroundImage = `url("${m.srcUrl}")`;
            wrapper.style.backgroundSize = 'cover';
            wrapper.style.backgroundPosition = 'center';
            wrapper.innerText = '';
          } else if (m.data) {
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

  /* --------------- upload binding (IDB) --------------- */
  function bindUploadInput_impl() {
    const inp = document.getElementById('bgUploadInput');
    if (!inp) return;
    if (inp._diBound) return;
    inp._diBound = true;

    const diHandler = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const id = 'bg_' + Date.now() + '_' + Math.floor(Math.random() * 9000 + 1000);
        await idbPut({ id, name: file.name || 'bg', blob: file, created: Date.now() });

        const meta = di_getBgImages_local().map(x => ({ ...x, active: false })) || [];
        meta.unshift({ id, name: file.name || 'bg', active: true, created: Date.now() });
        di_saveBgImages_local(meta);

        await di_applyBackground_impl(file);
        di_renderBgPanel_impl();
        try { inp.value = ''; } catch (err) {}
      } catch (err) {
        console.warn('diHandler upload error', err);
      }
    };

    // If another onchange exists, chain it safely
    if (typeof inp.onchange === 'function') {
      const old = inp.onchange;
      inp.addEventListener('change', (e) => { try { old.call(inp, e); } catch (err) { console.warn('old onchange error', err); } try { diHandler(e); } catch (err) { console.warn('di handler error', err); } });
    } else {
      inp.addEventListener('change', diHandler);
    }
  }

  /* --------------- import from manifest --------------- */
  async function di_importFromManifest_impl(manifestUrl, { storeBlobs = true, applyFirst = true } = {}) {
    try {
      const r = await fetch(manifestUrl, { cache: 'no-cache' });
      if (!r.ok) throw new Error('Manifest fetch failed: ' + r.status);
      const manifest = await r.json();
      if (!Array.isArray(manifest.images)) throw new Error('Manifest inválido: precisa de images[]');

      const meta = di_getBgImages_local().map(m => ({ ...m, active: false })) || [];

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
        if (rec?.blob) await di_applyBackground_impl(rec.blob);
        else if (meta[0].srcUrl) await di_applyBackground_impl(meta[0].srcUrl);
      }

      di_saveBgImages_local(meta);
      di_renderBgPanel_impl();
      return { success: true, count: meta.length };
    } catch (err) {
      console.error('di_importFromManifest error', err);
      return { success: false, error: err.message || err };
    }
  }

  /* --------------- init --------------- */
  async function init() {
    if (window.diBgUnifiedReady) return;
    window.diBgUnifiedReady = true;

    // inject styles
    if (!document.getElementById('di-bg-thumb-styles')) {
      const s = document.createElement('style');
      s.id = 'di-bg-thumb-styles';
      s.innerHTML = `
        #bgThumbPanel .di-bg-thumb{ box-shadow: 0 6px 18px rgba(0,0,0,0.35); transition: transform .15s ease, box-shadow .15s ease; }
        #bgThumbPanel .di-bg-thumb:hover{ transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.45); }
        .di-bg-thumb .di-meta { position:absolute; left:8px; bottom:6px; color: rgba(255,255,255,0.85); font-size:10px; background:rgba(0,0,0,0.25); padding:2px 6px; border-radius:4px; }
        /* botão aplicar */
#bgThumbPanel .di-bg-thumb .di-bg-apply {
  background: rgba(0,0,0,.45);
}

/* botão remover */
#bgThumbPanel .di-bg-thumb .di-bg-remove {
  background: rgba(180,40,40,.75);
}

#bgThumbPanel .di-bg-thumb .di-bg-remove:hover {
  background: rgba(220,60,60,.9);
}
      `;
      document.head.appendChild(s);
    }

    // expose globals (compat)
    window.di_getBgImages = di_getBgImages_local;
    window.di_saveBgImages = di_saveBgImages_local;
    window.di_applyBackground = di_applyBackground_impl;
    window.di_setActiveBg = di_setActiveBg_impl;
    window.di_removeBg = di_removeBg_impl;
    window.di_renderBgPanel = di_renderBgPanel_impl;
    window.di_importFromManifest = di_importFromManifest_impl;
    window.di_initBackgrounds = init;

    // migrate legacy metadata to IDB
    try { await migrateLegacyMetaToIDB(); } catch (e) { console.warn('migration failed', e); }

    // render UI and bind upload
    di_renderBgPanel_impl();
    bindUploadInput_impl();

    // apply active if any (try IDB first)
    const meta = di_getBgImages_local();
    const active = meta.find(m => m.active);
    if (active) {
      try {
        const rec = await idbGet(active.id);
        if (rec?.blob) await di_applyBackground_impl(rec.blob);
        else if (active.srcUrl) await di_applyBackground_impl(active.srcUrl);
        else if (active.data) await di_applyBackground_impl(active.data);
      } catch (e) { console.warn('apply active err', e); }
    }
  }

  // auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init().catch(e => console.warn('di init error', e)); });
  } else {
    setTimeout(() => { init().catch(e => console.warn('di init error', e)); }, 0);
  }

  // expose for manual init if needed
  window.di_BG_unified = { init };

  // done
})();