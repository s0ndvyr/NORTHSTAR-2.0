// NORTHSTAR Canvas bridge — narrowly allowlisted student reads and submissions.
const ALLOWED_ORIGIN = 'https://s0ndvyr.github.io';
const CANVAS_ORIGIN = 'https://nnps.instructure.com';
const cors = {'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers':'Authorization, Accept, Content-Type', 'Access-Control-Expose-Headers':'Content-Type, Content-Length, Content-Disposition, Content-Range, Accept-Ranges', 'Vary':'Origin', 'Cache-Control':'no-store'};
function reply(message,status){return new Response(JSON.stringify({error:message}),{status,headers:{...cors,'Content-Type':'application/json'}});}
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const isQuizFlagPath=path=>/^\/api\/v1\/quiz_submissions\/\d+\/questions\/\d+\/(?:flag|unflag)$/.test(path);
const keysOnly=(o,keys)=>isObject(o)&&Object.keys(o).every(k=>keys.includes(k));
function validAnswer(v){
  if(v===null)return true;
  if(typeof v==='string')return v.length<=16000;
  if(typeof v==='number')return Number.isFinite(v);
  if(typeof v==='boolean')return true;
  if(Array.isArray(v))return v.length<=100&&v.every(x=>typeof x==='string'||(typeof x==='number'&&Number.isFinite(x))||isObject(x)&&keysOnly(x,['answer_id','match_id'])&&Number.isSafeInteger(Number(x.answer_id))&&Number.isSafeInteger(Number(x.match_id)));
  if(isObject(v))return Object.keys(v).length<=30&&Object.values(v).every(x=>typeof x==='string'||(typeof x==='number'&&Number.isFinite(x)));
  return false;
}
function safeCanvasReturnTo(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')||value.includes('#'))return false;
  return /^\/courses\/\d+\/assignments\/\d+$/.test(value) ||
    /^\/courses\/\d+\/quizzes\/\d+$/.test(value) ||
    /^\/courses\/\d+\/files\/\d+$/.test(value) ||
    /^\/courses\/\d+\/external_tools\/\d+$/.test(value);
}
function allowedRead(path){
  let requested;try{requested=new URL(path,CANVAS_ORIGIN);}catch{return false;}
  if(requested.origin!==CANVAS_ORIGIN)return false;
  if(requested.pathname==='/login/session_token'){
    const keys=[...requested.searchParams.keys()];
    if(keys.some(key=>key!=='return_to')||keys.length>1)return false;
    const returnTo=requested.searchParams.get('return_to');
    return returnTo===null||safeCanvasReturnTo(returnTo);
  }
  if(/^\/api\/v1\/courses\/\d+\/external_tools\/sessionless_launch$/.test(requested.pathname)){
    const params=[...requested.searchParams.entries()];
    return params.length===2&&requested.searchParams.get('launch_type')==='assessment'&&/^\d+$/.test(requested.searchParams.get('assignment_id')||'');
  }
  return /^\/api\/v1\/users\/self$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/discussion_topics(?:\?(?:[^#]*))?$/.test(path) || /^\/api\/v1\/courses\/\d+\/discussion_topics\/\d+(?:\/entries)?(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/courses(?:\?[^#]*)?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/assignments\/\d+(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions\/\d+(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/files\/\d+(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/files\/\d+\/download$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/files\/\d+\/download$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/(?:assignments|assignment_groups|quizzes)(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/quizzes\/\d+(?:\/(?:questions|submission|submissions\/\d+\/time))?(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/quiz_submissions\/\d+\/questions(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/quiz\/v1\/courses\/\d+\/quizzes\/\d+$/.test(path) ||
    /^\/api\/quiz\/v1\/courses\/\d+\/quizzes\/\d+\/items$/.test(path);
}
function isWritePath(path){return /^\/api\/v1\/courses\/\d+\/discussion_topics\/\d+\/entries(?:\/\d+\/replies)?$/.test(path)||/^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions\/(?:\d+|self)\/files$/.test(path)||/^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions$/.test(path)||/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions\/self\/files$/.test(path)||/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions$/.test(path)||/^\/api\/v1\/quiz_submissions\/\d+\/questions$/.test(path)||/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions\/\d+\/complete$/.test(path);}
function validateWrite(path,data){
  if(!isObject(data))return 'JSON object required';
  const discussionPost=/^\/api\/v1\/courses\/\d+\/discussion_topics\/\d+\/entries(?:\/\d+\/replies)?$/;
  if(discussionPost.test(path)){if(!keysOnly(data,['message'])||typeof data.message!=='string'||!data.message.trim()||data.message.length>16000)return 'Invalid discussion message';return null;}
  const assignment=/^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions$/;
  const quizStart=/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions$/;
  const quizAnswers=/^\/api\/v1\/quiz_submissions\/\d+\/questions$/;
  const quizComplete=/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions\/\d+\/complete$/;
  const quizUploadInit=/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions\/self\/files$/;
  if(quizUploadInit.test(path)){
    if(!keysOnly(data,['name'])||typeof data.name!=='string'||!data.name.trim()||data.name.length>255)return 'Invalid quiz upload initialization request';
    return null;
  }
  const uploadInit=/^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions\/(?:\d+|self)\/files$/;
  if(uploadInit.test(path)){
    if(!keysOnly(data,['name','size','content_type'])||typeof data.name!=='string'||!data.name.trim()||data.name.length>255||!Number.isSafeInteger(data.size)||data.size<1||data.size>25000000||(data.content_type!==undefined&&typeof data.content_type!=='string'))return 'Invalid upload initialization request';
    return null;
  }
  if(assignment.test(path)){
    const sub=data.submission;
    if(!keysOnly(data,['submission'])||!isObject(sub))return 'Invalid submission';
    const type=sub.submission_type,field=type==='online_text_entry'?'body':type==='online_url'?'url':null;
    if(type==='online_upload'){if(!keysOnly(sub,['submission_type','file_ids'])||!Array.isArray(sub.file_ids)||!sub.file_ids.length||sub.file_ids.length>10||!sub.file_ids.every(x=>Number.isSafeInteger(x)&&x>0))return 'Invalid uploaded file submission';return null;}
    if(!field||!keysOnly(sub,['submission_type',field])||typeof sub[field]!=='string'||!sub[field].trim())return 'Unsupported assignment submission payload';
    if(field==='body'&&sub.body.length>16000)return 'Text submission exceeds Canvas 16 KB limit';
    if(field==='url'){try{if(!['https:','http:'].includes(new URL(sub.url).protocol))throw Error();}catch{return 'Invalid submission URL';}}
    return null;
  }
  if(quizStart.test(path)){
    if(!keysOnly(data,['access_code'])||(data.access_code!==undefined&&typeof data.access_code!=='string'))return 'Invalid quiz start request';
    return null;
  }
  if(quizAnswers.test(path)){
    if(!keysOnly(data,['attempt','validation_token','access_code','quiz_questions'])||!Number.isSafeInteger(data.attempt)||data.attempt<1||typeof data.validation_token!=='string'||!data.validation_token||data.validation_token.length>512||!Array.isArray(data.quiz_questions)||!data.quiz_questions.length||data.quiz_questions.length>200)return 'Invalid quiz answer request';
    if(data.access_code!==undefined&&data.access_code!==null&&typeof data.access_code!=='string')return 'Invalid access code';
    for(const q of data.quiz_questions){if(!keysOnly(q,['id','answer'])||!/^\d+$/.test(String(q.id))||!validAnswer(q.answer))return 'Invalid quiz answer payload';}
    return null;
  }
  if(quizComplete.test(path)){
    if(!keysOnly(data,['attempt','validation_token','access_code'])||!Number.isSafeInteger(data.attempt)||data.attempt<1||typeof data.validation_token!=='string'||!data.validation_token||data.validation_token.length>512)return 'Invalid quiz completion request';
    if(data.access_code!==undefined&&data.access_code!==null&&typeof data.access_code!=='string')return 'Invalid access code';
    return null;
  }
  return 'Write path not allowed';
}
function fileUpstreamFailure(stage,response,requestId){
  const code=stage==='metadata'?'CANVAS_FILE_METADATA_FAILED':'CANVAS_FILE_CONTENT_FAILED';
  const status=response.status>=400&&response.status<=599?response.status:502;
  // Log only the stage, status and opaque Cloudflare request ID. Never log tokens, URLs or file contents.
  console.warn(JSON.stringify({event:'northstar_canvas_file_failure',stage,upstreamStatus:response.status,requestId:requestId||null}));
  return new Response(JSON.stringify({error:'Canvas rejected the file request',code,stage,upstreamStatus:response.status,requestId:requestId||null}),{
    status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Northstar-Stage':stage,'X-Northstar-Upstream-Status':String(response.status),...(requestId?{'X-Northstar-Request-Id':requestId}:{})}
  });
}
async function downloadCanvasFile(fileId,courseId,authorization,userAgent,requestId){
  const apiUrl=CANVAS_ORIGIN+(courseId?'/api/v1/courses/'+courseId+'/files/'+fileId:'/api/v1/files/'+fileId);
  const metaResponse=await fetch(apiUrl,{headers:{Authorization:authorization,Accept:'application/json','User-Agent':userAgent},redirect:'manual'});
  if(!metaResponse.ok)return fileUpstreamFailure('metadata',metaResponse,requestId);
  let metadata;try{metadata=await metaResponse.json();}catch{return reply('Canvas file metadata was unreadable',502);}
  const raw=metadata.url||metadata.download_url;
  if(typeof raw!=='string'||!raw)return reply('Canvas did not provide a file download URL',404);
  let current;try{current=new URL(raw,CANVAS_ORIGIN);}catch{return reply('Canvas returned an invalid file URL',502);}
  if(current.protocol!=='https:'||current.username||current.password||current.searchParams.has('access_token'))return reply('Canvas file URL did not pass the secure download check',502);
  for(let hop=0;hop<6;hop++){
    const headers={Accept:'application/pdf,application/octet-stream,*/*','User-Agent':userAgent};
    // Forward the Canvas token only when the request is still on the exact configured Canvas origin.
    if(current.origin===CANVAS_ORIGIN)headers.Authorization=authorization;
    const response=await fetch(current.href,{method:'GET',headers,redirect:'manual'});
    if(response.status>=300&&response.status<400){
      const location=response.headers.get('Location');if(!location)return reply('Canvas file redirect did not include a destination',502);
      try{current=new URL(location,current);}catch{return reply('Canvas file redirect destination was invalid',502);}
      if(current.protocol!=='https:'||current.username||current.password||current.searchParams.has('access_token'))return reply('Canvas file redirect failed the secure download check',502);
      continue;
    }
    if(!response.ok)return fileUpstreamFailure('content',response,requestId);
    const responseHeaders={...cors,'Content-Type':response.headers.get('Content-Type')||metadata['content-type']||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','X-Northstar-Stage':'complete',...(requestId?{'X-Northstar-Request-Id':requestId}:{})};
    for(const name of ['Content-Length','Content-Disposition','Content-Range','Accept-Ranges']){const value=response.headers.get(name);if(value)responseHeaders[name]=value;}
    return new Response(response.body,{status:response.status,headers:responseHeaders});
  }
  return reply('Canvas file redirected too many times',502);
}
export default {
  async fetch(request) {
    if(request.headers.get('Origin') !== ALLOWED_ORIGIN) return new Response('Origin not allowed',{status:403});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(!['GET','POST','PUT'].includes(request.method)) return reply('Method not allowed',405);
    const auth=request.headers.get('Authorization')||'';
    if(!/^Bearer \S+$/.test(auth)) return reply('Authorization required',401);
    const rawPath=new URL(request.url).searchParams.get('path')||'';
    let url;try{url=new URL(rawPath,CANVAS_ORIGIN);}catch{return reply('Invalid path',400);}
    if(url.origin!==CANVAS_ORIGIN||url.searchParams.has('access_token')||url.hash)return reply('Path not allowed',403);
    if(request.method!=='GET'&&url.search)return reply('Query parameters are not allowed on writes',403);
    if(request.method==='GET'&&!allowedRead(url.pathname+url.search))return reply('Read path not allowed',403);
    if(request.method==='GET'){
      const courseFileMatch=url.pathname.match(/^\/api\/v1\/courses\/(\d+)\/files\/(\d+)\/download$/);
      if(courseFileMatch){try{return await downloadCanvasFile(courseFileMatch[2],courseFileMatch[1],auth,request.headers.get('User-Agent')||'NORTHSTAR/1.0',request.headers.get('cf-ray')||'');}catch{return reply('Could not download the Canvas file',502);}}
      const fileMatch=url.pathname.match(/^\/api\/v1\/files\/(\d+)\/download$/);
      if(fileMatch){try{return await downloadCanvasFile(fileMatch[1],null,auth,request.headers.get('User-Agent')||'NORTHSTAR/1.0',request.headers.get('cf-ray')||'');}catch{return reply('Could not download the Canvas file',502);}}
    }
    let body;
    if(request.method==='POST'||request.method==='PUT'){
      if(request.method==='POST'&&!isWritePath(url.pathname))return reply('Write path not allowed',405);
      if(request.method==='PUT'&&!isQuizFlagPath(url.pathname))return reply('Write path not allowed',405);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply('JSON required',415);
      const raw=await request.text();if(new TextEncoder().encode(raw).length>200000)return reply('Request too large',413);
      let data;try{data=JSON.parse(raw);}catch{return reply('Invalid JSON',400);}
      const invalid=request.method==='PUT'?(!keysOnly(data,['attempt','validation_token','access_code'])||!Number.isSafeInteger(data.attempt)||data.attempt<1||typeof data.validation_token!=='string'||!data.validation_token||data.validation_token.length>512||(data.access_code!==undefined&&data.access_code!==null&&typeof data.access_code!=='string')?'Invalid quiz flag request':null):validateWrite(url.pathname,data);if(invalid)return reply(invalid,400);
      body=JSON.stringify(data);
    }
    try{
      const upstream=await fetch(url.toString(),{method:request.method,body,headers:{...(body?{'Content-Type':'application/json'}:{}),Authorization:auth,Accept:'application/json','User-Agent':request.headers.get('User-Agent')||'NORTHSTAR-bridge/1.1'},redirect:'manual'});
      if(upstream.status>=300&&upstream.status<400)return reply('Canvas redirected the request; verify your Canvas origin',502);
      return new Response(upstream.body,{status:upstream.status,headers:{...cors,'Content-Type':upstream.headers.get('Content-Type')||'application/json','X-Content-Type-Options':'nosniff'}});
    }catch{return reply('Could not reach Canvas',502);}
  }
};
