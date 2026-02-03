
(()=>{'use strict';
if(window.__TEXT_BEAUTY_V3__) return; window.__TEXT_BEAUTY_V3__=true;

/* Utilitários */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(s)=>s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

/* 0) Toggle edição rápida */
let EDIT_ON=false;
const toggleEdit=()=>{
  EDIT_ON=!EDIT_ON;
  document.body.toggleAttribute('data-edit', EDIT_ON);
  const host = document.getElementById('CONTENT') || document.querySelector('main, article, .render, .reader, body');
  if(host) host.contentEditable = EDIT_ON ? 'plaintext-only' : 'false';
};
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='e'){ e.preventDefault(); toggleEdit(); }
});

/* 1) Key:Value negrito (palavra:) + parênteses + chips [ ]
   - roda apenas em blocos de texto (p, li) e não mexe dentro de code/pre */
const processInline = (root=document)=>{
  const targets = $$('p, li, h1, h2, h3, h4, h5, h6', root).filter(n=>!n.closest('pre, code, .no-beauty'));
  const rxKV = /(^|\s)([A-Za-zÀ-ÿ0-9_]+):(?=\s|$)/g; // Palavra:
  const rxParen = /\(([^\n)]+)\)/g;                  // ( … )
  const rxChip  = /\[\[([^[\]]+)\]\]|\[([^[\]]+)\]/g; // [[a]] | [a]

  for(const el of targets){
    // evita processar múltiplas vezes
    if(el.dataset.inlineProcessed==='1') continue;
    el.dataset.inlineProcessed='1';

    const html = el.innerHTML;
    if(/<pre|<code|contenteditable/i.test(html)) continue;

    let out = html;

    // 1. Palavra:  → <strong>
    out = out.replace(rxKV, (m, sp, key)=> `${sp}<strong class="kv-key">${key}:</strong>`);

    // 2. ( ... )   → span-paren
    out = out.replace(rxParen, (m, inside)=> `<span class="span-paren">(${inside})</span>`);

    // 3. [ ... ] / [[ ... ]]  → chip/chip-btn
    out = out.replace(rxChip, (m, dbl, sgl)=>{
      const label = (dbl||sgl||'').trim();
      return `<span class="${dbl?'chip-btn':'chip'}" data-chip="${esc(label)}">${esc(label)}</span>`;
    });

    el.innerHTML = out;
  }
};

/* 2) Perguntas → .q-card (frases que terminam com '?') */
const processQuestions=(root=document)=>{
  const paras = $$('p', root).filter(n=>!n.closest('.q-card, pre, code, .no-beauty'));
  for(const p of paras){
    const txt = (p.innerText||'').trim();
    if(txt.endsWith('?') && !p.dataset.qProcessed){
      p.dataset.qProcessed='1';
      const wrap=document.createElement('div'); wrap.className='q-card';
      wrap.innerHTML = `<div class="q-ico">?</div><div class="q-body">${esc(txt)}</div>`;
      p.replaceWith(wrap);
    }
  }
};

/* 3) Flow text: melhora texto corrido, cria heading leve se linha for "Algo:" sozinha */
const beautifyFlow=(root=document)=>{
  const container = root.querySelector('.flow-text') || root; // se já tiver classe, usa; senão aplica heurística suave
  $$('p', container).forEach(p=>{
    const t=(p.innerText||'').trim();
    if(/^[^:\n]{3,}:\s*$/.test(t)){ // linha que termina com ":" vira heading leve
      p.classList.add('kv-head');
    }
    // Quebra parágrafos absurdamente longos em dois (heurística)
    if(t.length>600 && t.includes('. ')){
      const mark = t.indexOf('. ', Math.floor(t.length/2));
      if(mark>0){
        const a=t.slice(0, mark+1), b=t.slice(mark+1);
        const p2=p.cloneNode(); p2.textContent=b.trim();
        p.textContent=a.trim();
        p.insertAdjacentElement('afterend', p2);
      }
    }
  });
};

/* 4) Listas copiáveis: badge + click copy */
const enableCopyLists=(root=document)=>{
  const lists = $$('.list-card', root);
  for(const card of lists){
    if(card.querySelector('.copy-badge')) continue;
    const badge = document.createElement('div');
    badge.className='copy-badge'; badge.textContent='copiar';
    card.appendChild(badge);
    card.addEventListener('click', e=>{
      // evita copiar quando clicou em link/botão dentro
      if(e.target.closest('a,button,.chip,.chip-btn')) return;
      const txt = [...card.querySelectorAll('li')].map(li=>li.innerText.trim()).join('\n');
      navigator.clipboard.writeText(txt).then(()=>{
        badge.textContent='copiado!'; setTimeout(()=>badge.textContent='copiar',1200);
      });
    }, {passive:true});
  }
};

/* 5) HTML/SVG pass-through
   - ```html-raw ... ``` → renderiza
   - <div data-raw-html>…(escapado)…</div> → renderiza
*/
const renderRawHTML=(root=document)=>{
  // code fence transform
  $$('pre code', root).forEach(code=>{
    const cls = (code.className||'').toLowerCase();
    if(cls.includes('language-html-raw') || cls.includes('lang-html-raw')){
      const raw = code.textContent;
      const box = document.createElement('div');
      box.className='raw-html-card';
      box.innerHTML = `<div class="raw-note">HTML/SVG renderizado a partir de bloco <code>html-raw</code></div>`;
      const slot = document.createElement('div');
      slot.className='raw-slot';
      // injeta SEM esc, assumindo que o autor confia no conteúdo
      slot.innerHTML = raw;
      box.appendChild(slot);
      const pre = code.closest('pre');
      pre.replaceWith(box);
    }
  });

  // <div data-raw-html>…</div>
  $$('div[data-raw-html]', root).forEach(div=>{
    const raw = div.textContent; // assume texto escapado pelo md
    const box = document.createElement('div'); box.className='raw-html-card';
    const slot = document.createElement('div'); slot.className='raw-slot';
    slot.innerHTML = raw;
    box.appendChild(slot);
    div.replaceWith(box);
  });
};

/* 6) Delegação de cliques para chips (colchetes) */
document.addEventListener('click', e=>{
  const chip = e.target.closest('.chip, .chip-btn');
  if(chip){
    const label = chip.dataset.chip||chip.textContent.trim();
    // dispara um evento customizado para teu bus/orquestrador
    const ev = new CustomEvent('chip:click', {detail:{label, source:'text-beauty-v3'}});
    document.dispatchEvent(ev);
  }
}, {passive:true});

/* 7) Orquestração */
const run=(ctx=document)=>{
  processInline(ctx);
  processQuestions(ctx);
  beautifyFlow(ctx);
  enableCopyLists(ctx);
  renderRawHTML(ctx);
};

if(window.__RENDERBUS__?.on){
  window.__RENDERBUS__.on('after', run, {name:'text-beauty-v3', priority: 96});
}else{
  (document.readyState==='loading') ? document.addEventListener('DOMContentLoaded',()=>run(document)) : run(document);
  new MutationObserver(m=>m.forEach(x=>x.addedNodes&&x.addedNodes.forEach(n=>n.nodeType===1&&run(n))))
    .observe(document.body,{childList:true,subtree:true});
}
})();
