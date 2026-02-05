
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
