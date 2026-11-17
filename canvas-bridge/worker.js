// Deploy your own Cloudflare Worker. Edit both settings before deployment.
// This is a read-only bridge: it never stores tokens or forwards them in URLs.
const ALLOWED_ORIGIN = 'https://s0ndvyr.github.io';
const CANVAS_ORIGIN = 'https://YOUR-SCHOOL.instructure.com';
const cors = {'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods':'GET, OPTIONS', 'Access-Control-Allow-Headers':'Authorization, Accept', 'Vary':'Origin', 'Cache-Control':'no-store'};
function reply(message,status){return new Response(JSON.stringify({error:message}),{status,headers:{...cors,'Content-Type':'application/json'}});}
export default {
  async fetch(request) {
    if(request.headers.get('Origin') !== ALLOWED_ORIGIN) return new Response('Origin not allowed',{status:403});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(request.method!=='GET') return reply('Only GET is allowed',405);
    const auth=request.headers.get('Authorization')||'';
    if(!/^Bearer \S+$/.test(auth)) return reply('Authorization required',401);
    const path=new URL(request.url).searchParams.get('path')||'';
    let url; try { url=new URL(path, CANVAS_ORIGIN); } catch { return reply('Invalid path',400); }
    if(url.origin!==CANVAS_ORIGIN || !/^\/api\/v1\/courses(?:\/\d+(?:\/assignments|\/assignment_groups)?)?$/.test(url.pathname) || url.searchParams.has('access_token')) return reply('Path not allowed',403);
    // Prevent browser cookies, redirects, or arbitrary headers from reaching Canvas.
    try {
      const upstream=await fetch(url.toString(),{method:'GET',headers:{Authorization:auth,Accept:'application/json','User-Agent':request.headers.get('User-Agent')||'NORTHSTAR-bridge/1.0'},redirect:'manual'});
      if(upstream.status>=300&&upstream.status<400) return reply('Canvas redirected the request; verify your Canvas origin',502);
      return new Response(upstream.body,{status:upstream.status,headers:{...cors,'Content-Type':upstream.headers.get('Content-Type')||'application/json','X-Content-Type-Options':'nosniff'}});
    }catch{return reply('Could not reach Canvas',502);}
  }
};
