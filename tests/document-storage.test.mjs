import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

function cloneRecord(record){
 const copy={...record};
 if(record.bytes instanceof Uint8Array)copy.bytes=record.bytes.slice();
 if(record.annotations)copy.annotations=JSON.parse(JSON.stringify(record.annotations));
 return copy;
}
function makeIndexedDb(){
 const stores=new Map(),state={failNextPut:null};
 const database={
  objectStoreNames:{contains:name=>stores.has(name)},
  createObjectStore(name){stores.set(name,new Map());return {};},
  transaction(name){
   const tx={oncomplete:null,onerror:null,onabort:null};
   const map=stores.get(name);
   tx.objectStore=()=>({
    get(key){
     const request={result:null,onsuccess:null,onerror:null};
     queueMicrotask(()=>{request.result=map.get(String(key))?cloneRecord(map.get(String(key))):null;request.onsuccess?.({target:request});queueMicrotask(()=>tx.oncomplete?.({target:tx}));});
     return request;
    },
    put(record){
     const request={result:record.key,onsuccess:null,onerror:null};
     const failure=state.failNextPut;state.failNextPut=null;
     queueMicrotask(()=>{
      if(failure){tx.error=failure;request.error=failure;request.onerror?.({target:request});tx.onerror?.({target:tx});queueMicrotask(()=>tx.onabort?.({target:tx}));return;}
      map.set(String(record.key),cloneRecord(record));request.onsuccess?.({target:request});queueMicrotask(()=>tx.oncomplete?.({target:tx}));
     });
     return request;
    },
    delete(key){
     const request={onsuccess:null,onerror:null};
     queueMicrotask(()=>{map.delete(String(key));request.onsuccess?.({target:request});queueMicrotask(()=>tx.oncomplete?.({target:tx}));});
     return request;
    }
   });
   return tx;
  },
  close(){}
 };
 return {state,open(name,version){
  const request={result:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
  queueMicrotask(()=>{request.result=database;request.onupgradeneeded?.({target:request});request.onsuccess?.({target:request});});
  return request;
 }};
}

const dom=new JSDOM('<!doctype html><body></body>',{url:'https://northstar.test/',runScripts:'outside-only'});
const fakeIdb=makeIndexedDb();
dom.window.indexedDB=fakeIdb;
dom.window.eval(readFileSync(new URL('../scripts/document-storage.js',import.meta.url),'utf8'));
const storage=dom.window.NorthstarDocumentStorage;
assert.ok(storage,'Document Studio persistence registers in the browser');

const identity={schemaVersion:1,canvasFileId:42,courseId:11,assignmentId:'assignment-7',originalFilename:'worksheet.pdf',contentType:'application/pdf'};
const bytes=new Uint8Array([37,80,68,70,45,49,46,55]);
assert.equal(await storage.saveDocument({key:'assignment-7_file-42',identity,bytes,filename:'worksheet.pdf',contentType:'application/pdf'}),true);
const savedDocument=await storage.getDocument('assignment-7_file-42');
assert.deepEqual([...savedDocument.bytes],[...bytes],'the original PDF bytes survive a structured-clone round trip');
assert.equal(savedDocument.identity.canvasFileId,42);
assert.equal(savedDocument.filename,'worksheet.pdf');
assert.equal(savedDocument.size,bytes.byteLength);

const annotations={'1':{strokes:[{tool:'pen',points:[{x:.1,y:.2,pressure:.7}]}],texts:[{id:'note-1',text:'Saved text'}]}};
const draftRecord={key:'assignment-7_file-42',identity,annotations,page:3,scale:1.6,updatedAt:123456};
assert.equal(await storage.saveDraft(draftRecord),true);
const savedDraft=await storage.getDraft('assignment-7_file-42');
assert.deepEqual(savedDraft.annotations,annotations,'annotation drafts survive independently from the source PDF');
assert.equal(savedDraft.page,3);
assert.equal(savedDraft.scale,1.6);
assert.equal(savedDraft.updatedAt,123456);

const invalidBytes=new Uint8Array([1,2,3,4,5,6]);
assert.equal(await storage.saveDocument({key:'invalid',identity,bytes:invalidBytes}),false,'a non-PDF source is rejected before it can replace a stored original');
assert.equal(storage.getLastError()?.name,'InvalidPdfError');
assert.equal(await storage.saveDocument({key:'assignment-7_file-42',identity,bytes,filename:'worksheet.pdf'}),true,'a later valid source save succeeds');
assert.equal(storage.getLastError(),null,'successful storage transactions clear recovered errors');

const quota=Object.assign(new Error('The device storage quota was exceeded.'),{name:'QuotaExceededError'});
fakeIdb.state.failNextPut=quota;
const changedDraft={...draftRecord,annotations:{'1':{strokes:[],texts:[{id:'note-1',text:'Newer but not saved'}]}}};
await assert.rejects(storage.saveDraft(changedDraft),/quota|storage/i,'quota failures are surfaced to the caller');
assert.equal(storage.getLastError()?.name,'QuotaExceededError','storage diagnostics preserve the quota failure class');
assert.equal(storage.getLastError()?.stage,'write','storage diagnostics identify the failed operation');
assert.equal((await storage.getDraft('assignment-7_file-42')).annotations['1'].texts[0].text,'Saved text','a failed transaction does not overwrite the last known-good draft');
assert.equal(storage.getLastError(),null,'a later successful read clears the recovered storage error');

assert.equal(await storage.deleteDraft('assignment-7_file-42'),true);
assert.equal(await storage.getDraft('assignment-7_file-42'),null,'draft deletion does not remove the source PDF');
assert.equal((await storage.getDocument('assignment-7_file-42')).identity.assignmentId,'assignment-7');
assert.equal(await storage.deleteDocument('assignment-7_file-42'),true);
assert.equal(await storage.getDocument('assignment-7_file-42'),null);

const noIdb=new JSDOM('<!doctype html><body></body>',{url:'https://northstar.test/',runScripts:'outside-only'});
noIdb.window.eval(readFileSync(new URL('../scripts/document-storage.js',import.meta.url),'utf8'));
assert.equal(await noIdb.window.NorthstarDocumentStorage.open(),null,'unsupported browsers fall back cleanly without IndexedDB');
assert.equal(noIdb.window.NorthstarDocumentStorage.getLastError()?.name,'NotSupportedError','unsupported IndexedDB is reported as a distinct diagnostic');
assert.equal(await noIdb.window.NorthstarDocumentStorage.saveDocument({key:'x',identity,bytes}),false);

dom.window.close();noIdb.window.close();
console.log('PASS: IndexedDB source/draft isolation, PDF validation, quota interruption safety, last-known-good recovery, diagnostics and unsupported-browser fallback');
