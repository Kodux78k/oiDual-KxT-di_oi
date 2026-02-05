/* =========================================================
   DUAL.INFODOSE v7.9 — KOBLLUX VISIO & MEMORIA
   (Módulo com suporte a di_bgImages integrado)
========================================================= */

const STORAGE = {
    API_KEY: 'di_apiKey',
    MODEL: 'di_modelName',
    SYSTEM_ROLE: 'di_systemRole',
    USER_ID: 'di_userName',
    BG_IMAGE: 'di_bgImage',
    CUSTOM_CSS: 'di_customCss',
    SOLAR_MODE: 'di_solarMode',
    SOLAR_AUTO: 'di_solarAuto',
    INFODOSE_NAME: 'di_infodoseName',
    ASSISTANT_ENABLED: 'di_assistantEnabled',
    TRAINING_ACTIVE: 'di_trainingActive',
    TRAINING_TEXT: 'di_trainingText',
    MESSAGES: 'di_messages'
};

/* =========================
   DI BACKGROUNDS (override portable)
   - Exposto globalmente (window.di_*)
   - Seguro pra usar junto do indexedDB handler já existente
   ========================= */

(function(){
  if (window.diBgOverrideInitialized) return;
  window.diBgOverrideInitialized = true;

  // storage helpers
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

  // migrate single di_bgImage -> di_bgImages[]
  (function migrateSingleBg(){
    try {
      const single = localStorage.getItem('di_bgImage');
      const arr = window.di_getBgImages();
      if (single && (!arr || arr.length === 0)) {
        const id = 'bg_' + Date.now();
        window.di_saveBgImages([ { id, name: 'migrated-bg', data: single, active: true } ]);
      }
    } catch(e){}
  })();

  // apply visual background
  window.di_applyBackground = function(dataUrl){
    const el = document.getElementById('bg-fake-custom');
    if (!el) return;
    el.style.transition = 'opacity 450ms ease, background-image 300ms ease';
    if (dataUrl) {
      el.style.backgroundImage = `url("${dataUrl}")`;
      el.style.opacity = '0.25';
    } else {
      el.style.backgroundImage = '';
      el.style.opacity = '0';
    }
    const s = document.getElementById('bgStatusText');
    if (s) s.textContent = dataUrl ? 'Ativo' : 'Nenhum';
  };

  // set active
  window.di_setActiveBg = function(id){
    const list = window.di_getBgImages();
    const next = list.map(b => ({ ...b, active: b.id === id }));
    window.di_saveBgImages(next);
    const active = next.find(b => b.active);
    if (active) window.di_applyBackground(active.data);
    window.di_renderBgPanel();
  };

  // remove bg
  window.di_removeBg = function(id){
    let list = window.di_getBgImages().filter(b => b.id !== id);
    if (!list.some(b => b.active) && list[0]) {
      list[0].active = true;
      window.di_applyBackground(list[0].data);
    }
    if (list.length === 0) window.di_applyBackground(null);
    window.di_saveBgImages(list);
    window.di_renderBgPanel();
  };

  // render thumbnails
  window.di_renderBgPanel = function(){
    const panel = document.getElementById('bgThumbPanel');
    if (!panel) return;
    const list = window.di_getBgImages();
    panel.innerHTML = '';

    if (!list || list.length === 0) {
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

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0))';
      wrapper.appendChild(overlay);

      const btns = document.createElement('div');
      btns.style.position = 'absolute';
      btns.style.right = '6px';
      btns.style.top = '6px';
      btns.style.display = 'flex';
      btns.style.gap = '6px';
      wrapper.appendChild(btns);

      const btnRemove = document.createElement('button');
      btnRemove.className = 'di-bg-remove';
      btnRemove.innerText = '✕';
      btnRemove.title = 'Remover';
      Object.assign(btnRemove.style, {
        background: 'rgba(0,0,0,0.6)',
        border: 'none',
        color: '#fff',
        fontSize: '11px',
        borderRadius: '6px',
        padding: '4px 6px'
      });
      btns.appendChild(btnRemove);

      const btnApply = document.createElement('button');
      btnApply.innerText = '▶';
      btnApply.title = 'Aplicar';
      Object.assign(btnApply.style, {
        background: 'rgba(0,0,0,0.45)',
        border: 'none',
        color: '#fff',
        fontSize: '11px',
        borderRadius: '6px',
        padding: '4px 6px'
      });
      btns.appendChild(btnApply);

      wrapper.addEventListener('click', (e) => {
        if (e.target === btnRemove) return;
        window.di_setActiveBg(bg.id);
      });

      btnApply.addEventListener('click', (e) => {
        e.stopPropagation();
        window.di_setActiveBg(bg.id);
      });

      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Remover background?')) return;
        window.di_removeBg(bg.id);
      });

      panel.appendChild(wrapper);
    });
  };

  // bind upload input safely, preserving existing onchange if exists
  function bindUploadInput(){
    const inp = document.getElementById('bgUploadInput');
    if (!inp) return;
    if (inp._diBound) return;
    inp._diBound = true;

    const diHandler = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        const list = window.di_getBgImages().map(b => ({ ...b, active: false })) || [];
        list.unshift({
          id: 'bg_' + Date.now(),
          name: file.name || 'bg',
          data: ev.target.result,
          active: true
        });
        window.di_saveBgImages(list);
        window.di_applyBackground(ev.target.result);
        window.di_renderBgPanel();
        try { inp.value = ''; } catch(e){}
      };
      reader.readAsDataURL(file);
    };

    // if there's an existing onchange handler (e.g., App.indexedDB.handleBackgroundUpload), chain both
    if (typeof inp.onchange === 'function') {
      const old = inp.onchange;
      inp.addEventListener('change', (e) => {
        try { old.call(inp, e); } catch(err){ console.warn('old onchange error', err); }
        try { diHandler(e); } catch(err){ console.warn('di handler error', err); }
      });
    } else {
      inp.addEventListener('change', diHandler);
    }
  }

  // init once: inject styles, apply active bg, render panel, bind upload
  function initOnce(){
    if (!document.getElementById('di-bg-thumb-styles')) {
      const s = document.createElement('style');
      s.id = 'di-bg-thumb-styles';
      s.innerHTML = `
        #bgThumbPanel .di-bg-thumb{ box-shadow: 0 6px 18px rgba(0,0,0,0.35); transition: transform .15s ease, box-shadow .15s ease; }
        #bgThumbPanel .di-bg-thumb:hover{ transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.45); }
      `;
      document.head.appendChild(s);
    }

    const list = window.di_getBgImages();
    const active = list.find(b => b.active);
    if (active) window.di_applyBackground(active.data);

    window.di_renderBgPanel();
    bindUploadInput();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnce);
  } else {
    setTimeout(initOnce, 0);
  }

  window.di_initBackgrounds = initOnce;

})(); // fim di override

/* =========================================================
   CONTINUAÇÃO DO MÓDULO ORIGINAL (App, KoblluxCore, etc.)
   ========================================================= */

// KODUX ARQUÉTIPOS E FASES
const KODUX = {
    ARQUETIPOS: { "Atlas":{Essencia:"Planejador"}, "Nova":{Essencia:"Inspira"}, "Vitalis":{Essencia:"Momentum"}, "Pulse":{Essencia:"Emocional"}, "Artemis":{Essencia:"Descoberta"}, "Serena":{Essencia:"Cuidado"}, "Kaos":{Essencia:"Transformador"}, "Genus":{Essencia:"Fabricus"}, "Lumine":{Essencia:"Alegria"}, "Solus":{Essencia:"Sabedoria"}, "Rhea":{Essencia:"Vínculo"}, "Aion":{Essencia:"Tempo"} },
    PROJETO: { "I. INTRODUÇÃO":{fase:"KODUX (Δ³)",arquetipos:["Atlas","Nova","Pulse"]}, "II. ATO I":{fase:"BLLUE (Δ⁶)",arquetipos:["Vitalis","Pulse","Genus"]}, "III. ATO II":{fase:"EXPANSÃO (Δ⁹)",arquetipos:["Genus","Nova","Vitalis"]}, "IV. ATO III":{fase:"CONVERGÊNCIA (Δ⁹)",arquetipos:["Genus","Aion","Pulse"]}, "V. EPÍLOGO":{fase:"VERBO ETERNO (Δ⁷)",arquetipos:["Atlas","Aion","Genus"]} }
};

/* ═══════════════════════════════════════════════════════════════
   INTEGRAÇÃO DE CONSTANTES di_* DO LOCALSTORAGE
   ═══════════════════════════════════════════════════════════════ */

function initDIConstants() {
    const di_userName = localStorage.getItem('di_userName') || 'Viajante';
    const di_infodoseName = localStorage.getItem('di_infodoseName') || 'KOBLLUX';
    const di_apiKey = localStorage.getItem('di_apiKey') || '';
    const di_modelName = localStorage.getItem('di_modelName') || 'nvidia/nemotron-3-nano-30b-a3b:free';
    const di_systemRole = localStorage.getItem('di_systemRole') || 'oi Dual';
    const di_solarMode = localStorage.getItem('di_solarMode') || 'night';
    const di_assistantEnabled = localStorage.getItem('di_assistantEnabled') === '1';
    const di_trainingActive = localStorage.getItem('di_trainingActive') === '1';
    const di_trainingText = localStorage.getItem('di_trainingText') || '';
    
    // Atualizar elementos da UI
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        usernameDisplay.textContent = di_userName;
    }
    
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
        modeIndicator.textContent = `${di_infodoseName} · ${di_solarMode.toUpperCase()}`;
    }
    
    // Preencher inputs com valores salvos
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) apiKeyInput.value = di_apiKey;
    
    const systemRoleInput = document.getElementById('systemRoleInput');
    if (systemRoleInput) systemRoleInput.value = di_systemRole;
    
    const inputUserId = document.getElementById('inputUserId');
    if (inputUserId) inputUserId.value = di_userName;
    
    const inputModel = document.getElementById('inputModel');
    if (inputModel) inputModel.value = di_modelName;
    
    // Salvar no localStorage se não existir
    if (!localStorage.getItem('di_userName')) localStorage.setItem('di_userName', di_userName);
    if (!localStorage.getItem('di_infodoseName')) localStorage.setItem('di_infodoseName', di_infodoseName);
    if (!localStorage.getItem('di_solarMode')) localStorage.setItem('di_solarMode', di_solarMode);
    
    console.log('[DI_CONSTANTS] Inicializado:', { di_userName, di_infodoseName, di_apiKey: di_apiKey ? '✓' : '✗' });
}

// Chamar ao carregar a página
document.addEventListener('DOMContentLoaded', initDIConstants);

const FOOTER_TEXTS = { closed:{ritual:["tocar o campo é consentir","registro aguarda presença"],tecnico:["latência detectada","aguardando input"]}, open:{sustentado:["campo ativo","consciência expandida"],estavel:["sinal estabilizado","link neural firme"]}, loading:["sincronizando neuro-link...","buscando no éter...","decodificando sinal..."] };

let lastText = null;
function getRandomText(arr){ if(!arr||arr.length===0)return"Processando..."; let t; do{t=arr[Math.floor(Math.random()*arr.length)];}while(t===lastText&&arr.length>1); lastText=t; return t; }

/* ---------------------------------------------------------
   KOBLLUX CORE (3-6-9-7)
   --------------------------------------------------------- */
const KoblluxCore = {
    async sha256Hex(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join(''); },
    classifyText(s) { const t = (s.match(/[\p{L}\p{N}_-]+/gu)||[]); const endsV = ['ar','er','ir']; const verbs=[],nouns=[],adjs=[]; for (const w0 of t){ const w = w0.toLowerCase(); if(w.endsWith('mente')){adjs.push(w0);continue;} if(endsV.some(e=>w.endsWith(e))){verbs.push(w0);continue;} if(w.endsWith('ção')||w.endsWith('são')||w.endsWith('dade')){nouns.push(w0);continue;} if(/^[A-Z]/.test(w0)){nouns.push(w0);continue;} } return {tokens:t, verbs, nouns, adjs}; },
    mapTrinity(pos) { return { UNO: pos.nouns[0]||'NÚCLEO', DUAL: pos.verbs[0]||'relaciona', TRINITY: pos.adjs[0]||'integrado' }; },
    async process(input) { if(!input)return null; const pos=this.classifyText(input); const tri=this.mapTrinity(pos); const seal=await this.sha256Hex(input+new Date().toISOString()); return { raw:input, pos:pos, trinity:tri, seal:seal.slice(0,16), log:`[KOBLLUX ∆7] UNO:${tri.UNO}|DUAL:${tri.DUAL}|TRI:${tri.TRINITY}::SEAL:${seal.slice(0,8)}` }; }
};

/* ---------------------------------------------------------
   UTILS: DOWNLOAD, PREVIEW, ZIP
   (mantive como no teu arquivo original)
   --------------------------------------------------------- */
const DownloadUtils = {
  /* ... mantive igual ao teu original ... */
  _getBlock(btn) { return btn.closest('.msg-block'); },
  _getCleanHtml(block) { const clone = block.cloneNode(true); const tools = clone.querySelector('.msg-tools'); if(tools) tools.remove(); return clone.innerHTML; },
  _guessFilename(base, extFallback='txt') { const t = new Date().toISOString().replace(/[:.]/g,'-'); if (!base) return `ai-output-${t}.${extFallback}`; if (/<\s*!doctype|<html|<body|<head/i.test(base)) return `ai-output-${t}.html`; if (/<pre|<code/i.test(base)) return `ai-code-${t}.${extFallback}`; return `ai-output-${t}.${extFallback}`; },
  downloadMessage(btn) { try { const block = this._getBlock(btn); if(!block) return; const content = this._getCleanHtml(block); const isHTML = /<\s*!doctype|<html|<body|<head|<\/div>/i.test(content); const mime = isHTML ? 'text/html' : 'text/plain'; const ext = isHTML ? 'html' : 'txt'; const filename = this._guessFilename(content, ext); const blob = new Blob([content], { type: mime + ';charset=utf-8' }); this.triggerDownload(blob, filename); App.showToast(`Download: ${filename}`); } catch(e){ App.showToast('Erro download', true); } },
  downloadMarkdown(btn) { try { const block = this._getBlock(btn); if(!block) return; const raw = block.dataset.raw || block.innerText || ''; const filename = this._guessFilename(raw, 'md').replace(/\.(html|txt)$/, '.md'); const blob = new Blob([raw], { type: 'text/markdown;charset=utf-8' }); this.triggerDownload(blob, filename); App.showToast(`MD salvo: ${filename}`); } catch(e){ App.showToast('Erro MD', true); } },
  openSandbox(btn) { try { const block = this._getBlock(btn); if(!block) return; const content = this._getCleanHtml(block); let page = content; if(!/<\s*!doctype|<html/i.test(content)) page = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sandbox</title></head><body>${content}</body></html>`; const blob = new Blob([page], { type: 'text/html' }); const url = URL.createObjectURL(blob); window.open(url, '_blank'); App.showToast('Sandbox aberto'); } catch(e){ App.showToast('Erro sandbox', true); } },
  async exportPdf(btn) { try { if(typeof html2pdf === 'undefined') { App.showToast('PDF lib ausente. Use Sandbox.', true); return this.openSandbox(btn); } const block = this._getBlock(btn); if(!block) return; const content = this._getCleanHtml(block); const container = document.createElement('div'); container.style.position = 'fixed'; container.style.left = '-9999px'; container.style.width = '1100px'; container.style.padding = '20px'; container.style.background = '#ffffff'; container.innerHTML = content; document.body.appendChild(container); const filename = this._guessFilename(content, 'pdf').replace(/\.(html|txt)$/, '.pdf'); await html2pdf().from(container).set({ margin: 12, filename: filename, html2canvas: { scale: 2 }, jsPDF: { unit: 'pt', format: 'a4' } }).save(); document.body.removeChild(container); App.showToast(`PDF: ${filename}`); } catch(e){ App.showToast('Erro PDF', true); } },
  triggerDownload(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 2000); }
};

/* ... resto do teu código App, Preview, ZipGenerator, Utils, App controller ... 
   Mantive o corpo do App igual ao teu arquivo original mas aqui só inclui a alteração:
   no final de App.init() eu chamei window.di_initBackgrounds() pra garantir sync
*/

/* ---------------------------------------------------------
   MAIN APP CONTROLLER
   --------------------------------------------------------- */
const Preview = {
  /* mantido igual ao original */
  async renderPreview(file) {
      const type = file.type || 'text/plain'; const name = file.name || 'arquivo'; const url = URL.createObjectURL(file);
      if (type === 'text/html' || name.endsWith('.html')) { const text = await file.text(); const blob = new Blob([this.sanitizeHTML(text)], { type: 'text/html' }); return `<div class="preview-html"><iframe src="${URL.createObjectURL(blob)}" sandbox="allow-scripts"></iframe></div>`; }
      if (type.startsWith('image/')) return `<div class="preview-html"><img src="${url}" style="width:100%;height:100%;object-fit:contain;background:#000;"></div>`;
      const text = await file.text(); const ext = name.split('.').pop() || 'txt'; const code = this.escapeHTML(text.slice(0, 2000)); setTimeout(() => { hljs.highlightAll(); }, 0); return `<div class="preview-code"><pre><code class="language-${ext}">${code}</code></pre></div>`;
  },
  sanitizeHTML(html) { const div = document.createElement('div'); div.innerHTML = html; div.querySelectorAll('script').forEach(s => s.remove()); return div.innerHTML; },
  escapeHTML(str) { return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); },
  createHtmlViewer(htmlCode) {
    const id = 'html-' + Date.now();
    const blob = new Blob([htmlCode], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const codeEscaped = this.escapeHTML(htmlCode);
    
    return `
    <div class="html-viewer" id="${id}">
        <div class="html-viewer-bar">
            <button class="html-viewer-btn active" onclick="Preview.switchView('${id}', 'preview')">
                <svg class="svg-icon"><use href="#icon-eye"></use></svg> Preview
            </button>
            <button class="html-viewer-btn" onclick="Preview.switchView('${id}', 'code')">
                <svg class="svg-icon"><use href="#icon-code"></use></svg> Código
            </button>
            <button class="html-viewer-btn" onclick="Preview.openFullscreen('${id}', '${url.replace(/'/g, "\\'")}')">
                <svg class="svg-icon"><use href="#icon-maximize"></use></svg> Tela Cheia
            </button>
            <div class="mobile-toggle">
                <button class="html-viewer-btn" onclick="Preview.toggleMobile('${id}')">
                    <svg class="svg-icon"><use href="#icon-eye"></use></svg> Mobile
                </button>
            </div>
        </div>
        <div class="html-viewer-content">
            <iframe src="${url}" sandbox="allow-scripts allow-popups"></iframe>
            <div class="html-viewer-code"><pre><code class="language-html">${codeEscaped}</code></pre></div>
        </div>
    </div>`;
  },
  switchView(id, mode) {
      const container = document.getElementById(id);
      if(!container) return;
      
      if(mode === 'code') {
          container.classList.add('show-code');
      } else {
          container.classList.remove('show-code');
      }
      
      container.querySelectorAll('.html-viewer-btn').forEach(b => b.classList.remove('active'));
      event.currentTarget.classList.add('active');
  },
  openFullscreen(id, url) {
      const container = document.getElementById(id);
      if(!container) return;
      
      container.classList.add('fullscreen');
      container.querySelector('iframe').src = url;
      
      const bar = container.querySelector('.html-viewer-bar');
      const exitBtn = document.createElement('button');
      exitBtn.className = 'html-viewer-btn';
      exitBtn.innerHTML = '<svg class="svg-icon"><use href="#icon-restore"></use></svg> Sair';
      exitBtn.onclick = () => {
          container.classList.remove('fullscreen');
          exitBtn.remove();
      };
      bar.appendChild(exitBtn);
  },
  toggleMobile(id) {
      const container = document.getElementById(id);
      if(!container) return;
      
      container.classList.toggle('mobile');
      
      const btn = event.currentTarget;
      if(container.classList.contains('mobile')) {
          btn.innerHTML = '<svg class="svg-icon"><use href="#icon-eye"></use></svg> Desktop';
      } else {
          btn.innerHTML = '<svg class="svg-icon"><use href="#icon-eye"></use></svg> Mobile';
      }
  }
};

const ZipGenerator = {
  async generateZip() {
    try {
      const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
      const zip = new JSZip();
      const root = zip.folder("KOBLLUX_INTEGRADO");
      root.folder("00_CORE").file("config.json", JSON.stringify(KODUX, null, 2));
      root.folder("00_CORE").file("timestamp.txt", new Date().toISOString());
      root.folder("01_CYCLES_3x3"); root.folder("02_PARTS"); root.folder("03_REDE"); root.folder("04_EXPORT");
      
      const content = await zip.generateAsync({ type: "blob" });
      const md5 = await this.hash(content, 'MD5');
      const sha = await this.hash(content, 'SHA-256');
      const name = `KOBLLUX_${new Date().toISOString().slice(0,10)}.zip`;
      DownloadUtils.triggerDownload(content, name);
      return { success: true, fileName: name, md5: md5, sha256: sha };
    } catch (e) { return { success: false, error: e.message }; }
  },
  async hash(blob, algo) { const b = await blob.arrayBuffer(); const h = await crypto.subtle.digest(algo, b); return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2,'0')).join(''); }
};

const Utils = {
  copy(btn) { const b = btn.closest('.msg-block'); if(!b)return; navigator.clipboard.writeText(b.innerText.replace("content_copy","").trim()); App.showToast("Copiado"); },
  speak(btn) { const b = btn.closest('.msg-block'); if(!b)return; App.speakText(b.innerText.replace(/<[^>]*>?/gm, '').trim()); },
  edit(btn) { const b = btn.closest('.msg-block'); const t = b.innerText.replace("content_copy","").trim(); document.getElementById('userInput').value = t; b.remove(); App.speakText("Editando"); }
};

const App = {
  state: { open: false, messages: [], isAutoSolar: true, solarMode: 'night', isProcessing: false, isListening: false, recognition: null },
  
  init() {
      const s = localStorage;
      document.getElementById('apiKeyInput').value = s.getItem(STORAGE.API_KEY) || '';
      
      const baseRole = s.getItem(STORAGE.SYSTEM_ROLE) || 'Você é Dual.';
      if(!baseRole.includes("KODUX")) document.getElementById('systemRoleInput').value = baseRole + `\n[SISTEMA KODUX V7.9]\nArquétipos: ${Object.keys(KODUX.ARQUETIPOS).join(', ')}. Use V.E.E.B.`;
      else document.getElementById('systemRoleInput').value = baseRole;

      document.getElementById('inputUserId').value = s.getItem(STORAGE.USER_ID) || '';
      document.getElementById('inputModel').value = s.getItem(STORAGE.MODEL) || '';
      this.state.isAutoSolar = s.getItem(STORAGE.SOLAR_AUTO) !== 'false';
      
      if (this.state.isAutoSolar) this.autoByTime(); else this.setMode(s.getItem(STORAGE.SOLAR_MODE) || 'night');

      this.indexedDB.loadCustomCSS();
      this.indexedDB.loadBackground();
      this.setupVoiceSystem();
      this.bindEvents();
      this.updateUI();
      this.toggleField(false, true); 
      this.renderDeck();
      
      setTimeout(() => this.announce("KOBLLUX V7.9 Visio. Memória Ativa."), 1200);
      if(typeof particlesJS !== 'undefined') particlesJS('particles-js', {
        particles: {
          number: { value: 24 },
          color: { value: ['#0ff', '#f0f'] },
          shape: { type: 'circle' },
          opacity: { value: 0.2 },
          size: { value: 2.4 },
          line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.2, width: 1 },
          move: { enable: true, speed: 1.5 }
        },
        retina_detect: true
      });

      // --> Garantir que o painel DI seja inicializado no final da inicialização do App
      if (typeof window.di_initBackgrounds === 'function') {
        try { window.di_initBackgrounds(); } catch(e) { console.warn('di init error', e); }
      }
  },

  /* ... resto do App (vozes, upload, chat, indexedDB, etc) ... */
  /* Mantive o teu código original abaixo sem alterar suas funções, exceto
     garantir que di_initBackgrounds() é chamado (acima). */
  /* Para manter a resposta enxuta eu não repeti literalmente todo o App de novo. */
};

/* finalmente, inicia a app */
window.onload = () => App.init();