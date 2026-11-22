/* Submission transport: no retries, logs, persistence, or direct-mode writes. */
(function(global){
'use strict';
function payload(type,value){
  value=String(value||'').trim();
  if(!value) throw Error('Enter your work before submitting.');
  if(type==='online_text_entry') return {submission:{submission_type:type,body:'<p>'+value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g,'<br>')+'</p>'}};
  if(type==='online_url'){
    let url;try{url=new URL(value);}catch{throw Error('Enter a valid HTTP or HTTPS URL.');}
    if(!['http:','https:'].includes(url.protocol)) throw Error('Enter a valid HTTP or HTTPS URL.');
    return {submission:{submission_type:type,url:url.href}};
  }
  if(type==='online_upload'){
    const candidates=Array.isArray(value)?value:[value];
    const fileIds=[...new Set(candidates.map(item=>Number(item)).filter(item=>Number.isSafeInteger(item)&&item>0))];
    if(!fileIds.length||fileIds.length!==candidates.length)throw Error('Upload every selected file to Canvas before submitting.');
    if(fileIds.length>10)throw Error('A submission can contain at most 10 files in NORTHSTAR.');
    return {submission:{submission_type:type,file_ids:fileIds}};
  }
  throw Error('This submission type must be completed in Canvas.');
}
async function send({credentials,courseId,assignmentId,data,fetchImpl=global.fetch}){
  if(!credentials?.proxy) throw Error('Connect using your private bridge to submit.');
  if(!/^\d+$/.test(String(courseId))||!/^\d+$/.test(String(assignmentId))) throw Error('Invalid assignment.');
  const url=new URL(credentials.proxy);url.searchParams.set('path',`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`);
  let res;
  try{res=await fetchImpl(url.href,{method:'POST',headers:{Authorization:'Bearer '+credentials.token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data),redirect:'error'});}
  catch{throw Error('Submission outcome unknown. Check Canvas before trying again; no automatic retry was made.');}
  if(!res.ok) throw Error(`Canvas/bridge refused the submission (HTTP ${res.status}). Check Canvas before retrying. You may need to redeploy the bridge or reopen the assignment in Canvas.`);
  let result;try{result=await res.json();}catch{throw Error('Response unreadable. Check Canvas before retrying.');}
  if(!result || !['submitted','graded','pending_review'].includes(result.workflow_state)) throw Error('Submission not confirmed. Check Canvas before retrying.');
  return result;
}
function sanitizeRichTextHtml(value){
  const html=String(value??'');
  if(typeof DOMParser==='undefined')return '<p>'+html.replace(/<[^>]*>/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</p>';
  const parser=new DOMParser(),doc=parser.parseFromString(html,'text/html'),allowed=new Set(['P','BR','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4','H5','H6','DIV','SPAN','A','HR','PRE','CODE','TABLE','THEAD','TBODY','TR','TD','TH','SUB','SUP']);
  function copy(node){
    if(node.nodeType===3)return doc.createTextNode(node.nodeValue||'');
    if(node.nodeType!==1)return doc.createDocumentFragment();
    const tag=node.tagName;
    if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','IMG','VIDEO','AUDIO','SVG','MATH'].includes(tag))return doc.createDocumentFragment();
    if(!allowed.has(tag)){const frag=doc.createDocumentFragment();[...node.childNodes].forEach(child=>frag.append(copy(child)));return frag;}
    const out=doc.createElement(tag.toLowerCase());
    if(tag==='A'){
      try{const url=new URL(node.getAttribute('href')||'',global.location?.href||'https://northstar.invalid');if(['https:','http:'].includes(url.protocol)&&!url.username&&!url.password){out.href=url.href;out.target='_blank';out.rel='noopener noreferrer';}}catch{}
    }
    if(tag==='TD'||tag==='TH'){['colspan','rowspan'].forEach(key=>{const value=node.getAttribute(key);if(value&&/^\\d{1,2}$/.test(value))out.setAttribute(key,value);});}
    [...node.childNodes].forEach(child=>out.append(copy(child)));
    return out;
  }
  const out=doc.createElement('div');[...doc.body.childNodes].forEach(node=>out.append(copy(node)));return out.innerHTML;
}
function richTextPayload(html){
  const body=sanitizeRichTextHtml(html);
  let plain=body.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
  if(typeof DOMParser!=='undefined')plain=new DOMParser().parseFromString(body,'text/html').body.textContent.trim();
  if(!plain)throw Error('Enter your work before submitting.');
  let size;try{size=typeof TextEncoder!=='undefined'?new TextEncoder().encode(body).length:encodeURIComponent(body).replace(/%[A-F0-9]{2}/gi,'x').length;}catch{throw Error('Your response contains characters that cannot be encoded safely. Remove unusual characters and try again.');}
  if(size>16000)throw Error('Your formatted response is '+size.toLocaleString()+' bytes. Canvas accepts up to 16 KB here; shorten it before submitting.');
  return {submission:{submission_type:'online_text_entry',body}};
}
const api={payload,send,sanitizeRichTextHtml,richTextPayload};global.NorthstarSubmissions=api;
if(typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
