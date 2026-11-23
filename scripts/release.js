/* NORTHSTAR release metadata and in-app changelog.
   The manifest is the single source for visible release identity and history. */
(function(root){
'use strict';
const fallback={
 product:'NORTHSTAR',phase:'4.4.6',northstarVersion:'4.4.6.10',packageVersion:'0.4.15',
 bridge:{version:'1.1',status:'unchanged'},releaseDate:'2026-11-22',
 deployment:{preview:'CI-gated GitHub Pages deployment',production:'CI-gated GitHub Pages deployment'},
 releases:[
  {version:'4.4.6.10',date:'2026-11-22',title:'Authenticated Canvas PDF retrieval',
   description:'Browser-direct PDF retrieval now sends the Canvas bearer token only to HTTPS Canvas/Instructure allowlisted file hosts. Browser cookies remain omitted; blocked CORS requests fall back to the authenticated private bridge.',
   category:'Canvas integration',areas:['PDF retrieval','Instructure host allowlist','CORS fallback','Token isolation'],status:'Live Canvas account and physical iPad acceptance remain external checks.'},
  {version:'4.4.6.9',date:'2026-11-22',title:'Manifest-driven browser boot assertion',
   description:'Removes the last hardcoded NORTHSTAR version from the browser boot regression test. The test reads release.json and compares the visible version pill against the manifest.',
   category:'Test reliability',areas:['Browser boot test','Release manifest','Version consistency'],status:'Deployed to production and preview; see recorded release-specific GitHub Actions runs.'},
  {version:'4.4.6.3',date:'2026-11-22',title:'Manifest-driven version identity',
   description:'Removes the legacy hardcoded version override from dashboard rendering. The version pill remains owned by the release manifest and Settings reads the current manifest version.',
   category:'Bug fixes',areas:['Release manifest','Dashboard rendering','Version pill','Settings'],status:'See the release-specific GitHub Actions test and Pages deployment.'},
  {version:'4.4.6.2',date:'2026-11-22',title:'Document Studio — interaction lifecycle and faithful text export',
   description:'Closes page-level hover listeners on unmount, preserves touch selection during contextual formatting, clears hover targets, and improves PDF export for lists, paragraph spacing, justified text, and supported punctuation glyphs.',
   category:'PDF rendering/export',areas:['Editor lifecycle','Text selection','Lists','Justified alignment','Paragraph spacing'],status:'Preview artifact emitted by a stale workflow trigger; .2 suite failed a boot version assertion and the changes were carried into .3.'},
  {version:'4.4.6.1',date:'2026-11-22',title:'Document Studio — editable text-object foundation',
   description:'Introduces direct on-page text creation, selection, edit, move and resize controls, contextual typography, rich-text persistence, Pencil hover feedback, and formatted PDF export.',
   category:'Document Studio',areas:['Direct text editing','Typography','Apple Pencil interaction','PDF export'],status:'Deployed to production and preview.'}
 ]
};
const $=selector=>root.document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function manifestUrl(){
 const script=root.document.currentScript;
 if(script&&script.src){try{return new URL('../release.json',script.src).href;}catch{}}
 return 'release.json';
}
let manifest=fallback,overlay=null,lastFocus=null;
function channel(){return String(root.location.pathname||'').includes('/preview/')?'preview':'production';}
function updateVersion(){
 const pill=$('#versionPill');if(!pill)return;
 const version=manifest.northstarVersion||fallback.northstarVersion;
 pill.innerHTML='NORTHSTAR / '+esc(version)+' <span class="ns-version-new" aria-hidden="true">CHANGELOG</span>';
 pill.setAttribute('aria-label','NORTHSTAR version '+version+'. Open release notes.');
 pill.setAttribute('aria-expanded','false');
 if(pill.dataset.releaseBound!=='true'){
  pill.dataset.releaseBound='true';pill.addEventListener('click',open);
  pill.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
 }
}
function releaseCard(entry){
 const status=entry.status?'<span class="ns-release-status">'+esc(entry.status)+'</span>':'';
 const areas=Array.isArray(entry.areas)?entry.areas.map(item=>'<span>'+esc(item)+'</span>').join(''):'';
 const commits=Array.isArray(entry.commits)?entry.commits:[];
 const links=commits.map(item=>{
  const sha=typeof item==='string'?item:item.sha;
  const label=typeof item==='string'?item.slice(0,8):(item.label||String(item.sha||'').slice(0,8));
  const url=typeof item==='object'&&item.url?item.url:(sha?'https://github.com/s0ndvyr/NORTHSTAR-2.0/commit/'+encodeURIComponent(sha):'');
  return url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Commit '+esc(label)+'</a>':'';
 }).join('');
 const provenance=entry.historical?'<span class="ns-release-provenance">Reconstructed from repository history</span>':'';
 const bridge=entry.bridge?'<div class="ns-release-infra"><b>Bridge:</b> '+esc(entry.bridge.status||'not specified')+(entry.bridge.version?' · v'+esc(entry.bridge.version):'')+'</div>':'';
 const deployment=entry.deployment?'<div class="ns-release-infra"><b>Deployment:</b> '+esc(entry.deployment)+'</div>':'';
 return '<article class="ns-release-entry"><div class="ns-release-entry-head"><div><span class="ns-release-version">NORTHSTAR / '+esc(entry.version)+'</span><h3>'+esc(entry.title||'Release update')+'</h3></div><time>'+esc(entry.date||'Date not recorded')+'</time></div>'+
  '<p>'+esc(entry.description||'No further release description is available.')+'</p>'+
  (entry.category?'<span class="ns-release-category">'+esc(entry.category)+'</span>':'')+
  (areas?'<div class="ns-release-areas">'+areas+'</div>':'')+status+provenance+bridge+deployment+
  (links?'<div class="ns-release-links">'+links+'</div>':'')+'</article>';
}
function ensureOverlay(){
 if(overlay)return overlay;
 overlay=root.document.createElement('div');overlay.className='ns-release-overlay';overlay.hidden=true;
 overlay.innerHTML='<section class="ns-release-dialog" role="dialog" aria-modal="true" aria-labelledby="nsReleaseTitle" aria-describedby="nsReleaseDescription">'+
  '<header class="ns-release-header"><div><span class="ns-release-eyebrow">NORTHSTAR · RELEASE HISTORY</span><h2 id="nsReleaseTitle">What changed</h2><p id="nsReleaseDescription">Every tracked app, integration, and infrastructure update.</p></div>'+
  '<button type="button" class="ns-release-close" aria-label="Close release notes">×</button></header>'+
  '<div class="ns-release-summary"><div><span>Current release</span><b id="nsReleaseCurrent"></b></div><div><span>App package</span><b id="nsReleasePackage"></b></div><div><span>Bridge</span><b id="nsReleaseBridge"></b></div><div><span>Channel</span><b id="nsReleaseChannel"></b></div></div>'+
  '<div class="ns-release-list" id="nsReleaseList" tabindex="0" aria-label="Release history"></div>'+
  '<footer class="ns-release-footer"><span>Source: NORTHSTAR release manifest and recorded repository changes</span><button type="button" class="ns-release-close-secondary">Done</button></footer>'+
  '</section>';
 root.document.body.append(overlay);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 overlay.querySelector('.ns-release-close').addEventListener('click',close);
 overlay.querySelector('.ns-release-close-secondary').addEventListener('click',close);
 overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 return overlay;
}
function render(){
 const panel=ensureOverlay(),list=panel.querySelector('#nsReleaseList');
 const releases=Array.isArray(manifest.releases)?manifest.releases:[];
 panel.querySelector('#nsReleaseCurrent').textContent=manifest.northstarVersion||'Unknown';
 panel.querySelector('#nsReleasePackage').textContent=manifest.packageVersion||'Unknown';
 panel.querySelector('#nsReleaseBridge').textContent=(manifest.bridge&&manifest.bridge.version?manifest.bridge.version+' · ':'')+(manifest.bridge&&manifest.bridge.status||'not recorded');
 panel.querySelector('#nsReleaseChannel').textContent=channel();
 list.innerHTML=releases.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.version||'').localeCompare(String(a.version||''))).map(releaseCard).join('')||
  '<div class="ns-release-empty">No release notes have been recorded yet.</div>';
}
function open(){
 lastFocus=root.document.activeElement;render();overlay.hidden=false;root.document.body.classList.add('ns-release-open');
 const pill=$('#versionPill');if(pill)pill.setAttribute('aria-expanded','true');
 root.document.body.style.overflow='hidden';
 const closeButton=overlay.querySelector('.ns-release-close');closeButton.focus();
 try{root.localStorage.setItem('northstar-last-seen-release',manifest.northstarVersion||'');}catch{}
}
function close(){
 if(!overlay||overlay.hidden)return;
 overlay.hidden=true;root.document.body.classList.remove('ns-release-open');root.document.body.style.overflow='';
 const pill=$('#versionPill');if(pill)pill.setAttribute('aria-expanded','false');
 if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus();
}
function load(){
 updateVersion();
 root.fetch(manifestUrl(),{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('release manifest unavailable');return response.json();})
 .then(data=>{
  if(!data||typeof data.northstarVersion!=='string')throw Error('invalid release manifest');
  manifest=data;updateVersion();
  root.NorthstarRelease={manifest,open,close,channel};
 }).catch(()=>{
  manifest=fallback;updateVersion();root.NorthstarRelease={manifest,open,close,channel};
 });
}
root.NorthstarRelease={manifest,open,close,channel};
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',load,{once:true});else load();
root.document.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay&&!overlay.hidden)close();});
})(window);
