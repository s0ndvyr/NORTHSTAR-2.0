// NORTHSTAR Canvas bridge — narrowly allowlisted student reads and submissions.
// Build marker: redeploy after deployment-workflow credential setup; behavior is unchanged.
const ALLOWED_ORIGIN = 'https://s0ndvyr.github.io';
const CANVAS_ORIGIN = 'https://nnps.instructure.com';
const WORKER_BUILD = '0.4.17 (4.4.7.6)';
const cors = {'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers':'Authorization, Accept, Content-Type', 'Access-Control-Expose-Headers':'Content-Type, Content-Length, Content-Disposition, Content-Range, Accept-Ranges, X-Northstar-Stage, X-Northstar-Upstream-Status, X-Northstar-Request-Id, X-Northstar-Failure, X-Northstar-Worker-Version', 'X-Northstar-Worker-Version':WORKER_BUILD, 'Vary':'Origin', 'Cache-Control':'no-store'};
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
// Canvas file downloads begin on the authenticated school origin and may then
// redirect to signed Instructure storage URLs. The Canvas bearer token belongs on
// the school-origin request only: never forward it to a different origin, even
// when that origin is operated by Instructure. Cross-origin storage URLs carry
// their own short-lived authorization in the URL returned by Canvas.
const TRUSTED_CANVAS_FILE_HOST_SUFFIXES=['.instructure.com','.canvas-user-content.com','.inscloudgate.net'];
function isTrustedCanvasFileHost(hostname){
  const host=String(hostname||'').toLowerCase();
  return host===new URL(CANVAS_ORIGIN).hostname||TRUSTED_CANVAS_FILE_HOST_SUFFIXES.some(suffix=>host.endsWith(suffix));
}
function fileDiagnosticContext(stage,response,requestId,context){
  const details=context||{};
  const headers=response?.headers;
  return {
    stage,
    upstreamStatus:response?.status??null,
    upstreamHost:details.upstreamHost||'',
    upstreamContentType:headers?.get('Content-Type')||'',
    upstreamServer:headers?.get('Server')||'',
    upstreamRayId:headers?.get('cf-ray')||'',
    redirectCount:Number(details.redirectCount)||0,
    redirectHosts:Array.isArray(details.redirectHosts)?details.redirectHosts.slice(0,6):[],
    courseScoped:!!details.courseScoped,
    failureType:details.failureType||'http'
  };
}
function fileDiagnosticFailure(stage,code,status,message,requestId,context,response){
  const diagnostics=fileDiagnosticContext(stage,response||null,requestId,{...(context||{}),failureType:context?.failureType||'http'});
  // Only safe metadata is logged: never bearer tokens, signed URLs, query strings, response bodies or file contents.
  console.warn(JSON.stringify({event:'northstar_canvas_file_failure',...diagnostics,requestId:requestId||null,code}));
  const headers={...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Northstar-Stage':stage,'X-Northstar-Failure':diagnostics.failureType,...(diagnostics.upstreamStatus!==null?{'X-Northstar-Upstream-Status':String(diagnostics.upstreamStatus)}:{}),...(requestId?{'X-Northstar-Request-Id':requestId}:{})};
  return new Response(JSON.stringify({error:message,code,stage,upstreamStatus:diagnostics.upstreamStatus,requestId:requestId||null,diagnostics}),{status,headers});
}
function fileUpstreamFailure(stage,response,requestId,context){
  const code=stage==='metadata'?'CANVAS_FILE_METADATA_FAILED':'CANVAS_FILE_CONTENT_FAILED';
  const status=response.status>=400&&response.status<=599?response.status:502;
  return fileDiagnosticFailure(stage,code,status,'Canvas rejected the file request',requestId,context,response);
}
function fileTransportFailure(stage,requestId,context){
  const code=stage==='metadata'?'CANVAS_FILE_METADATA_NETWORK_FAILED':'CANVAS_FILE_CONTENT_NETWORK_FAILED';
  const message=stage==='metadata'?'Could not reach Canvas while retrieving attachment metadata':'Could not reach the file host while downloading the attachment';
  return fileDiagnosticFailure(stage,code,502,message,requestId,{...(context||{}),failureType:'network'});
}
function fileRedirectFailure(code,message,requestId,context){
  return fileDiagnosticFailure('redirect',code,502,message,requestId,{...(context||{}),failureType:'redirect'});
}
async function downloadCanvasFile(fileId,courseId,authorization,userAgent,requestId){
  const apiUrl=CANVAS_ORIGIN+(courseId?'/api/v1/courses/'+courseId+'/files/'+fileId:'/api/v1/files/'+fileId);
  let metaResponse;
  try{metaResponse=await fetch(apiUrl,{headers:{Authorization:authorization,Accept:'application/json','User-Agent':userAgent},redirect:'manual'});}
  catch{return fileTransportFailure('metadata',requestId,{upstreamHost:new URL(apiUrl).hostname,courseScoped:!!courseId});}
  if(!metaResponse.ok)return fileUpstreamFailure('metadata',metaResponse,requestId,{upstreamHost:new URL(apiUrl).hostname,courseScoped:!!courseId});
  let metadata;try{metadata=await metaResponse.json();}catch{return fileDiagnosticFailure('metadata','CANVAS_FILE_METADATA_INVALID',502,'Canvas file metadata was unreadable',requestId,{upstreamHost:new URL(apiUrl).hostname,courseScoped:!!courseId},metaResponse);}
  const raw=metadata.url||metadata.download_url;
  if(typeof raw!=='string'||!raw)return fileDiagnosticFailure('metadata','CANVAS_FILE_METADATA_NO_DOWNLOAD_URL',502,'Canvas did not provide a file download URL',requestId,{upstreamHost:new URL(apiUrl).hostname,courseScoped:!!courseId},metaResponse);
  let current;try{current=new URL(raw,CANVAS_ORIGIN);}catch{return fileRedirectFailure('CANVAS_FILE_URL_INVALID','Canvas returned an invalid file destination',requestId,{upstreamHost:new URL(apiUrl).hostname,courseScoped:!!courseId});}
  if(current.protocol!=='https:'||current.username||current.password||current.port||current.searchParams.has('access_token')||!isTrustedCanvasFileHost(current.hostname))return fileRedirectFailure('CANVAS_FILE_URL_UNSAFE','Canvas file destination failed the HTTPS host security check',requestId,{upstreamHost:current.hostname,courseScoped:!!courseId});
  const redirectHosts=[];
  let refererOrigin='';
  for(let hop=0;hop<6;hop++){
    const headers={Accept:'application/pdf,application/octet-stream,*/*'};
    // Authenticate the Canvas download endpoint only. Signed cross-origin
    // storage redirects must not receive the student's Canvas bearer token.
    if(current.origin===CANVAS_ORIGIN)headers.Authorization=authorization;
    // Preserve the browser-like origin-only referrer across cross-origin hops;
    // never forward a path, query string, signed URL, or Canvas credential.
    if(refererOrigin)headers.Referer=refererOrigin+'/';
    let response;
    try{response=await fetch(current.href,{method:'GET',headers,redirect:'manual'});}
    catch{return fileTransportFailure('content',requestId,{upstreamHost:current.hostname,redirectCount:redirectHosts.length,redirectHosts,courseScoped:!!courseId});}
    if(response.status>=300&&response.status<400){
      if(redirectHosts.length<6)redirectHosts.push(current.hostname);
      const location=response.headers.get('Location');if(!location)return fileRedirectFailure('CANVAS_FILE_REDIRECT_LOCATION_MISSING','The file host returned a redirect without a destination',requestId,{upstreamHost:current.hostname,redirectCount:redirectHosts.length,redirectHosts,courseScoped:!!courseId});
      const previous=current;
      try{current=new URL(location,current);}catch{return fileRedirectFailure('CANVAS_FILE_REDIRECT_DESTINATION_INVALID','The file host returned an invalid redirect destination',requestId,{upstreamHost:previous.hostname,redirectCount:redirectHosts.length,redirectHosts,courseScoped:!!courseId});}
      if(current.protocol!=='https:'||current.username||current.password||current.port||current.searchParams.has('access_token')||!isTrustedCanvasFileHost(current.hostname))return fileRedirectFailure('CANVAS_FILE_REDIRECT_UNSAFE','The file redirect destination failed the HTTPS host security check',requestId,{upstreamHost:previous.hostname,redirectCount:redirectHosts.length,redirectHosts,courseScoped:!!courseId});
      if(previous.origin!==current.origin)refererOrigin=previous.origin;
      continue;
    }
    if(!response.ok)return fileUpstreamFailure('content',response,requestId,{upstreamHost:current.hostname,redirectCount:redirectHosts.length,redirectHosts,courseScoped:!!courseId});
    const responseHeaders={...cors,'Content-Type':response.headers.get('Content-Type')||metadata['content-type']||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','X-Northstar-Stage':'complete',...(requestId?{'X-Northstar-Request-Id':requestId}:{})};
    for(const name of ['Content-Length','Content-Disposition','Content-Range','Accept-Ranges']){const value=response.headers.get(name);if(value)responseHeaders[name]=value;}
    return new Response(response.body,{status:response.status,headers:responseHeaders});
  }
  return fileRedirectFailure('CANVAS_FILE_REDIRECT_LIMIT','The file host redirected too many times',requestId,{upstreamHost:current.hostname,redirectCount:redirectHosts.length,redirectHosts,courseScoped:!!courseId});
}
async function uploadCanvasFile(request,requestUrl,authorization){
  const kind=requestUrl.searchParams.get('kind')||'',courseId=requestUrl.searchParams.get('course_id')||'',resourceId=requestUrl.searchParams.get('resource_id')||'';
  const validId=value=>/^\d+$/.test(value)&&Number(value)>0&&Number.isSafeInteger(Number(value));
  if(!['assignment','quiz'].includes(kind)||!validId(courseId)||!validId(resourceId))return reply('Invalid Canvas upload destination',400);
  if(!/^multipart\/form-data\s*;/i.test(request.headers.get('Content-Type')||''))return reply('Multipart file upload required',415);
  let incoming;try{incoming=await request.formData();}catch{return reply('The selected file could not be read',400);}
  const keys=[...incoming.keys()],file=incoming.get('file');
  if(keys.length!==1||keys[0]!=='file'||incoming.getAll('file').length!==1)return reply('Upload exactly one file',400);
  if(!file||typeof file.arrayBuffer!=='function'||typeof file.name!=='string'||!file.name.trim()||!Number.isSafeInteger(file.size)||file.size<1||file.size>25000000)return reply('Choose a non-empty file under 25 MB',400);
  const initPath=kind==='assignment'?'/api/v1/courses/'+courseId+'/assignments/'+resourceId+'/submissions/self/files':'/api/v1/courses/'+courseId+'/quizzes/'+resourceId+'/submissions/self/files';
  const initBody=kind==='assignment'?{name:file.name,size:file.size,content_type:file.type||'application/octet-stream'}:{name:file.name};
  let initResponse;try{initResponse=await fetch(CANVAS_ORIGIN+initPath,{method:'POST',headers:{Authorization:authorization,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(initBody),redirect:'manual'});}catch{return reply('Could not reach Canvas to initialize the file upload',502);}
  if(!initResponse.ok)return reply('Canvas rejected file upload initialization (HTTP '+initResponse.status+')',502);
  let init;try{init=await initResponse.json();}catch{return reply('Canvas returned an unreadable file upload request',502);}
  const upload=Array.isArray(init.attachments)?init.attachments[0]:init;
  if(!upload||typeof upload.upload_url!=='string'||!upload.upload_url||!isObject(upload.upload_params))return reply('Canvas did not return a valid signed upload request',502);
  let uploadUrl;try{uploadUrl=new URL(upload.upload_url);}catch{return reply('Canvas returned an invalid signed upload destination',502);}
  if(uploadUrl.protocol!=='https:'||uploadUrl.username||uploadUrl.password||uploadUrl.searchParams.has('access_token'))return reply('Canvas signed upload destination failed security validation',502);
  const signedForm=new FormData();
  for(const [key,value] of Object.entries(upload.upload_params)){if(!key||!['string','number','boolean'].includes(typeof value))return reply('Canvas returned unsupported signed upload parameters',502);signedForm.append(key,String(value));}
  signedForm.append('file',file,file.name);
  let storageResponse;try{storageResponse=await fetch(uploadUrl.href,{method:'POST',body:signedForm,redirect:'manual'});}catch{return reply('The signed file transfer could not be completed; no assignment submission was sent',502);}
  const location=storageResponse.headers.get('Location');
  if(!location)return reply('Canvas storage did not return the finalization location required to complete the upload (HTTP '+storageResponse.status+')',502);
  if(!(storageResponse.status>=300&&storageResponse.status<400)&&!storageResponse.ok)return reply('Canvas storage rejected the file transfer (HTTP '+storageResponse.status+')',502);
  let finalizeUrl;try{finalizeUrl=new URL(location,uploadUrl);}catch{return reply('Canvas storage returned an invalid finalization location',502);}
  if(finalizeUrl.origin!==CANVAS_ORIGIN||!/^\/api\/v1\/files\/\d+\/create_success$/.test(finalizeUrl.pathname)||finalizeUrl.searchParams.has('access_token')||finalizeUrl.hash)return reply('Canvas file finalization destination failed security validation',502);
  let finalResponse;try{finalResponse=await fetch(finalizeUrl.href,{method:'GET',headers:{Authorization:authorization,Accept:'application/json'},redirect:'manual'});}catch{return reply('Canvas could not finalize the uploaded file',502);}
  if(!finalResponse.ok||finalResponse.status>=300&&finalResponse.status<400)return reply('Canvas did not confirm file finalization (HTTP '+finalResponse.status+')',502);
  let result;try{result=await finalResponse.json();}catch{return reply('Canvas file finalization response was unreadable',502);}
  if(!result||!Number.isSafeInteger(Number(result.id))||Number(result.id)<1)return reply('Canvas did not return a valid finalized file ID',502);
  return new Response(JSON.stringify(result),{status:200,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export default {
  async fetch(request) {
    if(request.headers.get('Origin') !== ALLOWED_ORIGIN) return new Response('Origin not allowed',{status:403});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(!['GET','POST','PUT'].includes(request.method)) return reply('Method not allowed',405);
    const auth=request.headers.get('Authorization')||'';
    if(!/^Bearer \S+$/.test(auth)) return reply('Authorization required',401);
    const requestUrl=new URL(request.url),action=requestUrl.searchParams.get('action');
    if(action!==null){
      const expected=['action','kind','course_id','resource_id'];
      if(action!=='upload-file'||requestUrl.searchParams.size!==expected.length||expected.some(key=>requestUrl.searchParams.getAll(key).length!==1)||[...requestUrl.searchParams.keys()].some(key=>!expected.includes(key)))return reply('Upload action parameters are not allowed',403);
      if(request.method!=='POST')return reply('Method not allowed',405);
      return uploadCanvasFile(request,requestUrl,auth);
    }
    const rawPath=requestUrl.searchParams.get('path')||'';
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
