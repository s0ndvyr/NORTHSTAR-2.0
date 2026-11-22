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
const pdfState={assignment:null,file:null,bytes:null,doc:null,page:1,scale:1.15,tool:'pen',inputMode:'hand',color:'#c4e87b',width:2.8,annotations:{},history:[],redo:[],host:null,renderToken:0,viewports:{},activePointers:new Map(),activeGesture:null,preview:null};
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
 host.innerHTML=[
  '<div class="ns-pdf-modebar" role="group" aria-label="PDF input mode">',
   '<span class="ns-pdf-mode-label">INPUT</span>',
   '<button type="button" data-ns-mode="hand" aria-pressed="true" class="is-active"><span aria-hidden="true">✋</span> Hand</button>',
   '<button type="button" data-ns-mode="pencil" aria-pressed="false"><span aria-hidden="true">✎</span> Pencil</button>',
   '<span class="ns-pdf-mode-help">Hand moves the page · Pencil annotates</span>',
  '</div>',
  '<div class="ns-pdf-toolbar">',
   '<div class="ns-pdf-tools" role="toolbar" aria-label="PDF annotation tools">',
    '<button type="button" data-ns-tool="select" title="Select and move an annotation">Move</button>',
    '<button type="button" data-ns-tool="pen" class="is-active" title="Draw freehand">Pen</button>',
    '<button type="button" data-ns-tool="highlight" title="Highlight text or a region">Highlight</button>',
    '<button type="button" data-ns-tool="text" title="Drag to place a text box">Text box</button>',
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
   '<label>Size <input type="range" id="nsPdfWidth" min="1" max="12" step=".5" value="2.8"></label>',
   '<label class="ns-pdf-text-entry">Text <input type="text" id="nsPdfText" maxlength="500" placeholder="Type, then drag a box on the page" autocomplete="off"></label>',
   '<span id="nsPdfInputHint" aria-live="polite">Hand mode · drag to move the page; pinch to zoom.</span>',
  '</div>',
  '<div class="ns-pdf-stage-scroll"><div class="ns-pdf-page"><canvas id="nsPdfCanvas" aria-label="PDF page"></canvas><canvas id="nsPdfInk" class="ns-pdf-ink" aria-label="PDF annotation layer"></canvas></div></div>',
  '<div class="ns-pdf-foot"><span id="nsPdfSaveState" role="status">Annotations save on this device as you work.</span><span id="nsPdfFileName"></span></div>'
 ].join('');
}

function wrapTextLines(text,maxWidth,measure){
 const lines=[],words=String(text||'').split(/\s+/).filter(Boolean),measureText=typeof measure==='function'?measure:(value=>String(value).length*7);
 let line='';
 words.forEach(word=>{
  const candidate=line?line+' '+word:word;
  if(line&&measureText(candidate)>maxWidth){lines.push(line);line=word;}else line=candidate;
 });
 if(line)lines.push(line);
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
 pageState.texts.forEach(note=>{
  const x=note.x*w,y=note.y*h,boxWidth=Math.max(36,(Number(note.width)||.55)*w),boxHeight=Math.max(24,(Number(note.height)||.12)*h),fontSize=Math.max(12,Math.min(30,Number(note.fontSize)||Math.round(w/65))),lineHeight=fontSize*1.35;
  ctx.save();ctx.fillStyle='rgba(255,255,255,.88)';ctx.strokeStyle=note.color||pdfState.color;ctx.lineWidth=Math.max(1,w/1200);
  ctx.fillRect(x,y,boxWidth,boxHeight);ctx.strokeRect(x,y,boxWidth,boxHeight);
  ctx.fillStyle=note.color||pdfState.color;ctx.font='600 '+fontSize+'px -apple-system,BlinkMacSystemFont,sans-serif';
  const lines=wrapTextLines(note.text,Math.max(20,boxWidth-14),value=>ctx.measureText(value).width);
  ctx.save();ctx.beginPath();ctx.rect(x+7,y+5,Math.max(1,boxWidth-14),Math.max(1,boxHeight-10));ctx.clip();
  lines.forEach((line,i)=>ctx.fillText(line,x+7,y+5+fontSize+i*lineHeight));ctx.restore();ctx.restore();
 });
 if(pdfState.preview&&pdfState.preview.page===pdfState.page){
  const p=pdfState.preview,x=Math.min(p.start.x,p.end.x)*w,y=Math.min(p.start.y,p.end.y)*h,bw=Math.max(1,Math.abs(p.end.x-p.start.x)*w),bh=Math.max(1,Math.abs(p.end.y-p.start.y)*h);
  ctx.save();ctx.setLineDash([7,5]);ctx.strokeStyle=p.color||'#c4e87b';ctx.lineWidth=2;ctx.strokeRect(x,y,bw,bh);ctx.restore();
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
function canAnnotatePointer(pointerType,mode,penAlreadyActive){
 return mode==='pencil'&&!penAlreadyActive&&['pen','touch','mouse'].includes(pointerType);
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
function setInputMode(mode){
 pdfState.inputMode=mode==='pencil'?'pencil':'hand';
 const host=pdfState.host,ink=$('#nsPdfInk'),stage=host?.querySelector('.ns-pdf-stage-scroll');
 if(ink)ink.dataset.inputMode=pdfState.inputMode;
 if(stage)stage.dataset.inputMode=pdfState.inputMode;
 if(host)host.querySelectorAll('[data-ns-mode]').forEach(button=>{
  const active=button.dataset.nsMode===pdfState.inputMode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
 });
 const hint=$('#nsPdfInputHint');
 if(hint)hint.textContent=pdfState.inputMode==='hand'?'Hand mode · one finger pans; two fingers move and pinch-zoom.':'Pencil mode · Pencil or one finger draws; two fingers pan and pinch-zoom.';
}
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
  if(active&&active.tool!=='hand-pan')cancelActive();
  const pair=[...pointers.entries()].filter(([,p])=>p.type==='touch').slice(0,2);
  if(pair.length<2)return false;
  const stageRect=stage.getBoundingClientRect(),pageRect=ink.parentElement.getBoundingClientRect();
  const a=pair[0][1],b=pair[1][1],centroid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
  pdfState.activeGesture={ids:pair.map(([id])=>id),distance,startScale:pdfState.scale,centroid,lastCentroid:centroid,origin:{x:centroid.x-pageRect.left,y:centroid.y-pageRect.top},scrollLeft:stage.scrollLeft,scrollTop:stage.scrollTop,stageRect};
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
   const input=$('#nsPdfText'),text=String(input?.value||'').trim();
   if(!text){setSaveState('Type your text first, then drag to place its box.');return;}
   active={tool:'text',pointerId:event.pointerId,pointerType:event.pointerType,page:pdfState.page,start:point,end:point,text,color:pdfState.color,width:pdfState.width,before};
   pdfState.preview={page:pdfState.page,start:point,end:point,color:pdfState.color};drawOverlay();return;
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
  if(event.pointerType==='touch')updatePointer(event);
  else if(pdfState.inputMode==='hand'&&event.pointerType!=='pen')updatePointer(event);
  else if(pdfState.inputMode==='pencil')updatePointer(event);
  if(pdfState.activeGesture){event.preventDefault();updateGesture();return;}
  if(event.pointerType==='touch'&&[...pointers.values()].filter(p=>p.type==='touch').length>=2){
   if(startGesture()){event.preventDefault();try{stage.setPointerCapture(event.pointerId);}catch{}return;}
  }
  if(pdfState.inputMode==='hand'){
   if(event.pointerType==='pen')return;
   if(event.pointerType==='touch'||event.pointerType==='mouse'){
    event.preventDefault();active={tool:'hand-pan',pointerId:event.pointerId,pointerType:event.pointerType,last:{x:event.clientX,y:event.clientY}};
    try{stage.setPointerCapture(event.pointerId);}catch{}
   }
   return;
  }
  if(!canAnnotatePointer(event.pointerType,'pencil',[...pointers.values()].some(p=>p.type==='pen'&&pointers.size>1)))return;
  if(event.pointerType==='pen'){
   if(active?.pointerType==='touch')cancelActive();
   pointers.forEach((p,id)=>{if(p.type==='touch')pointers.delete(id);});
  }
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
  if(active.tool==='hand-pan'){
   const dx=event.clientX-active.last.x,dy=event.clientY-active.last.y;stage.scrollLeft-=dx;stage.scrollTop-=dy;active.last={x:event.clientX,y:event.clientY};return;
  }
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
  if(active.tool==='hand-pan'){active=null;return;}
  if(cancelled){cancelActive();return;}
  if(active.tool==='text'){
   const input=$('#nsPdfText'),end=active.end||active.start,left=Math.min(active.start.x,end.x),top=Math.min(active.start.y,end.y),width=Math.max(.12,Math.abs(end.x-active.start.x)),height=Math.max(.055,Math.abs(end.y-active.start.y));
   const defaultWidth=.38,defaultHeight=Math.max(.09,Math.min(.24,(String(active.text).length/42)*.035+.07));
   getPageState(active.page).texts.push({x:left,y:top,width:Math.max(width,defaultWidth&&width<.02?defaultWidth:width),height:Math.max(height,height<.02?defaultHeight:height),text:active.text,color:active.color,fontSize:Math.max(12,Math.round(ink.clientWidth/70))});
   if(input)input.value='';pdfState.preview=null;persistAnnotations();drawOverlay();setSaveState('Text box placed. Use Move to reposition it.');
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
 host.querySelectorAll('[data-ns-tool]').forEach(button=>button.addEventListener('click',()=>{
  pdfState.tool=button.dataset.nsTool;
  host.querySelectorAll('[data-ns-tool]').forEach(b=>b.classList.toggle('is-active',b===button));
  setInputMode('pencil');
  const hint=$('#nsPdfInputHint');
  if(hint)hint.textContent=pdfState.tool==='text'?'Type above, then drag out the text box.':pdfState.tool==='select'?'Drag an annotation to move it.':'Pencil or one finger draws; two fingers navigate.';
 }));
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
 setInputMode('hand');
}

async function exportAnnotatedPdf(){
 if(!pdfState.bytes||!pdfState.doc)throw Error('Open a PDF first.');
 const lib=await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
 const pdf=await lib.PDFDocument.load(pdfState.bytes),pages=pdf.getPages(),rgb=lib.rgb;
 Object.keys(pdfState.annotations).forEach(key=>{
  const index=Number(key)-1,page=pages[index];if(!page)return;const width=page.getWidth(),height=page.getHeight(),s=pdfState.annotations[key];
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
    page.drawCircle({x:first.x,y:first.y,size:Math.max(1,thickness/2),color:ink,opacity:stroke.tool==='highlight'?.28:1});
   }else{
    for(let i=1;i<points.length;i++)page.drawLine({start:convert(points[i-1]),end:convert(points[i]),thickness:thickness*(stroke.tool==='highlight'?4:1),color:ink,opacity:stroke.tool==='highlight'?.28:1});
   }
  });
  (s.texts||[]).forEach(note=>{
   const color=String(note.color||'#c4e87b'),h=color.replace('#','').padEnd(6,'0'),r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255,viewport=pdfState.viewports[index+1]||{width,height,convertToPdfPoint:(x,y)=>[x,height-y]},boxWidth=(Number(note.width)||.55)*viewport.width,boxHeight=(Number(note.height)||.12)*viewport.height,position=viewport.convertToPdfPoint(note.x*viewport.width,(note.y*viewport.height)+boxHeight);
   const textSize=Math.max(9,Math.min(22,Number(note.fontSize)||12)),lines=String(note.text||'').split(/\s+/),wrapped=[];let line='';
   const maxChars=Math.max(8,Math.floor(boxWidth/(textSize*.55)));
   lines.forEach(word=>{const candidate=line?line+' '+word:word;if(line&&candidate.length>maxChars){wrapped.push(line);line=word;}else line=candidate;});if(line)wrapped.push(line);
   page.drawRectangle({x:note.x*width,y:Math.max(0,height-(note.y*height+boxHeight)),width:boxWidth/viewport.width*width,height:boxHeight/viewport.height*height,color:rgb(1,1,1),opacity:.88,borderColor:rgb(r,g,b),borderWidth:.6});
   page.drawText(wrapped.join('\n'),{x:position[0]+6,y:position[1]+4,size:textSize,color:rgb(r,g,b),maxWidth:boxWidth-12,lineHeight:textSize*1.25});
  });
 });
 const bytes=await pdf.save(),name=String(pdfState.file?.name||'assignment.pdf').replace(/\.pdf$/i,'')+'-northstar-annotated.pdf';
 return new File([bytes],name,{type:'application/pdf'});
}
function downloadBlob(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name||'annotated.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function openPdf(host,file,assignment,credentials){
 pdfState.assignment=assignment;pdfState.file=file;pdfState.host=host;pdfState.page=1;pdfState.scale=1.15;pdfState.tool='pen';pdfState.inputMode='hand';pdfState.activePointers.clear();pdfState.activeGesture=null;pdfState.preview=null;pdfState.annotations={};pdfState.history=[];pdfState.redo=[];pdfState.viewports={};
 try{pdfState.annotations=JSON.parse(localStorage.getItem(pdfKey())||'{}');}catch{}
 renderToolbar(host);const name=$('#nsPdfFileName');if(name)name.textContent=file.name;
 const api=await root.NorthstarWorkspace.downloadCanvasFile({credentials:credentials,courseId:assignment.canvasCourseId,fileId:file.id});
 pdfState.bytes=api.bytes;if(!/pdf/i.test(api.contentType||'')&&!/\.pdf$/i.test(file.name)&&String.fromCharCode(...pdfState.bytes.slice(0,5))!=='%PDF-')throw Error('This attachment is not a PDF. Document Studio currently supports PDF files.');const lib=await loadPdfEngine();pdfState.doc=await lib.getDocument({data:pdfState.bytes.slice()}).promise;
 attachCanvasEvents();wireToolbar();await renderPage();setSaveState('Ready. Pencil input is enabled; touch is reserved for page navigation.');
}
function getAnnotatedFile(){return exportAnnotatedPdf();}
const api={enter,exit,close,routeId,loadingMarkup,sanitizeHtml,collectFiles,openPdf,getAnnotatedFile,isPenPointer,canAnnotatePointer,distanceToSegment,pointHitsStroke,wrapTextLines,notify};
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
