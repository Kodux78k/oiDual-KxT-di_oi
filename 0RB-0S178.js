/**
 * FUSION OS // ORB WIDGET MODULE v2.4 (UNIFIED STORAGE PATCH)
 * Architecture: Widget Loader / Self-Contained / IIFE
 * Features: Live Snapshots, Fusion/Sandbox Modes, Shared Storage
 * Patch Note: Storage Key Unification (DI_SYSTEM_DUAL_APPS).
 */

const FusionOS = (() => {
    // --- 1. CONFIG & PRIVATE STATE ---
    const CONFIG = {
        // AQUI ESTÁ A CHAVE DE OURO UNIFICADA:
        key: 'DI_SYSTEM_DUAL_APPS', 
        
        // Mantém referência à anterior para migração suave se necessário
        storageKeyLegacy: 'fusion_os_state_v2_3', 
        
        rootId: 'fusion-os-root',
        fusionLayerId: 'navRoot',
        customCssRootId: 'custom-css-root',
        voice: false,
    };

    // Default apps (The Core Hub)
    const DEFAULT_APPS = [
        { id: 'DELTA', name: 'Delta Hub', desc: 'Interface de conexão externa.', url: 'https://kodux78k.github.io/DualInfodose-VirgemHuB/index.html', icon: 'globe', active: true, code: 'DELTA' }
    ];

    let _state = {
        active: false,
        installed: [],
        hiddenApps: [],
        customCSS: '',
        currentTab: 'dashboard',
        userData: { user: 'Visitante', system: 'SINGULARITY', stats: {} }
    };

    // --- 2. SUBSYSTEMS ---
    const Utils = {
        speak: (msg) => {
            if (!CONFIG.voice || !('speechSynthesis' in window)) return;
            try {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(msg);
                u.lang = 'pt-BR'; u.rate = 1.15;
                window.speechSynthesis.speak(u);
            } catch (e) { console.warn('TTS failed', e); }
        },
        save: () => {
            // Salva na chave unificada DI_SYSTEM_DUAL_APPS
            localStorage.setItem(CONFIG.key, JSON.stringify({
                installed: _state.installed,
                hiddenApps: _state.hiddenApps,
                customCSS: _state.customCSS
            }));
        },
        load: () => {
            // Tenta carregar da chave nova, se não, tenta da antiga (legacy)
            const raw = localStorage.getItem(CONFIG.key) || localStorage.getItem(CONFIG.storageKeyLegacy);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    _state.installed = parsed.installed || [...DEFAULT_APPS];
                    _state.hiddenApps = parsed.hiddenApps || [];
                    _state.customCSS = parsed.customCSS || '';
                    
                    // Se carregou do legacy, salva imediatamente no novo padrão para consolidar
                    if (!localStorage.getItem(CONFIG.key) && localStorage.getItem(CONFIG.storageKeyLegacy)) {
                        Utils.save();
                    }
                } catch (e) {
                    _state.installed = [...DEFAULT_APPS];
                }
            } else {
                _state.installed = [...DEFAULT_APPS];
            }

            // User Identity Logic
            const kardDataRaw = localStorage.getItem('fusion_os_data_v2');
            if (kardDataRaw) {
                try {
                    const parsedKard = JSON.parse(kardDataRaw);
                    if (!parsedKard.isEncrypted && parsedKard.data) {
                        _state.userData.user = parsedKard.data.user || _state.userData.user;
                    } else {
                        _state.userData.user = window.di_userName || localStorage.getItem('di_userName') || _state.userData.user;
                    }
                } catch (e) { /* ignore */ }
            } else {
                _state.userData.user = window.di_userName || localStorage.getItem('di_userName') || _state.userData.user;
            }
            _state.userData.system = window.di_infodoseName || localStorage.getItem('di_infodoseName') || _state.userData.system;
        },
        injectDeps: () => {
            if (!document.querySelector('script[src*="tailwindcss"]')) {
                const s = document.createElement('script');
                s.src = 'https://cdn.tailwindcss.com';
                document.head.appendChild(s);
            }
            if (!document.querySelector('script[src*="unpkg.com/lucide"]') && !window.lucide) {
                const s = document.createElement('script');
                s.src = 'https://unpkg.com/lucide@latest';
                s.onload = () => { try { window.lucide.createIcons(); } catch(e){} };
                document.head.appendChild(s);
            }
        },
        triggerShake: () => {
            document.body.style.animation = "shake 0.32s cubic-bezier(.36,.07,.19,.97) both";
            setTimeout(() => document.body.style.animation = "", 340);
        },
        generateHash: (s) => {
            let h = 0xdeadbeef;
            for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 2654435761); }
            return (h ^ (h >>> 16)) >>> 0;
        }
    };

    // --- 3. UI GENERATOR (Styles & HTML) ---
    const UI = {
        styles: `
            /* Base + imported fonts */
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;400;600;900&display=swap');

            #${CONFIG.rootId} { font-family: 'Inter', sans-serif; color: white; pointer-events: auto; }
            
            /* Monolith Architecture */
            .monolith-wrapper { perspective: 2000px; z-index: 9998; pointer-events: none; }
            .monolith {
                background: rgba(10, 10, 14, 0.95);
                backdrop-filter: blur(60px);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 40px;
                transform-origin: bottom center;
                clip-path: circle(0% at 50% 100%);
                transform: translateY(60px) scale(0.9); opacity: 0;
                transition: all 0.7s cubic-bezier(0.19, 1, 0.22, 1);
                pointer-events: none; overflow: hidden;
                box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8);
            }
            .os-active .monolith {
                transform: translateY(0) scale(1); opacity: 1;
                clip-path: circle(150% at 50% 100%); pointer-events: auto;
            }

            /* Nav Tabs */
            .tab-btn { width:44px; height:44px; border-radius:14px; transition: all .3s; color: rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; background:transparent; border:1px solid transparent; }
            .tab-btn:hover { color:#fff; background: rgba(255,255,255,0.04); }
            .tab-btn.active { color:#00f2ff; background: rgba(0,242,255,0.08); border-color: rgba(0,242,255,0.12); box-shadow: 0 0 12px rgba(0,242,255,0.06); }

            /* Runtime Layer (Sandbox) */
            .runtime-layer { position:absolute; inset:0; background:#050505; transform: translateY(100%); transition: .6s cubic-bezier(0.19, 1, 0.22, 1); z-index: 100; }
            .runtime-layer.visible { transform: translateY(0); }

            /* Orb Trigger */
            :root { --orb-cyan: #00f2ff; --orb-purple: #bd00ff; }
            .orb-trigger {
                position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
                width: 72px; height: 72px; cursor: pointer; z-index: 10010;
                display: grid; place-items:center; background: transparent; border: none; pointer-events: auto; outline: none;
                transition: transform 0.36s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .orb-trigger:hover { transform: translateX(-50%) scale(1.08); }
            .orb-core { width: 10px; height: 10px; background: #fff; border-radius: 50%; box-shadow: 0 0 18px rgba(255,255,255,0.95); transition: transform .36s, box-shadow .36s, background .36s; }
            .orb-ring { position: absolute; width: 52px; height: 52px; border-radius: 50%; border:2px solid transparent; border-top-color: var(--orb-cyan); border-bottom-color: var(--orb-purple); animation: orb-spin 4s linear infinite; opacity: .75; transition: all .45s ease; }
            .os-active .orb-core { background: var(--orb-cyan); box-shadow: 0 0 30px var(--orb-cyan); transform: scale(1.18); }
            .os-active .orb-ring { animation-duration: 1.25s; opacity: 1; border-color: var(--orb-cyan); box-shadow: 0 0 20px rgba(0,242,255,0.18); }
            @keyframes orb-spin { to { transform: rotate(360deg); } }
            @keyframes shake { 0% { transform: translate(1px,1px); } 10% { transform: translate(-1px,-2px); } 100% { transform: translate(0); } }

            /* Accordion */
            .accordion-item { transition: all .4s cubic-bezier(.25,1,.5,1); overflow: hidden; border: 1px solid rgba(255,255,255,0.05); background: linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.3) 100%); border-radius: 16px; }
            .accordion-item.expanded { background: linear-gradient(145deg, rgba(0,242,255,0.04) 0%, rgba(0,0,0,0.45) 100%); border-color: rgba(0,242,255,0.18); box-shadow: 0 10px 40px -10px rgba(0,0,0,0.6); transform: scale(1.01); margin: 10px 0; }
            .preview-frame { width: 133%; height: 133%; pointer-events: none; opacity: .6; transform: scale(.75); transform-origin: top left; border:none; background:transparent; }

            /* Utilities */
            .custom-scroll::-webkit-scrollbar { width: 6px; height:6px; }
            .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.16); border-radius: 10px; }
            .custom-scroll::-webkit-scrollbar-track { background: transparent; }

            /* --- NEW: COMPACT EXIT BUTTON --- */
            .fusion-exit-btn {
                width: 40px; height: 40px; padding: 0;
                display: inline-flex; align-items: center; justify-content: center;
                border-radius: 999px;
                font-size: 12px; font-weight: 800;
                color: var(--orb-cyan);
                background: rgba(0,0,0,0.45);
                border: 1px solid rgba(220,38,38,0.22);
                box-shadow: 0 8px 20px rgba(220,38,38,0.08);
                transition: transform .16s ease, background .16s ease, color .16s ease;
                -webkit-tap-highlight-color: transparent; cursor: pointer;
            }
            .fusion-exit-btn:hover {
                transform: scale(1.06); background: rgba(220,38,38,0.10); color: #fff;
            }
            .fusion-exit-ctrl-wrap {
                touch-action: manipulation;
                -webkit-backface-visibility: hidden; backface-visibility: hidden;
            }
        `,
        build: () => {
            // --- Safety Checks for Root ---
            if (!document.getElementById(CONFIG.fusionLayerId)) {
                const nav = document.createElement('div'); nav.id = CONFIG.fusionLayerId; document.body.appendChild(nav);
            }
            if (!document.getElementById(CONFIG.customCssRootId)) {
                const cssRoot = document.createElement('div'); cssRoot.id = CONFIG.customCssRootId; document.body.appendChild(cssRoot);
            }
            const existing = document.getElementById(CONFIG.rootId);
            if (existing) existing.remove();

            // --- Monolith Container ---
            const container = document.createElement('div');
            container.id = CONFIG.rootId;
            container.innerHTML = `
                <style>${UI.styles}</style>
                <div class="monolith-wrapper fixed inset-0 flex items-center justify-center p-6 md:p-12">
                    <div class="monolith w-full max-w-[1100px] h-[75vh] flex flex-col relative shadow-2xl">
                        
                        <header class="h-24 relative flex items-center justify-between px-8 md:px-12 bg-black/12 border-b border-white/5 shrink-0 select-none">
                            <div class="relative z-20 flex items-center gap-3">
                                <button onclick="FusionOS.setTab('dashboard')" id="tab-dashboard" class="tab-btn" title="Perfil / Dashboard"><i data-lucide="layout-dashboard" class="w-5 h-5"></i></button>
                                <button onclick="FusionOS.setTab('apps')" id="tab-apps" class="tab-btn" title="Módulos"><i data-lucide="layers" class="w-5 h-5"></i></button>
                                <button onclick="FusionOS.setTab('lab')" id="tab-lab" class="tab-btn" title="Laboratório"><i data-lucide="beaker" class="w-5 h-5"></i></button>
                            </div>

                            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none opacity-80 w-full max-w-[220px]">
                                <span id="sys-identity" class="text-[10px] font-black tracking-[0.4em] text-white/30 uppercase mb-1 drop-shadow-md text-center truncate w-full">${_state.userData.system}</span>
                                <div class="flex items-center justify-center w-full">
                                    <div class="status-line w-8"></div>
                                    <span id="header-context" class="text-[9px] text-cyan-400 font-mono tracking-widest font-bold">DASHBOARD</span>
                                    <div class="status-line w-8"></div>
                                </div>
                            </div>

                            <div class="relative z-20 flex items-center gap-5">
                                <div class="hidden md:flex flex-col items-end text-right">
                                    <span class="text-[8px] text-white/20 font-bold uppercase tracking-wider">Operator</span>
                                    <span id="user-identity" class="text-[9px] text-cyan-400/80 font-mono font-bold uppercase tracking-wide">${_state.userData.user}</span>
                                </div>
                                <button onclick="FusionOS.toggle()" class="w-10 h-10 rounded-full border border-white/5 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white/30 flex items-center justify-center transition-all" title="Fechar Sistema">
                                    <i data-lucide="power" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </header>

                        <main id="monolith-content" class="flex-1 overflow-y-auto custom-scroll p-8 md:p-12 bg-gradient-to-b from-transparent to-black/20 relative z-10"></main>

                        <div id="os-runtime" class="runtime-layer flex flex-col">
                            <div class="h-16 bg-zinc-950 border-b border-white/10 flex justify-between items-center px-8 shrink-0">
                                <div class="flex items-center gap-3">
                                    <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>
                                    <span id="runtime-title" class="text-[10px] text-cyan-400 font-mono font-bold tracking-[0.2em] uppercase">PROCESS_RUNNING</span>
                                </div>
                                <button onclick="FusionOS.closeRuntime()" class="px-4 py-2 rounded-lg text-[9px] font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest border border-transparent hover:border-white/10">Minimizar</button>
                            </div>
                            <iframe id="os-frame" class="flex-1 border-none bg-black"></iframe>
                        </div>
                    </div>
                </div>

                <button class="orb-trigger" id="orb-trigger" aria-label="Toggle Fusion OS">
                    <div class="orb-ring"></div>
                    <div class="orb-core"></div>
                </button>

                <div id="fusion-exit-ctrl" class="fixed top-8 left-1/2 -translate-x-1/2 hidden z-[10020] fusion-exit-ctrl-wrap" role="dialog" aria-hidden="true">
                    <button onclick="FusionOS.exitFusion()" class="fusion-exit-btn" aria-label="Encerrar Fusão" title="Encerrar Fusão">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="8"></circle>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                    </button>
                </div>
            `;
            document.body.appendChild(container);
            UI.refreshIcons();
            FusionOS.setTab(_state.currentTab || 'dashboard');
            // Ensure orb click toggles
            const orb = document.getElementById('orb-trigger');
            if (orb) orb.addEventListener('click', () => FusionOS.toggle());
        },
        injectCustomCSS(css) {
            const root = document.getElementById(CONFIG.customCssRootId);
            if (!root) {
                const r = document.createElement('div');
                r.id = CONFIG.customCssRootId;
                document.body.appendChild(r);
            }
            document.getElementById(CONFIG.customCssRootId).innerHTML = `<style>${css}</style>`;
        },
        refreshIcons() {
            if (window.lucide) try { window.lucide.createIcons(); } catch (e) { /* ignore */ }
        }
    };

    // --- 4. PARSER / LAB (HTML -> Kernel) ---
    const Parser = {
        convertFromHtmlSource(inputHtml) {
            if (!inputHtml) return '';
            const doc = new DOMParser().parseFromString(inputHtml, 'text/html');
            const styles = Array.from(doc.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
            const bodyClone = doc.body.cloneNode(true);
            bodyClone.querySelectorAll('script, style').forEach(el => el.remove());
            const bodyHtml = bodyClone.innerHTML.trim();
            const scripts = Array.from(doc.querySelectorAll('script')).map(s => s.innerHTML).join('\n');

            const safeStyles = styles.replace(/`/g, '\\`').replace(/\$/g, '\\$');
            const safeBody = bodyHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$');
            const safeScripts = scripts.replace(/`/g, '\\`').replace(/\$/g, '\\$');

            return `window.FusionModule = (() => {
    return {
        init() {
            const s = document.createElement('style'); s.innerHTML = \`${safeStyles}\`; document.head.appendChild(s);
            const c = document.createElement('div'); c.innerHTML = \`${safeBody}\`; document.body.appendChild(c);
            try { ${safeScripts} } catch(e) { console.error(e); }
        }
    };
})();
window.FusionModule.init();`;
        }
    };

    // --- 5. ENGINE CORE (Public API) ---
    return {
        boot: () => {
            console.log("%c FUSION OS v2.4 // READY ", "background:#000; color:#00f2ff; font-weight:bold;");
            Utils.injectDeps();
            UI.build();
            Utils.load();
            if (_state.customCSS) UI.injectCustomCSS(_state.customCSS);

            // Lazy load Lab UI into DOM if active tab needs it
            const monolith = document.getElementById('monolith-content');
            if (monolith) {
                // Lab Template
                const labHtml = `
                    <div id="fusion-lab-placeholder" style="display:none;">
                        <div class="glass-panel p-6 rounded-3xl">
                            <div class="flex justify-between items-end mb-4">
                                <h2 class="text-sm font-bold uppercase tracking-widest text-cyan-400">Conversor de Monólitos</h2>
                                <label class="bg-white/5 hover:bg-white/10 px-3 py-1 rounded text-[9px] cursor-pointer transition-colors border border-white/10">
                                    Importar .html <input id="lab-upload-file" type="file" class="hidden" />
                                </label>
                            </div>
                            <div class="grid grid-cols-2 gap-4 h-[200px]">
                                <textarea id="lab-input" placeholder="HTML Source..." class="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-mono text-zinc-400 focus:outline-none resize-none"></textarea>
                                <textarea id="lab-output" readonly placeholder="Kernel Output..." class="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-mono text-cyan-500/70 focus:outline-none resize-none"></textarea>
                            </div>
                            <div class="flex gap-2 mt-3">
                                <button id="lab-convert-btn" class="w-32 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 text-white/40 font-bold py-2 rounded-xl uppercase tracking-widest text-[10px] transition-all">Converter</button>
                                <button id="lab-inject-btn" class="w-32 bg-cyan-500/20 hover:bg-cyan-500 hover:text-white text-cyan-400 font-bold py-2 rounded-xl uppercase tracking-widest text-[10px] transition-all">Injetar</button>
                            </div>
                        </div>
                    </div>
                `;
                const fragment = document.createRange().createContextualFragment(labHtml);
                monolith.appendChild(fragment);

                // Listeners for Lab
                const fileInput = document.getElementById('lab-upload-file');
                if (fileInput) fileInput.addEventListener('change', (ev) => FusionOS.handleUpload(ev.target));

                const convertBtn = document.getElementById('lab-convert-btn');
                if (convertBtn) convertBtn.addEventListener('click', () => {
                    const source = document.getElementById('lab-input').value;
                    document.getElementById('lab-output').value = Parser.convertFromHtmlSource(source);
                    Utils.speak("Processado.");
                });

                const injectBtn = document.getElementById('lab-inject-btn');
                if (injectBtn) injectBtn.addEventListener('click', () => {
                    const code = document.getElementById('lab-output').value;
                    if (!code) return Utils.speak("Nenhum kernel para injetar.");
                    Utils.speak("Injetando módulo.");
                    try { eval(code); } catch (e) { console.error(e); Utils.speak("Erro ao injetar."); }
                });
            }

            // Terminal Input Compatibility
            const term = document.getElementById('os-terminal');
            if (term) {
                term.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const cmd = term.value.toUpperCase().trim();
                        if (cmd) FusionOS.handleCommand(cmd);
                        term.value = '';
                        term.blur();
                    }
                });
            }

            FusionOS.render();
        },

        register: ({ name, code, url = null, html = null, desc = '' }) => {
            if (!code || (!url && !html)) return;
            if (_state.installed.find(m => m.code === code || m.id === code)) return;
            const id = (code || name).toString();
            const module = { id, name, code, url, html, desc };
            _state.installed.unshift(module);
            Utils.save();
            FusionOS.render();
            Utils.speak(`Protocolo ${name} instalado.`);
        },

        toggle: () => {
            _state.active = !_state.active;
            const root = document.getElementById(CONFIG.rootId);
            const orb = document.getElementById('orb-trigger');
            if (root) root.classList.toggle('os-active', _state.active);
            if (orb) orb.classList.toggle('active', _state.active);
            if (_state.active) {
                Utils.triggerShake();
                const greeting = _state.userData.user && _state.userData.user !== 'Visitante' ? `Bem vindo, ${_state.userData.user}.` : "Sistema conectado.";
                Utils.speak(greeting);
            }
        },

        render: () => {
            // New monolith UI rendering per tab
            const content = document.getElementById('monolith-content');
            if (!content) return; // safety
            
            UI.refreshIcons();
            const user = _state.userData;

            if (_state.currentTab === 'dashboard') {
                const nameHash = Utils.generateHash(user.user);
                const h1 = nameHash % 360;
                const avatarSvg = `<svg viewBox="0 0 100 100" class="w-full h-full"><defs><linearGradient id="avGrad"><stop offset="0%" stop-color="hsl(${h1}, 90%, 50%)"/><stop offset="100%" stop-color="hsl(${(h1+40)%360}, 90%, 50%)"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="#080b12" stroke="rgba(255,255,255,0.1)" stroke-width="2"/><circle cx="50" cy="50" r="20" fill="url(#avGrad)"/></svg>`;

                content.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full max-w-2xl mx-auto transition-all duration-500">
                        <div class="w-full glass rounded-[36px] p-8 border border-white/10 relative overflow-hidden group">
                            <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <div class="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                <div class="w-24 h-24 shrink-0 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,242,255,0.1)] border border-white/5">${avatarSvg}</div>
                                <div class="text-center md:text-left flex-1">
                                    <div class="flex items-baseline justify-center md:justify-start gap-3 mb-1">
                                        <span class="text-2xl text-white/40 font-thin">Olá,</span>
                                        <span class="text-3xl md:text-4xl font-bold text-white tracking-tight">${user.user}</span>
                                    </div>
                                    <div class="text-2xl uppercase mb-2">DUAL // FUSION</div>
                                    
                                    <div class="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                                        <div class="bg-black/40 px-4 py-2 rounded-lg border border-white/5 text-center">
                                            <span class="block text-[9px] text-white/40 uppercase tracking-widest">SISTEMA</span>
                                            <span class="text-emerald-400 font-mono text-sm font-bold">ONLINE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mt-8 w-full max-w-[480px] relative group">
                            <div class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-60 blur transition duration-1000"></div>
                            <div class="relative flex items-center bg-black rounded-xl border border-white/10">
                                <div class="pl-4 text-cyan-500"><i data-lucide="terminal" class="w-5 h-5"></i></div>
                                <input id="os-terminal-input" type="text" 
                                    placeholder="INSIRA CODE MAP OU COMANDO..." 
                                    class="w-full bg-transparent border-none text-white font-mono text-sm p-4 focus:ring-0 focus:outline-none uppercase tracking-widest placeholder:text-white/20"
                                    autocomplete="off"
                                    onkeydown="if(event.key === 'Enter') { FusionOS.handleCommand(this.value.trim().toUpperCase()); this.value = ''; }"
                                >
                                <button onclick="FusionOS.handleCommand(document.getElementById('os-terminal-input').value.trim().toUpperCase()); document.getElementById('os-terminal-input').value = '';" 
                                    class="mr-2 p-2 hover:bg-white/10 rounded-lg text-cyan-400 transition-colors">
                                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                                </button>
                            </div>
                            <div class="text-center mt-3 text-[9px] text-white/20 uppercase tracking-[0.3em]">
                                Pressione ENTER para injetar código
                            </div>
                        </div>
                    </div>
                `;
            } else if (_state.currentTab === 'apps') {
                const visibleApps = _state.installed.filter(a => !_state.hiddenApps.includes(a.id));
                if (visibleApps.length === 0) {
                    content.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-white/30"><i data-lucide="ghost" class="w-12 h-12 mb-4 opacity-50"></i><p>Nenhum módulo visível.</p></div>`;
                    UI.refreshIcons();
                    return;
                }
                content.innerHTML = `
                    <div class="flex flex-col gap-4 pb-20">
                        ${visibleApps.map(app => `
                            <div id="acc-${app.id}" class="accordion-item h-[70px] rounded-2xl relative group cursor-pointer" onclick="FusionOS.toggleAccordion('${app.id}')">
                                <div class="h-[70px] flex items-center px-6 gap-5 relative z-20 bg-black/20">
                                    <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-cyan-400">
                                        <i data-lucide="${app.icon || 'box'}" class="w-5 h-5"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-sm font-bold text-white tracking-wide">${app.name}</h3>
                                            <span class="text-[9px] bg-white/5 px-2 py-0.5 rounded text-white/30 font-mono">${app.id}</span>
                                        </div>
                                    </div>
                                    <i data-lucide="chevron-down" class="w-4 h-4 text-white/30 transition-transform duration-300"></i>
                                </div>

                                <div class="absolute top-[70px] left-0 w-full h-[250px] bg-black/40 flex" style="pointer-events:auto;">
                                    <div class="w-1/2 h-full border-r border-white/5 relative overflow-hidden bg-black">
                                        <div class="absolute inset-0 flex items-center justify-center text-white/10 z-0">
                                            <span class="text-[9px] tracking-widest uppercase">Carregando Preview...</span>
                                        </div>
                                        <iframe data-src="${app.url}" class="preview-frame z-10 relative"></iframe>
                                        <div class="absolute inset-0 z-20"></div>
                                    </div>

                                    <div class="w-1/2 h-full p-6 flex flex-col justify-between">
                                        <div>
                                            <h4 class="text-[10px] uppercase tracking-widest text-cyan-500 mb-2 font-bold">Descrição</h4>
                                            <p class="text-xs text-white/50 leading-relaxed">${app.desc || ''}</p>
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <div class="flex gap-2">
                                                <button onclick="event.stopPropagation(); FusionOS.launch('${app.id}', 'sandbox')" class="flex-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-3 rounded-lg uppercase tracking-wider transition-all">Janela</button>
                                                <button onclick="event.stopPropagation(); FusionOS.launch('${app.id}', 'fusion')" class="flex-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black text-[10px] font-bold py-3 rounded-lg uppercase tracking-wider transition-all">Fusão</button>
                                            </div>
                                            <div class="flex gap-2 mt-2 pt-2 border-t border-white/5">
                                                <button onclick="event.stopPropagation(); FusionOS.toggleAppVisibility('${app.id}')" class="flex-1 text-white/30 hover:text-white text-[9px] py-2 flex items-center justify-center gap-1">
                                                    <i data-lucide="eye-off" class="w-3 h-3"></i> Ocultar
                                                </button>
                                                <button onclick="event.stopPropagation(); FusionOS.removeApp('${app.id}')" class="flex-1 text-white/30 hover:text-red-400 text-[9px] py-2 flex items-center justify-center gap-1">
                                                    <i data-lucide="trash-2" class="w-3 h-3"></i> Remover
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else if (_state.currentTab === 'lab') {
                content.innerHTML = `
                    <div class="h-full flex flex-col gap-8">
                        <div class="glass-panel p-6 rounded-3xl">
                            <div class="flex justify-between items-end mb-4">
                                <h2 class="text-sm font-bold uppercase tracking-widest text-cyan-400">Conversor de Monólitos</h2>
                                <label class="bg-white/5 hover:bg-white/10 px-3 py-1 rounded text-[9px] cursor-pointer transition-colors border border-white/10">
                                    Importar .html <input type="file" id="lab-upload-file-2" class="hidden" />
                                </label>
                            </div>
                            <div class="grid grid-cols-2 gap-4 h-[200px]">
                                <textarea id="lab-input-2" placeholder="HTML Source..." class="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-mono text-zinc-400 focus:outline-none resize-none"></textarea>
                                <textarea id="lab-output-2" readonly placeholder="Kernel Output..." class="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-mono text-cyan-500/70 focus:outline-none resize-none"></textarea>
                            </div>
                            <div class="flex gap-2 mt-3">
                                <button id="lab-convert-btn-2" class="w-32 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 text-white/40 font-bold py-2 rounded-xl uppercase tracking-widest text-[10px] transition-all">Converter</button>
                                <button id="lab-inject-btn-2" class="w-32 bg-cyan-500/20 hover:bg-cyan-500 hover:text-white text-cyan-400 font-bold py-2 rounded-xl uppercase tracking-widest text-[10px] transition-all">Injetar</button>
                            </div>
                        </div>

                        <div class="glass-panel p-6 rounded-3xl flex-1 flex flex-col">
                            <h2 class="text-sm font-bold uppercase tracking-widest text-purple-400 mb-4">Global Styles Override</h2>
                            <textarea id="css-input" placeholder="/* Cole seu CSS aqui para personalizar o Fusion OS */" class="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-mono text-pink-300/80 focus:outline-none resize-none custom-scroll">${_state.customCSS || ''}</textarea>
                            <div class="flex justify-between items-center mt-3">
                                <span class="text-[9px] text-white/20">Aplica-se imediatamente. Persistente.</span>
                                <button id="save-css-btn" class="bg-purple-500/20 hover:bg-purple-500 hover:text-white text-purple-400 font-bold py-2 px-6 rounded-lg uppercase tracking-widest text-[9px] transition-all">Salvar CSS</button>
                            </div>
                        </div>
                    </div>
                `;

                // Wire up Lab 2 logic with slight delay to ensure DOM readiness
                setTimeout(() => {
                    const up = document.getElementById('lab-upload-file-2');
                    if (up) up.addEventListener('change', (e) => FusionOS.handleUpload(e.target));
                    
                    const convBtn = document.getElementById('lab-convert-btn-2');
                    if (convBtn) convBtn.addEventListener('click', () => {
                        const src = document.getElementById('lab-input-2').value;
                        document.getElementById('lab-output-2').value = Parser.convertFromHtmlSource(src);
                        Utils.speak("Processado.");
                    });
                    
                    const injBtn = document.getElementById('lab-inject-btn-2');
                    if (injBtn) injBtn.addEventListener('click', () => {
                        const code = document.getElementById('lab-output-2').value;
                        if (!code) { Utils.speak("Nenhum kernel para injetar."); return; }
                        try { eval(code); Utils.speak("Módulo injetado."); } catch (e) { console.error(e); Utils.speak("Erro ao injetar módulo."); }
                    });
                    
                    const cssBtn = document.getElementById('save-css-btn');
                    if (cssBtn) cssBtn.addEventListener('click', () => {
                        const css = document.getElementById('css-input').value;
                        _state.customCSS = css;
                        UI.injectCustomCSS(css);
                        Utils.save();
                        Utils.speak("Estilos globais atualizados.");
                    });
                }, 60);
            }
            UI.refreshIcons();
        },

        launch: async (code, mode) => {
            const module = _state.installed.find(m => m.code === code || m.id === code);
            if (!module) return Utils.speak("Módulo não encontrado.");

            if (mode === 'sandbox') {
                const rt = document.getElementById('os-runtime');
                const frame = document.getElementById('os-frame');
                if (!rt || !frame) return;
                rt.classList.add('visible');
                if (module.url) frame.src = module.url;
                else frame.srcdoc = module.html || '';
                Utils.speak(`Abrindo ${module.name}.`);
            } else if (mode === 'fusion') {
                FusionOS.performFusion(module);
            }
        },

        performFusion: async (module) => {
            const layer = document.getElementById(CONFIG.fusionLayerId);
            if (!layer) return alert("Erro: NavRoot não encontrado.");
            if (_state.active) FusionOS.toggle(); // fecha painél suavemente
            document.getElementById('fusion-exit-ctrl').classList.remove('hidden');
            Utils.speak("Fusão iniciada.");

            let content = "";
            if (module.url) {
                try {
                    const resp = await fetch(module.url);
                    if (!resp.ok) throw new Error("Network");
                    content = await resp.text();
                    FusionOS.injectIntoDOM(layer, content);
                } catch (e) {
                    const ifr = document.createElement('iframe');
                    ifr.src = module.url;
                    ifr.style.cssText = "width:100vw; height:100vh; border:none; position:fixed; inset:0; z-index:10015; background:black;";
                    layer.appendChild(ifr);
                }
            } else if (module.html) {
                FusionOS.injectIntoDOM(layer, module.html);
            } else {
                Utils.speak("Conteúdo do módulo indisponível.");
            }
        },

        injectIntoDOM: (target, html) => {
            target.innerHTML = html;
            // Script Re-Hydration
            target.querySelectorAll('script').forEach(old => {
                const s = document.createElement('script');
                [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
                s.textContent = old.textContent;
                old.replaceWith(s);
            });
        },

        exitFusion: () => {
            const layer = document.getElementById(CONFIG.fusionLayerId);
            if (layer) layer.innerHTML = '';
            document.getElementById('fusion-exit-ctrl').classList.add('hidden');
            Utils.speak("Fusão encerrada.");
            if (!_state.active) FusionOS.toggle();
        },

        closeRuntime: () => {
            const rt = document.getElementById('os-runtime');
            if (!rt) return;
            rt.classList.remove('visible');
            setTimeout(() => {
                const frame = document.getElementById('os-frame');
                if (frame) frame.src = '';
            }, 500);
        },

        handleCommand: (cmd) => {
            const BUILTINS = {
                'OIDUAL': { name: '💬 OiDual 💬', url: 'https://kodux78k.github.io/oiDual-dip/' },
                'VIVIVI': { name: '🧬 Vivivi System 🆔', url: 'https://kodux78k.github.io/oiDual-Vivivi-1/' },
                'DELTA': { name: '🌐 Delta Hub 🔘', url: 'https://kodux78k.github.io/DualInfodose-VirgemHuB/index.html' },
                'KXT': { name: 'Kxt', url: 'https://kodux78k.github.io/oiDual-KxT/index.html' },
                'LIVROVIVO': { name: 'LivroVivo', url: 'https://kodux78k.github.io/Dual-Docs/index.html' },
                'LV2': { name: 'LV2', url: 'https://kodux78k.github.io/info-Doc/index.html' },
                'ASSERT': { name: 'ASSERT-HUB', url: 'https://kodux78k.github.io/DualHubjhbarros/' },
                'APR': { name: 'APR', url: 'https://kodux78k.github.io/ASSERT-app1/index.html' },
                'NR1035': { name: 'ASSERT NR10/35', url: 'https://kodux78k.github.io/DualHubjhbarros/PWA_TICO_Ultra/' },
                'VWR': { name: 'dual ViweR', url: 'https://kodux78k.github.io/oiDual-VwR/index.html' },
                'PORTAL': { name: 'PORTAL', url: 'https://kodux78k.github.io/PortalDual/index.html' },
                'KCHAT': { name: 'Kchat', url: 'https://kodux78k.github.io/oiDual-78KChat/index.html' },
                'KRDZ1': { name: 'dualKrdZ', url: 'https://kodux78k.github.io/oiDual-78KrdZ-v1/' },
                'KXT2': { name: 'Dual_KxT v9', url: 'https://kodux78k.github.io/oiDual-78KxaT-v4/' },
                'KXT56': { name: '78KXat Dual', url: 'https://kodux78k.github.io/oiDual-78KxT/' },
                'HTMGK': { name: 'Htmagik', url: 'https://kodux78k.github.io/oiDual-Htmagik-m/' },
                'DEX': { name: 'DeX', url: 'https://kodux78k.github.io/oiDual-DeX/' },
                'DFB': { name: 'DfB (HtMagik v8)', url: 'https://kodux78k.github.io/oiDual-HtMagikv8/' },
                'NEBULA': { name: 'Nébula', url: 'https://kodux78k.github.io/oiDual-PxR/' },
                'TST': { name: 'TST', url: 'https://kodux78k.github.io/oiDual-tst/' },
                'TST0': { name: 'TST0', url: 'https://kodux78k.github.io/oiDual-tst0/' },
                'TST1': { name: 'TST1', url: 'https://kodux78k.github.io/oiDual-tst1/' },
                'ADU': { name: 'Adega Urbana', url: 'https://kodux78k.github.io/oiDual-AdegaUrbana/' },
                '78F': { name: 'Iframe 78frames', url: 'https://kodux78k.github.io/oiDual-78F/' },
'KXTZ': { name: 'KxT KBllX', url: 'https://kodux78k.github.io/oiDual-KxT/' },
'KXDI': { name: 'KxT DI', url: 'https://kodux78k.github.io/oiDual-KxT-di/' },
'DH0':  { name: 'DH0', url: 'https://kodux78k.github.io/oiDual-H0/' },
'START': { name: 'starT', url: 'https://kodux78k.github.io/oiDual-starT/' },
'78K':  { name: '78K ID HOME', url: 'https://kodux78k.github.io/oiDual-idHome/' },
'NAV':  { name: 'NAV', url: 'https://kodux78k.github.io/oiDual-infodek/' },
                'RESET': 'RESET'
            };

            if (cmd === 'RESET') {
                localStorage.removeItem(CONFIG.key);
                location.reload();
                return;
            }

            if (BUILTINS[cmd]) {
                FusionOS.register({ ...BUILTINS[cmd], code: cmd, name: BUILTINS[cmd].name || cmd });
                Utils.speak("Código aceito.");
            } else {
                const term = document.getElementById('os-terminal');
                if (term) {
                    term.style.borderColor = 'red';
                    term.style.color = 'red';
                    setTimeout(() => { term.style.borderColor = ''; term.style.color = ''; }, 500);
                }
                Utils.speak("Comando não reconhecido.");
            }
        },

        handleUpload: (inputEl) => {
            const file = inputEl.files ? inputEl.files[0] : (inputEl instanceof File ? inputEl : null);
            if (!file) return Utils.speak("Nenhum arquivo selecionado.");
            const reader = new FileReader();
            reader.onload = (e) => {
                const labIn = document.getElementById('lab-input-2') || document.getElementById('lab-input');
                if (labIn) labIn.value = e.target.result;
                const out = document.getElementById('lab-output-2') || document.getElementById('lab-output');
                if (out) out.value = Parser.convertFromHtmlSource(e.target.result);
                Utils.speak("Arquivo carregado.");
            };
            reader.readAsText(file);
        },

        toggleAccordion: (appId) => {
            const el = document.getElementById(`acc-${appId}`);
            if (!el) return;
            const isExpanded = el.classList.contains('expanded');
            document.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('expanded'); i.style.height = '70px';
            });
            if (!isExpanded) {
                el.classList.add('expanded'); el.style.height = '320px';
                const iframe = el.querySelector('iframe');
                if (iframe && !iframe.src) iframe.src = iframe.dataset.src;
            }
        },

        toggleAppVisibility: (id) => {
            if (_state.hiddenApps.includes(id)) {
                _state.hiddenApps = _state.hiddenApps.filter(h => h !== id);
                Utils.speak("App visível.");
            } else {
                _state.hiddenApps.push(id);
                Utils.speak("App ocultado.");
            }
            Utils.save();
            FusionOS.render();
        },

        removeApp: (id) => {
            if (!confirm("Remover este módulo permanentemente?")) return;
            _state.installed = _state.installed.filter(a => (a.id !== id && a.code !== id));
            Utils.save();
            FusionOS.render();
            Utils.speak("Módulo desinstalado.");
        },

        setTab: (tab) => {
            _state.currentTab = tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const btn = document.getElementById(`tab-${tab}`);
            if (btn) btn.classList.add('active');
            const contextMap = { 'dashboard': 'DASHBOARD', 'apps': 'MODULES', 'lab': 'SYSTEM_LAB' };
            const headerCtx = document.getElementById('header-context');
            if (headerCtx) headerCtx.innerText = contextMap[tab] || 'SYSTEM';
            FusionOS.render();
        }
    };
})();

FusionOS.boot();
