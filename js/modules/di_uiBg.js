(function(){
  if (window.diBgPanelUIInitialized) return;
  window.diBgPanelUIInitialized = true;

  // ===== helper: store abstrato
  function store(){
    if (!window.di_bgStore) {
      console.warn('[di-bg-panel] di_bgStore não encontrado');
      return null;
    }
    return window.di_bgStore;
  }

  // ===== aplica bg visual
  window.di_applyBackground = function(dataUrl){
    const el = document.getElementById('bg-fake-custom');
    if (!el) return;

    el.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : '';
    el.style.transition = 'opacity 450ms ease, background-image 300ms ease';
    el.style.opacity = dataUrl ? '0.25' : '0';

    const s = document.getElementById('bgStatusText');
    if (s) s.textContent = dataUrl ? 'Ativo' : 'Nenhum';
  };

  // ===== render painel
  window.di_renderBgPanel = async function(){
    const panel = document.getElementById('bgThumbPanel');
    if (!panel) return;

    const s = store();
    if (!s) return;

    const list = await s.getAll();
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
        position:relative;height:70px;border-radius:8px;
        background:url("${bg.data}") center/cover no-repeat;
        cursor:pointer;overflow:hidden;
        border:${bg.active ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,.12)'};
      `;

      const btns = document.createElement('div');
      btns.style.cssText = 'position:absolute;top:6px;right:6px;display:flex;gap:6px';

      const mkBtn = (txt, title) => {
        const b = document.createElement('button');
        b.textContent = txt;
        b.title = title;
        b.style.cssText = `
          background:rgba(0,0,0,.55);
          border:0;color:#fff;font-size:11px;
          border-radius:6px;padding:4px 6px;
        `;
        return b;
      };

      const btnApply = mkBtn('▶', 'Aplicar');
      const btnRemove = mkBtn('✕', 'Remover');

      btnApply.onclick = e => {
        e.stopPropagation();
        s.setActive(bg.id).then(di_renderBgPanel);
      };

      btnRemove.onclick = e => {
        e.stopPropagation();
        if (confirm('Remover background?')) {
          s.remove(bg.id).then(di_renderBgPanel);
        }
      };

      card.onclick = () => s.setActive(bg.id).then(di_renderBgPanel);

      btns.append(btnApply, btnRemove);
      card.append(btns);
      panel.appendChild(card);
    });
  };

  // ===== upload
  function bindUpload(){
    const inp = document.getElementById('bgUploadInput');
    if (!inp || inp._diBound) return;
    inp._diBound = true;

    inp.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async ev => {
        const s = store();
        if (!s) return;

        await s.add({
          name: file.name,
          data: ev.target.result
        });

        di_renderBgPanel();
        try { inp.value = ''; } catch {}
      };
      reader.readAsDataURL(file);
    });
  }

  // ===== init
  function init(){
    if (!document.getElementById('di-bg-thumb-style')) {
      const st = document.createElement('style');
      st.id = 'di-bg-thumb-style';
      st.textContent = `
        #bgThumbPanel .di-bg-thumb{
          box-shadow:0 6px 18px rgba(0,0,0,.35);
          transition:.15s
        }
        #bgThumbPanel .di-bg-thumb:hover{
          transform:translateY(-4px);
          box-shadow:0 12px 30px rgba(0,0,0,.45)
        }
      `;
      document.head.appendChild(st);
    }

    bindUpload();
    di_renderBgPanel();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();