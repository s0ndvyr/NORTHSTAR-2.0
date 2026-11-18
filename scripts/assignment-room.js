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
  if(!options.fromHistory&&routeId())history.replaceState({northstarAssignmentRoom:false},'',cleanUrl());
  document.body.classList.remove('assignment-room-open');
  document.documentElement.classList.remove('assignment-room-open');
  const overlay=$('#wsOverlay');if(overlay)overlay.classList.remove('open');
  room.id=null;room.fromHistory=false;
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
 const add=(id,name,contentType,url)=>{
  const n=Number(id);if(!Number.isSafeInteger(n)||n<1||seen.has(n))return;
  seen.add(n);files.push({id:n,name:String(name||('Canvas file '+n)),contentType:String(contentType||''),url:safeLink(url||'',base)||''});
 };
 (Array.isArray(details.attachments)?details.attachments:[]).forEach(f=>add(f.id,f.display_name||f.filename,f['content-type']||f.content_type,f.url));
 const parser=new DOMParser(),doc=parser.parseFromString(String(details.description||''),'text/html');
 doc.querySelectorAll('a').forEach(a=>{
  const candidate=a.getAttribute('data-api-endpoint')||a.getAttribute('href')||'';
  const match=candidate.match(/\/api\/v1\/(?:courses\/\d+\/)?files\/(\d+)/)||candidate.match(/\/courses\/\d+\/files\/(\d+)/);
  if(match)add(match[1],a.textContent.trim()||a.getAttribute('title')||('Canvas file '+match[1]),'',a.href||'');
 });
 if(details.annotatable_attachment_id)add(details.annotatable_attachment_id,'Document to annotate','application/pdf','');
 return files;
}
const pdfState={assignment:null,file:null,bytes:null,doc:null,page:1,scale:1.15,tool:'select',color:'#c4e87b',width:2.8,annotations:{},history:[],redo:[],host:null,renderToken:0,viewports:{}};
function pdfKey(){return 'northstar_pdf_markup_v1_'+String(pdfState.assignment?.id||'assignment')+'_'+String(pdfState.file?.id||'file');}
function getPageState(page){const key=String(page);if(!pdfState.annotations[key])pdfState.annotations[key]={strokes:[],texts:[]};return pdfState.annotations[key];}
function persistAnnotations(){try{localStorage.setItem(pdfKey(),JSON.stringify(pdfState.annotations));}catch{notify('The annotation could not be saved on this device. Export a copy to keep it.');}}
function notify(message){if(typeof root.toast==='function')root.toast(message);else{const n=$('#toast');if(n){n.textContent=message;n.classList.add('show');}}}
function isPenPointer(pointerType){return pointerType==='pen';}
function loadPdfEngine(){
 if(pdfState.pdfEngine)return Promise.resolve(pdfState.pdfEngine);
 if(pdfState.pdfEnginePromise)return pdfState.pdfEnginePromise;
 pdfState.pdfEnginePromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs').then(lib=>{
   lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';pdfState.pdfEngine=lib;return lib;
 });
 return pdfState.pdfEnginePromise;
}
function renderToolbar(host){
 host.innerHTML='<div class="ns-pdf-toolbar"><div class="ns-pdf-tools" role="toolbar" aria-label="PDF annotation tools"><button type="button" data-ns-tool="select" class="is-active" title="Select and scroll">Select</button><button type="button" data-ns-tool="pen" title="Freehand draw with Apple Pencil">Pencil</button><button type="button" data-ns-tool="highlight" title="Highlight with Apple Pencil">Highlight</button><button type="button" data-ns-tool="text" title="Place typed text on the PDF">Text</button><button type="button" data-ns-tool="line" title="Draw a straight line with Apple Pencil">Line</button><button type="button" data-ns-tool="arrow" title="Draw an arrow with Apple Pencil">Arrow</button><button type="button" data-ns-tool="rectangle" title="Draw a rectangle with Apple Pencil">Box</button><button type="button" data-ns-tool="ellipse" title="Draw an ellipse with Apple Pencil">Circle</button><button type="button" data-ns-tool="eraser" title="Erase nearby annotations with Apple Pencil">Eraser</button></div><div class="ns-pdf-actions"><button type="button" data-ns-page="prev" aria-label="Previous page">←</button><span class="ns-pdf-page-indicator" id="nsPdfPageIndicator">Page 1 / 1</span><button type="button" data-ns-page="next" aria-label="Next page">→</button><button type="button" data-ns-zoom="out" aria-label="Zoom out">−</button><span id="nsPdfZoom">115%</span><button type="button" data-ns-zoom="in" aria-label="Zoom in">+</button><button type="button" data-ns-undo title="Undo last annotation">Undo</button><button type="button" data-ns-redo title="Redo annotation">Redo</button><button type="button" data-ns-export>Export PDF</button></div></div><div class="ns-pdf-stylebar"><label>Ink <input type="color" id="nsPdfColor" value="#c4e87b"></label><label>Size <input type="range" id="nsPdfWidth" min="1" max="8" step=".5" value="2.8"></label><label class="ns-pdf-text-entry">Text to place <input type="text" id="nsPdfText" maxlength="180" placeholder="Type, then tap the PDF"></label><span id="nsPdfInputHint">Pencil, shapes, highlighting and erasing accept Apple Pencil input only.</span></div><div class="ns-pdf-stage-scroll"><div class="ns-pdf-page"><canvas id="nsPdfCanvas" aria-label="PDF page"></canvas><canvas id="nsPdfInk" class="ns-pdf-ink" aria-label="PDF annotation layer"></canvas></div></div><div class="ns-pdf-foot"><span id="nsPdfSaveState">Annotations save on this device as you work.</span><span id="nsPdfFileName"></span></div>';
}
function drawOverlay(){
 const canvas=$('#nsPdfInk');if(!canvas||!pdfState.doc)return;
 const ctx=canvas.getContext('2d'),pageState=getPageState(pdfState.page),w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 pageState.strokes.forEach(stroke=>{
  const points=stroke.points||[];if(!points.length)return;
  ctx.save();ctx.globalAlpha=stroke.tool==='highlight'?.27:1;ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;ctx.lineCap='round';ctx.lineJoin='round';
  const avg=points.reduce((n,p)=>n+(p.pressure||.5),0)/points.length;
  const strokeWidth=Number(stroke.width)||pdfState.width;ctx.lineWidth=(stroke.tool==='highlight'?strokeWidth*5:strokeWidth)*Math.max(.6,avg)*w/900;
  const first=points[0],last=points[points.length-1],x1=first.x*w,y1=first.y*h,x2=last.x*w,y2=last.y*h;
  if(stroke.tool==='rectangle'){ctx.strokeRect(x1,y1,x2-x1,y2-y1);}
  else if(stroke.tool==='ellipse'){ctx.beginPath();ctx.ellipse((x1+x2)/2,(y1+y2)/2,Math.abs(x2-x1)/2,Math.abs(y2-y1)/2,0,0,Math.PI*2);ctx.stroke();}
  else if(stroke.tool==='line'||stroke.tool==='arrow'){
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    if(stroke.tool==='arrow'){const angle=Math.atan2(y2-y1,x2-x1),head=Math.max(10,ctx.lineWidth*4);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle-Math.PI/6),y2-head*Math.sin(angle-Math.PI/6));ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle+Math.PI/6),y2-head*Math.sin(angle+Math.PI/6));ctx.stroke();}
  }else{
    ctx.beginPath();ctx.moveTo(x1,y1);points.slice(1).forEach(p=>ctx.lineTo(p.x*w,p.y*h));if(points.length===1)ctx.lineTo(x1+.1,y1+.1);ctx.stroke();
  }
  ctx.restore();
 });
 pageState.texts.forEach(note=>{
  ctx.save();ctx.fillStyle=note.color||pdfState.color;ctx.font='600 '+Math.max(13,Math.round(w/65))+'px -apple-system,BlinkMacSystemFont,sans-serif';
  const lines=String(note.text||'').split(/\n/);lines.forEach((line,i)=>ctx.fillText(line,note.x*w,(note.y*h)+i*Math.max(16,w/55),w*.55));ctx.restore();
 });
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
 const rect=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)),pressure:Number(event.pressure)||.5};
}
function attachCanvasEvents(){
 const ink=$('#nsPdfInk');if(!ink)return;let active=null;
 const pencilTools=['pen','highlight','eraser','line','arrow','rectangle','ellipse'];
 ink.addEventListener('pointerdown',event=>{
  const tool=pdfState.tool;
  if(pencilTools.includes(tool)&&!isPenPointer(event.pointerType)){setSaveState('Apple Pencil input only — finger and mouse drawing are disabled.');return;}
  if(tool==='select')return;
  event.preventDefault();const point=addPoint(event,ink);
  if(tool==='text'){
   const input=$('#nsPdfText'),text=String(input?.value||'').trim();if(!text){setSaveState('Type your note in “Text to place” first.');return;}
   pushHistory();getPageState(pdfState.page).texts.push({x:point.x,y:point.y,text,color:pdfState.color});persistAnnotations();if(input)input.value='';drawOverlay();setSaveState('Text annotation saved on this device.');return;
  }
  if(tool==='eraser'){
   pushHistory();const state=getPageState(pdfState.page),radius=.035;
   state.strokes=state.strokes.filter(stroke=>!(stroke.points||[]).some(p=>Math.hypot(p.x-point.x,p.y-point.y)<radius));
   state.texts=state.texts.filter(note=>Math.hypot(note.x-point.x,note.y-point.y)>=radius);
   persistAnnotations();drawOverlay();setSaveState('Nearby annotation erased.');return;
  }
  pushHistory();active={tool:tool,color:pdfState.color,width:pdfState.width,points:[point]};getPageState(pdfState.page).strokes.push(active);ink.setPointerCapture?.(event.pointerId);drawOverlay();
 });
 ink.addEventListener('pointermove',event=>{
  if(!active)return;const points=event.getCoalescedEvents?event.getCoalescedEvents():[event];
  if(['line','arrow','rectangle','ellipse'].includes(active.tool)){active.points=[active.points[0],addPoint(points[points.length-1],ink)];}
  else points.forEach(e=>active.points.push(addPoint(e,ink)));
  drawOverlay();
 });
 const finish=()=>{if(!active)return;active=null;persistAnnotations();setSaveState('Saved on this device. Export the annotated PDF to submit a copy.');};
 ink.addEventListener('pointerup',finish);ink.addEventListener('pointercancel',finish);ink.addEventListener('lostpointercapture',finish);
}
function wireToolbar(){
 const host=pdfState.host;if(!host)return;
 host.querySelectorAll('[data-ns-tool]').forEach(button=>button.addEventListener('click',()=>{
  pdfState.tool=button.dataset.nsTool;host.querySelectorAll('[data-ns-tool]').forEach(b=>b.classList.toggle('is-active',b===button));
  const hint=$('#nsPdfInputHint');if(hint)hint.textContent=['pen','highlight','eraser','line','arrow','rectangle','ellipse'].includes(pdfState.tool)?'Apple Pencil only — finger and mouse drawing are ignored.':pdfState.tool==='text'?'Type text above, then tap where it should appear.':'Scroll and select document content.';
 }));
 host.querySelectorAll('[data-ns-page]').forEach(button=>button.addEventListener('click',()=>{pdfState.page=Math.max(1,Math.min(pdfState.doc.numPages,pdfState.page+(button.dataset.nsPage==='next'?1:-1)));renderPage();}));
 host.querySelectorAll('[data-ns-zoom]').forEach(button=>button.addEventListener('click',()=>{pdfState.scale=Math.max(.65,Math.min(2.25,pdfState.scale+(button.dataset.nsZoom==='in'?.15:-.15)));renderPage();}));
 const color=$('#nsPdfColor'),width=$('#nsPdfWidth'),undo=$('[data-ns-undo]'),redo=$('[data-ns-redo]'),exportButton=$('[data-ns-export]');
 if(color)color.addEventListener('input',()=>pdfState.color=color.value);
 if(width)width.addEventListener('input',()=>pdfState.width=Number(width.value));
 if(undo)undo.addEventListener('click',()=>{
  const item=pdfState.history.pop();if(!item||item.page!==pdfState.page)return;
  const state=getPageState(item.page);pdfState.redo.push(JSON.stringify(state));
  Object.assign(state,JSON.parse(item.state));persistAnnotations();drawOverlay();
 });
 if(redo)redo.addEventListener('click',()=>{
  const snapshot=pdfState.redo.pop();if(!snapshot)return;const state=getPageState(pdfState.page);pdfState.history.push({page:pdfState.page,state:JSON.stringify(state)});Object.assign(state,JSON.parse(snapshot));persistAnnotations();drawOverlay();
 });
 if(exportButton)exportButton.addEventListener('click',async()=>{try{const file=await exportAnnotatedPdf();downloadBlob(file);setSaveState('Annotated PDF exported.');}catch(error){setSaveState('Could not export PDF: '+error.message);}});
}
async function exportAnnotatedPdf(){
 if(!pdfState.bytes||!pdfState.doc)throw Error('Open a PDF first.');
 const lib=await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
 const pdf=await lib.PDFDocument.load(pdfState.bytes),pages=pdf.getPages(),rgb=lib.rgb;
 Object.keys(pdfState.annotations).forEach(key=>{
  const index=Number(key)-1,page=pages[index];if(!page)return;const width=page.getWidth(),height=page.getHeight(),s=pdfState.annotations[key];
  (s.strokes||[]).forEach(stroke=>{
   const points=stroke.points||[];if(!points.length)return;
   const viewport=pdfState.viewports[index]||{width,height,convertToPdfPoint:(x,y)=>[x,height-y]};
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
    page.drawCircle({x:first.x,y:first.y,size:Math.max(1,thickness/2),color:ink,opacity:stroke.tool==='highlight'?.28:1});
   }else{
    for(let i=1;i<points.length;i++)page.drawLine({start:convert(points[i-1]),end:convert(points[i]),thickness:thickness*(stroke.tool==='highlight'?4:1),color:ink,opacity:stroke.tool==='highlight'?.28:1});
   }
  });
  (s.texts||[]).forEach(note=>{const color=String(note.color||'#c4e87b'),h=color.replace('#',''),r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255,viewport=pdfState.viewports[index]||{width,height,convertToPdfPoint:(x,y)=>[x,height-y]},position=viewport.convertToPdfPoint(note.x*viewport.width,note.y*viewport.height);page.drawText(String(note.text||'').slice(0,500),{x:position[0],y:position[1],size:12,color:rgb(r,g,b),maxWidth:width*.7,lineHeight:14});});
 });
 const bytes=await pdf.save(),name=String(pdfState.file?.name||'assignment.pdf').replace(/\.pdf$/i,'')+'-northstar-annotated.pdf';
 return new File([bytes],name,{type:'application/pdf'});
}
function downloadBlob(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name||'annotated.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function openPdf(host,file,assignment,credentials){
 pdfState.assignment=assignment;pdfState.file=file;pdfState.host=host;pdfState.page=1;pdfState.scale=1.15;pdfState.tool='select';pdfState.annotations={};pdfState.history=[];pdfState.redo=[];pdfState.viewports={};
 try{pdfState.annotations=JSON.parse(localStorage.getItem(pdfKey())||'{}');}catch{}
 renderToolbar(host);const name=$('#nsPdfFileName');if(name)name.textContent=file.name;
 const api=await root.NorthstarWorkspace.downloadCanvasFile({credentials:credentials,courseId:assignment.canvasCourseId,fileId:file.id});
 pdfState.bytes=api.bytes;const lib=await loadPdfEngine();pdfState.doc=await lib.getDocument({data:pdfState.bytes}).promise;
 attachCanvasEvents();wireToolbar();await renderPage();setSaveState('Ready. Pencil input is enabled; touch is reserved for page navigation.');
}
function getAnnotatedFile(){return exportAnnotatedPdf();}
const api={enter,exit,close,routeId,loadingMarkup,sanitizeHtml,collectFiles,openPdf,getAnnotatedFile,isPenPointer,notify};
root.NorthstarAssignmentRoom=api;
root.closeAssignmentRoom=close;
const appCloseOverlay=root.closeOverlay;root.closeOverlay=function(id){if(id==='wsOverlay')return close();if(typeof appCloseOverlay==='function')return appCloseOverlay.call(root,id);};
root.addEventListener('popstate',()=>{
 const id=routeId();
 if(id){if(root.openWorkspace)root.openWorkspace(id,{fromHistory:true});}
 else if(document.body.classList.contains('assignment-room-open'))exit({fromHistory:true});
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('assignment-room-open'))close();});
})(window);
