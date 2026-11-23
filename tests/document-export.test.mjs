import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as pdfLib from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const source=await pdfLib.PDFDocument.create();
const helvetica=await source.embedFont(pdfLib.StandardFonts.Helvetica);
const first=source.addPage([612,792]);
first.drawText('ORIGINAL PAGE ONE',{x:48,y:740,size:14,font:helvetica});
const second=source.addPage([400,600]);
second.setRotation(pdfLib.degrees(90));
second.drawText('ORIGINAL PAGE TWO',{x:36,y:560,size:12,font:helvetica});
const third=source.addPage([792,612]);
third.setRotation(pdfLib.degrees(270));
third.drawText('ORIGINAL PAGE THREE',{x:48,y:560,size:14,font:helvetica});
const sourceBytes=new Uint8Array(await source.save());
const originalSourceBytes=sourceBytes.slice();

const dom=new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>',{
 url:'https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/',runScripts:'outside-only',pretendToBeVisual:true
});
const {window}=dom;
const host=window.document.getElementById('host');
const documents=new Map(),drafts=new Map();
let holdNextDraftSave=false,releaseHeldDraft=null;
window.NorthstarDocumentStorage={
 async getDocument(key){const value=documents.get(key);return value?{...value,bytes:value.bytes.slice()}:null;},
 async saveDocument(record){documents.set(record.key,{...record,bytes:record.bytes.slice()});return true;},
 async getDraft(key){const value=drafts.get(key);return value?JSON.parse(JSON.stringify(value)):null;},
 async saveDraft(record){const snapshot=JSON.parse(JSON.stringify(record));if(holdNextDraftSave){holdNextDraftSave=false;await new Promise(resolve=>{releaseHeldDraft=resolve;});}drafts.set(record.key,snapshot);return true;},
 getLastError(){return null;}
};
let downloadCalls=0;
window.NorthstarWorkspace={
 async downloadCanvasFile({courseId,fileId}){
  downloadCalls++;
  assert.equal(courseId,501);
  return {id:fileId,name:'rotated-multipage.pdf',contentType:'application/pdf',size:sourceBytes.byteLength,bytes:sourceBytes.slice()};
 }
};
window.NorthstarPdfLib=Object.assign({},pdfLib,{
 PDFDocument:new Proxy(pdfLib.PDFDocument,{
  get(target,key){
   if(key==='load')return async (bytes,options)=>{
   const document=await target.load(Buffer.from(bytes),options);
   const getPages=document.getPages.bind(document);
   document.getPages=()=>getPages().map(page=>new Proxy(page,{
    get(pageTarget,method){
     if(method==='drawLine')return drawingOptions=>{
      const start={x:Number(drawingOptions.start?.x),y:Number(drawingOptions.start?.y)};
      const end={x:Number(drawingOptions.end?.x),y:Number(drawingOptions.end?.y)};
      if(!Number.isFinite(start.x)||!Number.isFinite(start.y)||!Number.isFinite(end.x)||!Number.isFinite(end.y))throw Error('PDF.js test viewport returned an invalid PDF-space point: '+JSON.stringify({start:drawingOptions.start,end:drawingOptions.end}));
      return pageTarget.drawLine({...drawingOptions,start,end});
     };
     const value=Reflect.get(pageTarget,method,pageTarget);
     return typeof value==='function'?value.bind(pageTarget):value;
    }
   }));
   return document;
  };
   const value=Reflect.get(target,key,target);
   return typeof value==='function'?value.bind(target):value;
  }
 })
});
window.NorthstarPdfJs={
 GlobalWorkerOptions:pdfjs.GlobalWorkerOptions,
 getDocument(options){
  const task=pdfjs.getDocument({...options,disableWorker:true,useSystemFonts:true});
  return {promise:task.promise.then(document=>({
   numPages:document.numPages,
   getPage:async pageNumber=>{
    const page=await document.getPage(pageNumber);
    return {
     getViewport:settings=>page.getViewport(settings),
     render:()=>({promise:Promise.resolve()})
    };
   }
  }))};
 }
};
const context=new Proxy({},{
 get(target,key){if(!(key in target))target[key]=()=>{};return target[key];},
 set(target,key,value){target[key]=value;return true;}
});
window.HTMLCanvasElement.prototype.getContext=function(){return context;};
window.HTMLCanvasElement.prototype.getBoundingClientRect=function(){
 const width=parseFloat(this.style.width)||612,height=parseFloat(this.style.height)||792;
 return {left:0,top:0,right:width,bottom:height,width,height};
};
window.HTMLElement.prototype.setPointerCapture=function(){};
window.HTMLElement.prototype.getBoundingClientRect=function(){
 const width=parseFloat(this.style.width)||612,height=parseFloat(this.style.height)||792;
 return {left:0,top:0,right:width,bottom:height,width,height};
};
window.eval(readFileSync(new URL('../scripts/document-editor.js',import.meta.url),'utf8'));
window.eval(readFileSync(new URL('../scripts/assignment-room.js',import.meta.url),'utf8'));
const room=window.NorthstarAssignmentRoom;
const file={id:611,name:'rotated-multipage.pdf',contentType:'application/pdf',size:sourceBytes.byteLength};
const assignment={id:'local-assignment-1',canvasAssignmentId:9001,canvasCourseId:501,title:'Geometry packet'};
const credentials={base:'https://school.instructure.com',proxy:'https://bridge.example',token:'test-only'};
await room.openPdf(host,file,assignment,credentials);
assert.equal(downloadCalls,1,'the initial open downloads the actual Canvas PDF once');
assert.match(host.querySelector('#nsPdfPageIndicator').textContent,/Page 1 \/ 3/);

function pointer(type,pointerType,pointerId,x,y,pressure=.5){
 const event=new window.Event(type,{bubbles:true,cancelable:true});
 for(const [key,value] of Object.entries({pointerType,pointerId,clientX:x,clientY:y,pressure})){
  Object.defineProperty(event,key,{value});
 }
 Object.defineProperty(event,'getCoalescedEvents',{value:()=>[event]});
 return event;
}
const stage=host.querySelector('.ns-pdf-stage-scroll');
const ink=host.querySelector('#nsPdfInk');
function drawPencilStroke(pageLabel){
 room.setInputMode('pencil');
 room.setActiveTool('pen');
 const rect=ink.getBoundingClientRect();
 const x=Math.min(120,rect.width*.2),y=Math.min(140,rect.height*.2);
 stage.dispatchEvent(pointer('pointerdown','pen',31,x,y,.35));
 stage.dispatchEvent(pointer('pointermove','pen',31,x+40,y+28,.95));
 stage.dispatchEvent(pointer('pointerup','pen',31,x+40,y+28,.95));
}
drawPencilStroke('one');
assert.equal(room.getInputState().mode,'pencil','Apple Pencil selection remains independent of the selected tool');
host.querySelector('[data-ns-page="next"]').click();
await new Promise(resolve=>setTimeout(resolve,0));
host.querySelector('[data-ns-page="next"]').click();
await new Promise(resolve=>setTimeout(resolve,0));
assert.match(host.querySelector('#nsPdfPageIndicator').textContent,/Page 3 \/ 3/);
room.setInputMode('hand');
room.setActiveTool('text');
stage.dispatchEvent(pointer('pointerdown','touch',32,130,150));
stage.dispatchEvent(pointer('pointermove','touch',32,330,250));
stage.dispatchEvent(pointer('pointerup','touch',32,330,250));
const textObject=host.querySelector('.ns-doc-text-object');
assert.ok(textObject,'the native text object layer created a real editable page annotation');
const textEditor=textObject.querySelector('.ns-doc-text-content');
textEditor.innerHTML='<p>Document Studio verification note</p>';
textEditor.dispatchEvent(new window.Event('input',{bubbles:true}));
holdNextDraftSave=true;
window.dispatchEvent(new window.Event('pagehide'));
for(let attempt=0;attempt<20&&!releaseHeldDraft;attempt++)await Promise.resolve();
assert.equal(typeof releaseHeldDraft,'function','the first async draft write has reached the delayed storage transaction');
textEditor.innerHTML='<p>Newest serialized draft</p>';
textEditor.dispatchEvent(new window.Event('input',{bubbles:true}));
window.dispatchEvent(new window.Event('pagehide'));
releaseHeldDraft();
releaseHeldDraft=null;
await new Promise(resolve=>setTimeout(resolve,0));
await new Promise(resolve=>setTimeout(resolve,0));
assert.ok([...drafts.values()][0].annotations['3'].texts.some(note=>String(note.text).includes('Newest serialized draft')),'a newer write is queued behind the interrupted older write and wins');
Object.defineProperty(window.document,'visibilityState',{configurable:true,get:()=> 'hidden'});
textEditor.innerHTML='<p>Saved by Safari visibility change</p>';
textEditor.dispatchEvent(new window.Event('input',{bubbles:true}));
window.document.dispatchEvent(new window.Event('visibilitychange'));
await new Promise(resolve=>setTimeout(resolve,0));
await new Promise(resolve=>setTimeout(resolve,0));
assert.ok([...drafts.values()][0].annotations['3'].texts.some(note=>String(note.text).includes('Saved by Safari visibility change')),'Safari hidden visibility flush persists the latest in-progress rich-text change');

const sourceRecord=[...documents.values()][0];
assert.ok(sourceRecord,'the original PDF is persisted separately from its draft');
assert.deepEqual([...sourceRecord.bytes],[...sourceBytes],'editing and export never mutate the original PDF bytes');
const draftRecord=[...drafts.values()][0];
assert.ok(draftRecord,'the annotation draft is stored independently');
assert.equal(draftRecord.identity.canvasAssignmentId,9001,'the stored identity includes the canonical Canvas assignment ID');
assert.ok(draftRecord.annotations['1']?.strokes?.length,'the first page pencil stroke is in the saved draft');
const savedStroke=draftRecord.annotations['1'].strokes[0];
assert.ok(savedStroke.points.length>=2,'the Pencil stroke contains more than one point');
assert.ok(savedStroke.points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)),'the normalized Pencil points are finite before PDF export: '+JSON.stringify(savedStroke.points));
assert.ok(draftRecord.annotations['3']?.texts?.some(note=>String(note.text).includes('Saved by Safari visibility change')),'the third page rich-text annotation is saved after the latest Safari flush');

const exported=await room.getAnnotatedFile();
assert.equal(exported.type,'application/pdf');
const outputBytes=new Uint8Array(await exported.arrayBuffer());
const reopened=await pdfjs.getDocument({data:outputBytes,disableWorker:true,useSystemFonts:true}).promise;
assert.equal(reopened.numPages,3,'an independent PDF.js parser confirms the original three-page count');
const originalParsed=await pdfjs.getDocument({data:sourceBytes.slice(),disableWorker:true,useSystemFonts:true}).promise;
for(let pageNumber=1;pageNumber<=3;pageNumber++){
 const originalPage=await originalParsed.getPage(pageNumber);
 const exportedPage=await reopened.getPage(pageNumber);
 const before=originalPage.getViewport({scale:1});
 const after=exportedPage.getViewport({scale:1});
 assert.equal(after.width,before.width,'page '+pageNumber+' keeps its original displayed width and rotation');
 assert.equal(after.height,before.height,'page '+pageNumber+' keeps its original displayed height and rotation');
 const extracted=await exportedPage.getTextContent();
 const text=extracted.items.map(item=>item.str).join(' ');
 assert.ok(text.includes('ORIGINAL PAGE '+(pageNumber===1?'ONE':pageNumber===2?'TWO':'THREE')),'source page '+pageNumber+' content remains present');
 if(pageNumber===3)assert.ok(text.includes('Saved by Safari visibility change'),'the latest flushed rich-text annotation is flattened into the PDF');
 if(pageNumber===2)assert.ok(!text.includes('Document Studio verification note'),'the unannotated page is not duplicated or modified by the annotation layer');
}
assert.deepEqual([...sourceBytes],[...originalSourceBytes],'the original in-memory source remains unchanged after export');

const savedKey=[...documents.keys()][0];
await room.openPdf(host,file,assignment,credentials);
assert.equal(downloadCalls,1,'reopening restores the local source before asking Canvas for another download');
assert.match(host.querySelector('#nsPdfPageIndicator').textContent,/Page 3 \/ 3/,'the last viewed page is recovered from the draft');
assert.ok(host.querySelector('.ns-doc-text-content')?.textContent.includes('Saved by Safari visibility change'),'rich text restores after leaving and reopening');
assert.equal([...documents.keys()].filter(key=>key===savedKey).length,1,'reopening does not create duplicate source records');

const otherFile={id:612,name:'second-assignment.pdf',contentType:'application/pdf',size:sourceBytes.byteLength};
const otherAssignment={id:'local-assignment-2',canvasAssignmentId:9002,canvasCourseId:501,title:'Second packet'};
await room.openPdf(host,otherFile,otherAssignment,credentials);
assert.equal(documents.size,2,'two assignments retain separate original PDFs');
assert.equal(drafts.size,2,'two assignments retain separate annotation drafts');
assert.notEqual([...drafts.values()][0].identity.canvasAssignmentId,[...drafts.values()][1].identity.canvasAssignmentId,'assignment identity prevents cross-assignment draft collisions');

let resolveFirst=null,resolveSecond=null;
window.NorthstarWorkspace.downloadCanvasFile=({fileId})=>new Promise(resolve=>{if(fileId===613)resolveFirst=resolve;else if(fileId===614)resolveSecond=resolve;else throw Error('unexpected concurrent file ID '+fileId);});
const assignmentThree={id:'local-assignment-3',canvasAssignmentId:9003,canvasCourseId:501,title:'Slow first open'};
const assignmentFour={id:'local-assignment-4',canvasAssignmentId:9004,canvasCourseId:501,title:'Newer active open'};
const slowFirst=room.openPdf(host,{id:613,name:'slow-first.pdf',contentType:'application/pdf'},assignmentThree,credentials);
for(let attempt=0;attempt<20&&!resolveFirst;attempt++)await Promise.resolve();
assert.equal(typeof resolveFirst,'function','the first Canvas attachment request is pending');
const newestOpen=room.openPdf(host,{id:614,name:'newer-active.pdf',contentType:'application/pdf'},assignmentFour,credentials);
for(let attempt=0;attempt<20&&!resolveSecond;attempt++)await Promise.resolve();
assert.equal(typeof resolveSecond,'function','the second Canvas attachment request is pending');
resolveSecond({id:614,name:'newer-active.pdf',contentType:'application/pdf',size:sourceBytes.byteLength,bytes:sourceBytes.slice()});
await newestOpen;
resolveFirst({id:613,name:'slow-first.pdf',contentType:'application/pdf',size:sourceBytes.byteLength,bytes:sourceBytes.slice()});
await slowFirst;
assert.equal(host.querySelector('#nsPdfFileName')?.textContent,'newer-active.pdf','a stale Canvas fetch cannot replace the newer assignment editor');
assert.ok([...documents.values()].some(record=>record.identity.canvasAssignmentId===9004),'the newest assignment PDF is stored under its own Canvas identity');
assert.ok(![...documents.values()].some(record=>record.identity.canvasAssignmentId===9003),'the stale open cannot persist its PDF into the active assignment state');

dom.window.close();
console.log('PASS: rotated multi-page PDF export, independent PDF.js reopen, Safari pagehide/visibility flush, serialized async drafts, recovery, and stale-open isolation');
