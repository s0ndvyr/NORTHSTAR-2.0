/* NORTHSTAR Document Studio persistence.
   IndexedDB stores immutable source-PDF bytes separately from changing drafts,
   so autosave never clones a large PDF after every annotation. */
(function(root){
'use strict';
const DB_NAME='northstar-document-studio';
const DB_VERSION=1;
const DOCUMENTS='documents';
const DRAFTS='drafts';
let dbPromise=null;

function openDatabase(){
 if(!root.indexedDB)return Promise.resolve(null);
 if(dbPromise)return dbPromise;
 dbPromise=new Promise(resolve=>{
  let request;
  try{request=root.indexedDB.open(DB_NAME,DB_VERSION);}catch{return resolve(null);}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(DOCUMENTS))db.createObjectStore(DOCUMENTS,{keyPath:'key'});
   if(!db.objectStoreNames.contains(DRAFTS))db.createObjectStore(DRAFTS,{keyPath:'key'});
  };
  request.onsuccess=()=>{
   const db=request.result;
   db.onversionchange=()=>{try{db.close();}catch{}dbPromise=null;};
   resolve(db);
  };
  request.onerror=()=>resolve(null);
  request.onblocked=()=>resolve(null);
 });
 return dbPromise;
}
function readRecord(storeName,key){
 return openDatabase().then(db=>{
  if(!db)return null;
  return new Promise((resolve,reject)=>{
   let tx,request,value=null;
   try{tx=db.transaction(storeName,'readonly');request=tx.objectStore(storeName).get(String(key));}
   catch(error){reject(error);return;}
   request.onsuccess=()=>{value=request.result||null;};
   request.onerror=()=>reject(request.error||new Error('Document storage read failed'));
   tx.oncomplete=()=>resolve(value);
   tx.onerror=()=>reject(tx.error||new Error('Document storage read transaction failed'));
   tx.onabort=()=>reject(tx.error||new Error('Document storage read was interrupted'));
  });
 });
}
function writeRecord(storeName,record){
 if(!record||typeof record.key!=='string'||!record.key)return Promise.resolve(false);
 return openDatabase().then(db=>{
  if(!db)return false;
  return new Promise((resolve,reject)=>{
   let tx;
   try{tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).put(record);}
   catch(error){reject(error);return;}
   tx.oncomplete=()=>resolve(true);
   tx.onerror=()=>reject(tx.error||new Error('Document storage write failed'));
   tx.onabort=()=>reject(tx.error||new Error('Document storage write was interrupted'));
  });
 });
}
function deleteRecord(storeName,key){
 return openDatabase().then(db=>{
  if(!db)return false;
  return new Promise((resolve,reject)=>{
   let tx;
   try{tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).delete(String(key));}
   catch(error){reject(error);return;}
   tx.oncomplete=()=>resolve(true);
   tx.onerror=()=>reject(tx.error||new Error('Document storage delete failed'));
   tx.onabort=()=>reject(tx.error||new Error('Document storage delete was interrupted'));
  });
 });
}
function saveDocument(record){
 if(!record||typeof record.key!=='string'||!record.identity||!record.bytes)return Promise.resolve(false);
 const bytes=record.bytes instanceof Uint8Array?record.bytes:new Uint8Array(record.bytes);
 if(bytes.byteLength<5||bytes.byteLength>100*1024*1024)return Promise.resolve(false);
 return writeRecord(DOCUMENTS,{key:record.key,identity:record.identity,bytes,filename:String(record.filename||''),contentType:String(record.contentType||'application/pdf'),size:bytes.byteLength,updatedAt:Number(record.updatedAt)||Date.now()});
}
function saveDraft(record){
 if(!record||typeof record.key!=='string'||!record.identity||!record.annotations||typeof record.annotations!=='object')return Promise.resolve(false);
 return writeRecord(DRAFTS,{key:record.key,identity:record.identity,annotations:record.annotations,page:Math.max(1,Number(record.page)||1),scale:Math.max(.65,Math.min(2.5,Number(record.scale)||1.15)),updatedAt:Number(record.updatedAt)||Date.now()});
}
const api={
 databaseName:DB_NAME,
 open:openDatabase,
 getDocument:key=>readRecord(DOCUMENTS,key),
 saveDocument,
 getDraft:key=>readRecord(DRAFTS,key),
 saveDraft,
 deleteDocument:key=>deleteRecord(DOCUMENTS,key),
 deleteDraft:key=>deleteRecord(DRAFTS,key),
 close(){if(dbPromise)dbPromise.then(db=>{try{db?.close();}catch{}});dbPromise=null;}
};
root.NorthstarDocumentStorage=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
