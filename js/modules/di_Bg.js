
(function(){
  if (window.diBgOverrideInitialized) return;
  window.diBgOverrideInitialized = true;

  // ===== Helpers de storage
  window.di_getBgImages = function(){
    try {
      const raw = localStorage.getItem('di_bgImages');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch(e){ console.warn('di_getBgImages parse error', e); return []; }
  };

  window.di_saveBgImages = function(list){
    try {
      localStorage.setItem('di_bgImages', JSON.stringify(list || []));
    } catch(e){ console.warn('di_saveBgImages', e); }
  };

  // Migração simples: di_bgImage (single) -> di_bgImages (array)
  (function migrateSingleBg(){
    try {
      const single = localStorage.getItem('di_bgImage');
      const arr = di_getBgImages();
      if (single && (!arr || arr.length === 0)) {
        const id = 'bg_' + Date.now();
        di_saveBgImages([ { id, name: 'migrated-bg', data: single, active: true } ]);
      }
    } catch(e){}
  })();

  // ===== Aplicar background visual
  window.di_applyBackground = function(dataUrl){
    const el = document.getElementById('bg-fake-custom');
    if (!el) return;
    el.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : '';
    // transição sutil
    el.style.transition = 'opacity 450ms ease, background-image 300ms ease';
    el.style.opacity = dataUrl ? '0.25' : '0';
    // atualiza texto de status se existir
    const s = document.getElementById('bgStatusText');
    if (s) s.textContent = dataUrl ? 'Ativo' : 'Nenhum';
  };

  // ===== Ativar por id
  window.di_setActiveBg = function(id){
    const list = di_getBgImages();
    const next = list.map(b => ({ ...b, active: b.id === id }));
    di_saveBgImages(next);
    const active = next.find(b => b.active);
    if (active) di_applyBackground(active.data);
    di_renderBgPanel();
  };

  // ===== Remover
  window.di_removeBg = function(id){
    let list = di_getBgImages().filter(b => b.id !== id);
    // se remover o ativo, ativa o primeiro restante
    if (!list.some(b => b.active) && list[0]) {
      list[0].active = true;
      di_applyBackground(list[0].data);
    }
    // se vazio, limpa bg
    if (list.length === 0) di_applyBackground(null);
    di_saveBgImages(list);
    di_renderBgPanel();
  };

  // ===== Render thumbnails (melhorado)
  window.di_renderBgPanel = function(){
    const panel = document.getElementById('bgThumbPanel');
    if (!panel) return;
    const list = di_getBgImages();
    panel.innerHTML = '';

    if (list.length === 0) {
      panel.innerHTML = '<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;font-size:0.85rem">Nenhum background salvo. Faça upload.</div>';
      return;
    }

    list.forEach(bg => {
      const wrapper = document.createElement('div');
      wrapper.className = 'di-bg-thumb';
      wrapper.style.position = 'relative';
      wrapper.style.height = '70px';
      wrapper.style.borderRadius = '8px';
      wrapper.style.cursor = 'pointer';
      wrapper.style.backgroundImage = `url("${bg.data}")`;
      wrapper.style.backgroundSize = 'cover';
      wrapper.style.backgroundPosition = 'center';
      wrapper.style.overflow = 'hidden';
      wrapper.style.border = bg.active ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)';
      wrapper.title = bg.name || bg.id || 'background';

      // overlay dim (sutil)
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0))';
      wrapper.appendChild(overlay);

      // botões container
      const btns = document.createElement('div');
      btns.style.position = 'absolute';
      btns.style.right = '6px';
      btns.style.top = '6px';
      btns.style.display = 'flex';
      btns.style.gap = '6px';
      wrapper.appendChild(btns);

      // remover
      const btnRemove = document.createElement('button');
      btnRemove.className = 'di-bg-remove';
      btnRemove.innerText = '✕';
      btnRemove.title = 'Remover';
      btnRemove.style.background = 'rgba(0,0,0,0.6)';
      btnRemove.style.border = 'none';
      btnRemove.style.color = '#fff';
      btnRemove.style.fontSize = '11px';
      btnRemove.style.borderRadius = '6px';
      btnRemove.style.padding = '4px 6px';
      btns.appendChild(btnRemove);

      // aplicar (ícone)
      const btnApply = document.createElement('button');
      btnApply.innerText = '▶';
      btnApply.title = 'Aplicar';
      btnApply.style.background = 'rgba(0,0,0,0.45)';
      btnApply.style.border = 'none';
      btnApply.style.color = '#fff';
      btnApply.style.fontSize = '11px';
      btnApply.style.borderRadius = '6px';
      btnApply.style.padding = '4px 6px';
      btns.appendChild(btnApply);

      // clique no card aplica
      wrapper.addEventListener('click', (e) => {
        // evita conflito se clicar em botão
        if (e.target === btnRemove) return;
        di_setActiveBg(bg.id);
      });

      btnApply.addEventListener('click', (e) => {
        e.stopPropagation();
        di_setActiveBg(bg.id);
      });

      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Remover background?')) return;
        di_removeBg(bg.id);
      });

      panel.appendChild(wrapper);
    });
  };

  // ===== Upload handler seguro (evita múltiplos binds)
  function bindUploadInput(){
    const inp = document.getElementById('bgUploadInput');
    if (!inp) return;
    if (inp._diBound) return;
    inp._diBound = true;

    inp.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        // desativa todos antes de adicionar
        const list = di_getBgImages().map(b => ({ ...b, active: false })) || [];
        list.unshift({
          id: 'bg_' + Date.now(),
          name: file.name || 'bg',
          data: ev.target.result,
          active: true
        });
        di_saveBgImages(list);
        di_applyBackground(ev.target.result);
        di_renderBgPanel();
        // limpa o input pra permitir re-upload mesmo do mesmo arquivo
        try { inp.value = ''; } catch(e){}
      };
      reader.readAsDataURL(file);
    });
  }
/* ===== IDB HELPERS ===== */
const _DI_IDB = { name: 'InfodoseBG', store: 'bgAssets', ver: 1 };

function idbOpen() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(_DI_IDB.name, _DI_IDB.ver);
    rq.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(_DI_IDB.store)) db.createObjectStore(_DI_IDB.store, { keyPath: 'id' });
    };
    rq.onsuccess = e => res(e.target.result);
    rq.onerror = e => rej(e.target.error);
  });
}
async function idbPut(record) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction([_DI_IDB.store], 'readwrite');
    const store = tx.objectStore(_DI_IDB.store);
    const r = store.put(record);
    r.onsuccess = () => res(record);
    r.onerror = (e) => rej(e.target.error);
  });
}
async function idbGet(id) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction([_DI_IDB.store], 'readonly');
    const store = tx.objectStore(_DI_IDB.store);
    const r = store.get(id);
    r.onsuccess = (e) => res(e.target.result);
    r.onerror = (e) => rej(e.target.error);
  });
}
async function idbDelete(id) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction([_DI_IDB.store], 'readwrite');
    const store = tx.objectStore(_DI_IDB.store);
    const r = store.delete(id);
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}

/* ===== di_applyBackground: aceita dataURL OR Blob OR URL ===== */
window.di_applyBackground = async function(data) {
  const el = document.getElementById('bg-fake-custom');
  if (!el) return;
  el.style.transition = 'opacity 450ms ease, background-image 300ms ease';

  // limpa previous objectURL se existir
  if (el._diBlobUrl) { try{ URL.revokeObjectURL(el._diBlobUrl); }catch(e){} el._diBlobUrl = null; }

  if (!data) {
    el.style.backgroundImage = '';
    el.style.opacity = '0';
    const s = document.getElementById('bgStatusText'); if (s) s.textContent = 'Nenhum';
    return;
  }

  if (data instanceof Blob) {
    const url = URL.createObjectURL(data);
    el._diBlobUrl = url;
    el.style.backgroundImage = `url("${url}")`;
  } else if (typeof data === 'string') {
    el.style.backgroundImage = `url("${data}")`;
  } else {
    console.warn('di_applyBackground unknown type', data);
    return;
  }
  el.style.opacity = '0.25';
  const s = document.getElementById('bgStatusText'); if (s) s.textContent = 'Ativo';
};

/* ===== MIGRAR entradas legacy (com .data base64) para IDB ===== */
async function di_migrateMetaDataToIDB() {
  try {
    const meta = di_getBgImages();
    let changed = false;
    for (let i = 0; i < meta.length; i++) {
      const item = meta[i];
      if (item && item.data && typeof item.data === 'string' && item.data.startsWith('data:')) {
        // converter para blob e salvar no IDB
        const res = await fetch(item.data); // funciona para data: URLs
        const blob = await res.blob();
        const id = 'bg_' + (item.id || Date.now()) + '_' + Math.floor(Math.random()*9999);
        await idbPut({ id, name: item.name || 'bg', blob, created: item.created || Date.now() });
        // substitui meta entry (sem data)
        meta[i] = { id, name: item.name || 'migrated-bg', active: !!item.active, created: item.created || Date.now() };
        changed = true;
      }
    }
    if (changed) di_saveBgImages(meta);
  } catch (e) { console.warn('di_migrateMetaDataToIDB error', e); }
}

/* ===== bindUploadInput (IDB version) ===== */
function bindUploadInputIDB(){
  const inp = document.getElementById('bgUploadInput');
  if (!inp) return;
  if (inp._diBoundIDB) return;
  inp._diBoundIDB = true;

  inp.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const id = 'bg_' + Date.now() + '_' + Math.floor(Math.random()*9999);
      const blob = file; // file is a Blob
      await idbPut({ id, name: file.name || 'bg', blob, created: Date.now() });
      // update metadata (deactivate others)
      const list = di_getBgImages().map(b => ({ ...b, active: false })) || [];
      list.unshift({ id, name: file.name || 'bg', active: true, created: Date.now() });
      di_saveBgImages(list);
      // apply blob
      await window.di_applyBackground(blob);
      di_renderBgPanel();
      try { inp.value = ''; } catch(e){}
    } catch(err) {
      console.warn('bindUploadInputIDB error', err);
    }
  });
}

/* ===== di_renderBgPanel: tenta carregar blob do IDB para thumb ===== */
window.di_renderBgPanel = function(){
  const panel = document.getElementById('bgThumbPanel');
  if (!panel) return;
  const list = di_getBgImages();
  panel.innerHTML = '';

  if (list.length === 0) {
    panel.innerHTML = '<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;font-size:0.85rem">Nenhum background salvo. Faça upload.</div>';
    return;
  }

  list.forEach(bg => {
    const wrapper = document.createElement('div');
    wrapper.className = 'di-bg-thumb';
    wrapper.style.position = 'relative';
    wrapper.style.height = '70px';
    wrapper.style.borderRadius = '8px';
    wrapper.style.cursor = 'pointer';
    wrapper.style.overflow = 'hidden';
    wrapper.style.border = bg.active ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)';
    wrapper.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))';
    wrapper.title = bg.name || bg.id || 'background';

    // UI buttons (same do teu código)
    const btns = document.createElement('div');
    btns.style.position = 'absolute';
    btns.style.right = '6px';
    btns.style.top = '6px';
    btns.style.display = 'flex';
    btns.style.gap = '6px';
    wrapper.appendChild(btns);

    const btnRemove = document.createElement('button');
    btnRemove.innerText = '✕';
    Object.assign(btnRemove.style, { background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', padding:'4px 6px', borderRadius:'6px', fontSize:'11px' });
    btns.appendChild(btnRemove);

    const btnApply = document.createElement('button');
    btnApply.innerText = '▶';
    Object.assign(btnApply.style, { background:'rgba(0,0,0,0.45)', color:'#fff', border:'none', padding:'4px 6px', borderRadius:'6px', fontSize:'11px' });
    btns.appendChild(btnApply);

    wrapper.addEventListener('click', (e) => { if (e.target === btnRemove) return; di_setActiveBg(bg.id); });
    btnApply.addEventListener('click', (e)=>{ e.stopPropagation(); di_setActiveBg(bg.id); });
    btnRemove.addEventListener('click', (e)=>{ e.stopPropagation(); if (!confirm('Remover background?')) return; di_removeBg(bg.id); });

    panel.appendChild(wrapper);

    // async load blob from IDB
    (async () => {
      try {
        const rec = await idbGet(bg.id);
        if (rec && rec.blob) {
          const url = URL.createObjectURL(rec.blob);
          wrapper.style.backgroundImage = `url("${url}")`;
          wrapper.style.backgroundSize = 'cover';
          wrapper.style.backgroundPosition = 'center';
          wrapper.innerText = '';
          // keep ref to revoke later if needed
          if (!wrapper._diBlobUrls) wrapper._diBlobUrls = [];
          wrapper._diBlobUrls.push(url);
        } else if (bg.data) {
          // fallback legacy
          wrapper.style.backgroundImage = `url("${bg.data}")`;
          wrapper.style.backgroundSize = 'cover';
          wrapper.style.backgroundPosition = 'center';
          wrapper.innerText = '';
        } else {
          wrapper.innerText = bg.name || 'bg';
        }
      } catch(er){ console.warn('thumb load err', er); wrapper.innerText = bg.name || 'bg'; }
    })();
  });
};

/* ===== di_setActiveBg: busca blob do IDB e aplica ===== */
window.di_setActiveBg = function(id){
  const list = di_getBgImages();
  const next = list.map(b => ({ ...b, active: b.id === id }));
  di_saveBgImages(next);
  (async () => {
    try {
      const rec = await idbGet(id);
      if (rec && rec.blob) await window.di_applyBackground(rec.blob);
      else {
        const active = next.find(b => b.id === id);
        if (active?.data) await window.di_applyBackground(active.data);
      }
      di_renderBgPanel();
    } catch(e){ console.warn('di_setActiveBg idb err', e); di_renderBgPanel(); }
  })();
};

/* ===== di_removeBg: remove from metadata AND from IDB ===== */
window.di_removeBg = function(id){
  (async () => {
    try {
      await idbDelete(id);
    } catch(e){ console.warn('idb delete err', e); }
    let list = di_getBgImages().filter(b => b.id !== id);
    if (!list.some(b => b.active) && list[0]) {
      list[0].active = true;
      // try apply new active
      const rec = await idbGet(list[0].id);
      if (rec?.blob) await window.di_applyBackground(rec.blob);
      else if (list[0].data) await window.di_applyBackground(list[0].data);
    }
    if (list.length === 0) await window.di_applyBackground(null);
    di_saveBgImages(list);
    di_renderBgPanel();
  })();
};

/* ===== Alterar initOnce para usar migrate + bindUploadInputIDB ===== */
/* Substitui chamadas dentro do teu initOnce atual por estas linhas: */
(async function _di_init_replace() {
  // chama migração (se tiver entradas com .data)
  try { await di_migrateMetaDataToIDB(); } catch(e){ console.warn('migrate err', e); }
  // render e bind IDB upload
  di_renderBgPanel();
  bindUploadInputIDB();
})();
  // ===== Inicialização segura
  function initOnce(){
    // injeta estilos locais mínimos (se ainda não tiver)
    if (!document.getElementById('di-bg-thumb-styles')) {
      const s = document.createElement('style');
      s.id = 'di-bg-thumb-styles';
      s.innerHTML = `
        #bgThumbPanel .di-bg-thumb{ box-shadow: 0 6px 18px rgba(0,0,0,0.35); transition: transform .15s ease, box-shadow .15s ease; }
        #bgThumbPanel .di-bg-thumb:hover{ transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.45); }
      `;
      document.head.appendChild(s);
    }

    // apply active bg if exists
    const list = di_getBgImages();
    const active = list.find(b => b.active);
    if (active) di_applyBackground(active.data);

    // render panel and bind upload input
    di_renderBgPanel();
    bindUploadInput();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnce);
  } else {
    setTimeout(initOnce, 0);
  }

  // expõe init pra debug
  window.di_initBackgrounds = initOnce;

})();

