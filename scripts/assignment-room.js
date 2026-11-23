/* NORTHSTAR .4.4.1 — in-app assignment navigation + PDF document studio.
   PDF.js renders the source document. NORTHSTAR owns the annotation layer and exports
   a flattened PDF copy; Canvas remains the submission/grade source of truth. */
(function(root){
'use strict';
const $=s=>document.querySelector(s);
const room={id:null,previousView:'dashboard',fromHistory:false};
function routeId(){const m=String(location.hash||'').match(/^#assignment\/(.+)$/);if(!m)return null;try{return decodeURIComponent(m[1]);}catch{return null;}}
function routeUrl(id){return location.pathname+location.search+'#assignment/'+encodeURIComponent(String(id));}
function cleanUrl(){return location.pathname+location.search;}
function enter(id,options){
  options=options||{};
  if(!room.id){const active=document.querySelector('.view.active');room.previousView=active&&active.id?active.id.replace(/^view-/,''):'dashboard';}
  room.id=String(id);
  room.fromHistory=!!options.fromHistory;
  if(!options.fromHistory&&routeId()!==room.id)history.pushState({northstarAssignmentRoom:true,assignmentId:room.id},'',routeUrl(room.id));
  document.body.classList.add('assignment-room-open');
  const overlay=$('#wsOverlay');if(overlay)overlay.classList.add('open');
  document.documentElement.classList.add('assignment-room-open');
}
function exit(options){
  options=options||{};
  flushPdfDraft();
  if(!options.fromHistory&&routeId())history.replaceState({northstarAssignmentRoom:false},'',cleanUrl());
  document.body.classList.remove('assignment-room-open');
  document.documentElement.classList.remove('assignment-room-open');
  const overlay=$('#wsOverlay');if(overlay)overlay.classList.remove('open');
  room.id=null;room.fromHistory=false;
  root.dispatchEvent(new Event('northstar:assignment-room-exit'));
  if(typeof root.showView==='function')root.showView(room.previousView||'dashboard');
}
function close(){exit({fromHistory:false});}
function loadingMarkup(title,course){
 return '<div class="ns-room-loading"><div class="ns-loading-brand"><span class="ns-loading-orb"></span><span>NORTHSTAR <i>/ ASSIGNMENT WORKSPACE</i></span></div><div class="ns-loading-title"><span class="eyebrow">'+escapeHtml(course||'COURSEWORK')+'</span><h1>'+escapeHtml(title||'Opening assignment')+'</h1><p>Preparing your workspace, instructions and documents…</p></div><div class="ns-loading-grid"><div class="ns-loading-main"><span></span><span></span><span></span><span></span><span></span></div><div class="ns-loading-side"><span></span><span></span><span></span></div></div><div class="ns-loading-progress"><i></i></div></div>';
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeLink(value,base){
 try{const u=new URL(value,base);if(u.protocol!=='https:'&&u.protocol!=='http:')return null;return u.href;}catch{return null;}
}
const allowedTags=new Set(['P','BR','STRONG','B','EM','I','U','S','UL','OL','LI','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','PRE','CODE','A','IMG','TABLE','THEAD','TBODY','TR','TD','TH','HR','SPAN','DIV','SUP','SUB']);
function sanitizeHtml(markup,base){
 const parser=new DOMParser(),doc=parser.parseFromString(String(markup||''),'text/html');
 function copy(node){
  if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.nodeValue||'');
  if(node.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
  const tag=node.tagName;
  if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','VIDEO','AUDIO','SVG','MATH'].includes(tag))return document.createDocumentFragment();
  if(!allowedTags.has(tag)){const frag=document.createDocumentFragment();[...node.childNodes].forEach(child=>frag.append(copy(child)));return frag;}
  const out=document.createElement(tag.toLowerCase());
  if(tag==='A'){
   const href=safeLink(node.getAttribute('href')||'',base);
   if(href){out.href=href;out.target='_blank';out.rel='noopener noreferrer';out.setAttribute('data-ns-resource-link','true');}
  }
  if(tag==='IMG'){
   const src=safeLink(node.getAttribute('src')||'',base);
   if(src)out.src=src;else out.removeAttribute('src');
   out.alt=node.getAttribute('alt')||'Assignment image';out.loading='lazy';
  }
  if(tag==='TD'||tag==='TH'){['colspan','rowspan'].forEach(k=>{const v=node.getAttribute(k);if(v&&/^\d{1,2}$/.test(v))out.setAttribute(k,v);});}
  [...node.childNodes].forEach(child=>out.append(copy(child)));
  return out;
 }
 const frag=document.createDocumentFragment();[...doc.body.childNodes].forEach(n=>frag.append(copy(n)));return frag;
}
function collectFiles(details,base){
 const files=[],seen=new Set();
 const add=(id,name,contentType,url,size)=>{
  const n=Number(id);if(!Number.isSafeInteger(n)||n<1||seen.has(n))return;
  seen.add(n);files.push({id:n,name:String(name||('Canvas file '+n)),contentType:String(contentType||''),url:safeLink(url||'',base)||'',size:Number(size)||null});
 };
 (Array.isArray(details.attachments)?details.attachments:[]).forEach(f=>add(f.id,f.display_name||f.filename,f['content-type']||f.content_type,f.url,f.size));
 const parser=new DOMParser(),doc=parser.parseFromString(String(details.description||''),'text/html');
 doc.querySelectorAll('a').forEach(a=>{
  const candidate=a.getAttribute('data-api-endpoint')||a.getAttribute('href')||'';
  const match=candidate.match(/\/api\/v1\/(?:courses\/\d+\/)?files\/(\d+)/)||candidate.match(/\/courses\/\d+\/files\/(\d+)/);
  if(match)add(match[1],a.textContent.trim()||a.getAttribute('title')||('Canvas file '+match[1]),'',a.href||'');
 });
 if(details.annotatable_attachment_id)add(details.annotatable_attachment_id,'Document to annotate','application/pdf','');
 return files;
}
const pdfState={assignment:null,file:null,identity:null,bytes:null,doc:null,page:1,scale:1.15,tool:'pen',inputMode:'hand',color:'#c4e87b',width:2.8,annotations:{},history:[],redo:[],host:null,renderToken:0,openToken:0,viewports:{},activePointers:new Map(),activeGesture:null,preview:null,persistQueue:Promise.resolve(),persistenceMode:'unavailable',persistenceWarning:null,sourcePersisted:false};
const draftSaveQueues=new Map();
function pdfKey(){const preview=String(location.pathname||'').includes('/preview/');return 'northstar_'+(preview?'preview_':'')+'pdf_markup_v2_'+String(pdfState.assignment?.id||'assignment')+'_'+String(pdfState.file?.id||'file');}
function pdfIdentityKey(){return pdfKey().replace('_pdf_markup_v2_','_pdf_identity_v1_');}
function persistPdfIdentity(){
 const file=pdfState.file||{},assignment=pdfState.assignment||{};
 const localAssignmentKey=String(assignment.id||'');
 const canvasAssignmentId=Number(assignment.canvasAssignmentId)||(Number(assignment.id)>0?Number(assignment.id):null);
 const identity={schemaVersion:2,canvasFileId:Number(file.id)||null,courseId:Number(assignment.canvasCourseId)||null,canvasAssignmentId:Number.isSafeInteger(canvasAssignmentId)&&canvasAssignmentId>0?canvasAssignmentId:null,assignmentKey:localAssignmentKey,assignmentId:String(canvasAssignmentId||localAssignmentKey),originalFilename:String(file.originalName||file.name||''),contentType:String(file.contentType||'application/pdf'),size:Number(file.size)||null,canvasFilePath:'/courses/'+Number(assignment.canvasCourseId)+'/files/'+Number(file.id),importedFilename:String(file.importedFileName||'')};
 pdfState.identity=identity;
 try{localStorage.setItem(pdfIdentityKey(),JSON.stringify(identity));return true;}catch{return false;}
}
function legacyPdfKey(){return pdfKey().replace('_pdf_markup_v2_','_pdf_markup_v1_');}
function getPageState(page){const key=String(page);if(!pdfState.annotations[key])pdfState.annotations[key]={strokes:[],texts:[]};return pdfState.annotations[key];}
function currentPdfIdentity(){if(pdfState.identity)return pdfState.identity;persistPdfIdentity();return pdfState.identity;}
function samePdfIdentity(a,b){
 if(!a||!b||Number(a.canvasFileId)<=0||Number(a.canvasFileId)!==Number(b.canvasFileId)||Number(a.courseId)<=0||Number(a.courseId)!==Number(b.courseId))return false;
 const aCanvas=Number(a.canvasAssignmentId)||null,bCanvas=Number(b.canvasAssignmentId)||null;
 if(aCanvas&&bCanvas)return aCanvas===bCanvas;
 const aKey=String(a.assignmentKey||a.assignmentId||''),bKey=String(b.assignmentKey||b.assignmentId||'');
 return !!aKey&&aKey===bKey;
}
function normalizePdfAnnotations(value){
 const annotations=value&&typeof value==='object'?value:{};
 Object.keys(annotations).forEach(key=>{
  if(!/^\d+$/.test(key))return;
  const page=annotations[key];if(!page||typeof page!=='object'){delete annotations[key];return;}
  page.strokes=Array.isArray(page.strokes)?page.strokes:[];
  page.texts=root.NorthstarDocumentEditor?root.NorthstarDocumentEditor.migrateTextAnnotations(page.texts):Array.isArray(page.texts)?page.texts:[];
 });
 annotations.__schemaVersion=2;return annotations;
}
async function restoreStoredPdf(key,identity){
 const storage=root.NorthstarDocumentStorage;if(!storage?.getDocument)return {warning:{stage:'open',name:'NotSupportedError',message:'IndexedDB is not available in this browser.'}};
 const pending=draftSaveQueues.get(key);if(pending)await pending.catch(()=>false);
 let documentRecord=null,draft=null,documentError=null,draftError=null;
 try{documentRecord=await storage.getDocument(key);}catch(error){documentError=error;}
 try{draft=await storage.getDraft(key);}catch(error){draftError=error;}
 const warning=documentError||draftError?{stage:documentError?'document-read':'draft-read',name:String((documentError||draftError)?.name||'StorageError'),message:String((documentError||draftError)?.message||'Document storage could not be read.')}:(storage.getLastError?.()||null);
 const draftMatches=!!(draft&&samePdfIdentity(draft.identity,identity));
 const draftWarning=draft&&!draftMatches?{stage:'identity-mismatch',name:'IdentityMismatchError',message:'A saved annotation draft did not match this Canvas attachment. It was not applied.'}:null;
 if(!documentRecord)return {documentRecord:null,draft:draftMatches?draft:null,warning:warning||draftWarning||null};
 if(!samePdfIdentity(documentRecord.identity,identity))return {identityMismatch:true,documentRecord,draft,warning:{stage:'identity-mismatch',name:'IdentityMismatchError',message:'Saved PDF identity does not match the selected Canvas course, assignment and file. The stored record was left untouched.'}};
 const bytes=documentRecord.bytes instanceof Uint8Array?documentRecord.bytes:new Uint8Array(documentRecord.bytes||[]);
 if(bytes.byteLength<5||String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')return {invalidSource:true,documentRecord,draft,warning:{stage:'source-validation',name:'InvalidPdfError',message:'The saved PDF recovery copy is incomplete or invalid. The stored draft was preserved; NORTHSTAR will try the current Canvas attachment.'}};
 return {documentRecord,draft:draftMatches?draft:null,bytes,warning:warning||draftWarning,draftUpdatedAt:Number(draft?.updatedAt)||null};
}
function storageFailureMessage(error,fallback){
 const name=String(error?.name||''),stage=String(error?.stage||'');
 if(name==='QuotaExceededError')return 'Device storage is full. Your last saved draft remains intact; free Safari storage or export a backup.';
 if(name==='NotSupportedError'||stage==='open')return 'IndexedDB is unavailable in this Safari session. The localStorage compatibility copy is retained; export a backup before closing.';
 if(name==='IdentityMismatchError')return 'The saved document belongs to a different Canvas attachment and was not overwritten.';
 if(stage==='document-read'||stage==='draft-read'||stage==='write'||stage==='abort')return 'Device storage could not complete the save ('+(name||'storage error')+'). Your previous saved copy was not deliberately deleted; export a backup.';
 return fallback||'Device storage is unavailable. Export a backup before leaving this document.';
}
async function persistPdfSource(bytes,context){
 const storage=root.NorthstarDocumentStorage;if(!storage?.saveDocument)return false;
 const key=context?.key||pdfKey(),identity=context?.identity||currentPdfIdentity(),file=context?.file||pdfState.file||{};
 try{
  const saved=await storage.saveDocument({key,identity,bytes,filename:file.name||'Assignment PDF',contentType:file.contentType||'application/pdf',updatedAt:Date.now()});
  if(saved){if(!context||context.token===pdfState.openToken){pdfState.persistenceMode='IndexedDB';pdfState.sourcePersisted=true;pdfState.persistenceWarning=null;}return true;}
  const error=storage.getLastError?.();if(!context||context.token===pdfState.openToken){pdfState.sourcePersisted=false;pdfState.persistenceWarning=error||{stage:'document-write',name:'StorageWriteError',message:'The original PDF could not be stored.'};}
  return false;
 }catch(error){
  if(!context||context.token===pdfState.openToken){pdfState.sourcePersisted=false;pdfState.persistenceWarning={stage:'document-write',name:String(error?.name||'StorageWriteError'),message:String(error?.message||'The original PDF could not be stored.')};}
  return false;
 }
}
function queuePdfDraftSave(){
 const storage=root.NorthstarDocumentStorage;if(!storage?.saveDraft)return Promise.resolve(false);
 let annotations;try{annotations=JSON.parse(JSON.stringify(pdfState.annotations));}catch{return Promise.resolve(false);}
 const record={key:pdfKey(),identity:currentPdfIdentity(),annotations,page:pdfState.page,scale:pdfState.scale,updatedAt:Date.now()},key=record.key;
 const previous=draftSaveQueues.get(key)||Promise.resolve(false);
 const queued=previous.catch(()=>false).then(()=>storage.saveDraft(record)).then(saved=>{
  if(saved){if(key===pdfKey()){pdfState.persistenceMode='IndexedDB';if(pdfState.sourcePersisted){pdfState.persistenceWarning=null;setSaveState('Saved on this iPad · PDF and annotations recover automatically.');}else setSaveState('Annotations saved, but the original PDF recovery copy is unavailable. Export a backup before leaving.');}}
  else{const error=storage.getLastError?.();if(key===pdfKey())setSaveState(storageFailureMessage(error,'Draft remains in browser storage; IndexedDB recovery is unavailable. Export a backup.'));}
  return !!saved;
 }).catch(error=>{
  if(key===pdfKey())setSaveState(storageFailureMessage({stage:'write',name:error?.name,message:error?.message},'Draft remains in browser storage; IndexedDB recovery failed. Export a backup.'));
  return false;
 });
 draftSaveQueues.set(key,queued);
 queued.then(()=>{if(draftSaveQueues.get(key)===queued)draftSaveQueues.delete(key);});
 pdfState.persistQueue=queued;
 return queued;
}
function persistAnnotations(){
 let localSaved=false;try{localStorage.setItem(pdfKey(),JSON.stringify(pdfState.annotations));localSaved=true;}catch{}
 if(root.NorthstarDocumentStorage?.saveDraft){setSaveState('Saving draft to this iPad…');queuePdfDraftSave();if(!localSaved)setSaveState('Saving to IndexedDB; the local compatibility copy is unavailable.');return true;}
 if(localSaved){pdfState.persistenceMode='localStorage';return true;}
 notify('The annotation could not be saved on this device. Export a copy to keep it.');return false;
}
function flushPdfDraft(){try{if(pdfState.textEditor?.flush)pdfState.textEditor.flush();else persistAnnotations();}catch{persistAnnotations();}}
function notify(message){if(typeof root.toast==='function')root.toast(message);else{const n=$('#toast');if(n){n.textContent=message;n.classList.add('show');}}}
function isPenPointer(pointerType){return pointerType==='pen';}
function loadPdfEngine(){
 if(pdfState.pdfEngine)return Promise.resolve(pdfState.pdfEngine);
 if(pdfState.pdfEnginePromise)return pdfState.pdfEnginePromise;
 if(root.NorthstarPdfJs){pdfState.pdfEngine=root.NorthstarPdfJs;return Promise.resolve(pdfState.pdfEngine);}
 pdfState.pdfEnginePromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs').then(lib=>{
   lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';pdfState.pdfEngine=lib;return lib;
 });
 return pdfState.pdfEnginePromise;
}
function renderToolbar(host){
 host.innerHTML=[
  '<div class="ns-pdf-modebar" role="group" aria-label="PDF input mode">',
   '<span class="ns-pdf-mode-label">INPUT</span>',
   '<button type="button" data-ns-mode="hand" aria-pressed="true" class="is-active"><span aria-hidden="true">✋</span> Hand / Finger</button>',
   '<button type="button" data-ns-mode="pencil" aria-pressed="false"><span aria-hidden="true">✎</span> Apple Pencil</button>',
   '<span class="ns-pdf-mode-help">Choose your input. Every tool works in either mode.</span>',
  '</div>',
  '<div class="ns-pdf-toolbar">',
   '<div class="ns-pdf-tools" role="toolbar" aria-label="PDF annotation tools">',
    '<button type="button" data-ns-tool="select" title="Select and move an annotation">Move</button>',
    '<button type="button" data-ns-tool="pen" class="is-active" title="Draw freehand">Pen</button>',
    '<button type="button" data-ns-tool="highlight" title="Highlight text or a region">Highlight</button>',
    '<button type="button" data-ns-tool="text" title="Tap or drag on the page to create editable text">Text</button>',
    '<button type="button" data-ns-tool="line" title="Drag to draw a straight line">Line</button>',
    '<button type="button" data-ns-tool="arrow" title="Drag to draw an arrow">Arrow</button>',
    '<button type="button" data-ns-tool="rectangle" title="Drag to draw a rectangle">Box</button>',
    '<button type="button" data-ns-tool="ellipse" title="Drag to draw an ellipse">Oval</button>',
    '<button type="button" data-ns-tool="eraser" title="Erase annotations by brushing over them">Eraser</button>',
   '</div>',
   '<div class="ns-pdf-actions">',
    '<button type="button" data-ns-page="prev" aria-label="Previous page">←</button>',
    '<span class="ns-pdf-page-indicator" id="nsPdfPageIndicator">Page 1 / 1</span>',
    '<button type="button" data-ns-page="next" aria-label="Next page">→</button>',
    '<button type="button" data-ns-zoom="out" aria-label="Zoom out">−</button>',
    '<span id="nsPdfZoom">115%</span>',
    '<button type="button" data-ns-zoom="in" aria-label="Zoom in">+</button>',
    '<button type="button" data-ns-undo title="Undo last annotation">Undo</button>',
    '<button type="button" data-ns-redo title="Redo annotation">Redo</button>',
    '<button type="button" data-ns-export>Export PDF</button>',
   '</div>',
  '</div>',
  '<div class="ns-pdf-stylebar">',
   '<label>Ink <input type="color" id="nsPdfColor" value="#c4e87b"></label>',
   '<label>Brush <input type="range" id="nsPdfWidth" min="1" max="12" step=".5" value="2.8"></label>',
   '<span id="nsPdfInputHint" aria-live="polite">Choose a tool. Text objects are edited directly on the page.</span>',
  '</div>',
  '<div class="ns-pdf-contextbar" id="nsPdfTextContext" aria-label="Text formatting" hidden>',
   '<div class="ns-doc-format-group">',
    '<label class="ns-doc-format-label">Font <select data-doc-family aria-label="Font family"><option value="sans">Arial</option><option value="serif">Georgia / Serif</option><option value="mono">Courier / Mono</option></select></label>',
    '<label class="ns-doc-format-label">Size <input data-doc-size type="number" min="6" max="96" step="1" value="14" aria-label="Font size"></label>',
    '<label class="ns-doc-format-label">Style <select data-doc-preset aria-label="Text style"><option value="normal">Normal text</option><option value="title">Title</option><option value="subtitle">Subtitle</option><option value="heading1">Heading 1</option><option value="heading2">Heading 2</option><option value="heading3">Heading 3</option></select></label>',
   '</div>',
   '<div class="ns-doc-format-group" role="group" aria-label="Text appearance">',
    '<button type="button" data-doc-cmd="bold" aria-label="Bold" title="Bold"><b>B</b></button>',
    '<button type="button" data-doc-cmd="italic" aria-label="Italic" title="Italic"><i>I</i></button>',
    '<button type="button" data-doc-cmd="underline" aria-label="Underline" title="Underline"><u>U</u></button>',
    '<button type="button" data-doc-cmd="strike" aria-label="Strikethrough" title="Strikethrough"><s>S</s></button>',
    '<label class="ns-doc-color-label">Text <input data-doc-color type="color" value="#172033" aria-label="Text color"></label>',
    '<label class="ns-doc-color-label">Fill <input data-doc-background type="color" value="#ffffff" aria-label="Text box background"></label>',
   '</div>',
   '<div class="ns-doc-format-group">',
    '<label class="ns-doc-format-label">Align <select data-doc-align aria-label="Text alignment"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label>',
    '<label class="ns-doc-format-label">Line <input data-doc-line-height type="number" min="1" max="3" step=".1" value="1.35" aria-label="Line spacing"></label>',
    '<label class="ns-doc-format-label">Paragraph <input data-doc-paragraph-spacing type="number" min="0" max="48" step="1" value="0" aria-label="Paragraph spacing"></label>',
    '<button type="button" data-doc-list="ul" title="Bulleted list" aria-label="Bulleted list">• List</button>',
    '<button type="button" data-doc-list="ol" title="Numbered list" aria-label="Numbered list">1. List</button>',
    '<button type="button" data-doc-edit>Edit</button><button type="button" data-doc-done>Done</button>',
    '<button type="button" data-doc-duplicate>Duplicate</button><button type="button" data-doc-delete>Delete</button>',
   '</div>',
  '</div>',
  '<div class="ns-pdf-stage-scroll"><div class="ns-pdf-page"><canvas id="nsPdfCanvas" aria-label="PDF page"></canvas><canvas id="nsPdfInk" class="ns-pdf-ink" aria-label="PDF annotation layer"></canvas></div></div>',
  '<div class="ns-pdf-foot"><span id="nsPdfSaveState" role="status">Annotations save on this device as you work.</span><span id="nsPdfFileName"></span></div>'
 ].join('');
}

function wrapTextLines(text,maxWidth,measure){
 const lines=[],paragraphs=String(text||'').replace(/\r\n/g,'\n').split('\n'),measureText=typeof measure==='function'?measure:(value=>String(value).length*7);
 paragraphs.forEach(paragraph=>{
  const words=paragraph.split(/\s+/).filter(Boolean);let line='';
  if(!words.length){lines.push('');return;}
  words.forEach(word=>{
   const candidate=line?line+' '+word:word;
   if(line&&measureText(candidate)>maxWidth){lines.push(line);line=word;}else line=candidate;
  });
  if(line)lines.push(line);
 });
 return lines;
}
function drawOverlay(){
 const canvas=$('#nsPdfInk');if(!canvas||!pdfState.doc)return;
 const ctx=canvas.getContext('2d'),pageState=getPageState(pdfState.page),w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 pageState.strokes.forEach(stroke=>{
  const points=stroke.points||[];if(!points.length)return;
  ctx.save();ctx.strokeStyle=stroke.color||pdfState.color;ctx.fillStyle=stroke.color||pdfState.color;ctx.lineCap='round';ctx.lineJoin='round';
  const baseWidth=(stroke.tool==='highlight'?5:1)*(Number(stroke.width)||pdfState.width)*w/900;
  if(stroke.tool==='rectangle'||stroke.tool==='ellipse'||stroke.tool==='line'||stroke.tool==='arrow'){
   const first=points[0],last=points[points.length-1],x1=first.x*w,y1=first.y*h,x2=last.x*w,y2=last.y*h;
   ctx.globalAlpha=stroke.tool==='highlight'?.25:1;ctx.lineWidth=baseWidth;
   if(stroke.tool==='rectangle')ctx.strokeRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1));
   else if(stroke.tool==='ellipse'){ctx.beginPath();ctx.ellipse((x1+x2)/2,(y1+y2)/2,Math.max(1,Math.abs(x2-x1)/2),Math.max(1,Math.abs(y2-y1)/2),0,0,Math.PI*2);ctx.stroke();}
   else{
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    if(stroke.tool==='arrow'){const angle=Math.atan2(y2-y1,x2-x1),head=Math.max(10,baseWidth*4);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle-Math.PI/6),y2-head*Math.sin(angle-Math.PI/6));ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle+Math.PI/6),y2-head*Math.sin(angle+Math.PI/6));ctx.stroke();}
   }
  }else{
   ctx.globalAlpha=stroke.tool==='highlight'?.28:1;
   if(points.length===1){ctx.beginPath();ctx.arc(points[0].x*w,points[0].y*h,Math.max(1,baseWidth/2),0,Math.PI*2);ctx.fill();}
   else for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],pressure=Math.max(.15,Math.min(1,((a.pressure||.5)+(b.pressure||.5))/2));
    ctx.lineWidth=baseWidth*pressure;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();
   }
  }
  ctx.restore();
 });
 // Rich text objects are rendered in the interactive DOM layer.
 if(root.NorthstarDocumentEditor&&pdfState.textEditor)pdfState.textEditor.render();
 if(pdfState.preview&&pdfState.preview.page===pdfState.page){
  const p=pdfState.preview,x1=p.start.x*w,y1=p.start.y*h,x2=p.end.x*w,y2=p.end.y*h;
  ctx.save();ctx.setLineDash([7,5]);ctx.strokeStyle=p.color||'#c4e87b';ctx.lineWidth=2;ctx.globalAlpha=.9;
  if(pdfState.tool==='line'||pdfState.tool==='arrow'){
   ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
   if(pdfState.tool==='arrow'){const angle=Math.atan2(y2-y1,x2-x1),head=12;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle-.5),y2-head*Math.sin(angle-.5));ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle+.5),y2-head*Math.sin(angle+.5));ctx.stroke();}
  }else if(pdfState.tool==='ellipse'){ctx.beginPath();ctx.ellipse((x1+x2)/2,(y1+y2)/2,Math.max(1,Math.abs(x2-x1)/2),Math.max(1,Math.abs(y2-y1)/2),0,0,Math.PI*2);ctx.stroke();}
  else ctx.strokeRect(Math.min(x1,x2),Math.min(y1,y2),Math.max(1,Math.abs(x2-x1)),Math.max(1,Math.abs(y2-y1)));
  ctx.restore();
 }
}

function pushHistory(){
 const state=getPageState(pdfState.page),snapshot=JSON.stringify(state);
 pdfState.history.push({page:pdfState.page,state:snapshot});if(pdfState.history.length>100)pdfState.history.shift();pdfState.redo=[];
}
function setSaveState(text){const n=$('#nsPdfSaveState');if(n)n.textContent=text;}
function renderPage(){
 const token=++pdfState.renderToken;
 return pdfState.doc.getPage(pdfState.page).then(page=>{
  if(token!==pdfState.renderToken)return;
  const viewport=page.getViewport({scale:pdfState.scale});pdfState.viewports=pdfState.viewports||{};pdfState.viewports[pdfState.page]=viewport;const ratio=Math.min(root.devicePixelRatio||1,2),canvas=$('#nsPdfCanvas'),ink=$('#nsPdfInk'),wrapper=canvas&&canvas.parentElement;
  if(!canvas||!ink||!wrapper)return;
  [canvas,ink].forEach(c=>{c.width=Math.floor(viewport.width*ratio);c.height=Math.floor(viewport.height*ratio);c.style.width=viewport.width+'px';c.style.height=viewport.height+'px';});
  wrapper.style.width=viewport.width+'px';wrapper.style.height=viewport.height+'px';
  const ctx=canvas.getContext('2d');const transform=ratio===1?null:[ratio,0,0,ratio,0,0];
  return page.render({canvasContext:ctx,viewport,transform}).promise.then(()=>{
   if(token!==pdfState.renderToken)return;
   drawOverlay();const indicator=$('#nsPdfPageIndicator'),zoom=$('#nsPdfZoom');if(indicator)indicator.textContent='Page '+pdfState.page+' / '+pdfState.doc.numPages;if(zoom)zoom.textContent=Math.round(pdfState.scale*100)+'%';
  });
 });
}
function addPoint(event,canvas){
 const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
 const pressure=event.pointerType==='pen'?Math.max(.12,Math.min(1,Number(event.pressure)||.5)):.5;
 return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/height)),pressure};
}
const annotationTools=new Set(['select','pen','highlight','text','line','arrow','rectangle','ellipse','eraser']);
function canAnnotatePointer(pointerType,mode){
 return mode==='hand'?['touch','mouse'].includes(pointerType):mode==='pencil'?pointerType==='pen':false;
}
function canUseAnnotationTool(tool,pointerType,mode){
 return annotationTools.has(tool)&&canAnnotatePointer(pointerType,mode);
}
function distanceToSegment(point,start,end,widthPx,heightPx){
 const px=point.x*widthPx,py=point.y*heightPx,ax=start.x*widthPx,ay=start.y*heightPx,bx=end.x*widthPx,by=end.y*heightPx,dx=bx-ax,dy=by-ay;
 const length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/length)):0;
 return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
function pointHitsStroke(point,stroke,widthPx,heightPx,radiusPx){
 const pts=stroke.points||[];if(!pts.length)return false;
 const a=pts[0],b=pts[pts.length-1],tool=stroke.tool;
 if(tool==='rectangle'){
  const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);
  const edges=[[{x:left,y:top},{x:right,y:top}],[{x:right,y:top},{x:right,y:bottom}],[{x:right,y:bottom},{x:left,y:bottom}],[{x:left,y:bottom},{x:left,y:top}]];
  return edges.some(edge=>distanceToSegment(point,edge[0],edge[1],widthPx,heightPx)<=radiusPx);
 }
 if(tool==='ellipse'){
  const rx=Math.max(1,Math.abs(b.x-a.x)*widthPx/2),ry=Math.max(1,Math.abs(b.y-a.y)*heightPx/2),cx=(a.x+b.x)*widthPx/2,cy=(a.y+b.y)*heightPx/2;
  const normalized=Math.hypot((point.x*widthPx-cx)/rx,(point.y*heightPx-cy)/ry);
  return Math.abs(normalized-1)*Math.min(rx,ry)<=radiusPx;
 }
 if(tool==='line'||tool==='arrow'||pts.length===1)return distanceToSegment(point,a,b,widthPx,heightPx)<=radiusPx;
 for(let i=1;i<pts.length;i++)if(distanceToSegment(point,pts[i-1],pts[i],widthPx,heightPx)<=radiusPx)return true;
 return false;
}
function findAnnotationAt(point,state,widthPx,heightPx,radiusPx){
 for(let i=(state.texts||[]).length-1;i>=0;i--){
  const note=state.texts[i],w=(Number(note.width)||.55)*widthPx,h=(Number(note.height)||.12)*heightPx;
  if(point.x*widthPx>=note.x*widthPx-radiusPx&&point.x*widthPx<=note.x*widthPx+w+radiusPx&&point.y*heightPx>=note.y*heightPx-radiusPx&&point.y*heightPx<=note.y*heightPx+h+radiusPx)return {kind:'text',index:i};
 }
 for(let i=(state.strokes||[]).length-1;i>=0;i--)if(pointHitsStroke(point,state.strokes[i],widthPx,heightPx,radiusPx))return {kind:'stroke',index:i};
 return null;
}
function textBoxFromDrag(start,end,textLength){
 const left=Math.min(start.x,end.x),top=Math.min(start.y,end.y),dragWidth=Math.abs(end.x-start.x),dragHeight=Math.abs(end.y-start.y),defaultWidth=Math.max(.28,Math.min(.62,Math.max(1,Number(textLength)||1)*.012)),defaultHeight=Math.max(.09,Math.min(.24,((Number(textLength)||1)/42)*.035+.07)),width=dragWidth<.025?defaultWidth:Math.max(.12,dragWidth),height=dragHeight<.025?defaultHeight:Math.max(.055,dragHeight);
 return {x:Math.max(0,Math.min(left,1-width)),y:Math.max(0,Math.min(top,1-height)),width,height};
}
function setInputMode(mode){
 pdfState.inputMode=mode==='pencil'?'pencil':'hand';
 const host=pdfState.host,ink=$('#nsPdfInk'),stage=host?.querySelector('.ns-pdf-stage-scroll');
 if(ink)ink.dataset.inputMode=pdfState.inputMode;
 if(stage)stage.dataset.inputMode=pdfState.inputMode;
 if(host)host.querySelectorAll('[data-ns-mode]').forEach(button=>{
  const active=button.dataset.nsMode===pdfState.inputMode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
 });
 if(pdfState.textEditor)pdfState.textEditor.setMode(pdfState.inputMode);
 const hint=$('#nsPdfInputHint');
 if(hint)hint.textContent=pdfState.inputMode==='hand'?'Hand input · use your finger for every tool. Two fingers pan and pinch-zoom.':'Pencil input · use Apple Pencil for every tool. Two fingers pan and pinch-zoom.';
}
function setActiveTool(tool){
 if(!annotationTools.has(tool))return false;
 pdfState.tool=tool;
 const host=pdfState.host;
 if(host)host.querySelectorAll('[data-ns-tool]').forEach(button=>button.classList.toggle('is-active',button.dataset.nsTool===tool));
 if(pdfState.textEditor)pdfState.textEditor.setTool(tool);
 const hint=$('#nsPdfInputHint');
 if(hint){const label=tool==='text'?'Tap to create text or drag to size a box.':tool==='select'?'Select text to edit, drag the grip to move, or use a corner to resize.':tool==='eraser'?'Drag over marks to erase them.':'Drag on the page to use '+tool+'.';hint.textContent=label+' '+(pdfState.inputMode==='hand'?'Hand / finger input':'Apple Pencil input')+' remains selected.';}
 return true;
}
function getInputState(){return {mode:pdfState.inputMode,tool:pdfState.tool};}
function attachCanvasEvents(){
 const ink=$('#nsPdfInk'),stage=pdfState.host?.querySelector('.ns-pdf-stage-scroll');if(!ink||!stage)return;
 const pointers=pdfState.activePointers;pointers.clear();pdfState.activeGesture=null;
 let active=null;
 function inCanvas(event){
  const r=ink.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
 }
 function updatePointer(event){pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,type:event.pointerType});}
 function cancelActive(){
  if(!active)return;
  if(active.before&&active.page===pdfState.page){
   Object.assign(getPageState(active.page),JSON.parse(active.before));
   const last=pdfState.history[pdfState.history.length-1];if(last&&last.page===active.page)pdfState.history.pop();
   persistAnnotations();drawOverlay();
  }
  active=null;pdfState.preview=null;
 }
 function startGesture(){
  if(active?.pointerType==='pen')return false;
  if(active&&active.tool!=='hand-pan')cancelActive();else if(active?.tool==='hand-pan')active=null;
  const pair=[...pointers.entries()].filter(([,p])=>p.type==='touch').slice(0,2);
  if(pair.length<2)return false;
  const stageRect=stage.getBoundingClientRect(),pageRect=ink.parentElement.getBoundingClientRect();
  const a=pair[0][1],b=pair[1][1],centroid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
  pdfState.activeGesture={ids:pair.map(([id])=>id),distance,startScale:pdfState.scale,centroid,lastCentroid:centroid,origin:{x:centroid.x-pageRect.left,y:centroid.y-pageRect.top},scrollLeft:stage.scrollLeft,scrollTop:stage.scrollTop,stageRect};
  pair.forEach(([pointerId])=>{try{stage.setPointerCapture(pointerId);}catch{}});
  active=null;setSaveState('Gesture navigation');return true;
 }
 function updateGesture(){
  const g=pdfState.activeGesture;if(!g)return;
  const pair=g.ids.map(id=>pointers.get(id)).filter(Boolean);if(pair.length<2)return;
  const centroid={x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2},distance=Math.max(1,Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y)),factor=distance/g.distance;
  const nextScale=Math.max(.65,Math.min(2.5,g.startScale*factor)),visualFactor=nextScale/g.startScale,page=ink.parentElement;
  page.style.transformOrigin=g.origin.x+'px '+g.origin.y+'px';page.style.transform='scale('+visualFactor+')';
  stage.scrollLeft=Math.max(0,g.scrollLeft+g.origin.x*(visualFactor-1)-(centroid.x-g.centroid.x));
  stage.scrollTop=Math.max(0,g.scrollTop+g.origin.y*(visualFactor-1)-(centroid.y-g.centroid.y));
  g.lastCentroid=centroid;g.nextScale=nextScale;
 }
 async function finishGesture(){
  const g=pdfState.activeGesture;if(!g)return;
  pdfState.scale=g.nextScale||g.startScale;pdfState.activeGesture=null;pointers.clear();
  const page=ink.parentElement;page.style.transform='';page.style.transformOrigin='';
  await renderPage();setInputMode(pdfState.inputMode);setSaveState('Page gesture complete.');
 }
 function beginAnnotation(event,point){
  const tool=pdfState.tool,state=getPageState(pdfState.page),before=JSON.stringify(state);
  if(tool==='text'){
   active={tool:'text',pointerId:event.pointerId,pointerType:event.pointerType,page:pdfState.page,start:point,end:point,color:'#172033'};
   pdfState.preview={page:pdfState.page,start:point,end:point,color:'#8ea7c4'};drawOverlay();return;
  }
  if(tool==='eraser'||tool==='select'){
   pushHistory();
   active={tool,pointerId:event.pointerId,pointerType:event.pointerType,page:pdfState.page,start:point,last:point,before,selection:tool==='select'?findAnnotationAt(point,state,ink.clientWidth,ink.clientHeight,14):null};
   if(tool==='eraser')eraseAt(point);
   else if(!active.selection){pdfState.history.pop();active=null;setSaveState('Tap an annotation to select and move it.');}
   return;
  }
  pushHistory();active={tool,pointerId:event.pointerId,pointerType:event.pointerType,page:pdfState.page,start:point,end:point,color:pdfState.color,width:pdfState.width,points:[point],before};
  state.strokes.push(active);drawOverlay();
 }
 function eraseAt(point){
  const state=getPageState(pdfState.page),radius=Math.max(10,pdfState.width*4),w=ink.clientWidth,h=ink.clientHeight;
  const strokes=state.strokes||[],texts=state.texts||[];
  state.strokes=strokes.filter(stroke=>!pointHitsStroke(point,stroke,w,h,radius));
  state.texts=texts.filter(note=>{
   const x=note.x*w,y=note.y*h,bw=(Number(note.width)||.55)*w,bh=(Number(note.height)||.12)*h;
   return !(point.x*w>=x-radius&&point.x*w<=x+bw+radius&&point.y*h>=y-radius&&point.y*h<=y+bh+radius);
  });
 }
 function moveSelection(point){
  const item=active.selection,dx=point.x-active.last.x,dy=point.y-active.last.y,state=getPageState(active.page);
  if(item.kind==='text'){const note=state.texts[item.index];if(note){note.x=Math.max(0,Math.min(1-(note.width||.55),note.x+dx));note.y=Math.max(0,Math.min(1-(note.height||.12),note.y+dy));}}
  else{const stroke=state.strokes[item.index];if(stroke)(stroke.points||[]).forEach(p=>{p.x=Math.max(0,Math.min(1,p.x+dx));p.y=Math.max(0,Math.min(1,p.y+dy));});}
  active.last=point;drawOverlay();
 }
 function onPointerDown(event){
  if(!pdfState.doc)return;
  // Track touch contacts independently of the selected drawing input so two
  // fingers can always navigate, including while Apple Pencil mode is active.
  if(event.pointerType==='touch'||event.pointerType==='pen')updatePointer(event);
  if(pdfState.activeGesture){event.preventDefault();updateGesture();return;}
  if(event.pointerType==='touch'&&[...pointers.values()].filter(p=>p.type==='touch').length>=2){
   if(startGesture()){event.preventDefault();try{stage.setPointerCapture(event.pointerId);}catch{}return;}
  }
  // The selected mode determines the drawing device. Tool changes never alter it.
  if(!canUseAnnotationTool(pdfState.tool,event.pointerType,pdfState.inputMode))return;
  if(active)return;
  if(!inCanvas(event))return;
  event.preventDefault();
  const point=addPoint(event,ink);
  beginAnnotation(event,point);
  if(active){try{stage.setPointerCapture(event.pointerId);}catch{}}
 }
 function onPointerMove(event){
  if(pointers.has(event.pointerId))updatePointer(event);
  if(pdfState.activeGesture){updateGesture();event.preventDefault();return;}
  if(!active||active.pointerId!==event.pointerId)return;
  const events=event.getCoalescedEvents?event.getCoalescedEvents():[event],last=events[events.length-1],point=addPoint(last,ink);
  if(active.tool==='text'){
   active.end=point;pdfState.preview={page:active.page,start:active.start,end:point,color:active.color};drawOverlay();return;
  }
  if(active.tool==='select'){moveSelection(point);return;}
  if(active.tool==='eraser'){
   const prior=active.last,steps=Math.max(1,Math.ceil(Math.hypot((point.x-prior.x)*ink.clientWidth,(point.y-prior.y)*ink.clientHeight)/8));
   for(let i=1;i<=steps;i++)eraseAt({x:prior.x+(point.x-prior.x)*i/steps,y:prior.y+(point.y-prior.y)*i/steps});
   active.last=point;drawOverlay();return;
  }
  if(['line','arrow','rectangle','ellipse'].includes(active.tool)){active.points=[active.start,point];active.end=point;}
  else events.forEach(e=>active.points.push(addPoint(e,ink)));
  drawOverlay();
 }
 function finishActive(event,cancelled){
  if(!active||active.pointerId!==event.pointerId)return;
  if(cancelled){cancelActive();return;}
  if(active.tool==='text'){
   const end=active.end||active.start,box=textBoxFromDrag(active.start,end,30);
   pdfState.preview=null;
   if(pdfState.textEditor){
    pdfState.textEditor.createTextBox(box,{fontFamily:'sans',fontSize:14,color:'#172033',backgroundColor:'#ffffff',align:'left',lineHeight:1.35,opacity:.96});
    setSaveState('Text box created. Type directly on the page; use its handles to move or resize it.');
   }else setSaveState('Text editor is unavailable. Reopen the document and try again.');
   drawOverlay();
  }else{pdfState.preview=null;persistAnnotations();drawOverlay();setSaveState('Saved on this device. Export the annotated PDF to submit a copy.');}
  active=null;
 }
 function onPointerUp(event){if(pointers.has(event.pointerId))pointers.delete(event.pointerId);if(pdfState.activeGesture){if(pointers.size<2)finishGesture();return;}finishActive(event,false);}
 function onPointerCancel(event){if(pointers.has(event.pointerId))pointers.delete(event.pointerId);if(pdfState.activeGesture){finishGesture();return;}finishActive(event,true);}
 stage.addEventListener('pointerdown',onPointerDown);
 stage.addEventListener('pointermove',onPointerMove);
 stage.addEventListener('pointerup',onPointerUp);
 stage.addEventListener('pointercancel',onPointerCancel);
 stage.addEventListener('lostpointercapture',event=>{if(active&&active.pointerId===event.pointerId)finishActive(event,true);});
}
function wireToolbar(){
 const host=pdfState.host;if(!host)return;
 host.querySelectorAll('[data-ns-mode]').forEach(button=>button.addEventListener('click',()=>setInputMode(button.dataset.nsMode)));
 host.querySelectorAll('[data-ns-tool]').forEach(button=>button.addEventListener('click',()=>setActiveTool(button.dataset.nsTool)));
 host.querySelectorAll('[data-ns-page]').forEach(button=>button.addEventListener('click',()=>{
  pdfState.page=Math.max(1,Math.min(pdfState.doc.numPages,pdfState.page+(button.dataset.nsPage==='next'?1:-1)));renderPage();
 }));
 host.querySelectorAll('[data-ns-zoom]').forEach(button=>button.addEventListener('click',()=>{
  pdfState.scale=Math.max(.65,Math.min(2.5,pdfState.scale+(button.dataset.nsZoom==='in'?.15:-.15)));renderPage();
 }));
 const color=$('#nsPdfColor'),width=$('#nsPdfWidth'),undo=$('[data-ns-undo]'),redo=$('[data-ns-redo]'),exportButton=$('[data-ns-export]');
 if(color)color.addEventListener('input',()=>pdfState.color=color.value);
 if(width)width.addEventListener('input',()=>pdfState.width=Number(width.value));
 function takePageHistory(stack,page){for(let i=stack.length-1;i>=0;i--){if(stack[i].page===page)return stack.splice(i,1)[0];}return null;}
 if(undo)undo.addEventListener('click',()=>{
  const item=takePageHistory(pdfState.history,pdfState.page);if(!item)return;
  const state=getPageState(item.page);pdfState.redo.push({page:item.page,state:JSON.stringify(state)});
  Object.assign(state,JSON.parse(item.state));persistAnnotations();drawOverlay();setSaveState('Undone.');
 });
 if(redo)redo.addEventListener('click',()=>{
  const item=takePageHistory(pdfState.redo,pdfState.page);if(!item)return;
  const state=getPageState(pdfState.page);pdfState.history.push({page:pdfState.page,state:JSON.stringify(state)});
  Object.assign(state,JSON.parse(item.state));persistAnnotations();drawOverlay();setSaveState('Redone.');
 });
 if(exportButton)exportButton.addEventListener('click',async()=>{
  exportButton.disabled=true;exportButton.textContent='Exporting…';
  try{const file=await exportAnnotatedPdf();downloadBlob(file);setSaveState('Annotated PDF exported.');}
  catch(error){setSaveState('Could not export PDF: '+error.message);}
  finally{exportButton.disabled=false;exportButton.textContent='Export PDF';}
 });
 setInputMode(pdfState.inputMode);
}

function richTextRuns(note){
 const base={fontFamily:note.fontFamily||'sans',fontSize:Number(note.fontSize)||14,bold:!!note.bold,italic:!!note.italic,underline:!!note.underline,strike:!!note.strike,color:note.color||'#172033',backgroundColor:null};
 const holder=document.createElement('div');holder.innerHTML=note.html||String(note.text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r?\n/g,'<br>');
 const runs=[];
 function push(text,style){if(!text)return;runs.push({text:String(text),style:Object.assign({},style)});}
 function walk(node,inherited){
  if(node.nodeType===3){push(node.nodeValue,inherited);return;}
  if(node.nodeType!==1)return;
  const tag=node.tagName,style=Object.assign({},inherited),css=node.getAttribute('style')||'';
  if(tag==='B'||tag==='STRONG')style.bold=true;
  if(tag==='I'||tag==='EM')style.italic=true;
  if(tag==='U')style.underline=true;
  if(tag==='S'||tag==='STRIKE')style.strike=true;
  css.split(';').forEach(part=>{const at=part.indexOf(':');if(at<0)return;const key=part.slice(0,at).trim().toLowerCase(),value=part.slice(at+1).trim();
   if(key==='font-family')style.fontFamily=/courier|mono/i.test(value)?'mono':/georgia|times|serif/i.test(value)?'serif':'sans';
   if(key==='font-size'){const size=parseFloat(value);if(Number.isFinite(size))style.fontSize=Math.max(6,Math.min(96,size));}
   if(key==='font-weight'&&(value==='bold'||Number(value)>=600))style.bold=true;
   if(key==='font-style'&&value==='italic')style.italic=true;
   if(key==='text-decoration'){if(value.includes('underline'))style.underline=true;if(value.includes('line-through'))style.strike=true;}
   if(key==='color'&&/^#[0-9a-f]{6}$/i.test(value))style.color=value;
   if(key==='background-color'&&/^#[0-9a-f]{6}$/i.test(value))style.backgroundColor=value;
  });
  if(tag==='BR'){push('\n',style);return;}
  const block=['P','DIV','LI'].includes(tag),before=block&&runs.length&& !runs[runs.length-1].text.endsWith('\n');
  if(before)push('\n',style);
  if(tag==='LI'){
   const parent=node.parentElement,items=parent?Array.from(parent.children).filter(item=>item.tagName==='LI'):[],index=items.indexOf(node)+1;
   push(parent?.tagName==='OL'?(index+'. '):'• ',style);
  }
  Array.from(node.childNodes).forEach(child=>walk(child,style));
  if(block&&runs.length&&!runs[runs.length-1].text.endsWith('\n'))push('\n',style);
 }
 Array.from(holder.childNodes).forEach(node=>walk(node,base));
 return runs.length?runs:[{text:String(note.text||''),style:base}];
}
async function exportAnnotatedPdf(){
 if(!pdfState.bytes||!pdfState.doc)throw Error('Open a PDF first.');
 if(pdfState.textEditor?.flush)pdfState.textEditor.flush();
 if(pdfState.persistQueue)await pdfState.persistQueue.catch(()=>false);
 const lib=root.NorthstarPdfLib||await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
 const pdf=await lib.PDFDocument.load(pdfState.bytes),pages=pdf.getPages(),rgb=lib.rgb;
 if(pages.length!==pdfState.doc.numPages)throw Error('The exported PDF page count does not match the original. The source document was not changed.');
 for(const key of Object.keys(pdfState.annotations)){
  if(!/^\d+$/.test(key))continue;
  const index=Number(key)-1,page=pages[index];if(!page)continue;const width=page.getWidth(),height=page.getHeight(),s=pdfState.annotations[key];
  if(!pdfState.viewports[index+1]){const renderedPage=await pdfState.doc.getPage(index+1);pdfState.viewports[index+1]=renderedPage.getViewport({scale:pdfState.scale});}
  (s.strokes||[]).forEach(stroke=>{
   const points=stroke.points||[];if(!points.length)return;
   const viewport=pdfState.viewports[index+1]||{width,height,convertToPdfPoint:(x,y)=>[x,height-y]};
   const convert=p=>{const point=viewport.convertToPdfPoint(p.x*viewport.width,p.y*viewport.height);return {x:point[0],y:point[1]};};
   const first=convert(points[0]),last=convert(points[points.length-1]),color=stroke.color||'#c4e87b',match=color.match(/^#([0-9a-f]{6})$/i),hex=match?match[1]:'c4e87b',r=parseInt(hex.slice(0,2),16)/255,g=parseInt(hex.slice(2,4),16)/255,b=parseInt(hex.slice(4,6),16)/255,ink=rgb(r,g,b),thickness=Math.max(.8,stroke.width||pdfState.width);
   if(stroke.tool==='rectangle'){
    page.drawRectangle({x:Math.min(first.x,last.x),y:Math.min(first.y,last.y),width:Math.abs(last.x-first.x),height:Math.abs(last.y-first.y),borderColor:ink,borderWidth:thickness,opacity:1});
   }else if(stroke.tool==='ellipse'){
    page.drawEllipse({x:(first.x+last.x)/2,y:(first.y+last.y)/2,xScale:Math.abs(last.x-first.x)/2,yScale:Math.abs(last.y-first.y)/2,borderColor:ink,borderWidth:thickness});
   }else if(stroke.tool==='line'||stroke.tool==='arrow'){
    page.drawLine({start:first,end:last,thickness,color:ink,opacity:1});
    if(stroke.tool==='arrow'){
     const angle=Math.atan2(last.y-first.y,last.x-first.x),head=Math.max(8,thickness*4);
     for(const offset of [-Math.PI/6,Math.PI/6])page.drawLine({start:last,end:{x:last.x-head*Math.cos(angle+offset),y:last.y-head*Math.sin(angle+offset)},thickness,color:ink});
    }
   }else if(points.length===1){
    const pressure=Math.max(.12,Math.min(1,Number(points[0].pressure)||.5));
    page.drawCircle({x:first.x,y:first.y,size:Math.max(.5,thickness*pressure/2),color:ink,opacity:stroke.tool==='highlight'?.28:1});
   }else{
    for(let i=1;i<points.length;i++){
     const pressure=Math.max(.12,Math.min(1,((Number(points[i-1].pressure)||.5)+(Number(points[i].pressure)||.5))/2));
     page.drawLine({start:convert(points[i-1]),end:convert(points[i]),thickness:Math.max(.35,thickness*(stroke.tool==='highlight'?4:1)*pressure),color:ink,opacity:stroke.tool==='highlight'?.28:1});
    }
   }
  });
  for(const note of (s.texts||[])){
   const viewport=pdfState.viewports[index+1]||{width,height,convertToPdfPoint:(x,y)=>[x,height-y]};
   const toPdf=(px,py)=>viewport.convertToPdfPoint(px,py);
   const topLeft=toPdf(note.x*viewport.width,note.y*viewport.height),bottomRight=toPdf((note.x+(note.width||.42))*viewport.width,(note.y+(note.height||.12))*viewport.height);
   const bx=Math.min(topLeft[0],bottomRight[0]),by=Math.min(topLeft[1],bottomRight[1]),bw=Math.abs(bottomRight[0]-topLeft[0]),bh=Math.abs(bottomRight[1]-topLeft[1]);
   const hexColor=value=>{const h=String(value||'#172033').replace('#','');if(!/^[0-9a-f]{6}$/i.test(h))return rgb(.09,.13,.2);return rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255);};
   const background=hexColor(note.backgroundColor||'#ffffff');
   page.drawRectangle({x:bx,y:by,width:bw,height:bh,color:background,opacity:Number(note.opacity)||.92,borderColor:hexColor('#cbd5e1'),borderWidth:.35,borderOpacity:.45});
   const standard=lib.StandardFonts||{},fontCache=new Map();
   const getFont=async style=>{
    const family=style.fontFamily==='serif'?'TimesRoman':style.fontFamily==='mono'?'Courier':'Helvetica';
    const suffix=style.bold?(style.italic?'BoldItalic':'Bold'):(style.italic?(family==='Courier'?'Oblique':'Italic'):'');
    const name=family==='Helvetica'?(suffix==='Italic'?'HelveticaOblique':family+(suffix||'')):family+(suffix||'');
    const key=name in standard?name:'Helvetica';
    if(!fontCache.has(key))fontCache.set(key,await pdf.embedFont(standard[key]||standard.Helvetica));
    return fontCache.get(key);
   };
   const runs=richTextRuns(note),lines=[{tokens:[],width:0,maxSize:12,paragraphEnd:false}];
   const scaleX=width/viewport.width,scaleY=height/viewport.height,maxWidth=Math.max(8,bw-10*scaleX);
   for(const run of runs){
    const style=run.style||{},font=await getFont(style),size=Math.max(6,Math.min(96,Number(style.fontSize)||Number(note.fontSize)||14))*scaleY;
    const tokens=String(run.text||'').replace(/\r\n/g,'\n').split(/(\n|\s+)/);
    for(const token of tokens){
     if(!token)continue;
     if(token==='\n'){lines[lines.length-1].paragraphEnd=true;lines.push({tokens:[],width:0,maxSize:12,paragraphEnd:false});continue;}
     const chunks=[];
     if(!/^\\s+$/.test(token)&&font.widthOfTextAtSize(token,size)>maxWidth){
      let chunk='';
      for(const character of Array.from(token)){
       const candidate=chunk+character;
       if(chunk&&font.widthOfTextAtSize(candidate,size)>maxWidth){chunks.push(chunk);chunk=character;}else chunk=candidate;
      }
      if(chunk)chunks.push(chunk);
     }else chunks.push(token);
     for(const piece of chunks){
      const tokenWidth=font.widthOfTextAtSize(piece,size);
      if(tokenWidth>maxWidth)throw Error('A text annotation on page '+(index+1)+' contains a character wider than its text box. Widen the box before exporting.');
      let line=lines[lines.length-1];
      if(line.tokens.length&&line.width+tokenWidth>maxWidth&&!/^\\s+$/.test(piece)){
       lines.push({tokens:[],width:0,maxSize:12,paragraphEnd:false});line=lines[lines.length-1];
      }
      if(/^\\s+$/.test(piece)&&!line.tokens.length)continue;
      line.tokens.push({text:piece,style,font,size,width:tokenWidth});line.width+=tokenWidth;line.maxSize=Math.max(line.maxSize,size);
     }
    }
   }
   if(lines.length>1&&!lines[lines.length-1].tokens.length)lines.pop();
   if(lines.length)lines[lines.length-1].paragraphEnd=true;
   const maxLines=Math.max(1,Math.floor(Math.max(1,bh-8)/(Math.max(6,Number(note.fontSize)||14)*scaleY*(Number(note.lineHeight)||1.35))));
   const requiredBottom=lines.reduce((bottom,line,index)=>Math.max(bottom,6+(index+1)*Math.max(6,line.maxSize/Math.max(.0001,scaleY))*(Number(note.lineHeight)||1.35)+lines.slice(0,index).filter(item=>item.paragraphEnd).length*(Number(note.paragraphSpacing)||0)),0);
   if(lines.length>maxLines||requiredBottom>Math.max(1,(Number(note.height)||.12)*viewport.height-4))throw Error('A text annotation on page '+(index+1)+' exceeds its text box. Enlarge the box or reduce its font size before exporting; no text was silently clipped.');
   lines.forEach((line,lineIndex)=>{
    const alignment=note.align||'left',availableWidth=Math.max(8,bw-10*scaleX),spaceCount=line.tokens.filter(token=>/^\\s+$/.test(token.text)).length;
    const justifyGap=alignment==='justify'&&!line.paragraphEnd&&spaceCount?Math.max(0,availableWidth-line.width)/spaceCount:0;
    const offset=alignment==='center'?Math.max(0,(availableWidth-line.width)/2):alignment==='right'?Math.max(0,availableWidth-line.width):0;
    let cursorPx=note.x*viewport.width+5+offset/Math.max(.0001,scaleX);
    const completedParagraphs=lines.slice(0,lineIndex).filter(item=>item.paragraphEnd).length;
    const baselinePx=note.y*viewport.height+6+(lineIndex+1)*Math.max(6,(line.maxSize/Math.max(.0001,scaleY)))*(Number(note.lineHeight)||1.35)+completedParagraphs*(Number(note.paragraphSpacing)||0);
    line.tokens.forEach(token=>{
     const [tx,ty]=toPdf(cursorPx,baselinePx),color=hexColor(token.style.color||note.color||'#172033');
     if(token.style.backgroundColor){const bg=hexColor(token.style.backgroundColor);page.drawRectangle({x:tx,y:ty-2,width:token.width,height:token.size,color:bg,opacity:.8});}
     const safe=token.text.replace(/[^\x20-\xFF]/g,char=>({'•':'•','–':'–','—':'—','’':'’','‘':'‘','“':'“','”':'”','…':'…'}[char]||'?'));
     page.drawText(safe,{x:tx,y:ty,size:token.size,font:token.font,color});
     if(token.style.underline||token.style.strike){
      const lineY=ty+(token.style.underline?-1:token.size*.32);
      page.drawLine({start:{x:tx,y:lineY},end:{x:tx+token.width,y:lineY},thickness:Math.max(.35,token.size*.035),color});
     }
     cursorPx+=token.width/Math.max(.0001,scaleX);
     if(alignment==='justify'&&!line.paragraphEnd&&/^\\s+$/.test(token.text))cursorPx+=justifyGap/Math.max(.0001,scaleX);
    });
   });
  }
 }
 const bytes=await pdf.save(),name=String(pdfState.file?.name||'assignment.pdf').replace(/\.pdf$/i,'')+'-northstar-annotated.pdf';
 return new File([bytes],name,{type:'application/pdf'});
}
function downloadBlob(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name||'annotated.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function initializePdfEditor(host,bytes,context){
 context=context||{token:pdfState.openToken,key:pdfKey(),identity:currentPdfIdentity(),file:pdfState.file};
 if(context.token!==pdfState.openToken)return false;
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]);
 if(data.byteLength<5||String.fromCharCode(...data.slice(0,5))!=='%PDF-')throw Error('The selected file is not a readable PDF. Choose the original PDF from Files.');
 pdfState.bytes=data;pdfState.doc=null;pdfState.renderToken++;
 renderToolbar(host);
 const name=$('#nsPdfFileName');if(name)name.textContent=pdfState.file?.name||'Assignment PDF';
 const lib=await loadPdfEngine();
 if(context.token!==pdfState.openToken)return false;
 const parseBytes=pdfState.bytes.slice();
 const parsedDocument=await lib.getDocument({data:parseBytes}).promise;
 if(context.token!==pdfState.openToken)return false;
 pdfState.doc=parsedDocument;
 // Only persist bytes after PDF.js has successfully parsed the source file.
 setSaveState('Saving the original PDF to this iPad…');
 const sourceSaved=await persistPdfSource(data,context);
 if(context.token!==pdfState.openToken)return false;
 attachCanvasEvents();wireToolbar();await renderPage();
 if(context.token!==pdfState.openToken)return false;
 if(pdfState.textEditor)pdfState.textEditor.unmount();
 if(root.NorthstarDocumentEditor){
  pdfState.textEditor=root.NorthstarDocumentEditor.mount({
   getHost:()=>host,getPageElement:()=>$('#nsPdfCanvas')?.parentElement,getTexts:()=>getPageState(pdfState.page).texts,
   canInteract:pointerType=>canAnnotatePointer(pointerType,pdfState.inputMode),
   getBrushSize:()=>pdfState.width*3,beforeChange:()=>pushHistory(),
   onChange:()=>{setSaveState('Saving…');persistAnnotations();}
  });
  pdfState.textEditor.setMode(pdfState.inputMode);pdfState.textEditor.setTool(pdfState.tool);pdfState.textEditor.render();
  persistAnnotations();
 }
 const completedDraftSave=pdfState.persistQueue;
 if(completedDraftSave)await completedDraftSave.catch(()=>false);
 if(context.token!==pdfState.openToken)return false;
 if(!sourceSaved)setSaveState(storageFailureMessage(pdfState.persistenceWarning,'PDF opened, but its original bytes could not be saved for automatic recovery. Export a backup before leaving.'));
 else if(pdfState.persistenceWarning)setSaveState('PDF opened and the original is saved. '+storageFailureMessage(pdfState.persistenceWarning,'Some saved annotations could not be read; the compatibility draft was retained.'));
 else if(pdfState.persistenceMode==='IndexedDB')setSaveState('Saved on this iPad · PDF and annotations recover automatically.');
 else setSaveState('Draft saved in browser storage. Export a backup before leaving.');
}
function renderNativePdfFallback(host,file,assignment,credentials,source){
 const token=pdfState.openToken;
 if(Number(pdfState.file?.id)===Number(file.id))file={...file,...pdfState.file};
 const fileSnapshot={...file},assignmentSnapshot={...assignment},identity=currentPdfIdentity(),key=pdfKey();
 const previewUrl=String(source?.previewUrl||'');
 const returnTo=String(source?.canvasReturnTo||('/courses/'+assignment.canvasCourseId+'/files/'+file.id));
 const browserResult=String(source?.previewDelivery?.result||'');
 const frame=previewUrl?'<iframe class="ns-pdf-native-preview" title="Canvas original PDF preview" src="'+escapeHtml(previewUrl)+'" referrerpolicy="no-referrer"></iframe>':'<div class="ns-pdf-native-placeholder"><span class="eyebrow">CANVAS FILE</span><h3>Original PDF ready in Canvas</h3><p>Open the official file preview to save a local copy, then import that copy here to edit and export it.</p></div>';
 host.innerHTML='<div class="ns-pdf-native-fallback">'+
  '<div class="ns-pdf-native-head"><span class="eyebrow">DOCUMENT STUDIO / BROWSER DELIVERY</span><h2>'+escapeHtml(file.name)+'</h2>'+
  '<p>Canvas has authorized this attachment, but Safari may be required to open its temporary preview. NORTHSTAR cannot always read cross-origin storage bytes directly. Temporary preview links can expire; use Refresh Canvas preview to request a new one.</p></div>'+
  '<div class="ns-pdf-native-preview-wrap">'+frame+'</div>'+
  '<div class="ns-pdf-native-actions">'+
   (previewUrl?'<a class="btn btn-primary" href="'+escapeHtml(previewUrl)+'" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Open original PDF in Safari</a>':'')+
   '<button class="btn btn-ghost" type="button" id="nsPdfRefreshPreview">Refresh Canvas preview</button>'+
   '<button class="btn btn-ghost" type="button" id="nsPdfOpenCanvas">Open official Canvas file</button>'+
   '<button class="btn btn-primary" type="button" id="nsPdfImportLocal">Import downloaded PDF to edit</button>'+
   '<input id="nsPdfLocalFile" type="file" accept="application/pdf,.pdf" hidden>'+
  '</div>'+
  '<p class="ns-pdf-native-help">On iPad: open the original PDF, use Safari’s Share button and choose <strong>Save to Files</strong>. Return here, choose <strong>Import downloaded PDF to edit</strong>, and select that saved file. NORTHSTAR keeps this Canvas attachment’s file, course and assignment IDs as the working context; verify that the selected PDF is the intended attachment. Your annotations can then be edited and exported for Canvas.</p>'+
  '<p class="ns-pdf-native-status" id="nsPdfNativeStatus" role="status" aria-live="polite">'+
   (browserResult==='browser_fetch_blocked'?'Safari could not expose the PDF bytes to JavaScript. The native preview path is being used.':'Preview delivery is using the browser-native route.')+
  '</p></div>';
 const input=host.querySelector('#nsPdfLocalFile'),choose=host.querySelector('#nsPdfImportLocal'),status=host.querySelector('#nsPdfNativeStatus');
 if(choose&&input)choose.onclick=()=>input.click();
 if(input)input.addEventListener('change',async()=>{
  const local=input.files?.[0];if(!local)return;
  const activeToken=token;choose.disabled=true;if(status)status.textContent='Reading '+local.name+'…';
  try{
   const bytes=new Uint8Array(await local.arrayBuffer());
   if(activeToken!==pdfState.openToken)return;
   if(bytes.byteLength>100*1024*1024)throw Error('This PDF is larger than NORTHSTAR’s 100 MB in-browser editing limit.');
   const header=String.fromCharCode(...bytes.subarray(0,Math.min(bytes.byteLength,1024)));
   if(!header.includes('%PDF-'))throw Error('The selected file is not a readable PDF. Choose the PDF for this Canvas attachment.');
   pdfState.file={...fileSnapshot,originalName:String(fileSnapshot.originalName||fileSnapshot.name||''),importedFileName:String(local.name||''),name:String(fileSnapshot.originalName||fileSnapshot.name||'Canvas PDF')};
   persistPdfIdentity();
   const context={token:activeToken,key:pdfKey(),identity:currentPdfIdentity(),file:{...pdfState.file}};
   await initializePdfEditor(host,bytes,context);
  }catch(error){if(activeToken===pdfState.openToken&&status)status.textContent='Could not import this PDF: '+error.message;}
  finally{choose.disabled=false;}
 });
 const refreshButton=host.querySelector('#nsPdfRefreshPreview');
 if(refreshButton)refreshButton.onclick=async()=>{
  refreshButton.disabled=true;if(status)status.textContent='Requesting a fresh temporary preview from Canvas…';
  try{
   const refreshed=await root.NorthstarWorkspace.downloadCanvasFile({credentials,courseId:assignmentSnapshot.canvasCourseId,fileId:fileSnapshot.id});
   if(token!==pdfState.openToken)return;
   if(Number(refreshed?.id)!==Number(fileSnapshot.id))throw Error('Canvas returned a different attachment. The current assignment was not changed.');
   pdfState.file={...fileSnapshot,originalName:String(fileSnapshot.originalName||fileSnapshot.name||''),name:String(refreshed.name||fileSnapshot.name||''),contentType:String(refreshed.contentType||fileSnapshot.contentType||'application/pdf'),size:Number(refreshed.size)||Number(fileSnapshot.size)||null};
   persistPdfIdentity();
   if(refreshed.bytes){await initializePdfEditor(host,refreshed.bytes,{token,key:pdfKey(),identity:currentPdfIdentity(),file:{...pdfState.file}});return;}
   renderNativePdfFallback(host,fileSnapshot,assignmentSnapshot,credentials,refreshed);
   const refreshedStatus=host.querySelector('#nsPdfNativeStatus');
   if(refreshedStatus)refreshedStatus.textContent=refreshed.previewUrl?'A fresh Canvas preview is ready. Open it in Safari if the embedded preview does not load.':'Canvas did not provide a usable preview. Open the official Canvas file or try again.';
  }catch(error){if(token===pdfState.openToken&&status)status.textContent='Could not refresh the Canvas preview: '+error.message+' You can retry when your connection is available.';if(token===pdfState.openToken)refreshButton.disabled=false;}
 };
 const canvasButton=host.querySelector('#nsPdfOpenCanvas');
 if(canvasButton)canvasButton.onclick=async()=>{
  const tab=root.open('about:blank','_blank');
  if(!tab){if(status)status.textContent='Safari blocked the new tab. Use the original PDF link above instead.';return;}
  canvasButton.disabled=true;if(status)status.textContent='Creating a temporary Canvas browser session…';
  try{
   const session=await root.NorthstarWorkspace.getCanvasSessionUrl({credentials,returnTo});
   tab.location.href=session.sessionUrl;
   if(status)status.textContent='Canvas file opened in a new tab. Save a copy to Files, then import it here to edit.';
  }catch(error){try{tab.close();}catch{}if(status)status.textContent='Canvas preview could not be opened: '+error.message;}
  finally{canvasButton.disabled=false;}
 };
}
async function openPdf(host,file,assignment,credentials){
 const token=++pdfState.openToken;
 if(pdfState.textEditor)pdfState.textEditor.unmount();
 pdfState.assignment=assignment;pdfState.file={...file,originalName:String(file.originalName||file.name||'')};pdfState.host=host;pdfState.identity=null;persistPdfIdentity();
 pdfState.page=1;pdfState.scale=1.15;pdfState.tool='pen';pdfState.activePointers.clear();pdfState.activeGesture=null;pdfState.preview=null;pdfState.annotations={};pdfState.history=[];pdfState.redo=[];pdfState.viewports={};pdfState.bytes=null;pdfState.doc=null;pdfState.persistenceMode='unavailable';pdfState.persistenceWarning=null;pdfState.sourcePersisted=false;pdfState.renderToken++;
 try{
  const saved=localStorage.getItem(pdfKey())||localStorage.getItem(legacyPdfKey())||'{}';
  pdfState.annotations=normalizePdfAnnotations(JSON.parse(saved));
 }catch{pdfState.annotations={__schemaVersion:2};}
 const loading=host.querySelector('.ns-room-loading');if(!loading)host.innerHTML='<div class="ns-room-loading"><h2>Opening '+escapeHtml(file.name)+'</h2><p>Restoring your saved document or requesting Canvas…</p></div>';
 const key=pdfKey(),identity=currentPdfIdentity();
 let cached=null,recoveryError=null;
 try{cached=await restoreStoredPdf(key,identity);}catch(error){recoveryError={stage:'recovery-read',name:String(error?.name||'StorageReadError'),message:String(error?.message||'The saved recovery copy could not be read.')};}
 if(token!==pdfState.openToken)return false;
 if(recoveryError)pdfState.persistenceWarning=recoveryError;
 if(cached?.draft&&samePdfIdentity(cached.draft.identity,identity)){pdfState.annotations=normalizePdfAnnotations(cached.draft.annotations);pdfState.page=Math.max(1,Math.min(500,Number(cached.draft.page)||1));pdfState.scale=Math.max(.65,Math.min(2.5,Number(cached.draft.scale)||1.15));}
 if(cached?.identityMismatch)throw Error(storageFailureMessage(cached.warning,'Saved PDF identity does not match this assignment. The record was preserved and not overwritten.'));
 if(cached?.warning)pdfState.persistenceWarning=cached.warning;
 if(cached?.bytes)pdfState.sourcePersisted=true;
 const context={token,key,identity,file:{...pdfState.file}};
 if(cached?.bytes){
  try{
   const restored=await initializePdfEditor(host,cached.bytes,context);
   if(token!==pdfState.openToken)return false;
   if(restored===false)return false;
   const restoredAt=cached.draftUpdatedAt?new Date(cached.draftUpdatedAt).toLocaleString():'previously saved';
   if(cached.warning)setSaveState('Restored the saved PDF and draft ('+restoredAt+'). '+storageFailureMessage(cached.warning,'A storage warning was recorded.'));
   else setSaveState('Restored your saved PDF and annotations from this iPad · '+restoredAt+'.');
   return true;
  }catch(error){
   if(token!==pdfState.openToken)return false;
   pdfState.persistenceWarning={stage:'cached-pdf-parse',name:String(error?.name||'InvalidPdfError'),message:'The saved PDF could not be reopened: '+String(error?.message||'PDF parser rejected the saved document.')};
   setSaveState('Saved recovery copy could not be opened. The saved annotation draft was retained; checking Canvas for the original attachment…');
  }
 }
 const api=await root.NorthstarWorkspace.downloadCanvasFile({credentials,courseId:assignment.canvasCourseId,fileId:file.id});
 if(token!==pdfState.openToken)return false;
 if(Number(api?.id)!==Number(file.id))throw Error('Canvas returned a different attachment. The saved recovery copy was not replaced.');
 if(api.bytes){
  pdfState.file={...file,originalName:String(file.originalName||file.name||''),name:api.name||file.name,contentType:api.contentType||file.contentType||'application/pdf',size:Number(api.size)||Number(file.size)||null};
  persistPdfIdentity();
  const liveContext={token,key:pdfKey(),identity:currentPdfIdentity(),file:{...pdfState.file}};
  try{
   const initialized=await initializePdfEditor(host,api.bytes,liveContext);
   if(token!==pdfState.openToken)return false;
   if(initialized===false)return false;
  }catch(error){
   if(token!==pdfState.openToken)return false;
   error.browserDelivery=api.previewDelivery||null;
   error.publicPreviewDelivery={
    publicUrlEndpointResult:api.publicUrlEndpoint?.result||'not_recorded',
    publicUrlEndpointStatus:api.publicUrlEndpoint?.status??null,
    ...(api.previewDelivery||{}),
    canvasViewerAvailable:true
   };
   throw error;
  }
 }else{
  pdfState.file={...file,originalName:String(file.originalName||file.name||''),name:api.name||file.name,contentType:api.contentType||file.contentType||'application/pdf',size:Number(api.size)||Number(file.size)||null};
  persistPdfIdentity();
  renderNativePdfFallback(host,file,assignment,credentials,api);
 }
 return true;
}

function getAnnotatedFile(){return exportAnnotatedPdf();}
const api={enter,exit,close,routeId,loadingMarkup,sanitizeHtml,collectFiles,openPdf,getAnnotatedFile,isPenPointer,canAnnotatePointer,canUseAnnotationTool,setInputMode,setActiveTool,getInputState,distanceToSegment,pointHitsStroke,wrapTextLines,textBoxFromDrag,richTextRuns,notify};
root.NorthstarAssignmentRoom=api;
root.closeAssignmentRoom=close;
root.addEventListener('pagehide',flushPdfDraft);
root.document?.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='hidden')flushPdfDraft();});
const appCloseOverlay=root.closeOverlay;root.closeOverlay=function(id){if(id==='wsOverlay')return close();if(typeof appCloseOverlay==='function')return appCloseOverlay.call(root,id);};
root.addEventListener('popstate',()=>{
 const id=routeId();
 if(id){if(root.openWorkspace)root.openWorkspace(id,{fromHistory:true});}
 else if(document.body.classList.contains('assignment-room-open'))exit({fromHistory:true});
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('assignment-room-open'))close();});
})(window);
