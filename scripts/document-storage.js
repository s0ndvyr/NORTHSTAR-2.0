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
let lastError=null;
function rememberError(stage,error){lastError={stage,name:String(error?.name||'StorageError'),message:String(error?.message||'Document storage operation failed.')};return error;}
function clearError(){lastError=null;}

function openDatabase(){
 if(!root.indexedDB){rememberError('open',{name:'NotSupportedError',message:'IndexedDB is unavailable in this browser.'});return Promise.resolve(null);}
 if(dbPromise)return dbPromise;
 dbPromise=new Promise(resolve=>{
  let request;
  try{request=root.indexedDB.open(DB_NAME,DB_VERSION);}catch(error){rememberError('open',error);return resolve(null);}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(DOCUMENTS))db.createObjectStore(DOCUMENTS,{keyPath:'key'});
   if(!db.objectStoreNames.contains(DRAFTS))db.createObjectStore(DRAFTS,{keyPath:'key'});
  };
  request.onsuccess=()=>{
   clearError();
   const db=request.result;
   db.onversionchange=()=>{try{db.close();}catch{}dbPromise=null;};
   resolve(db);
  };
  request.onerror=()=>{rememberError('open',request.error||new Error('IndexedDB could not be opened.'));dbPromise=null;resolve(null);};
  request.onblocked=()=>{rememberError('open',{name:'BlockedError',message:'Another tab is blocking the NORTHSTAR document database upgrade.'});dbPromise=null;resolve(null);};
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
   request.onerror=()=>{const error=request.error||new Error('Document storage read failed');rememberError('read',error);reject(error);};
   tx.oncomplete=()=>{clearError();resolve(value);};
   tx.onerror=()=>{const error=tx.error||new Error('Document storage read transaction failed');rememberError('read',error);reject(error);};
   tx.onabort=()=>{const error=tx.error||new Error('Document storage read was interrupted');rememberError('abort',error);reject(error);};
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
   tx.oncomplete=()=>{clearError();resolve(true);};
   tx.onerror=()=>{const error=tx.error||new Error('Document storage write failed');rememberError('write',error);reject(error);};
   tx.onabort=()=>{const error=tx.error||new Error('Document storage write was interrupted');rememberError('abort',error);reject(error);};
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
   tx.oncomplete=()=>{clearError();resolve(true);};
   tx.onerror=()=>{const error=tx.error||new Error('Document storage delete failed');rememberError('delete',error);reject(error);};
   tx.onabort=()=>{const error=tx.error||new Error('Document storage delete was interrupted');rememberError('abort',error);reject(error);};
  });
 });
}
function saveDocument(record){
 if(!record||typeof record.key!=='string'||!record.key||!record.identity||!record.bytes){rememberError('validation',{name:'DataError',message:'A PDF storage record is incomplete.'});return Promise.resolve(false);}
 const bytes=record.bytes instanceof Uint8Array?record.bytes:new Uint8Array(record.bytes);
 if(bytes.byteLength<5||bytes.byteLength>100*1024*1024||String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-'){rememberError('validation',{name:'InvalidPdfError',message:'The source does not contain a valid PDF header or exceeds the 100 MB storage limit.'});return Promise.resolve(false);}
 return writeRecord(DOCUMENTS,{key:record.key,identity:record.identity,bytes,filename:String(record.filename||''),contentType:String(record.contentType||'application/pdf'),size:bytes.byteLength,updatedAt:Number(record.updatedAt)||Date.now()});
}
function saveDraft(record){
 if(!record||typeof record.key!=='string'||!record.key||!record.identity||!record.annotations||typeof record.annotations!=='object'){rememberError('validation',{name:'DataError',message:'An annotation draft record is incomplete.'});return Promise.resolve(false);}
 return writeRecord(DRAFTS,{key:record.key,identity:record.identity,annotations:record.annotations,page:Math.max(1,Number(record.page)||1),scale:Math.max(.65,Math.min(2.5,Number(record.scale)||1.15)),updatedAt:Number(record.updatedAt)||Date.now()});
}
const api={
 databaseName:DB_NAME,
 getLastError:()=>lastError?{...lastError}:null,
 clearLastError,
 open:openDatabase,
 getDocument:key=>readRecord(DOCUMENTS,key),
 saveDocument,
 getDraft:key=>readRecord(DRAFTS,key),
 saveDraft,
 deleteDocument:key=>deleteRecord(DOCUMENTS,key),
 deleteDraft:key=>deleteRecord(DRAFTS,key),
 close(){if(dbPromise)dbPromise.then(db=>{try{db?.close();}catch{}});dbPromise=null;clearError();}
};
root.NorthstarDocumentStorage=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
