// NORTHSTAR Canvas bridge — narrowly allowlisted student reads and submissions.
const ALLOWED_ORIGIN = 'https://s0ndvyr.github.io';
const CANVAS_ORIGIN = 'https://nnps.instructure.com';
const cors = {'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Allow-Headers':'Authorization, Accept, Content-Type', 'Vary':'Origin', 'Cache-Control':'no-store'};
function reply(message,status){return new Response(JSON.stringify({error:message}),{status,headers:{...cors,'Content-Type':'application/json'}});}
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keysOnly=(o,keys)=>isObject(o)&&Object.keys(o).every(k=>keys.includes(k));
function validAnswer(v){
  if(typeof v==='string')return v.length<=16000;
  if(typeof v==='number')return Number.isFinite(v);
  if(typeof v==='boolean')return true;
  if(Array.isArray(v))return v.length<=100&&v.every(x=>typeof x==='string'||(typeof x==='number'&&Number.isFinite(x))||isObject(x)&&keysOnly(x,['answer_id','match_id'])&&Number.isSafeInteger(Number(x.answer_id))&&Number.isSafeInteger(Number(x.match_id)));
  if(isObject(v))return Object.keys(v).length<=30&&Object.values(v).every(x=>typeof x==='string'||(typeof x==='number'&&Number.isFinite(x)));
  return false;
}
function allowedRead(path){
  return /^\/api\/v1\/courses(?:\?[^#]*)?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/(?:assignments|assignment_groups|quizzes)(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/courses\/\d+\/quizzes\/\d+(?:\/(?:questions|submission))?(?:\?(?:[^#]*))?$/.test(path) ||
    /^\/api\/v1\/quiz_submissions\/\d+\/questions(?:\?(?:[^#]*))?$/.test(path);
}
function isWritePath(path){return /^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions$/.test(path)||/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions$/.test(path)||/^\/api\/v1\/quiz_submissions\/\d+\/questions$/.test(path)||/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions\/\d+\/complete$/.test(path);}
  if(!isObject(data))return 'JSON object required';
  const assignment=/^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions$/;
  const quizStart=/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions$/;
  const quizAnswers=/^\/api\/v1\/quiz_submissions\/\d+\/questions$/;
  const quizComplete=/^\/api\/v1\/courses\/\d+\/quizzes\/\d+\/submissions\/\d+\/complete$/;
  if(assignment.test(path)){
    const sub=data.submission;
    if(!keysOnly(data,['submission'])||!isObject(sub))return 'Invalid submission';
    const type=sub.submission_type,field=type==='online_text_entry'?'body':type==='online_url'?'url':null;
    if(!field||!keysOnly(sub,['submission_type',field])||typeof sub[field]!=='string'||!sub[field].trim())return 'Only nonempty text or URL submissions are supported by this bridge';
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
export default {
  async fetch(request) {
    if(request.headers.get('Origin') !== ALLOWED_ORIGIN) return new Response('Origin not allowed',{status:403});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(!['GET','POST'].includes(request.method)) return reply('Method not allowed',405);
    const auth=request.headers.get('Authorization')||'';
    if(!/^Bearer \S+$/.test(auth)) return reply('Authorization required',401);
    const rawPath=new URL(request.url).searchParams.get('path')||'';
    let url;try{url=new URL(rawPath,CANVAS_ORIGIN);}catch{return reply('Invalid path',400);}
    if(url.origin!==CANVAS_ORIGIN||url.searchParams.has('access_token')||url.hash)return reply('Path not allowed',403);
    if(request.method==='GET'&&!allowedRead(url.pathname+url.search))return reply('Read path not allowed',403);
    let body;
    if(request.method==='POST'){
      if(!isWritePath(url.pathname))return reply('Write path not allowed',405);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply('JSON required',415);
      const raw=await request.text();if(new TextEncoder().encode(raw).length>200000)return reply('Request too large',413);
      let data;try{data=JSON.parse(raw);}catch{return reply('Invalid JSON',400);}
      const invalid=validateWrite(url.pathname,data);if(invalid)return reply(invalid,400);
      body=JSON.stringify(data);
    }
    try{
      const upstream=await fetch(url.toString(),{method:request.method,body,headers:{...(body?{'Content-Type':'application/json'}:{}),Authorization:auth,Accept:'application/json','User-Agent':request.headers.get('User-Agent')||'NORTHSTAR-bridge/1.1'},redirect:'manual'});
      if(upstream.status>=300&&upstream.status<400)return reply('Canvas redirected the request; verify your Canvas origin',502);
      return new Response(upstream.body,{status:upstream.status,headers:{...cors,'Content-Type':upstream.headers.get('Content-Type')||'application/json','X-Content-Type-Options':'nosniff'}});
    }catch{return reply('Could not reach Canvas',502);}
  }
};
