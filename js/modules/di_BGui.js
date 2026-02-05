(function () {
  if (window.diBgPanelUIInitialized) return;
  window.diBgPanelUIInitialized = true;

  const PANEL_ID = 'bgThumbPanel';
  const STATUS_ID = 'bgStatusText';
  const UPLOAD_INPUT_ID = 'bgUploadInput';

  // ===== helpers seguros (UI NÃO assume engine)
  function getBgList() {
    if (typeof window.di_getBgList === 'function') {
      return window.di_getBgList() || [];
    }
    return [];
  }

  function setActive(id) {
    if (typeof window.di_setActiveBg === 'function') {
      window.di_setActiveBg(id);
    } else {
      console.warn('[bgPanel.ui] di_setActiveBg não disponível');
    }
  }

  function removeBg(id) {
    if (typeof window.di_removeBg === 'function') {
      window.di_removeBg(id);
    } else {
      console.warn('[bgPanel.ui] di_removeBg não disponível');
    }
  }

  // ===== render thumbnails (UI ONLY)
  function renderPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const list = getBgList();
    panel.innerHTML = '';

    if (!list.length) {
      panel.innerHTML =
        '<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;font-size:.85rem">Nenhum background</div>';
      return;
    }

    list.forEach(bg => {
      const card = document.createElement('div');
      card.className = 'di-bg-thumb';
      card.style.cssText = `
        position:relative;
        height:70px;
        border-radius:8px;
        cursor:pointer;
        background-image:url("${bg.thumb || bg.data || ''}");
        background-size:cover;
        background-position:center;
        overflow:hidden;
        border:${bg.active ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,.15)'};
      `;
      card.title = bg.name || bg.id || 'background';

      const btns = document.createElement('div');
      btns.style.cssText = `
        position:absolute;
        top:6px;
        right:6px;
        display:flex;
        gap:6px;
      `;

      const btnApply = document.createElement('button');
      btnApply.textContent = '▶';
      btnApply.title = 'Aplicar';
      btnApply.style.cssText = btnStyle();

      const btnRemove = document.createElement('button');
      btnRemove.textContent = '✕';
      btnRemove.title = 'Remover';
      btnRemove.style.cssText = btnStyle(true);

      btnApply.onclick = e => {
        e.stopPropagation();
        setActive(bg.id);
      };

      btnRemove.onclick = e => {
        e.stopPropagation();
        if (confirm('Remover background?')) removeBg(bg.id);
      };

      card.onclick = () => setActive(bg.id);

      btns.appendChild(btnApply);
      btns.appendChild(btnRemove);
      card.appendChild(btns);
      panel.appendChild(card);
    });

    updateStatus(list);
  }

  function updateStatus(list) {
    const el = document.getElementById(STATUS_ID);
    if (!el) return;
    const active = list.find(b => b.active);
    el.textContent = active ? 'Ativo' : 'Nenhum';
  }

  function btnStyle(danger) {
    return `
      background:${danger ? 'rgba(120,0,0,.6)' : 'rgba(0,0,0,.5)'};
      border:none;
      color:#fff;
      font-size:11px;
      padding:4px 6px;
      border-radius:6px;
      cursor:pointer;
    `;
  }

  // ===== upload: UI só dispara o input
  function bindUpload() {
    const inp = document.getElementById(UPLOAD_INPUT_ID);
    if (!inp || inp._uiBound) return;
    inp._uiBound = true;

    // engine deve escutar o change
    // aqui não fazemos nada
  }

  // ===== init
  function init() {
    bindUpload();
    renderPanel();
  }

  // permite engine forçar re-render
  window.di_renderBgPanelUI = renderPanel;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();