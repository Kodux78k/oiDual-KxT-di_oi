
(function(){
  'use strict';
  // 1) Emit event once on DOMContentLoaded (already mostly handled), and provide a fallback observer
  function fireRendered(node){
    document.dispatchEvent(new CustomEvent('infodx:rendered', { detail: { node: node || document } }));
  }

  document.addEventListener('DOMContentLoaded', ()=> setTimeout(()=>fireRendered(document), 80));

  // MutationObserver to catch dynamic chat renders
  const mo = new MutationObserver((mut)=>{
    for(const m of mut){
      if(!m.addedNodes) continue;
      for(const n of m.addedNodes){
        if(n.nodeType!==1) continue;
        // if new message nodes are appended, trigger beauty+trinity
        if(n.matches && (n.matches('.msg-block') || n.querySelector && n.querySelector('.msg-block'))){
          fireRendered(n);
        }
      }
    }
  });
  mo.observe(document.getElementById('chat-container') || document.body, { childList: true, subtree: true });

  // 2) Try to run the exposed functions if available
  function runPostRender(node){
    try{
      if(window.__TEXT_BEAUTY_V3_RUN__) window.__TEXT_BEAUTY_V3_RUN__(node ? (node.nodeType===1 ? null : null) : null);
      if(window.__TEXT_BEAUTY_V3__) {
        window.__TEXT_BEAUTY_V3__.processInline(document);
        window.__TEXT_BEAUTY_V3__.processQuestions(document);
        window.__TEXT_BEAUTY_V3__.beautifyFlow(document);
        window.__TEXT_BEAUTY_V3__.enableCopyLists(document);
        window.__TEXT_BEAUTY_V3__.renderRawHTML(document);
      }
      if(window.TrinityTTS && typeof window.TrinityTTS.injectJokers === 'function'){
        window.TrinityTTS.injectJokers('#chat-container');
      }
    }catch(e){ console.warn('[INFODOX_EMBED_LOADER] post render error', e); }
  }

  document.addEventListener('infodx:rendered', (e)=> {
    runPostRender(e && e.detail ? e.detail.node : document);
  });

  // 3) expose manual helper
  window.Infodox = window.Infodox || {};
  window.Infodox.runAll = function(rootSelector){
    try{
      const root = rootSelector ? document.querySelector(rootSelector) : document;
      if(window.__TEXT_BEAUTY_V3_RUN__) window.__TEXT_BEAUTY_V3_RUN__(rootSelector);
      if(window.__TEXT_BEAUTY_V3__) {
        window.__TEXT_BEAUTY_V3__.processInline(root);
        window.__TEXT_BEAUTY_V3__.processQuestions(root);
        window.__TEXT_BEAUTY_V3__.beautifyFlow(root);
        window.__TEXT_BEAUTY_V3__.enableCopyLists(root);
        window.__TEXT_BEAUTY_V3__.renderRawHTML(root);
      }
      if(window.TrinityTTS) window.TrinityTTS.injectJokers(rootSelector || '#chat-container');
      console.info('[Infodox.runAll] executed');
    }catch(e){ console.warn(e); }
  };

  // 4) small UX hint
  console.info('[INFODOX PATCH] Beauty.v3 + Trinity loaded. Use Infodox.runAll() to manually trigger.');
})();
