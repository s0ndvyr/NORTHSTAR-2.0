import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../scripts/assignment-room.js',import.meta.url),'utf8');
const dom=new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>',{
  url:'https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/',
  runScripts:'outside-only',
  pretendToBeVisual:true
});
const {window}=dom;
const host=window.document.getElementById('host');
const previewUrl='https://inst-fs-iad-prod.inscloudgate.net/inline/worksheet.pdf?signature=short-lived-secret';
let sessionRequest=null,openedTab=null;
window.open=()=>{openedTab={location:{href:'about:blank'},close(){this.closed=true;},closed:false};return openedTab;};
window.NorthstarWorkspace={
  downloadCanvasFile:async()=>({
    id:61162022,name:'ionic nomenclature problem set 2026.pdf',contentType:'application/pdf',
    bytes:null,previewUrl,canvasReturnTo:'/courses/155417/files/61162022',
    publicUrlEndpoint:{result:'response',status:200},
    previewDelivery:{attempted:true,result:'browser_fetch_blocked',status:null,host:'inst-fs-iad-prod.inscloudgate.net',contentType:''}
  }),
  getCanvasSessionUrl:async args=>{sessionRequest=args;return {sessionUrl:'https://nnps.instructure.com/login?session_url=temporary-session'};}
};
window.eval(source);
const file={id:61162022,name:'ionic nomenclature problem set 2026.pdf'};
const assignment={id:'assignment-1',canvasCourseId:155417,title:'Ionic nomenclature'};
const credentials={base:'https://nnps.instructure.com',proxy:'https://northstar-bridge.s0ndvyr.workers.dev',token:'secret'};
await window.NorthstarAssignmentRoom.openPdf(host,file,assignment,credentials);

assert.ok(host.querySelector('.ns-pdf-native-fallback'),'CORS failure renders a recoverable native-preview state');
assert.equal(host.querySelector('.ns-pdf-native-preview')?.src,previewUrl,'the browser native viewer receives the Canvas signed URL');
assert.equal(host.querySelector('a[href]')?.href,previewUrl,'a direct Safari link is available as a fallback');
assert.ok(host.textContent.includes('Save to Files'),'the iPad save-to-Files workflow is explained');
assert.ok(host.textContent.includes('Import downloaded PDF to edit'),'the fallback clearly returns the document to Document Studio');
assert.equal(host.querySelector('#nsPdfLocalFile')?.accept,'application/pdf,.pdf');
assert.equal([...Array(window.localStorage.length)].map((_,i)=>window.localStorage.key(i)).filter(Boolean).some(key=>String(window.localStorage.getItem(key)).includes('signature=')),false,'signed URLs are not persisted');

host.querySelector('#nsPdfOpenCanvas').click();
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(sessionRequest.returnTo,'/courses/155417/files/61162022','the Canvas handoff targets the exact course-scoped file');
assert.equal(openedTab.location.href,'https://nnps.instructure.com/login?session_url=temporary-session','the temporary Canvas session opens in a user-initiated browser tab');

// Import validation runs before PDF.js is initialized; a non-PDF cannot enter the editor.
const input=host.querySelector('#nsPdfLocalFile'),status=host.querySelector('#nsPdfNativeStatus');
Object.defineProperty(input,'files',{configurable:true,value:[{
  name:'not-a-pdf.pdf',arrayBuffer:async()=>new TextEncoder().encode('not a PDF').buffer
}]});
input.dispatchEvent(new window.Event('change'));
await new Promise(resolve=>setTimeout(resolve,0));
assert.match(status.textContent,/not a readable PDF/i,'invalid imports are rejected before the PDF renderer runs');
console.log('PASS: native Canvas PDF recovery UI, Safari preview, temporary session handoff, signed-URL privacy, and local PDF validation');
