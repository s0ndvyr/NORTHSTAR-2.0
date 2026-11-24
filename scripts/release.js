/* NORTHSTAR release metadata and in-app changelog.
   The manifest is the single source for visible release identity and history. */
(function(root){
'use strict';
const fallback={
 product:'NORTHSTAR',phase:'4.4.8',northstarVersion:'4.4.8.3',packageVersion:'0.4.31',
 bridge:{version:'1.3',status:'Worker 0.4.22 (4.4.8.2) is deployed and its live X-Northstar-Worker-Version header is verified. Cloudflare Version ID: f06f5377-632b-44c9-b647-dcfca3166f54.'},releaseDate:'2026-11-24',
 deployment:{preview:'NORTHSTAR 4.4.8.3 / package 0.4.31 is deployed at https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/. Initial qualified preview source SHA b844132bd49975743b291e8c5edd9a361c907081; Pages run 45397062468. Production remains 4.4.7.5 / package 0.4.19.',production:'Production remains NORTHSTAR 4.4.7.5 / package 0.4.19.'},
 releases:[
  {version:'4.4.8.3',date:'2026-11-24',title:'Canvas-aligned assignment architecture and provider routing',description:'Dedicated strategy pivot: centralized metadata-driven classification, official Canvas quiz/discussion/Student Annotation routing, sessionless external-tool launches and read-only return synchronization. Preserves supported Canvas-native submissions and specialized Document Studio workflows.',category:'Assignment architecture and provider integration',areas:['Metadata classifier','Google Assignments LTI handoff','Student Annotation','Quiz routing','External return synchronization'],status:'Preview deployed to https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/ by Pages run 45397062468. Initial qualified preview source SHA b844132bd49975743b291e8c5edd9a361c907081 (Phase 4 run 45396767776 passed). Real Canvas and Google Workspace LTI acceptance are not verified. Physical iPad Safari acceptance has not yet been performed. Canvas Worker 0.4.22 is unchanged; production remains 4.4.7.5 / package 0.4.19.',commits:[{sha:'b844132bd49975743b291e8c5edd9a361c907081',label:'initial exact-head Phase 4-qualified preview source'}]},
  {version:'4.4.8.2.1',date:'2026-11-23',title:'Phase 3 completion, Canvas integration repair and qualification',description:'Qualification sub-release of NORTHSTAR 4.4.8.2. Repairs assignment submission read-back, staged PDF upload progress, and Classic Quiz lost-response reconciliation; adds trusted signed-storage host validation and post-deployment Worker version verification. Preserves the New Quizzes provider boundary and Document Studio architecture.',category:'Phase 3 completion and qualification',areas:['Assignment read-back receipts','Staged multi-file and annotated PDF upload','Classic Quiz exact-attempt reconciliation','New Quizzes provider handoff','Discussion persistence and verification','Worker signed-storage host allowlist','Worker deployment smoke verification'],status:'Development candidate. The preview is published at https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/ through the exact-head Phase 4 freshness gate; the Pages workflow records the tested source SHA and validates the release manifest/package before deployment. Worker 0.4.22 is separately deployed and its live version header is verified. Real Canvas and physical iPad acceptance remain open; production remains 4.4.7.5 / package 0.4.19.',commits:[]},
  {version:'4.4.8.2',date:'2026-11-23',title:'Native Canvas assignment submission and assessment integration',description:'Phase 3 implementation baseline, superseded by qualification sub-release 4.4.8.2.1.',category:'Canvas submission and assessment integration',areas:['Assignment receipts','Classic Quiz completion','Discussion workflows'],status:'Historical Phase 3 baseline; superseded by 4.4.8.2.1.',commits:[]},
  {version:'4.4.8.1.1',date:'2026-11-23',title:'Document Studio lifecycle hardening and independent PDF export qualification',description:'Sub-priority qualification of the existing 4.4.8.1 Document Studio. Preserves the existing IndexedDB architecture, PDF.js renderer, annotation tools, Canvas delivery flow and submission implementation. Hardens Canvas assignment identity, per-document save serialization, stale asynchronous recovery, source validation and storage diagnostics. Prevents silent PDF text overflow and adds independent PDF.js reopening tests for multi-page documents with different dimensions and rotations.',category:'Document Studio qualification',areas:['Canvas assignment identity','IndexedDB write ordering','Safari recovery','Storage failure diagnostics','Source PDF validation','PDF export and overflow prevention','Independent PDF parser tests'],status:'Preview deployed successfully by Pages run 45249098517 from exact source SHA 3312aecf49d03ef16030f7a17b896b99364e73f5; exact-head Phase 4 passed in run 45248995494. Physical iPad Safari and Apple Pencil validation, including manual multi-page exported-PDF inspection, has not yet been performed; production stays 4.4.7.5 / package 0.4.19.',commits:[{sha:'3312aecf49d03ef16030f7a17b896b99364e73f5',label:'final source passed Phase 4 and was preview deployed'}]},
  {version:'4.4.8.1',date:'2026-11-23',title:'PDF Document Studio persistence and recovery',description:'Adds IndexedDB-backed storage for original Canvas PDF bytes and separate annotation drafts, restores matching Canvas file/course/assignment identities before another network fetch, flushes in-progress rich text when Safari backgrounds the page, and calculates page-specific viewports before flattened export. Existing Canvas local import, CORS fallback, Pencil, finger gestures and annotation tools are preserved. The Canvas Worker is unchanged.',category:'Document Studio and PDF persistence',areas:['IndexedDB source-PDF storage','Annotation draft autosave','Canvas attachment identity','Reload and interruption recovery','Safari visibility flush','Multi-page viewport and export preservation','Regression tests'],status:'Parent source northstar-4.4.8.1-document-studio at exact head 917c3a5e3f2862dba263fab4ee7ff0ab620b2566 passed Phase 4 run 45212530217 and was deployed as preview by Pages run 45212652910. Owner reports iPad Safari assignment edits survive page/site exit and device power-off. Physical multi-page export acceptance remains separate. Production remains 4.4.7.5 / package 0.4.19.'},
  {version:'4.4.8.0',date:'2026-11-23',title:'Browser-native Canvas PDF delivery and Document Studio recovery',description:'Rebuilds the PDF source path around authenticated Canvas public_url. The private Worker proxies Canvas API JSON only and never fetches storage bytes. Browser fetch uses the signed preview URL without Canvas credentials; if CORS blocks byte access, Safari displays the official inline preview and the workspace offers Canvas session handoff plus local PDF import for native editing/export. Removes the obsolete Worker binary-download route and adds tests for CORS fallback, hostile URL rejection, session handoff and local import.',category:'Canvas integration and Document Studio',areas:['Canvas public_url API','Safari-native PDF preview','Local PDF import recovery','Document Studio editing and export','Worker credential isolation','Regression tests'],status:'Phase 1 accepted by the owner on a physical iPad: actual Canvas assignment PDFs open in NORTHSTAR, can be fully viewed, and accept text annotations. Automated delivery/recovery tests passed and Worker 0.4.21 is deployed. Phase 2 persistence/export and Phase 3 submission acceptance remain separate gates; production stays on 4.4.7.5.'},
  {version:'4.4.7.9',date:'2026-11-23',title:'Canvas signed preview capability retrieval and safe diagnostics',description:'Treats every allowlisted URL returned by Canvas public_url as a temporary signed capability and never adds the Canvas bearer token or browser User-Agent to it or its redirects. Strict URL validation and the separate authenticated legacy fallback remain in place. Adds safe endpoint, host, status, Cloudflare request ID and redirect diagnostics without signed URL queries, tokens or bodies.',category:'Canvas integration and security',areas:['Document Studio attachment retrieval','Signed preview capability handling','Canvas credential isolation','Safe failure diagnostics','Worker regression tests'],status:'Preview deployed successfully: Worker 0.4.20 run 45107151368 and Pages run 45107205281. Live NNPS PDF retrieval and assignment submission remain open; production stays on 4.4.7.5.'},
  {version:'4.4.7.8',date:'2026-11-23',title:'Canvas authenticated public-preview PDF retrieval',description:'Prefers Canvas’s authenticated GET /api/v1/files/:id/public_url for inline document viewing, then fetches its signed storage URL without forwarding the Canvas bearer token to external object storage. If unavailable, falls back to authenticated file download with bearer credentials limited to the configured Canvas origin and explicit Instructure file-host allowlist. Adds safe URL validation and regression coverage.',category:'Canvas integration and security',areas:['Document Studio attachment retrieval','Canvas Files API public preview URL','Signed object storage','Trusted Instructure download authentication','Regression tests'],status:'Preview deployed successfully: Worker 0.4.19 run 45104758113 and Pages run 45104813239. Live NNPS PDF retrieval and assignment submission remain open; production stays on 4.4.7.5 pending acceptance.'},
  {version:'4.4.7.7',date:'2026-11-23',title:'Canvas PDF download request compatibility',description:'Restores the requesting browser User-Agent on the authenticated request to the configured school Canvas origin only. Cross-origin Instructure storage requests continue to receive neither the Canvas bearer token nor the browser User-Agent. Adds regression coverage for the Canvas-origin header boundary.',category:'Canvas integration and security',areas:['Canvas PDF retrieval','Canvas Cloudflare edge compatibility','Request header isolation','Worker security','Regression tests'],status:'Preview deployed successfully: Worker 0.4.18 run 45103459358 and Pages run 45103520416. Live NNPS PDF retrieval and assignment submission remain open; production stays on 4.4.7.5 pending acceptance.'},
  {version:'4.4.7.6',date:'2026-11-23',title:'Canvas PDF redirect authentication recovery',description:'The private Worker now sends the Canvas bearer token only to the configured school Canvas download endpoint, strips it from cross-origin redirects to signed Instructure storage, preserves only an origin-level Referer, avoids replaying the browser User-Agent to storage, and rejects untrusted redirect hosts. Regression tests model the NNPS Canvas → canvas-user-content.com → inscloudgate.net chain.',category:'Canvas integration and security',areas:['Canvas PDF retrieval','Redirect authentication','Instructure storage','Cloudflare 406 recovery','Worker security'],status:'Preview deployed successfully: Worker 0.4.17 run 45099837678 and Pages run 45099890111. Live NNPS PDF retrieval and assignment submission remain open; production stays on 4.4.7.5 pending acceptance.'},
  {version:'4.4.7.5',date:'2026-11-23',title:'Authenticated Canvas PDF retrieval',description:'Browser-direct PDF retrieval now sends the Canvas bearer token only to HTTPS Canvas/Instructure allowlisted file hosts. Browser cookies remain omitted; untrusted destinations are rejected and CORS failures fall back to the authenticated private Worker. The signed-upload token isolation and annotated-PDF-only submission workflow remain intact.',category:'Canvas integration and security',areas:['Authenticated PDF retrieval','Instructure host allowlist','CORS fallback','Signed upload token isolation','Document Studio submission'],status:'Production and preview are deployed; exact Pages run and tested source SHAs are recorded in release.json. Live Canvas/iPad acceptance remains open.'},
  {version:'4.4.7.4',date:'2026-11-23',title:'Canvas UI release-history assertion correction',description:'Corrects the release-history regression assertion while carrying forward the Document Studio annotated-PDF-only submission handoff.',category:'Test reliability',areas:['Canvas submission UI','Release history tests','Version consistency'],status:'Preview deployed successfully by Pages run 45086841863.'},
  {version:'4.4.7.3',date:'2026-11-23',title:'Document Studio to Canvas submission UI verification',description:'The Use annotated PDF action now submits the exported PDF as the sole attachment and has a browser boot integration test covering the complete in-dashboard UI handoff.',category:'Canvas integration',areas:['Document Studio export handoff','Annotated PDF selection','Assignment submission UI'],status:'Awaiting Phase 4 CI and preview deployment; live Canvas acceptance remains pending.'},
  {version:'4.4.7.2',date:'2026-11-22',title:'Canvas upload finalization — version-aligned diagnostics',description:'Carries forward the private-bridge Canvas upload finalization and makes attachment diagnostics read the app version from the release manifest.',category:'Canvas integration',areas:['Assignment PDF submission','Signed uploads','Authenticated finalization','Diagnostic version consistency'],status:'Awaiting Phase 4 CI and live Canvas acceptance.'},
  {version:'4.4.7.1',date:'2026-11-22',title:'Canvas file upload finalization',description:'Assignment and Classic Quiz uploads now complete Canvas’s documented signed upload flow through the private bridge, including the authenticated create_success request. The Canvas token is never sent to signed storage.',category:'Canvas integration',areas:['Assignment PDF submission','Signed uploads','Authenticated finalization','Submission pipeline'],status:'Awaiting Phase 4 CI and live Canvas acceptance.'},
  {version:'4.4.6.9',date:'2026-11-22',title:'Test-pinned deployment gate',
   description:'GitHub Pages verifies both source branches have passing Phase 4 push runs at their current heads and checks out those exact tested SHAs. A delayed successful event cannot publish a newer untested branch tip.',
   category:'Deployment',areas:['GitHub Actions','Source freshness','Test-pinned checkout','Release integrity'],status:'See the release-specific Phase 4 and Pages runs.'},
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
