(() => {
  'use strict';
  const $ = id => document.getElementById(id), DATA = window.ASE_DATA;
  const MODELS = ['qwen3.5-9b', 'churro-3b'], LABELS = {'qwen3.5-9b':'Qwen', 'churro-3b':'CHURRO'};
  const KEY = 'ase-review-differences-8270b54-v2';
  const TYPE_LABEL = {replace:'modifie', delete:'absent_du_modele', insert:'ajout_du_modele'};
  const RESULT = {reference:'modele_pire', modele:'modele_mieux', autre:'les_deux_faux'};
  const NOTHING = '(rien)';
  const tasks = DATA.pages.flatMap((p,pageIndex)=>MODELS.map(model=>({p,pageIndex,model,key:`${p.id}|${model}`})));
  tasks.forEach(t=>{t.diffs=window.ASEDifferences.compare(t.p.ref,t.p.predictions[t.model]);});
  const TOTAL = tasks.reduce((n,t)=>n+t.diffs.length,0);
  let state={choices:{},index:0,diff:0,autoNext:true}, storageOK=true, zoom=100, toastTimer;
  try {
    const raw=localStorage.getItem(KEY);
    if(raw){const s=JSON.parse(raw);if(!s||!s.choices||typeof s.choices!=='object'||Array.isArray(s.choices))throw Error('Invalid data');state={...state,...s};}
  } catch(_){storageOK=false;}
  state.index=Math.min(tasks.length-1,Math.max(0,Number(state.index)||0));
  const current=()=>tasks[state.index];
  const choiceKey=(t,i)=>`${t.key}#${i}`;
  const choiceOf=(t,i)=>state.choices[choiceKey(t,i)];
  const decidedIn=t=>t.diffs.filter((_,i)=>choiceOf(t,i)).length;
  const slice=(text,r)=>text.slice(r.start,r.end);
  function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
  function storageWarning(){
    $('storage-warning').hidden=false;
    $('storage-warning').textContent='La sauvegarde du navigateur est indisponible. Garde cette fenêtre ouverte et exporte ton CSV avant de la fermer.';
    $('save-status').textContent='Pense à exporter';
  }
  function save(){
    if(!storageOK){storageWarning();return;}
    try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='✓ Enregistré dans ce navigateur';}
    catch(_){storageOK=false;storageWarning();}
  }
  function progress(){
    const count=Object.keys(state.choices).length;
    $('progress').max=TOTAL||1;$('progress').value=count;$('progress-label').textContent=`${count} / ${TOTAL}`;
    document.querySelectorAll('.page-status').forEach((el,i)=>{
      const ts=tasks.filter(t=>t.pageIndex===i);
      el.textContent=`${ts.reduce((n,t)=>n+decidedIn(t),0)}/${ts.reduce((n,t)=>n+t.diffs.length,0)}`;
    });
  }
  function setZoom(value){zoom=Math.min(300,Math.max(50,value));$('manuscript').style.width=zoom+'%';$('zoom-reset').textContent=zoom+' %';}

  // ---------- Texte surligné ----------
  function highlight(container,text,side){
    const t=current();container.replaceChildren();let offset=0;
    t.diffs.forEach((d,index)=>{
      const range=d[side];
      container.append(document.createTextNode(text.slice(offset,range.start)));
      const mark=document.createElement('mark');mark.className='difference difference-'+d.type;
      mark.dataset.difference=index;mark.dataset.side=side;mark.tabIndex=0;mark.setAttribute('role','button');
      mark.textContent=text.slice(range.start,range.end);
      if(range.start===range.end)mark.classList.add('difference-gap');
      const who=side==='reference'?'la référence est juste (modèle pire)':'le modèle est juste (modèle mieux)';
      mark.title=`Différence ${index+1} · cliquer = ${who}`;
      mark.setAttribute('aria-label',`Différence ${index+1} : ${mark.textContent||'rien ici'}. Choisir : ${who}.`);
      const pick=()=>{state.diff=index;choose(side==='reference'?'reference':'modele');};
      mark.addEventListener('click',pick);
      mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});
      container.append(mark);offset=range.end;
    });
    container.append(document.createTextNode(text.slice(offset)));
  }
  function paintChoices(){
    const t=current();
    document.querySelectorAll('[data-difference]').forEach(mark=>{
      const i=Number(mark.dataset.difference),c=choiceOf(t,i);
      const good=c&&((c.choice==='reference'&&mark.dataset.side==='reference')||(c.choice==='modele'&&mark.dataset.side==='prediction'));
      mark.classList.toggle('chosen-good',!!good);mark.classList.toggle('chosen-bad',!!c&&!good);
      const active=i===state.diff;mark.classList.toggle('difference-active',active);mark.setAttribute('aria-pressed',String(active));
    });
  }
  function scrollToDiff(){
    for(const id of ['reference','prediction']){
      const container=$(id),mark=container.querySelector(`[data-difference="${state.diff}"]`);
      if(mark){const rect=container.getBoundingClientRect(),target=mark.getBoundingClientRect();container.scrollTop+=target.top-rect.top-container.clientHeight/2+Math.min(target.height,container.clientHeight)/2;}
    }
  }
  function renderDecision(){
    const t=current(),total=t.diffs.length,done=decidedIn(t);
    $('difference-count').textContent=total?`Différence ${state.diff+1} / ${total} · ${done} tranchée${done>1?'s':''}`:'Aucune différence de texte';
    $('difference-prev').disabled=!total||state.diff<=0;$('difference-next').disabled=!total||state.diff>=total-1;
    $('decision').hidden=!total;
    if(!total)return;
    const d=t.diffs[state.diff],c=choiceOf(t,state.diff);
    const ref=slice(t.p.ref,d.reference)||'∅',pred=slice(t.p.predictions[t.model],d.prediction)||'∅';
    $('decision-title').textContent=`« ${ref} » ↔ « ${pred} »`;
    $('decision-badge').textContent=c?{reference:'Modèle pire',modele:'Modèle mieux',autre:'Les deux faux'}[c.choice]:'À trancher';
    $('decision-badge').className='pill '+(c?{reference:'badge-ref',modele:'badge-model',autre:'badge-own'}[c.choice]:'');
    $('pick-ref').setAttribute('aria-pressed',String(c?.choice==='reference'));
    $('pick-model').setAttribute('aria-pressed',String(c?.choice==='modele'));
    $('own-text').value=c?.choice==='autre'?c.text:'';
    $('own-form').classList.toggle('chosen',c?.choice==='autre');
    $('clear').disabled=!c;
  }

  function render(){
    const {p,pageIndex,model}=current();
    $('page-title').textContent=p.title;
    $('page-meta').textContent=`PAGE ${String(pageIndex+1).padStart(2,'0')} / 10 · ${{fr:'FRANÇAIS',de:'ALLEMAND',en:'ANGLAIS'}[p.language]}`;
    if($('manuscript').getAttribute('src')!==p.image){$('manuscript').src=p.image;$('image-scroll').scrollTop=0;$('image-scroll').scrollLeft=0;zoom=100;}
    $('manuscript').alt=`Manuscrit original : ${p.title}`;$('original-link').href=p.image;setZoom(zoom);
    document.querySelectorAll('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.model===model)));
    $('pages').replaceChildren();
    DATA.pages.forEach((pg,i)=>{
      const b=document.createElement('button');b.className='page-button'+(i===pageIndex?' active':'');
      if(i===pageIndex)b.setAttribute('aria-current','page');
      const n=document.createElement('span');n.className='page-number';n.textContent=String(i+1).padStart(2,'0');
      const title=document.createElement('span');title.className='page-name';title.textContent=pg.title;
      const status=document.createElement('span');status.className='page-status';
      b.append(n,title,status);b.addEventListener('click',()=>select(i*2+MODELS.indexOf(model)));$('pages').append(b);
    });
    $('item-select').replaceChildren();
    tasks.forEach((t,i)=>{
      const opt=document.createElement('option');opt.value=i;const done=decidedIn(t);
      const marker=t.diffs.length&&done===t.diffs.length?'✓ ':done?'… ':'';
      opt.textContent=`${marker}${i+1}/20 · ${t.p.title} · ${LABELS[t.model]} (${done}/${t.diffs.length})`;$('item-select').append(opt);
    });
    $('item-select').value=state.index;$('prev').disabled=state.index===0;$('next').disabled=state.index===tasks.length-1;
    state.diff=Math.min(Math.max(0,Number(state.diff)||0),Math.max(0,current().diffs.length-1));
    document.querySelector('.reading-panel').classList.add('page-mode');
    $('prediction-label').textContent=`RECONNU PAR ${LABELS[model].toUpperCase()}`;
    const done=decidedIn(current()),total=current().diffs.length;
    $('verdict-badge').textContent=total&&done===total?'✓ Terminé':`${done} / ${total}`;
    $('verdict-badge').className='pill '+(total&&done===total?'badge-ok':'');
    highlight($('reference'),p.ref,'reference');highlight($('prediction'),p.predictions[model],'prediction');
    paintChoices();renderDecision();progress();save();
  }
  function select(index,diff=0){state.index=Math.max(0,Math.min(tasks.length-1,index));state.diff=diff;render();$('reference').scrollTop=0;$('prediction').scrollTop=0;}
  function goDiff(i){const t=current();if(!t.diffs.length)return;state.diff=Math.max(0,Math.min(t.diffs.length-1,i));paintChoices();renderDecision();scrollToDiff();save();}

  function choose(choice,text=''){
    const t=current();if(!t.diffs.length)return;
    state.choices[choiceKey(t,state.diff)]={choice,text,date:new Date().toISOString()};
    save();
    if(state.autoNext){
      const next=t.diffs.findIndex((_,i)=>i>state.diff&&!choiceOf(t,i));
      const earlier=t.diffs.findIndex((_,i)=>!choiceOf(t,i));
      if(next>=0||earlier>=0){render();goDiff(next>=0?next:earlier);return;}
      render();notify(`${t.p.title} · ${LABELS[t.model]} : toutes les différences sont tranchées.`);
      const nextTask=tasks.findIndex((x,i)=>i>state.index&&decidedIn(x)<x.diffs.length);
      if(nextTask>=0)setTimeout(()=>select(nextTask),900);
      else if(Object.keys(state.choices).length>=TOTAL)notify('Tout est tranché. Ouvre le rapport et exporte le CSV.');
      return;
    }
    render();
  }

  $('pick-ref').addEventListener('click',()=>choose('reference'));
  $('pick-model').addEventListener('click',()=>choose('modele'));
  $('own-form').addEventListener('submit',e=>{
    e.preventDefault();const text=$('own-text').value.trim();
    if(!text){notify('Écris le texte correct, ou choisis la référence ou le modèle.');$('own-text').focus();return;}
    choose('autre',text);
  });
  $('clear').addEventListener('click',()=>{delete state.choices[choiceKey(current(),state.diff)];render();});
  $('prev').addEventListener('click',()=>select(state.index-1));$('next').addEventListener('click',()=>select(state.index+1));
  $('item-select').addEventListener('change',e=>select(Number(e.target.value)));
  document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>select(current().pageIndex*2+MODELS.indexOf(b.dataset.model))));
  $('auto-next').checked=state.autoNext;
  $('auto-next').addEventListener('change',e=>{state.autoNext=e.target.checked;save();});
  $('zoom-in').addEventListener('click',()=>setZoom(zoom+25));$('zoom-out').addEventListener('click',()=>setZoom(zoom-25));$('zoom-reset').addEventListener('click',()=>setZoom(100));
  $('help-button').addEventListener('click',()=>$('help').showModal());
  $('difference-prev').addEventListener('click',()=>goDiff(state.diff-1));
  $('difference-next').addEventListener('click',()=>goDiff(state.diff+1));

  // ---------- Rapport ----------
  function counts(filter){
    const c={total:0,reference:0,modele:0,autre:0};
    tasks.filter(filter).forEach(t=>t.diffs.forEach((_,i)=>{c.total++;const x=choiceOf(t,i);if(x)c[x.choice]++;}));
    c.open=c.total-c.reference-c.modele-c.autre;return c;
  }
  function table(rows,firstLabel){
    const head=`<thead><tr><th>${firstLabel}</th><th>Différences</th><th>Modèle pire</th><th>Modèle mieux</th><th>Les deux faux</th><th>Non tranché</th></tr></thead>`;
    const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    return `<table class="report-table">${head}<tbody>${rows.map(([label,c])=>`<tr><td>${esc(label)}</td><td>${c.total}</td><td>${c.reference}</td><td>${c.modele}</td><td>${c.autre}</td><td>${c.open}</td></tr>`).join('')}</tbody></table>`;
  }
  function renderReport(){
    const byModel=MODELS.map(m=>[LABELS[m],counts(t=>t.model===m)]);
    const byPage=DATA.pages.flatMap((p,i)=>MODELS.map(m=>[`${String(i+1).padStart(2,'0')} ${p.title} · ${LABELS[m]}`,counts(t=>t.pageIndex===i&&t.model===m)]));
    $('report-body').innerHTML=`<p class="muted">« Modèle pire » = la référence était juste ; « modèle mieux » = le modèle avait raison contre la référence.</p><h3>Par modèle</h3>${table(byModel,'Modèle')}<h3>Par page</h3>${table(byPage,'Page · modèle')}`;
  }
  $('report-button').addEventListener('click',()=>{renderReport();$('report').showModal();});

  // ---------- Export CSV ----------
  function context(text,r){
    const before=text.slice(Math.max(0,r.start-30),r.start),after=text.slice(r.end,r.end+30);
    return (before+'['+text.slice(r.start,r.end)+']'+after).replace(/\s+/g,' ').trim();
  }
  function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function buildCSV(){
    const headers=['image_source','modele','page_id','dossier','langue','n_difference','type_ecart','texte_reference','texte_modele','contexte_reference','choix','texte_correct','resultat','date_verification','commit_source'];
    const rows=[];
    tasks.forEach(t=>t.diffs.forEach((d,i)=>{
      const c=choiceOf(t,i),pred=t.p.predictions[t.model];
      const ref=slice(t.p.ref,d.reference)||NOTHING,mod=slice(pred,d.prediction)||NOTHING;
      const correct=!c?'':c.choice==='reference'?ref:c.choice==='modele'?mod:c.text;
      rows.push([t.p.image,t.model,t.p.id,t.p.folder,t.p.language,i+1,TYPE_LABEL[d.type],ref,mod,context(t.p.ref,d.reference),c?.choice||'',correct,c?RESULT[c.choice]:'non_traite',c?.date||'',DATA.commit]);
    }));
    return '﻿'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
  }
  function exportCSV(){
    const blob=new Blob([buildCSV()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`ASE-rapport-differences-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    notify(`CSV exporté : ${TOTAL} lignes, une par différence (image source + modèle sur chaque ligne).`);
  }
  $('export').addEventListener('click',exportCSV);$('report-export').addEventListener('click',exportCSV);
  window.ASE_buildCSV=buildCSV;

  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,button,a,summary,[contenteditable],[role=button]'))return;
    const k=e.key.toLowerCase();
    if(k==='r'){e.preventDefault();choose('reference');}
    if(k==='m'){e.preventDefault();choose('modele');}
    if(e.key==='ArrowUp'){e.preventDefault();goDiff(state.diff-1);}
    if(e.key==='ArrowDown'){e.preventDefault();goDiff(state.diff+1);}
    if(e.key==='ArrowLeft'){e.preventDefault();select(state.index-1);}
    if(e.key==='ArrowRight'){e.preventDefault();select(state.index+1);}
  });
  $('manuscript').addEventListener('error',()=>notify('Image introuvable : garde OUVRIR.html dans le dossier ASE-verification-noms.'));
  render();if(!storageOK)storageWarning();
})();
