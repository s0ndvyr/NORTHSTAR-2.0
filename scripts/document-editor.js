/* NORTHSTAR Document Studio — editable text-object layer.
   This module owns rich text annotations; the PDF source remains immutable. */
(function(root){
'use strict';
const FAMILIES={
  sans:'Arial, Helvetica, sans-serif',
  serif:'Georgia, "Times New Roman", serif',
  mono:'"Courier New", Courier, monospace'
};
const PRESETS={
  normal:{fontSize:14,bold:false,fontFamily:'sans'},
  title:{fontSize:30,bold:true,fontFamily:'serif'},
  subtitle:{fontSize:20,bold:false,fontFamily:'serif'},
  heading1:{fontSize:24,bold:true,fontFamily:'serif'},
  heading2:{fontSize:20,bold:true,fontFamily:'sans'},
  heading3:{fontSize:16,bold:true,fontFamily:'sans'}
};
const ALLOWED_TAGS=new Set(['B','STRONG','I','EM','U','S','STRIKE','SPAN','P','DIV','BR','UL','OL','LI']);
const ALLOWED_STYLES=new Set(['font-family','font-size','font-weight','font-style','text-decoration','color','background-color']);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const makeId=()=>root.crypto&&typeof root.crypto.randomUUID==='function'?root.crypto.randomUUID():'ns-text-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function plainTextFromHtml(html){
 if(!root.document)return String(html||'').replace(/<[^>]*>/g,' ');
 const node=root.document.createElement('div');node.innerHTML=String(html||'');return node.innerText||node.textContent||'';
}
function sanitizeRichHtml(html){
 if(!root.document)return escapeHtml(plainTextFromHtml(html)).replace(/\n/g,'<br>');
 const template=root.document.createElement('template');template.innerHTML=String(html||'');
 function clean(node){
  if(node.nodeType===3)return root.document.createTextNode(node.nodeValue||'');
  if(node.nodeType!==1)return root.document.createDocumentFragment();
  const tag=node.tagName;
  if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH'].includes(tag))return root.document.createDocumentFragment();
  if(!ALLOWED_TAGS.has(tag)){const fragment=root.document.createDocumentFragment();Array.from(node.childNodes).forEach(child=>fragment.append(clean(child)));return fragment;}
  const out=root.document.createElement(tag.toLowerCase());
  const style=node.getAttribute('style')||'';
  style.split(';').forEach(declaration=>{
   const parts=declaration.split(':');if(parts.length<2)return;
   const property=parts.shift().trim().toLowerCase(),value=parts.join(':').trim();
   if(!ALLOWED_STYLES.has(property)||!value||/url\s*\(|expression|javascript/i.test(value))return;
   out.style.setProperty(property,value);
  });
  Array.from(node.childNodes).forEach(child=>out.append(clean(child)));
  return out;
 }
 const result=root.document.createElement('div');Array.from(template.content.childNodes).forEach(child=>result.append(clean(child)));
 return result.innerHTML;
}
function normalizeTextObject(raw,index){
 const source=raw&&typeof raw==='object'?raw:{};
 const text=String(source.text??'');
 const html=source.html?sanitizeRichHtml(source.html):escapeHtml(text).replace(/\r?\n/g,'<br>');
 const fontFamily=['sans','serif','mono'].includes(source.fontFamily)?source.fontFamily:'sans';
 return {
  id:String(source.id||makeId()),type:'text',x:clamp(source.x,0,.98),y:clamp(source.y,0,.98),
  width:source.width===undefined ? .42 : clamp(source.width,.12,1),height:source.height===undefined ? .12 : clamp(source.height,.055,1),
  text,html,color:/^#[0-9a-f]{6}$/i.test(source.color||'')?source.color:'#172033',
  backgroundColor:/^#[0-9a-f]{6}$/i.test(source.backgroundColor||'')?source.backgroundColor:'#ffffff',
  fontFamily,fontSize:clamp(source.fontSize||14,6,96),
  bold:!!source.bold,italic:!!source.italic,underline:!!source.underline,strike:!!source.strike,
  align:['left','center','right','justify'].includes(source.align)?source.align:'left',
  lineHeight:clamp(source.lineHeight||1.35,1,3),paragraphSpacing:clamp(source.paragraphSpacing||0,0,48),
  preset:PRESETS[source.preset]?source.preset:'normal',opacity:clamp(source.opacity===undefined?.92:source.opacity,.15,1),
  zIndex:Number.isFinite(Number(source.zIndex))?Number(source.zIndex):Number(index)||0
 };
}
function migrateTextAnnotations(texts){
 return (Array.isArray(texts)?texts:[]).map(normalizeTextObject);
}
function createTextObject(position,defaults){
 const base=Object.assign({x:position?.x,y:position?.y,width:position?.width||.42,height:position?.height||.12},defaults||{});
 return normalizeTextObject(base);
}
function resizeTextObject(note,handle,dx,dy){
 const next=Object.assign({},note);
 const left=handle.includes('w'),right=handle.includes('e'),top=handle.includes('n'),bottom=handle.includes('s');
 if(right)next.width=clamp(note.width+dx,.12,1-note.x);
 if(bottom)next.height=clamp(note.height+dy,.055,1-note.y);
 if(left){const width=clamp(note.width-dx,.12,note.x+note.width);next.x=clamp(note.x+note.width-width,0,1-width);next.width=width;}
 if(top){const height=clamp(note.height-dy,.055,note.y+note.height);next.y=clamp(note.y+note.height-height,0,1-height);next.height=height;}
 return next;
}
function normalizeFamily(value){const v=String(value||'sans').toLowerCase();return v==='serif'||v.includes('georgia')||v.includes('times')?'serif':v==='mono'||v.includes('courier')||v.includes('mono')?'mono':'sans';}
function styleFor(note){
 const family=FAMILIES[normalizeFamily(note.fontFamily)];
 return 'font-family:'+family+';font-size:'+note.fontSize+'px;color:'+note.color+';font-weight:'+(note.bold?'700':'400')+';font-style:'+(note.italic?'italic':'normal')+';text-align:'+note.align+';line-height:'+note.lineHeight+';opacity:'+note.opacity+';';
}
function applyInlineStyle(editor,property,value){
 const selection=root.getSelection&&root.getSelection();
 if(!selection||!selection.rangeCount||selection.isCollapsed)return false;
 const range=selection.getRangeAt(0);
 if(!editor.contains(range.commonAncestorContainer))return false;
 const span=root.document.createElement('span');span.style.setProperty(property,String(value));
 try{range.surroundContents(span);}catch{span.appendChild(range.extractContents());range.insertNode(span);}
 const next=root.document.createRange();next.selectNodeContents(span);selection.removeAllRanges();selection.addRange(next);
 return true;
}
class Editor{
 constructor(options){
  this.options=options||{};this.page=null;this.layer=null;this.cursor=null;this.preview=null;this.context=null;
  this.nodes=new Map();this.selected=null;this.editing=null;this.drag=null;this.tool='pen';this.mode='hand';this.range=null;this.saveTimer=0;
 }
 texts(){return this.options.getTexts?this.options.getTexts():[];}
 allowed(pointerType){return this.options.canInteract?this.options.canInteract(pointerType):true;}
 changed(persist){if(this.options.onChange)this.options.onChange(persist!==false);}
 before(){if(this.options.beforeChange)this.options.beforeChange();}
 mount(){
  this.unmount();
  this.page=this.options.getPageElement&&this.options.getPageElement();
  const host=this.options.getHost&&this.options.getHost();
  if(!this.page||!host)return false;
  this.page.classList.add('ns-doc-page');
  this.layer=root.document.createElement('div');this.layer.className='ns-pdf-text-layer';this.layer.setAttribute('aria-label','Editable PDF text annotations');
  this.preview=root.document.createElement('div');this.preview.className='ns-doc-placement-preview';this.preview.hidden=true;
  this.cursor=root.document.createElement('div');this.cursor.className='ns-doc-pencil-cursor';this.cursor.hidden=true;
  this.page.append(this.layer,this.preview,this.cursor);
  this.context=host.querySelector('#nsPdfTextContext');
  this.bindToolbar();
  this.layer.addEventListener('pointerdown',event=>this.onObjectPointerDown(event));
  this.layer.addEventListener('pointermove',event=>this.onObjectPointerMove(event));
  this.layer.addEventListener('pointerup',event=>this.finishDrag(event,false));
  this.layer.addEventListener('pointercancel',event=>this.finishDrag(event,true));
  this.page.addEventListener('pointermove',event=>this.onHover(event),{passive:true});
  this.page.addEventListener('pointerleave',()=>this.hideHover());
  this.exitHandler=()=>{if(this.editing)this.endEdit();if(this.saveTimer){root.clearTimeout(this.saveTimer);this.saveTimer=0;this.changed(true);}};
  root.addEventListener('northstar:assignment-room-exit',this.exitHandler);
  this.render();return true;
 }
 unmount(){
  if(this.editing){
   const id=this.editing,note=this.texts().find(item=>item.id===id),editor=this.nodes.get(id)?.querySelector('.ns-doc-text-content');
   if(note&&editor)this.captureEditor(note,editor);
   this.editing=null;
   if(this.saveTimer){root.clearTimeout(this.saveTimer);this.saveTimer=0;}
   this.changed(true);
  }
  if(this.page){this.page.querySelectorAll('.ns-pdf-text-layer,.ns-doc-placement-preview,.ns-doc-pencil-cursor').forEach(node=>node.remove());}
  if(this.exitHandler)root.removeEventListener('northstar:assignment-room-exit',this.exitHandler);
  this.nodes.clear();this.layer=null;this.cursor=null;this.preview=null;this.page=null;this.context=null;this.selected=null;this.editing=null;
 }
 setTool(tool){this.tool=String(tool||'pen');if(this.layer)this.layer.style.pointerEvents='none';this.nodes.forEach(node=>node.style.pointerEvents=(this.tool==='select'||node.dataset.id===this.editing)?'auto':'none');this.renderContext();}
 setMode(mode){this.mode=mode==='pencil'?'pencil':'hand';this.renderContext();}
 select(id){this.selected=id||null;this.render();this.renderContext();}
 getSelected(){return this.texts().find(item=>item.id===this.selected)||null;}
 render(){
  if(!this.layer)return;
  const items=this.texts(),ids=new Set(items.map(item=>item.id));
  this.nodes.forEach((node,id)=>{if(!ids.has(id)){node.remove();this.nodes.delete(id);}});
  items.forEach((raw,index)=>{
   const note=normalizeTextObject(raw,index);Object.assign(raw,note);
   let node=this.nodes.get(note.id);
   if(!node){node=root.document.createElement('div');node.className='ns-doc-text-object';node.dataset.id=note.id;
    node.innerHTML='<button type="button" class="ns-doc-drag-handle" aria-label="Move text box" title="Drag to move">⠿</button><div class="ns-doc-text-content" role="textbox" aria-multiline="true"></div><button type="button" class="ns-doc-resize ns-doc-resize-nw" data-handle="nw" aria-label="Resize text box"></button><button type="button" class="ns-doc-resize ns-doc-resize-ne" data-handle="ne" aria-label="Resize text box"></button><button type="button" class="ns-doc-resize ns-doc-resize-sw" data-handle="sw" aria-label="Resize text box"></button><button type="button" class="ns-doc-resize ns-doc-resize-se" data-handle="se" aria-label="Resize text box"></button><button type="button" class="ns-doc-resize ns-doc-resize-n" data-handle="n" aria-label="Resize text box height"></button><button type="button" class="ns-doc-resize ns-doc-resize-s" data-handle="s" aria-label="Resize text box height"></button><button type="button" class="ns-doc-resize ns-doc-resize-e" data-handle="e" aria-label="Resize text box width"></button><button type="button" class="ns-doc-resize ns-doc-resize-w" data-handle="w" aria-label="Resize text box width"></button>';
    node.addEventListener('dblclick',event=>{if(event.target.closest('.ns-doc-text-content')){event.preventDefault();this.beginEdit(note.id);}});
    this.nodes.set(note.id,node);this.layer.append(node);
   }
   const textContent=node.querySelector('.ns-doc-text-content');
   if(!textContent.dataset.bound){
    textContent.dataset.bound='true';
    textContent.addEventListener('input',()=>{const current=this.texts().find(item=>item.id===note.id);if(!current)return;this.captureEditor(current,textContent);const pageHeight=this.page?.getBoundingClientRect().height||0;if(pageHeight&&textContent.scrollHeight>textContent.clientHeight){current.height=clamp(Math.max(current.height,(textContent.scrollHeight+12)/pageHeight),.055,1-current.y);this.layoutNode(current);}if(this.saveTimer)root.clearTimeout(this.saveTimer);this.saveTimer=root.setTimeout(()=>this.changed(true),420);});
    textContent.addEventListener('blur',()=>{if(this.editing===note.id)this.endEdit();});
   }
   node.classList.toggle('is-selected',note.id===this.selected);
   node.classList.toggle('is-editing',note.id===this.editing);
   node.style.left=(note.x*100)+'%';node.style.top=(note.y*100)+'%';node.style.width=(note.width*100)+'%';node.style.height=(note.height*100)+'%';node.style.zIndex=String(note.zIndex+1);node.style.opacity=String(note.opacity);node.style.pointerEvents=this.tool==='select'?'auto':'none';
   node.style.backgroundColor=note.backgroundColor;node.style.color=note.color;node.style.pointerEvents=(this.tool==='select'||note.id===this.editing)?'auto':'none';
   const content=node.querySelector('.ns-doc-text-content');
   content.style.cssText=styleFor(note);
   content.contentEditable=String(note.id===this.editing);
   content.setAttribute('aria-label','PDF text annotation');
   content.spellcheck=true;
   if(note.id!==this.editing&&content.dataset.html!==note.html){content.innerHTML=note.html;content.dataset.html=note.html;}
   node.querySelectorAll('.ns-doc-resize,.ns-doc-drag-handle').forEach(handle=>{handle.hidden=note.id!==this.selected;});
  });
  this.layer.style.pointerEvents=this.tool==='select'?'auto':'none';
  this.renderContext();
 }
 renderContext(){
  const bar=this.context,note=this.getSelected();if(!bar)return;
  bar.hidden=!note;
  if(!note)return;
  const set=(selector,value)=>{const el=bar.querySelector(selector);if(el&&root.document.activeElement!==el)el.value=String(value);};
  set('[data-doc-family]',normalizeFamily(note.fontFamily));set('[data-doc-size]',note.fontSize);
  set('[data-doc-align]',note.align);set('[data-doc-color]',note.color);set('[data-doc-background]',note.backgroundColor);
  set('[data-doc-line-height]',note.lineHeight);set('[data-doc-paragraph-spacing]',note.paragraphSpacing);set('[data-doc-preset]',note.preset);
  bar.querySelectorAll('[data-doc-cmd]').forEach(button=>{const key=button.dataset.docCmd;button.setAttribute('aria-pressed',String(!!note[key]));button.classList.toggle('is-active',!!note[key]);});
 }
 bindToolbar(){
  if(!this.context)return;
  const bar=this.context;
  bar.querySelectorAll('[data-doc-cmd]').forEach(button=>button.addEventListener('mousedown',event=>event.preventDefault()));
  bar.querySelectorAll('[data-doc-cmd]').forEach(button=>button.addEventListener('click',()=>this.toggleFormat(button.dataset.docCmd)));
  const bind=(selector,fn,eventName)=>{const el=bar.querySelector(selector);if(el)el.addEventListener(eventName||'change',()=>fn(el.value));};
  bind('[data-doc-family]',value=>this.applyStyle('fontFamily',normalizeFamily(value)));
  bind('[data-doc-size]',value=>this.applyStyle('fontSize',clamp(value,6,96)));
  bind('[data-doc-align]',value=>this.applyStyle('align',value));
  bind('[data-doc-color]',value=>this.applyStyle('color',value),'input');
  bind('[data-doc-background]',value=>this.applyStyle('backgroundColor',value),'input');
  bind('[data-doc-line-height]',value=>this.applyStyle('lineHeight',clamp(value,1,3)));
  bind('[data-doc-paragraph-spacing]',value=>this.applyStyle('paragraphSpacing',clamp(value,0,48)));
  bar.querySelectorAll('[data-doc-list]').forEach(button=>button.addEventListener('mousedown',event=>event.preventDefault()));
  bar.querySelectorAll('[data-doc-list]').forEach(button=>button.addEventListener('click',()=>this.applyList(button.dataset.docList)));
  bind('[data-doc-preset]',value=>this.applyPreset(value));
  const action=(selector,fn)=>{const el=bar.querySelector(selector);if(el)el.addEventListener('click',()=>fn());};
  action('[data-doc-edit]',()=>this.beginEdit(this.selected));
  action('[data-doc-done]',()=>this.endEdit());
  action('[data-doc-duplicate]',()=>this.duplicate());
  action('[data-doc-delete]',()=>this.remove());
  bar.addEventListener('mousedown',event=>{if(event.target.closest('button,select,input'))event.preventDefault();});
 }
 rememberRange(){
  const selection=root.getSelection&&root.getSelection();
  if(selection&&selection.rangeCount){const range=selection.getRangeAt(0);if(this.editing&&this.nodes.get(this.editing)?.querySelector('.ns-doc-text-content')?.contains(range.commonAncestorContainer))this.range=range.cloneRange();}
 }
 restoreRange(){
  const selection=root.getSelection&&root.getSelection(),editor=this.editing&&this.nodes.get(this.editing)?.querySelector('.ns-doc-text-content');
  if(selection&&this.range&&editor){editor.focus();selection.removeAllRanges();selection.addRange(this.range);}
 }
 applyStyle(key,value){
  const note=this.getSelected();if(!note)return;
  this.before();
  const editor=this.editing&&this.nodes.get(this.editing)?.querySelector('.ns-doc-text-content');
  const props={fontFamily:'font-family',fontSize:'font-size',color:'color',backgroundColor:'background-color'};
  if(editor&&props[key]){this.rememberRange();const changed=applyInlineStyle(editor,props[key],key==='fontFamily'?FAMILIES[value]:key==='fontSize'?value+'px':value);if(!changed)note[key]=value;else this.captureEditor(note,editor);}
  else note[key]=value;
  if(key==='fontFamily')note.fontFamily=value;
  if(key==='fontSize')note.fontSize=Number(value);
  if(key==='color')note.color=value;
  if(key==='backgroundColor')note.backgroundColor=value;
  if(key==='align')note.align=['left','center','right','justify'].includes(value)?value:'left';
  if(key==='lineHeight')note.lineHeight=clamp(value,1,3);
  if(key==='paragraphSpacing')note.paragraphSpacing=clamp(value,0,48);
  this.changed(true);this.render();
 }
 toggleFormat(key){
  const note=this.getSelected();if(!note||!['bold','italic','underline','strike'].includes(key))return;
  const editor=this.editing&&this.nodes.get(this.editing)?.querySelector('.ns-doc-text-content');
  this.before();
  if(editor){
   this.rememberRange();this.restoreRange();
   const command=key==='strike'?'strikeThrough':key;
   try{root.document.execCommand('styleWithCSS',false,true);root.document.execCommand(command,false,null);this.captureEditor(note,editor);}catch{note[key]=!note[key];}
  }else note[key]=!note[key];
  this.changed(true);this.render();
 }
 applyList(type){
  const note=this.getSelected();if(!note)return;
  const editor=this.editing&&this.nodes.get(this.editing)?.querySelector('.ns-doc-text-content');
  this.before();
  if(editor){
   this.rememberRange();this.restoreRange();
   try{root.document.execCommand(type==='ol'?'insertOrderedList':'insertUnorderedList',false,null);}catch{}
   this.captureEditor(note,editor);
  }else{
   const lines=String(note.text||'').split(/\r?\n/).filter(Boolean);
   const tag=type==='ol'?'ol':'ul';
   note.html='<'+tag+'>'+lines.map(line=>'<li>'+escapeHtml(line)+'</li>').join('')+'</'+tag+'>';
   note.text=lines.join('\n');
  }
  this.changed(true);this.render();
 }
 applyPreset(value){
  const preset=PRESETS[value];if(!preset)return;
  const note=this.getSelected();if(!note)return;
  this.before();
  const editor=this.editing&&this.nodes.get(this.editing)?.querySelector('.ns-doc-text-content');
  const selection=root.getSelection&&root.getSelection();
  const hasRange=!!(editor&&selection&&selection.rangeCount&&!selection.isCollapsed&&editor.contains(selection.getRangeAt(0).commonAncestorContainer));
  if(hasRange){
   this.rememberRange();
   applyInlineStyle(editor,'font-family',FAMILIES[preset.fontFamily]);
   applyInlineStyle(editor,'font-size',preset.fontSize+'px');
   applyInlineStyle(editor,'font-weight',preset.bold?'700':'400');
   this.captureEditor(note,editor);
  }else{
   Object.assign(note,preset,{preset:value});
   if(editor){editor.style.fontSize=preset.fontSize+'px';editor.style.fontFamily=FAMILIES[preset.fontFamily];editor.style.fontWeight=preset.bold?'700':'400';}
  }
  this.changed(true);this.render();
 }
 captureEditor(note,editor){
  note.html=sanitizeRichHtml(editor.innerHTML);note.text=plainTextFromHtml(note.html);editor.dataset.html=note.html;
 }
 createTextBox(box,defaults){
  if(!this.options.getTexts)return null;
  this.before();
  const note=createTextObject(box,defaults||{});
  note.zIndex=this.texts().reduce((max,item)=>Math.max(max,Number(item.zIndex)||0),0)+1;
  this.texts().push(note);this.selected=note.id;this.editing=note.id;
  this.changed(true);this.render();
  const content=this.nodes.get(note.id)?.querySelector('.ns-doc-text-content');
  if(content){content.contentEditable='true';content.focus();const range=root.document.createRange();range.selectNodeContents(content);range.collapse(false);const selection=root.getSelection();selection.removeAllRanges();selection.addRange(range);}
  return note;
 }
 beginEdit(id){
  const note=this.texts().find(item=>item.id===id);if(!note)return;
  if(this.editing===id)return;
  this.before();this.selected=id;this.editing=id;this.render();
  const content=this.nodes.get(id)?.querySelector('.ns-doc-text-content');if(content){content.contentEditable='true';content.focus();const range=root.document.createRange();range.selectNodeContents(content);range.collapse(false);const selection=root.getSelection();selection.removeAllRanges();selection.addRange(range);}
 }
 endEdit(){
  if(!this.editing)return;
  if(this.saveTimer){root.clearTimeout(this.saveTimer);this.saveTimer=0;}
  const id=this.editing,note=this.texts().find(item=>item.id===id),editor=this.nodes.get(id)?.querySelector('.ns-doc-text-content');
  if(note&&editor)this.captureEditor(note,editor);
  this.editing=null;this.range=null;this.changed(true);this.render();
 }
 duplicate(){
  const note=this.getSelected();if(!note)return;
  this.before();const copy=normalizeTextObject(Object.assign({},note,{id:makeId(),x:clamp(note.x+.025,0,1-note.width),y:clamp(note.y+.025,0,1-note.height),zIndex:note.zIndex+1}));
  this.texts().push(copy);this.selected=copy.id;this.editing=null;this.changed(true);this.render();
 }
 remove(){
  if(!this.selected)return;this.before();
  const items=this.texts(),index=items.findIndex(item=>item.id===this.selected);if(index>=0)items.splice(index,1);
  this.selected=null;this.editing=null;this.changed(true);this.render();
 }
 onObjectPointerDown(event){
  const object=event.target.closest('.ns-doc-text-object');if(!object)return;
  const id=object.dataset.id,note=this.texts().find(item=>item.id===id);if(!note)return;
  if(!this.allowed(event.pointerType)){event.preventDefault();event.stopPropagation();return;}
  const handle=event.target.closest('[data-handle]'),dragHandle=event.target.closest('.ns-doc-drag-handle');
  if(this.editing===id&&event.target.closest('.ns-doc-text-content')){event.stopPropagation();return;}
  if(this.editing&&this.editing!==id)this.endEdit();
  event.stopPropagation();
  if(handle||dragHandle){
   event.preventDefault();if(this.editing)this.endEdit();this.before();this.selected=id;
   const rect=this.page.getBoundingClientRect(),origin={x:event.clientX,y:event.clientY};
   this.drag={id,mode:handle?'resize':'move',handle:handle?.dataset.handle||'se',pointerId:event.pointerId,origin,rect,start:{x:note.x,y:note.y,width:note.width,height:note.height}};
   object.setPointerCapture(event.pointerId);this.render();return;
  }
  this.select(id);
 }
 onObjectPointerMove(event){
  if(!this.drag||event.pointerId!==this.drag.pointerId&&this.drag.pointerId!==undefined)return;
  const note=this.texts().find(item=>item.id===this.drag.id);if(!note)return;
  const dx=(event.clientX-this.drag.origin.x)/Math.max(1,this.drag.rect.width),dy=(event.clientY-this.drag.origin.y)/Math.max(1,this.drag.rect.height),start=this.drag.start;
  if(this.drag.mode==='move'){note.x=clamp(start.x+dx,0,1-note.width);note.y=clamp(start.y+dy,0,1-note.height);}
  else Object.assign(note,resizeTextObject(start,this.drag.handle,dx,dy));
  this.layoutNode(note);
 }
 finishDrag(event,cancelled){
  if(!this.drag)return;
  const note=this.texts().find(item=>item.id===this.drag.id);
  if(note&&cancelled)Object.assign(note,this.drag.start);
  this.drag=null;if(note){this.changed(true);this.render();}
 }
 layoutNode(note){
  const node=this.nodes.get(note.id);if(!node)return;
  node.style.left=(note.x*100)+'%';node.style.top=(note.y*100)+'%';node.style.width=(note.width*100)+'%';node.style.height=(note.height*100)+'%';
 }
 onHover(event){
  if(!this.page)return;
  const type=event.pointerType||'mouse',hover=(type==='pen'&&this.mode==='pencil'&&event.buttons===0&&Number(event.pressure)===0)||(type==='mouse'&&this.mode==='hand');
  if(!hover){if(type==='touch'||type==='pen')this.hideHover();return;}
  const rect=this.page.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
  this.cursor.hidden=false;this.cursor.style.left=x+'px';this.cursor.style.top=y+'px';
  const diameter=this.tool==='eraser'?Math.max(12,Number(this.options.getBrushSize?.())||20):this.tool==='pen'||this.tool==='highlight'?Math.max(5,Number(this.options.getBrushSize?.())||8):8;
  this.cursor.style.width=diameter+'px';this.cursor.style.height=diameter+'px';
  this.cursor.dataset.tool=this.tool;
  const hovered=root.document.elementFromPoint?root.document.elementFromPoint(event.clientX,event.clientY)?.closest('.ns-doc-text-object'):null;
  this.nodes.forEach(node=>node.classList.toggle('is-hover-target',!!hovered&&node===hovered));
  this.preview.hidden=this.tool!=='text';
  if(this.tool==='text'){this.preview.style.left=x+'px';this.preview.style.top=y+'px';this.preview.style.width='180px';this.preview.style.height='54px';}
 }
 hideHover(){if(this.cursor)this.cursor.hidden=true;if(this.preview)this.preview.hidden=true;}
};
const api={
 families:FAMILIES,presets:PRESETS,normalizeTextObject,migrateTextAnnotations,createTextObject,resizeTextObject,
 sanitizeRichHtml,plainTextFromHtml,styleFor,Editor,
 mount(options){const editor=new Editor(options);editor.mount();return editor;}
};
root.NorthstarDocumentEditor=api;
})(window);
