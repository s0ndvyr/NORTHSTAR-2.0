// Deploy your own Cloudflare Worker. Edit both settings before deployment.
// Only assignment text/URL submissions may write; it never stores tokens or forwards them in URLs.
const ALLOWED_ORIGIN = 'https://s0ndvyr.github.io';
const CANVAS_ORIGIN = 'https://nnps.instructure.com';
const cors = {'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Allow-Headers':'Authorization, Accept, Content-Type', 'Vary':'Origin', 'Cache-Control':'no-store'};
function reply(message,status){return new Response(JSON.stringify({error:message}),{status,headers:{...cors,'Content-Type':'application/json'}});}
export default {
  async fetch(request) {
    if(request.headers.get('Origin') !== ALLOWED_ORIGIN) return new Response('Origin not allowed',{status:403});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(!['GET','POST'].includes(request.method)) return reply('Method not allowed',405);
    const auth=request.headers.get('Authorization')||'';
    if(!/^Bearer \S+$/.test(auth)) return reply('Authorization required',401);
    const path=new URL(request.url).searchParams.get('path')||'';
    let url; try { url=new URL(path, CANVAS_ORIGIN); } catch { return reply('Invalid path',400); }
    const submissionPath=/^\/api\/v1\/courses\/\d+\/assignments\/\d+\/submissions$/.test(url.pathname);
    if(request.method==='POST' && !submissionPath) return reply('Only assignment submissions may write',405);
    if(url.origin!==CANVAS_ORIGIN || !(request.method==='POST' ? submissionPath : /^\/api\/v1\/courses(?:\/\d+(?:\/assignments|\/assignment_groups)?)?$/.test(url.pathname)) || (request.method==='POST' && url.search) || url.searchParams.has('access_token')) return reply('Path not allowed',403);
    let body;
    if(request.method==='POST') {
      if(!request.headers.get('Content-Type')?.startsWith('application/json')) return reply('JSON required',415);
      if(Number(request.headers.get('Content-Length'))>200000) return reply('Submission too large',413);
      const raw=await request.text();
      if(new TextEncoder().encode(raw).length>200000) return reply('Submission too large',413);
      let data; try{data=JSON.parse(raw);}catch{return reply('Invalid JSON',400);}
      const sub=data?.submission;
      if(!sub || Object.keys(data).some(k=>k!=='submission')) return reply('Invalid submission',400);
      const type=sub.submission_type, field=type==='online_text_entry'?'body':type==='online_url'?'url':null;
      if(!field || Object.keys(sub).some(k=>!['submission_type',field].includes(k)) || typeof sub[field]!=='string' || !sub[field].trim()) return reply('Only nonempty text or URL submissions supported',400);
      if(field==='url'){try{if(!['https:','http:'].includes(new URL(sub.url).protocol)) throw Error();}catch{return reply('Invalid submission URL',400);}}
      body=JSON.stringify({submission:{submission_type:type,[field]:sub[field]}});
    }
    // Prevent browser cookies, redirects, or arbitrary headers from reaching Canvas.
    try {
      const upstream=await fetch(url.toString(),{method:request.method,body,headers:{...(body?{'Content-Type':'application/json'}:{}),Authorization:auth,Accept:'application/json','User-Agent':request.headers.get('User-Agent')||'NORTHSTAR-bridge/1.0'},redirect:'manual'});
      if(upstream.status>=300&&upstream.status<400) return reply('Canvas redirected the request; verify your Canvas origin',502);
      return new Response(upstream.body,{status:upstream.status,headers:{...cors,'Content-Type':upstream.headers.get('Content-Type')||'application/json','X-Content-Type-Options':'nosniff'}});
    }catch{return reply('Could not reach Canvas',502);}
  }
};
