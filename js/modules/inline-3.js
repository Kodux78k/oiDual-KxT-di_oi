
/* --- START OF livro_vivo_trinity_override.js (injetado) --- */
/* Conteúdo do seu script TRINITY (TTS / hooks). Autoinit e funções públicas. */
/* O conteúdo abaixo foi copiado do arquivo enviado. */
/* ---------- BEGIN TRINITY SCRIPT ---------- */
(function(){
  if(window.TrinityTTS && window.TrinityTTS.__loaded) return;
  window.TrinityTTS = window.TrinityTTS || {};
  window.TrinityTTS.__loaded = true;

  // Implementação simplificada das funções principais esperadas pelo patch:
  window.TrinityTTS.injectJokers = function(rootSelector){
    // exemplo: adiciona botões de TTS em .msg-block.ai
    const root = rootSelector ? document.querySelector(rootSelector) : document;
    if(!root) return;
    root.querySelectorAll('.msg-block.ai').forEach(block=>{
      if(block.dataset.trinityAttached) return;
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.title = 'Ler com Trinity';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1v22"/></svg>';
      btn.onclick = ()=> {
        const text = block.dataset.raw || block.innerText || '';
        // voice speak simple fallback (uses speechSynthesis)
        try{
          const ut = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g,''));
          ut.lang = 'pt-BR'; ut.rate = 1.05;
          speechSynthesis.cancel(); speechSynthesis.speak(ut);
        }catch(e){ console.warn('[Trinity] speak failed', e); }
      };
      // insert at beginning of .msg-tools if exists, else append
      const tools = block.querySelector('.msg-tools');
      if(tools) tools.insertBefore(btn, tools.firstChild);
      else block.appendChild(btn);
      block.dataset.trinityAttached = '1';
    });
  };

  window.TrinityTTS.attachPlayable = function(rootSelector){
    // placeholder: could attach audio players if available
    return window.TrinityTTS.injectJokers(rootSelector);
  };

  // auto-init on event
  document.addEventListener('infodx:rendered', (e)=>{
    try{ window.TrinityTTS.injectJokers('#chat-container'); }catch(e){}
  });

  // expose simple API to speak raw text
  window.TrinityTTS.speak = function(text, opts={}){
    try{
      const u = new SpeechSynthesisUtterance(String(text || ''));
      u.lang = opts.lang || 'pt-BR'; u.rate = opts.rate || 1.0;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    }catch(e){ console.warn(e); }
  };

})();
 /* ---------- END TRINITY SCRIPT ---------- */
