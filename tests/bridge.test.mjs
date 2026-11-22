import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
let source=await readFile(new URL('../canvas-bridge/worker.js',import.meta.url),'utf8');
source=source.replace('https://nnps.instructure.com','https://school.instructure.com');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const origin='https://s0ndvyr.github.io';let upstream=[];
globalThis.fetch=async(url,opts)=>{
  upstream.push({url,opts});
  const target=new URL(url);
  if(target.pathname==='/login/session_token')return new Response(JSON.stringify({session_url:'https://school.instructure.com/login?session_token=opaque-browser-session'}),{status:200,headers:{'Content-Type':'application/json'}});
  if(target.pathname==='/api/v1/courses/1/external_tools/sessionless_launch')return new Response(JSON.stringify({id:44,name:'Publisher Assessment',url:'https://publisher.example/lti/launch?state=one-time-state'}),{status:200,headers:{'Content-Type':'application/json'}});
  return new Response(JSON.stringify([{id:1}]),{status:200,headers:{'Content-Type':'application/json'}});
};
const request=(path,opts={})=>new Request('https://bridge.example/?path='+encodeURIComponent(path),{...opts,headers:{Origin:origin,Authorization:'Bearer test-secret','User-Agent':'Mozilla/5.0 (test browser)',...(opts.headers||{})}});
let res=await worker.fetch(request('/api/v1/courses?per_page=100&page=1'));assert.equal(res.status,200);assert.equal(upstream.length,1);assert.equal(upstream[0].url,'https://school.instructure.com/api/v1/courses?per_page=100&page=1');assert.equal(upstream[0].opts.headers.Authorization,'Bearer test-secret');assert.equal(upstream[0].opts.headers['User-Agent'],'Mozilla/5.0 (test browser)');assert(!upstream[0].url.includes('test-secret'));
res=await worker.fetch(request('/api/v1/courses/1/assignments?include[]=submission'));assert.equal(res.status,200);
assert.equal((await worker.fetch(request('/login/session_token?return_to=%2Fcourses%2F1%2Fassignments%2F2'))).status,200,'Canvas temporary authenticated web session route is allowlisted');
assert.equal((await worker.fetch(request('/login/session_token?return_to=https%3A%2F%2Fevil.example%2F'))).status,403,'session return destinations must remain on supported Canvas pages');
assert.equal((await worker.fetch(request('/login/session_token?return_to=%2Fcourses%2F1%2Fassignments%2F2&debug=true'))).status,403,'session-token query parameters are narrowly restricted');
assert.equal((await worker.fetch(request('/api/v1/courses/1/external_tools/sessionless_launch?launch_type=assessment&assignment_id=2'))).status,200,'Canvas assessment-specific LTI launch route is allowlisted');
assert.equal((await worker.fetch(request('/api/v1/courses/1/external_tools/sessionless_launch?launch_type=course&assignment_id=2'))).status,403,'only assignment assessment launches are allowed');
assert.equal((await worker.fetch(request('/api/v1/courses/1/external_tools/sessionless_launch?launch_type=assessment&assignment_id=2&url=https%3A%2F%2Fevil.example'))).status,403,'arbitrary external tool launch parameters are rejected');
assert.equal((await worker.fetch(request('/api/v1/courses/1/assignment_groups'))).status,200);
assert.equal((await worker.fetch(request('/api/v1/courses/1'))).status,200);
for(const p of ['https://evil.example/api/v1/courses','/api/v1/courses?access_token=token','/api/v1/courses/1/assignments/1/submissions'])assert.equal((await worker.fetch(request(p))).status,403);
assert.equal((await worker.fetch(request('/api/v1/courses',{method:'POST'}))).status,405);
assert.equal((await worker.fetch(request('/api/v1/courses',{headers:{Origin:'https://evil.example'}}))).status,403);
assert.equal((await worker.fetch(request('/api/v1/courses',{method:'OPTIONS'}))).status,204);
console.log('PASS: bridge read paths and bearer header, rejects other origins, hosts and arbitrary writes');
const submitPath='/api/v1/courses/1/assignments/2/submissions';
const post=(data,path=submitPath)=>request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
let before=upstream.length;
assert.equal((await worker.fetch(post({submission:{submission_type:'online_text_entry',body:'<p>My work</p>'}}))).status,200);
assert.equal(upstream.at(-1).opts.method,'POST');
assert.deepEqual(JSON.parse(upstream.at(-1).opts.body),{submission:{submission_type:'online_text_entry',body:'<p>My work</p>'}});
assert.equal(upstream.length,before+1);
before=upstream.length;
for(const data of [
  {submission:{submission_type:'online_url',url:'javascript:alert(1)'}},
  {submission:{submission_type:'online_text_entry',body:' '}},
  {submission:{submission_type:'online_text_entry',body:'x',user_id:2}},
  {submission:{submission_type:'online_text_entry',body:'x'},comment:'no'}
]) assert.equal((await worker.fetch(post(data))).status,400);
assert.equal((await worker.fetch(post({submission:{submission_type:'online_url',url:'https://example.com'}},submitPath+'?as_user_id=2'))).status,403);
assert.equal((await worker.fetch(post({},'https://evil.example'+submitPath))).status,403);
assert.equal((await worker.fetch(post({},'/api/v1/courses/1/quizzes/2'))).status,405);
assert.equal((await worker.fetch(request(submitPath,{method:'DELETE'}))).status,405);
assert.equal(upstream.length,before,'invalid writes never reach Canvas');


const uploadInitPath='/api/v1/courses/1/assignments/2/submissions/7/files';
assert.equal((await worker.fetch(request('/api/v1/users/self'))).status,200);
assert.equal((await worker.fetch(post({name:'homework.pdf',size:1024,content_type:'application/pdf'},uploadInitPath))).status,200);
assert.equal((await worker.fetch(post({submission:{submission_type:'online_upload',file_ids:[42]}}))).status,200);
assert.equal((await worker.fetch(post({submission:{submission_type:'online_upload',file_ids:[]}}))).status,400);
assert.equal((await worker.fetch(post({name:'too-big.pdf',size:26000000},uploadInitPath))).status,400);

const quizUploadPath='/api/v1/courses/1/quizzes/2/submissions/self/files';
const upstreamBeforeQuizUpload=upstream.length;
assert.equal((await worker.fetch(post({name:'quiz-answer.pdf'},quizUploadPath))).status,200,'official Classic Quiz file upload initialization is allowlisted');
assert.equal(upstream.at(-1).opts.method,'POST');
assert.equal(upstream.at(-1).url,'https://school.instructure.com'+quizUploadPath);
assert.deepEqual(JSON.parse(upstream.at(-1).opts.body),{name:'quiz-answer.pdf'});
assert.equal(upstream.length,upstreamBeforeQuizUpload+1);
assert.equal((await worker.fetch(post({name:' '},quizUploadPath))).status,400,'empty quiz attachment names are rejected');
assert.equal((await worker.fetch(post({name:'quiz.pdf',url:'https://evil.example'},quizUploadPath))).status,400,'unrecognized quiz upload fields are rejected');

for(const p of ['/api/v1/courses/1/quizzes/2/submissions/8/time','/api/v1/courses/1/quizzes','/api/v1/courses/1/quizzes/2','/api/v1/courses/1/quizzes/2/submission','/api/v1/courses/1/quizzes/2/questions','/api/v1/quiz_submissions/8/questions'])assert.equal((await worker.fetch(request(p))).status,200);
assert.equal((await worker.fetch(post({access_code:'1234'},'/api/v1/courses/1/quizzes/2/submissions'))).status,200);
assert.equal((await worker.fetch(post({attempt:1,validation_token:'v',quiz_questions:[{id:'9',answer:3}]},'/api/v1/quiz_submissions/8/questions'))).status,200);
assert.equal((await worker.fetch(post({attempt:1,validation_token:'v',quiz_questions:[{id:'9',answer:null}]},'/api/v1/quiz_submissions/8/questions'))).status,200,'an unanswered question can be cleared');
const put=(data,path)=>request(path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
assert.equal((await worker.fetch(put({attempt:1,validation_token:'v',access_code:null},'/api/v1/quiz_submissions/8/questions/9/flag'))).status,200,'Canvas review flags use the official PUT flag endpoint');
assert.equal(upstream.at(-1).opts.method,'PUT');
assert.equal((await worker.fetch(put({attempt:1,validation_token:'v',access_code:null},'/api/v1/quiz_submissions/8/questions/9/unflag'))).status,200,'Canvas review flags can be removed through the official endpoint');
assert.equal((await worker.fetch(put({attempt:0,validation_token:'v'},'/api/v1/quiz_submissions/8/questions/9/flag'))).status,400,'flag attempt index must be valid');
assert.equal((await worker.fetch(put({attempt:1,validation_token:'v'},'/api/v1/courses/1/assignments/2/submissions'))).status,405,'PUT remains restricted to quiz flag paths');
assert.equal((await worker.fetch(post({attempt:1,validation_token:'v'},'/api/v1/courses/1/quizzes/2/submissions/8/complete'))).status,200);

for(const p of ['/api/v1/courses/1/discussion_topics','/api/v1/courses/1/discussion_topics/4','/api/v1/courses/1/discussion_topics/4/entries?per_page=50'])assert.equal((await worker.fetch(request(p))).status,200);
assert.equal((await worker.fetch(post({message:'My initial response'},'/api/v1/courses/1/discussion_topics/4/entries'))).status,200);
assert.equal((await worker.fetch(post({message:'My reply'},'/api/v1/courses/1/discussion_topics/4/entries/7/replies'))).status,200);
assert.equal((await worker.fetch(post({message:' '},'/api/v1/courses/1/discussion_topics/4/entries'))).status,400);

for(const [path,data] of [
 ['/api/v1/courses/1/quizzes/2/submissions',{preview:true}],
 ['/api/v1/quiz_submissions/8/questions',{attempt:1,validation_token:'v',quiz_questions:[{id:'9',answer:{bad:{nested:true}}}]}],
 ['/api/v1/courses/1/quizzes/2/submissions/8/complete',{attempt:0,validation_token:'v'}]
])assert.equal((await worker.fetch(post(data,path))).status,400);


assert.equal((await worker.fetch(request('/api/v1/courses/1/assignments/2?include%5B%5D=submission'))).status,200,'single assignment detail is readable');
assert.equal((await worker.fetch(request('/api/v1/courses/1/assignments/2/submissions/7?include%5B%5D=submission_history&include%5B%5D=submission_comments&include%5B%5D=full_rubric_assessment'))).status,200,'the current user submission history and feedback are readable');
assert.equal((await worker.fetch(request('/api/quiz/v1/courses/1/quizzes/12'))).status,200,'New Quiz details are readable');
assert.equal((await worker.fetch(request('/api/quiz/v1/courses/1/quizzes/12/items'))).status,200,'New Quiz items are readable');
assert.equal((await worker.fetch(request('/api/quiz/v1/courses/1/quizzes/12/items',{method:'POST'}))).status,405,'New Quiz writes remain disallowed');
assert.equal((await worker.fetch(request('/api/v1/courses/1/files/42'))).status,200,'course file metadata is readable');
let fileCalls=[];
globalThis.fetch=async(url,opts)=>{
  fileCalls.push({url,opts});
  if(url==='https://school.instructure.com/api/v1/files/123')return new Response(JSON.stringify({url:'https://school.instructure.com/files/123/download'}),{status:200,headers:{'Content-Type':'application/json'}});
  if(url==='https://school.instructure.com/api/v1/courses/1/files/124')return new Response(JSON.stringify({url:'https://school.instructure.com/files/124/download'}),{status:200,headers:{'Content-Type':'application/json'}});
  if(url==='https://school.instructure.com/files/124/download')return new Response(null,{status:302,headers:{Location:'https://cdn.inscloudgate.net/private/file.pdf'}});
  if(url==='https://school.instructure.com/files/123/download')return new Response(null,{status:302,headers:{Location:'https://cdn.inscloudgate.net/private/file.pdf'}});
  if(url==='https://cdn.inscloudgate.net/private/file.pdf'){assert.equal(opts.headers.Authorization,'Bearer test-secret','Canvas bearer token must follow redirects to trusted Instructure file storage');return new Response(new Uint8Array([37,80,68,70]),{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="worksheet.pdf"'}});}
  throw Error('unexpected URL '+url);
};
const fileResponse=await worker.fetch(request('/api/v1/files/123/download'));
assert.equal(fileResponse.status,200);
assert.equal(fileResponse.headers.get('Content-Type'),'application/pdf');
assert.equal(fileResponse.headers.get('Content-Disposition'),'attachment; filename="worksheet.pdf"');
assert.deepEqual([...new Uint8Array(await fileResponse.arrayBuffer())],[37,80,68,70]);
assert.equal(fileCalls.length,3,'file metadata, Canvas download redirect and signed binary request are proxied');
const scopedFileResponse=await worker.fetch(request('/api/v1/courses/1/files/124/download'));
assert.equal(scopedFileResponse.status,200,'course-scoped file download uses the course-scoped Canvas metadata endpoint');
assert(fileCalls.some(x=>x.url==='https://school.instructure.com/api/v1/courses/1/files/124'),'scoped attachment metadata request retains course context');

// A rejected binary download returns actionable, URL-free diagnostics to NORTHSTAR.
globalThis.fetch=async(url,opts)=>{
  if(url==='https://school.instructure.com/api/v1/courses/1/files/124')return new Response(JSON.stringify({url:'https://cdn.inscloudgate.net/private/signed-file?signature=must-not-leak'}),{status:200,headers:{'Content-Type':'application/json'}});
  if(url==='https://cdn.inscloudgate.net/private/signed-file?signature=must-not-leak'){assert.equal(opts.headers.Authorization,'Bearer test-secret','authenticated Canvas file storage receives the Canvas bearer token');return new Response('private upstream error body',{status:406,headers:{'Content-Type':'text/html','Server':'cloudflare','cf-ray':'upstream-ray-406'}});}
  throw Error('unexpected diagnostic URL '+url);
};
const failedFile=await worker.fetch(request('/api/v1/courses/1/files/124/download',{headers:{'cf-ray':'outer-ray-406'}}));
assert.equal(failedFile.status,406);
const failedDetails=await failedFile.json();
assert.equal(failedFile.headers.get('X-Northstar-Worker-Version'),'0.4.4.5 (3)');
assert.match(failedFile.headers.get('Access-Control-Expose-Headers'),/X-Northstar-Worker-Version/);
assert.equal(failedDetails.stage,'content');
assert.equal(failedDetails.upstreamStatus,406);
assert.equal(failedDetails.requestId,'outer-ray-406');
assert.equal(failedDetails.diagnostics.upstreamHost,'cdn.inscloudgate.net');
assert.equal(failedDetails.diagnostics.upstreamRayId,'upstream-ray-406');
assert.equal(failedDetails.diagnostics.courseScoped,true);
assert.equal(failedDetails.diagnostics.redirectCount,0);
assert(!JSON.stringify(failedDetails).includes('signature='));
assert(!JSON.stringify(failedDetails).includes('private upstream error body'));
assert(!JSON.stringify(failedDetails).includes('test-secret'),'diagnostics never include the Canvas bearer token');

// Network failures are stage-specific and never include exception messages or signed URLs.
globalThis.fetch=async()=>{throw Error('network failed for https://storage.example.net/private?signature=do-not-leak');};
const metadataNetwork=await worker.fetch(request('/api/v1/courses/1/files/124/download',{headers:{'cf-ray':'outer-metadata-network'}}));
assert.equal(metadataNetwork.status,502);
const metadataNetworkDetails=await metadataNetwork.json();
assert.equal(metadataNetworkDetails.code,'CANVAS_FILE_METADATA_NETWORK_FAILED');
assert.equal(metadataNetworkDetails.stage,'metadata');
assert.equal(metadataNetworkDetails.diagnostics.failureType,'network');
assert.equal(metadataNetworkDetails.upstreamStatus,null);
assert(!JSON.stringify(metadataNetworkDetails).includes('signature='));
assert(!JSON.stringify(metadataNetworkDetails).includes('test-secret'));

globalThis.fetch=async(url,opts)=>{
  if(url==='https://school.instructure.com/api/v1/courses/1/files/124')return new Response(JSON.stringify({url:'https://storage.example.net/private/signed-file?signature=do-not-leak'}),{status:200,headers:{'Content-Type':'application/json'}});
  throw Error('network failed for '+url);
};
const contentNetwork=await worker.fetch(request('/api/v1/courses/1/files/124/download',{headers:{'cf-ray':'outer-content-network'}}));
const contentNetworkDetails=await contentNetwork.json();
assert.equal(contentNetwork.status,502);
assert.equal(contentNetworkDetails.code,'CANVAS_FILE_CONTENT_NETWORK_FAILED');
assert.equal(contentNetworkDetails.stage,'content');
assert.equal(contentNetworkDetails.diagnostics.upstreamHost,'storage.example.net');
assert.equal(contentNetworkDetails.diagnostics.failureType,'network');
assert(!JSON.stringify(contentNetworkDetails).includes('signature='));

// Redirect errors are categorized without exposing the redirect target URL.
globalThis.fetch=async(url,opts)=>{
  if(url==='https://school.instructure.com/api/v1/courses/1/files/124')return new Response(JSON.stringify({url:'https://school.instructure.com/files/124/download'}),{status:200,headers:{'Content-Type':'application/json'}});
  if(url==='https://school.instructure.com/files/124/download')return new Response(null,{status:302});
  throw Error('unexpected URL '+url);
};
const redirectFailure=await worker.fetch(request('/api/v1/courses/1/files/124/download'));
const redirectDetails=await redirectFailure.json();
assert.equal(redirectFailure.status,502);
assert.equal(redirectDetails.code,'CANVAS_FILE_REDIRECT_LOCATION_MISSING');
assert.equal(redirectDetails.stage,'redirect');
assert.equal(redirectDetails.diagnostics.failureType,'redirect');

console.log('PASS: bridge file diagnostics cover HTTP failures, network failures and unsafe redirects without exposing secrets');
