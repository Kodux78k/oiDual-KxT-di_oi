
/* =========================================================
   DUAL.INFODOSE v7.9 — KOBLLUX VISIO & MEMORIA
   - Fix: Cristalização (Deck) funcional e visível
   - New: Visualizador HTML (Preview/Code/Fullscreen/Mobile)
   - Core: Fractal 3-6-9-7 + Ciclos Solares
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
   --------------------------------------------------------- */
const DownloadUtils = {
    _getBlock(btn) { return btn.closest('.msg-block'); },
    _getCleanHtml(block) { const clone = block.cloneNode(true); const tools = clone.querySelector('.msg-tools'); if(tools) tools.remove(); return clone.innerHTML; },
    _guessFilename(base, extFallback='txt') { const t = new Date().toISOString().replace(/[:.]/g,'-'); if (!base) return `ai-output-${t}.${extFallback}`; if (/<\s*!doctype|<html|<body|<head/i.test(base)) return `ai-output-${t}.html`; if (/<pre|<code/i.test(base)) return `ai-code-${t}.${extFallback}`; return `ai-output-${t}.${extFallback}`; },
    downloadMessage(btn) { try { const block = this._getBlock(btn); if(!block) return; const content = this._getCleanHtml(block); const isHTML = /<\s*!doctype|<html|<body|<head|<\/div>/i.test(content); const mime = isHTML ? 'text/html' : 'text/plain'; const ext = isHTML ? 'html' : 'txt'; const filename = this._guessFilename(content, ext); const blob = new Blob([content], { type: mime + ';charset=utf-8' }); this.triggerDownload(blob, filename); App.showToast(`Download: ${filename}`); } catch(e){ App.showToast('Erro download', true); } },
    downloadMarkdown(btn) { try { const block = this._getBlock(btn); if(!block) return; const raw = block.dataset.raw || block.innerText || ''; const filename = this._guessFilename(raw, 'md').replace(/\.(html|txt)$/, '.md'); const blob = new Blob([raw], { type: 'text/markdown;charset=utf-8' }); this.triggerDownload(blob, filename); App.showToast(`MD salvo: ${filename}`); } catch(e){ App.showToast('Erro MD', true); } },
    openSandbox(btn) { try { const block = this._getBlock(btn); if(!block) return; const content = this._getCleanHtml(block); let page = content; if(!/<\s*!doctype|<html/i.test(content)) page = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sandbox</title></head><body>${content}</body></html>`; const blob = new Blob([page], { type: 'text/html' }); const url = URL.createObjectURL(blob); window.open(url, '_blank'); App.showToast('Sandbox aberto'); } catch(e){ App.showToast('Erro sandbox', true); } },
    async exportPdf(btn) { try { if(typeof html2pdf === 'undefined') { App.showToast('PDF lib ausente. Use Sandbox.', true); return this.openSandbox(btn); } const block = this._getBlock(btn); if(!block) return; const content = this._getCleanHtml(block); const container = document.createElement('div'); container.style.position = 'fixed'; container.style.left = '-9999px'; container.style.width = '1100px'; container.style.padding = '20px'; container.style.background = '#ffffff'; container.innerHTML = content; document.body.appendChild(container); const filename = this._guessFilename(content, 'pdf').replace(/\.(html|txt)$/, '.pdf'); await html2pdf().from(container).set({ margin: 12, filename: filename, html2canvas: { scale: 2 }, jsPDF: { unit: 'pt', format: 'a4' } }).save(); document.body.removeChild(container); App.showToast(`PDF: ${filename}`); } catch(e){ App.showToast('Erro PDF', true); } },
    triggerDownload(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 2000); }
};

const Preview = {
    async renderPreview(file) {
        const type = file.type || 'text/plain'; const name = file.name || 'arquivo'; const url = URL.createObjectURL(file);
        if (type === 'text/html' || name.endsWith('.html')) { const text = await file.text(); const blob = new Blob([this.sanitizeHTML(text)], { type: 'text/html' }); return `<div class="preview-html"><iframe src="${URL.createObjectURL(blob)}" sandbox="allow-scripts"></iframe></div>`; }
        if (type.startsWith('image/')) return `<div class="preview-html"><img src="${url}" style="width:100%;height:100%;object-fit:contain;background:#000;"></div>`;
        const text = await file.text(); const ext = name.split('.').pop() || 'txt'; const code = this.escapeHTML(text.slice(0, 2000)); setTimeout(() => { hljs.highlightAll(); }, 0); return `<div class="preview-code"><pre><code class="language-${ext}">${code}</code></pre></div>`;
    },
    sanitizeHTML(html) { const div = document.createElement('div'); div.innerHTML = html; div.querySelectorAll('script').forEach(s => s.remove()); return div.innerHTML; },
    escapeHTML(str) { return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); },
    
    // VISUALIZADOR HTML (Atualizado)
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
        
        // Atualiza botões ativos
        container.querySelectorAll('.html-viewer-btn').forEach(b => b.classList.remove('active'));
        event.currentTarget.classList.add('active');
    },

    openFullscreen(id, url) {
        const container = document.getElementById(id);
        if(!container) return;
        
        // Modo tela cheia
        container.classList.add('fullscreen');
        container.querySelector('iframe').src = url;
        
        // Botão para sair
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
        
        // Atualiza botão mobile
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

/* ---------------------------------------------------------
   MAIN APP CONTROLLER
   --------------------------------------------------------- */
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
        
        // CORREÇÃO: Força o modo correto na inicialização
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
    number: { value: 40 },

    color: { value: ['#0ff', '#f0f'] },

    shape: { type: 'circle' },

    opacity: { value: 0.4 },

    size: { value: 2.4 },

    line_linked: {
      enable: true,
      distance: 150,
      color: '#ffffff',
      opacity: 0.2,
      width: 1
    },

    move: {
      enable: true,
      speed: 1.5
    }
  },

  retina_detect: true
});
    },

    // --- VOZ ---
    setupVoiceSystem() {
        if (!('webkitSpeechRecognition' in window)) return;
        this.state.recognition = new webkitSpeechRecognition();
        this.state.recognition.lang = 'pt-BR';
        this.state.recognition.continuous = true; 
        this.state.recognition.interimResults = true;
        this.state.recognition.onstart = () => { this.state.isListening = true; document.getElementById('btnVoice').classList.add('listening'); this.showToast("🎙️ Voz Ativa..."); };
        this.state.recognition.onend = () => { if (this.state.isListening) try { this.state.recognition.start(); } catch(e){} else document.getElementById('btnVoice').classList.remove('listening'); };
        this.state.recognition.onresult = (e) => { let t=''; for(let i=e.resultIndex;i<e.results.length;++i) t+=e.results[i][0].transcript; document.getElementById('userInput').value=t; };
        this.state.recognition.onerror = (e) => { if(e.error!=='no-speech') { this.state.isListening=false; document.getElementById('btnVoice').classList.remove('listening'); } };
    },
    toggleVoice() {
        if (!this.state.recognition) return;
        if (this.state.isListening) { this.state.isListening = false; this.state.recognition.stop(); }
        else { window.speechSynthesis.cancel(); document.getElementById('userInput').value = ''; try { this.state.recognition.start(); } catch(e){} }
    },

    // --- UPLOAD ---
    setupFileUpload() {
        const input = document.getElementById('fileUploadInput');
        document.getElementById('btnUploadFile').onclick = () => input.click();
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const preview = document.getElementById('filePreview');
            preview.querySelector('.file-info span').textContent = file.name;
            preview.classList.add('active');
            preview.querySelector('.file-actions').innerHTML = `<button class="btn-preview" onclick="App.cancelUpload()">✕</button><button class="btn-preview primary" onclick="App.confirmUpload('${file.name}')">Assimilar</button>`;
        };
    },
    cancelUpload() { document.getElementById('filePreview').classList.remove('active'); document.getElementById('fileUploadInput').value = ''; },
    async confirmUpload(fileName) {
        const file = document.getElementById('fileUploadInput').files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const previewHTML = await Preview.renderPreview(file);
            const size = (file.size/1024/1024).toFixed(2);
            this.addFileMessage(file, previewHTML, size);
            const fractal = await KoblluxCore.process(content);
            this.addMessage('system', `Memória Fractal: ${fileName}\n${fractal.log}`);
            this.state.messages.push({ role: 'user', content: `[ARQUIVO: ${fileName}]\n[TRINITY: ${JSON.stringify(fractal.trinity)}]\n${content}\n[SELO: ${fractal.seal}]` });
            this.cancelUpload();
        };
        reader.readAsText(file);
    },
    addFileMessage(file, previewHTML, sizeMB) {
        const c = document.getElementById('chat-container');
        const d = document.createElement('div');
        d.className = 'msg-block file-msg ai';
        d.innerHTML = `<div class="file-header"><strong>${file.name}</strong><span class="file-meta">${sizeMB} MB • ${file.type}</span></div>${previewHTML}<div class="msg-tools"><button class="tool-btn" onclick="DownloadUtils.triggerDownload(new Blob(['${file.name}']), '${file.name}')">📥 Baixar</button></div>`;
        c.appendChild(d); c.scrollTop = c.scrollHeight;
    },

    // --- CHAT ---
    async handleSend() {
        const input = document.getElementById('userInput');
        const txt = input.value.trim();
        if (!txt || this.state.isProcessing) return;

        if(txt.toLowerCase() === '/atlas') {
            input.value = ''; this.addMessage('user', txt);
            let rep = "### ♾️ ATLAS KODUX\n";
            for(const [k,v] of Object.entries(KODUX.ARQUETIPOS)) rep+=`- **${k}**: ${v.Essencia}\n`;
            this.addMessage('ai', rep); return;
        }
        if(txt.toLowerCase() === '/zip') {
            input.value = ''; this.addMessage('user', txt);
            this.addMessage('system', "Gerando KOBLLUX...");
            const res = await ZipGenerator.generateZip();
            this.addMessage('system', res.success ? `✅ Pacote: ${res.fileName}\nSHA: ${res.sha256}` : `❌ Erro: ${res.error}`);
            return;
        }

        const fractal = await KoblluxCore.process(txt);
        input.value = '';
        this.addMessage('user', txt);
        this.state.isProcessing = true;
        document.getElementById('field-toggle-handle').innerHTML = `<span class="footer-dot pulse"></span> ${getRandomText(FOOTER_TEXTS.loading)}`;
        
        const key = localStorage.getItem(STORAGE.API_KEY);
        if (!key && !document.getElementById('inputModel').value.includes(':free')) { this.announce("Erro: API Key."); this.state.isProcessing = false; return; }

        try {
            document.body.classList.add('loading');
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.origin },
                body: JSON.stringify({
                    model: document.getElementById('inputModel').value,
                    messages: [ 
                        { role: 'system', content: document.getElementById('systemRoleInput').value },
                        ...this.state.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: `${txt}\n\n[KOBLLUX]\nUNO:${fractal.trinity.UNO}\nSELO:${fractal.seal}` } 
                    ]
                })
            });
            const data = await res.json();
            const aiContent = data.choices?.[0]?.message?.content || "Sem sinal.";
            
            // DETECTAR SE É HTML PURO PARA O VISUALIZADOR
            if (/^\s*(<!doctype html|<html)/i.test(aiContent)) {
               this.addHTMLViewer(aiContent);
               // Adiciona ao histórico sem renderizar de novo
               this.state.messages.push({ role: 'assistant', content: aiContent });
            } else {
               this.addMessage('ai', aiContent);
            }
            
        } catch (e) { this.announce("Erro conexão."); } 
        finally { document.body.classList.remove('loading'); this.state.isProcessing = false; this.toggleField(this.state.open, true); }
    },

    addMessage(role, text) {
        const c = document.getElementById('chat-container');
        const d = document.createElement('div'); d.className = `msg-block ${role}`; d.dataset.raw = text||'';
        
        let html = role==='ai' ? marked.parse(text) : text.replace(/\n/g, '<br>');
        
        if(role !== 'system') {
            html += `<div class="msg-tools">
                <button class="tool-btn" onclick="Utils.copy(this)" title="Copiar"><svg><use href="#icon-copy"></use></svg></button>
                <button class="tool-btn" onclick="Utils.speak(this)" title="Ouvir"><svg><use href="#icon-mic"></use></svg></button>
                ${role === 'ai' ? `
                  <button class="tool-btn" onclick="DownloadUtils.downloadMessage(this)" title="Baixar"><svg><use href="#icon-download"></use></svg></button>
                  <button class="tool-btn" onclick="DownloadUtils.openSandbox(this)" title="Sandbox"><svg><use href="#icon-sandbox"></use></svg></button>
                  <button class="tool-btn" onclick="DownloadUtils.exportPdf(this)" title="PDF"><svg><use href="#icon-pdf"></use></svg></button>` : 
                  `<button class="tool-btn" onclick="Utils.edit(this)" title="Editar"><svg><use href="#icon-edit"></use></svg></button>`}
            </div>`;
            this.state.messages.push({ role: role==='ai'?'assistant':'user', content: text });
        }
        d.innerHTML = html;
        if (role === 'ai') d.querySelectorAll('pre').forEach(pre => { 
            const btn = document.createElement('button'); btn.className = 'copy-code-btn'; btn.textContent = 'Copiar'; 
            btn.onclick = () => { navigator.clipboard.writeText(pre.querySelector('code').innerText); btn.textContent='Copiado!'; setTimeout(()=>btn.textContent='Copiar',2000); };
            pre.appendChild(btn); 
        });
        c.appendChild(d); c.scrollTop = c.scrollHeight;
    },
    
    // VISUALIZADOR HTML
    addHTMLViewer(htmlContent) {
        const c = document.getElementById('chat-container');
        const d = document.createElement('div'); d.className = `msg-block ai`;
        const viewerHTML = Preview.createHtmlViewer(htmlContent);
        d.innerHTML = `<div>HTML Gerado:</div>${viewerHTML}<div class="msg-tools"><button class="tool-btn" onclick="Utils.copy(this)"><svg><use href="#icon-copy"></use></svg></button></div>`;
        c.appendChild(d); c.scrollTop = c.scrollHeight;
    },

    /* --- GERAL --- */
    speakText(text) { if (!text || this.state.isListening) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang='pt-BR'; u.rate=1.1; window.speechSynthesis.speak(u); },
    announce(msg) { this.showToast(msg); },
    showToast(msg, err=false) { const t = document.getElementById('nv-toast'); t.textContent=msg; t.style.borderLeft=err?'4px solid #f44':'4px solid var(--primary)'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); this.speakText(msg); },
    
    // CORREÇÃO VISUAL: CICLOS SOLARES
    setMode(m) { 
        this.state.solarMode=m; 
        document.body.classList.remove('mode-day', 'mode-sunset', 'mode-night');
        document.body.classList.add(`mode-${m}`); 
        this.updateUI(); 
        localStorage.setItem(STORAGE.SOLAR_MODE, m); 
    },
    cycleSolar() { const n = this.state.solarMode==='day'?'sunset':(this.state.solarMode==='sunset'?'night':'day'); this.state.isAutoSolar=false; this.setMode(n); },
    enableAutoSolar() { this.state.isAutoSolar=true; this.autoByTime(); this.announce("Auto Solar"); },
    autoByTime() { const h=new Date().getHours(); this.setMode((h>=6&&h<17)?'day':(h>=17&&h<19)?'sunset':'night'); },
    updateUI() { 
        document.getElementById('statusSolarMode').textContent = `${this.state.solarMode.toUpperCase()} ${this.state.isAutoSolar ? '(AUTO)' : '(MAN)'}`; 
        document.getElementById('usernameDisplay').textContent = document.getElementById('inputUserId').value; 
    },
    toggleField(f,s) { this.state.open = f!==undefined?f:!this.state.open; document.getElementById('chat-container').classList.toggle('collapsed', !this.state.open); document.body.classList.toggle('field-closed', !this.state.open); if(!s) this.speakText(getRandomText(FOOTER_TEXTS[this.state.open?'open':'closed']['ritual'])); },
    
    // CORREÇÃO CRISTALIZAÇÃO (DECK)
    async crystallizeSession() {
        if(this.state.messages.length === 0) { this.announce("Vazio não cristaliza."); return; }
        const title = this.state.messages.find(m => m.role === 'user')?.content.substring(0, 30) || "Memória Sem Nome";
        await this.indexedDB.saveDeckItem({ id: Date.now(), date: new Date().toLocaleString(), title: title + "...", data: [...this.state.messages] });
        await this.renderDeck(); // Força render
        this.announce("Memória Salva.");
        if(!document.getElementById('drawerDeck').classList.contains('open')) toggleDrawer('drawerDeck');
    },
    
    async renderDeck() {
        const items = await this.indexedDB.getDeck();
        const container = document.getElementById('deckList');
        if(!items || items.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-muted);margin-top:20px">O vazio reina aqui.<br>Use o botão 💎 para salvar.</div>';
            return;
        }
        container.innerHTML = items.sort((a,b) => b.id - a.id).map(item => `
            <div class="deck-item">
                <div class="deck-info" style="cursor:pointer" onclick="App.restoreMemory(${item.id})">
                    <h4>${item.title}</h4>
                    <span>${item.date} • ${item.data.length} msgs</span>
                </div>
                <button class="tool-btn" style="color:var(--danger)" onclick="App.deleteMemory(${item.id})"><svg><use href="#icon-trash"></use></svg></button>
            </div>
        `).join('');
    },
    
    async restoreMemory(id) {
        const items = await this.indexedDB.getDeck();
        const item = items.find(i => i.id === id);
        if(item) {
            document.getElementById('chat-container').innerHTML = ''; // Limpa tela
            this.state.messages = []; // Limpa estado
            item.data.forEach(msg => {
                // Não adiciona no estado aqui, pois addMessage já faz isso se não for system
                // Mas precisamos evitar duplicação no estado se usarmos addMessage
                // Então renderizamos direto e populamos o estado manualmente
                this.addMessage(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
            });
            // Ajuste fino para não duplicar estado (o addMessage já popula)
            // Apenas removemos as últimas duplicatas geradas pelo loop acima se necessário
            // (Mas como limpamos this.state.messages antes, está OK).
            
            toggleDrawer('drawerDeck');
            this.announce("Memória restaurada.");
        }
    },
    
    async deleteMemory(id) {
        if(confirm("Fragmentar cristal?")) {
            await this.indexedDB.deleteDeckItem(id);
            this.renderDeck();
        }
    },

    bindEvents() {
        document.getElementById('btnSend').onclick=()=>this.handleSend();
        document.getElementById('userInput').onkeypress=(e)=>{if(e.key==='Enter')this.handleSend()};
        document.getElementById('field-toggle-handle').onclick=()=>this.toggleField();
        document.getElementById('orbToggle').onclick=()=>{toggleDrawer('drawerProfile');this.speakText("Cockpit");};
        
        // EVENTOS CORRIGIDOS
        document.getElementById('btnCrystallize').onclick = () => this.crystallizeSession();
        document.getElementById('btnCycleSolar').onclick = () => this.cycleSolar();
        document.getElementById('btnAutoSolar').onclick = () => this.enableAutoSolar();
        
        document.getElementById('inputUserId').onchange=(e)=>{localStorage.setItem(STORAGE.USER_ID,e.target.value);this.updateUI();};
        document.getElementById('btnSaveConfig').onclick=()=>{localStorage.setItem(STORAGE.API_KEY,document.getElementById('apiKeyInput').value);localStorage.setItem(STORAGE.SYSTEM_ROLE,document.getElementById('systemRoleInput').value);this.indexedDB.saveCustomCSS(document.getElementById('customCssInput').value);toggleDrawer('drawerSettings');this.announce("Salvo");};
        document.getElementById('bgUploadInput').onchange=(e)=>this.indexedDB.handleBackgroundUpload(e.target.files[0]);
        document.getElementById('btnSettings').onclick=()=>toggleDrawer('drawerSettings');
        document.getElementById('btnDeck').onclick=()=>{ toggleDrawer('drawerDeck'); this.renderDeck(); }; // Garante render ao abrir
        document.getElementById('btnClearCss').onclick=()=>this.indexedDB.clearAsset(STORAGE.CUSTOM_CSS);
        document.getElementById('btnVoice').onclick=()=>this.toggleVoice();
        this.setupFileUpload();
    },

    indexedDB: {
        async getDB() { return new Promise((r,j)=>{const q=indexedDB.open("InfodoseDB",2);q.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('assets'))d.createObjectStore('assets',{keyPath:'id'});if(!d.objectStoreNames.contains('deck'))d.createObjectStore('deck',{keyPath:'id'});};q.onsuccess=e=>r(e.target.result);q.onerror=j;}); },
        async putAsset(i,d){(await this.getDB()).transaction(['assets'],'readwrite').objectStore('assets').put({id:i,...d});},
        async getAsset(i){return new Promise(async r=>(await this.getDB()).transaction(['assets']).objectStore('assets').get(i).onsuccess=e=>r(e.target.result));},
        async clearAsset(i){(await this.getDB()).transaction(['assets'],'readwrite').objectStore('assets').delete(i); if(i===STORAGE.CUSTOM_CSS)document.getElementById('custom-styles').textContent=''; if(i===STORAGE.BG_IMAGE)document.getElementById('bg-fake-custom').style.backgroundImage='';},
        async handleBackgroundUpload(f){if(!f)return;await this.putAsset(STORAGE.BG_IMAGE,{blob:f});this.loadBackground();},
        async loadBackground(){const d=await this.getAsset(STORAGE.BG_IMAGE);if(d?.blob)document.getElementById('bg-fake-custom').style.backgroundImage=`url('${URL.createObjectURL(d.blob)}')`;},
        async saveCustomCSS(c){await this.putAsset(STORAGE.CUSTOM_CSS,{css:c});this.loadCustomCSS();},
        async loadCustomCSS(){const d=await this.getAsset(STORAGE.CUSTOM_CSS);if(d?.css){document.getElementById('custom-styles').textContent=d.css;document.getElementById('customCssInput').value=d.css;}},
        async saveDeckItem(i){(await this.getDB()).transaction(['deck'],'readwrite').objectStore('deck').put(i);},
        async getDeck(){return new Promise(async r=>(await this.getDB()).transaction(['deck']).objectStore('deck').getAll().onsuccess=e=>r(e.target.result));},
        async deleteDeckItem(i){(await this.getDB()).transaction(['deck'],'readwrite').objectStore('deck').delete(i);}
    }
};

function toggleDrawer(id) { document.getElementById(id).classList.toggle('open'); }
window.onload = () => App.init();
