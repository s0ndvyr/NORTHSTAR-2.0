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

for(const p of ['/api/v1/courses/1/discussion_topics','/api/v1/courses/1/discussion_topics/4','/api/v1/courses/1/discussion_topics/4/entries?per_page=50','/api/v1/courses/1/discussion_topics/4/entry_list?ids%5B%5D=7','/api/v1/courses/1/discussion_topics/4/entries/7/replies?per_page=50&page=1'])assert.equal((await worker.fetch(request(p))).status,200);
assert.equal((await worker.fetch(request('/api/v1/courses/1/discussion_topics/4/entry_list?ids%5B%5D=7&foo=bar'))).status,403,'discussion entry lookup accepts only bounded IDs');
assert.equal((await worker.fetch(request('/api/v1/courses/1/discussion_topics/4/entry_list?ids%5B%5D=abc'))).status,403,'discussion entry lookup rejects non-numeric IDs');
assert.equal((await worker.fetch(request('/api/v1/courses/1/discussion_topics/4/entries/7/replies?per_page=1000'))).status,403,'discussion reply pagination is capped at 100 entries');
assert.equal((await worker.fetch(request('/api/v1/courses/1/discussion_topics/4/entries/7/replies?sort=oldest'))).status,403,'discussion reply reads do not accept unrecognized query parameters');
assert.equal((await worker.fetch(post({message:'My initial response'},'/api/v1/courses/1/discussion_topics/4/entries'))).status,200);
assert.equal((await worker.fetch(post({message:'My reply'},'/api/v1/courses/1/discussion_topics/4/entries/7/replies'))).status,200);
assert.equal((await worker.fetch(post({message:' '},'/api/v1/courses/1/discussion_topics/4/entries'))).status,400);
const editEntryPath='/api/v1/courses/1/discussion_topics/4/entries/7';
const edited=await worker.fetch(put({message:'Updated by the original author'},editEntryPath));
assert.equal(edited.status,200,'the bridge permits the official Canvas edit endpoint for one exact discussion entry');
assert.equal(upstream.at(-1).opts.method,'PUT');
assert.equal(upstream.at(-1).url,'https://school.instructure.com'+editEntryPath);
assert.deepEqual(JSON.parse(upstream.at(-1).opts.body),{message:'Updated by the original author'});
assert.equal((await worker.fetch(put({message:'Edited',user_id:999},editEntryPath))).status,400,'discussion edits accept only the message field; Canvas verifies authorship');
assert.equal((await worker.fetch(put({attempt:1,validation_token:'v'},editEntryPath))).status,400,'quiz flag payloads cannot be sent to discussion routes');
assert.equal((await worker.fetch(put({message:'edit'},'/api/v1/courses/1/discussion_topics/4/entries/7/replies'))).status,405,'discussion reply edit paths are not confused with entry edits');
assert.equal((await worker.fetch(put({message:'edit'},'/api/v1/courses/1/assignments/2/submissions'))).status,405,'other Worker write routes remain restricted');
assert.equal(edited.headers.get('X-Northstar-Worker-Version'),'0.4.22 (4.4.8.2)');

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
// The Worker authenticates Canvas's public_url API request, but never fetches
// the returned storage URL. The browser owns native navigation and PDF bytes.
const previewCalls=[];
const previewStorageHost='inst-fs-iad-prod.inscloudgate.net';
globalThis.fetch=async(url,opts)=>{
  previewCalls.push({url,opts});
  const target=new URL(url);
  if(target.pathname==='/api/v1/courses/1/files/124')return new Response(JSON.stringify({
    id:124,display_name:'ionic nomenclature problem set 2026.pdf',size:34567,
    url:'https://school.instructure.com/files/124/download'
  }),{status:200,headers:{'Content-Type':'application/json'}});
  if(target.pathname==='/api/v1/files/124/public_url'){
    assert.equal(opts.headers.Authorization,'Bearer test-secret','the public-preview URL is generated through authenticated Canvas API access');
    assert.equal(opts.headers['User-Agent'],'Mozilla/5.0 (test browser)','the Canvas API request retains the browser User-Agent');
    return new Response(JSON.stringify({public_url:'https://'+previewStorageHost+'/inline/61162022?signature=short-lived'}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  if(target.hostname===previewStorageHost)throw Error('The private Worker must never fetch Canvas storage bytes.');
  throw Error('Unexpected preview API URL '+target.href);
};
const previewResponse=await worker.fetch(request('/api/v1/files/124/public_url'));
assert.equal(previewResponse.status,200);
assert.equal(previewResponse.headers.get('Content-Type'),'application/json');
const previewData=await previewResponse.json();
assert.equal(new URL(previewData.public_url).hostname,previewStorageHost);
assert.equal(previewCalls.length,1,'the Worker only calls the authenticated Canvas API');
assert.equal(previewCalls[0].opts.headers.Authorization,'Bearer test-secret');
assert.equal((await worker.fetch(request('/api/v1/courses/1/files/124'))).status,200,'course file metadata remains readable');
assert.equal((await worker.fetch(request('/api/v1/files/124/download'))).status,403,'legacy server-side file downloads are no longer exposed');
assert.equal((await worker.fetch(request('/api/v1/courses/1/files/124/download'))).status,403,'course-scoped server-side file downloads are no longer exposed');
assert.equal((await worker.fetch(request('/api/v1/files/124/public_url?access_token=secret'))).status,403,'public-preview requests cannot smuggle credentials in the query string');
console.log('PASS: Canvas preview URL is authenticated and proxied without any Worker-to-storage fetch');

// Full Canvas signed upload: storage never receives the bearer token, and the
// authenticated Canvas create_success GET is required before a file ID is returned.
const uploadActionRequest=(kind,resourceId,file)=>{
  const form=new FormData();form.append('file',file,file.name);
  return new Request('https://bridge.example/?action=upload-file&kind='+kind+'&course_id=1&resource_id='+resourceId,{
    method:'POST',headers:{Origin:origin,Authorization:'Bearer test-secret','User-Agent':'NORTHSTAR upload test'},body:form
  });
};
const uploadSequence=[];
globalThis.fetch=async(url,opts)=>{
  const target=new URL(url);uploadSequence.push({url:target.href,opts});
  if(target.origin==='https://school.instructure.com'&&target.pathname==='/api/v1/courses/1/assignments/2/submissions/self/files'){
    assert.equal(opts.method,'POST');assert.equal(opts.headers.Authorization,'Bearer test-secret');
    const body=JSON.parse(opts.body);assert.equal(body.name,'annotated.pdf');assert.equal(body.size,12);assert.equal(body.content_type,'application/pdf');
    return new Response(JSON.stringify({upload_url:'https://northstar-test-bucket.s3.us-east-1.amazonaws.com/signed',upload_params:{key:'opaque-key',policy:'opaque-policy'}}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  if(target.origin==='https://northstar-test-bucket.s3.us-east-1.amazonaws.com'){
    assert.equal(opts.method,'POST');assert.equal(opts.redirect,'manual');assert.equal(opts.headers?.Authorization,undefined,'Canvas token is never sent to signed storage');
    assert.deepEqual([...opts.body.keys()],['key','policy','file']);assert.equal(opts.body.get('file').name,'annotated.pdf');
    return new Response(null,{status:302,headers:{Location:'https://school.instructure.com/api/v1/files/501/create_success?uuid=opaque-finalize-token'}});
  }
  if(target.origin==='https://school.instructure.com'&&target.pathname==='/api/v1/files/501/create_success'){
    assert.equal(opts.method,'GET');assert.equal(opts.headers.Authorization,'Bearer test-secret');assert.equal(opts.redirect,'manual');
    return new Response(JSON.stringify({id:501,display_name:'annotated.pdf','content-type':'application/pdf',size:12}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  throw Error('Unexpected upload request '+target.href);
};
const annotatedFile=new File(['123456789012'],'annotated.pdf',{type:'application/pdf'});
let finalized=await worker.fetch(uploadActionRequest('assignment',2,annotatedFile));
assert.equal(finalized.status,200,'assignment upload completes all three Canvas upload steps');
let finalizedFile=await finalized.json();assert.equal(finalizedFile.id,501);assert.equal(finalizedFile.display_name,'annotated.pdf');
assert.deepEqual(uploadSequence.map(call=>new URL(call.url).pathname),['/api/v1/courses/1/assignments/2/submissions/self/files','/signed','/api/v1/files/501/create_success']);
assert.equal(uploadSequence[1].opts.headers?.Authorization,undefined);assert.equal(uploadSequence[2].opts.headers.Authorization,'Bearer test-secret');

// Canvas installations may return 201 Created with Location instead of a 3xx.
const quizSequence=[];
globalThis.fetch=async(url,opts)=>{
  const target=new URL(url);quizSequence.push({url:target.href,opts});
  if(target.pathname==='/api/v1/courses/1/quizzes/3/submissions/self/files'){
    assert.equal(opts.headers.Authorization,'Bearer test-secret');assert.deepEqual(JSON.parse(opts.body),{name:'quiz-answer.pdf'});
    return new Response(JSON.stringify({upload_url:'https://northstar-test-bucket.s3.us-east-1.amazonaws.com/quiz',upload_params:{key:'quiz-key'}}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  if(target.origin==='https://northstar-test-bucket.s3.us-east-1.amazonaws.com'){
    assert.equal(opts.headers?.Authorization,undefined);assert.deepEqual([...opts.body.keys()],['key','file']);
    return new Response(null,{status:201,headers:{Location:'https://school.instructure.com/api/v1/files/502/create_success?uuid=opaque'}});
  }
  if(target.pathname==='/api/v1/files/502/create_success'){
    assert.equal(opts.headers.Authorization,'Bearer test-secret');
    return new Response(JSON.stringify({id:502,display_name:'quiz-answer.pdf'}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  throw Error('Unexpected quiz upload request '+target.href);
};
const quizUploadFile=new File(['quiz-answer'],'quiz-answer.pdf',{type:'application/pdf'});
finalized=await worker.fetch(uploadActionRequest('quiz',3,quizUploadFile));
assert.equal(finalized.status,200);assert.equal((await finalized.json()).id,502);assert.equal(quizSequence.length,3);

// A Canvas response cannot redirect uploaded document bytes to an arbitrary HTTPS host.
let untrustedStorageFetches=0;
globalThis.fetch=async(url,opts)=>{
  untrustedStorageFetches++;
  const target=new URL(url);
  if(target.pathname==='/api/v1/courses/1/assignments/2/submissions/self/files')
    return new Response(JSON.stringify({upload_url:'https://evil.example/signed',upload_params:{key:'k'}}),{status:200,headers:{'Content-Type':'application/json'}});
  throw Error('Untrusted signed storage hosts must not receive file bytes');
};
const untrustedStorage=await worker.fetch(uploadActionRequest('assignment',2,annotatedFile));
assert.equal(untrustedStorage.status,502,'arbitrary HTTPS storage hosts are rejected');
assert.equal(untrustedStorageFetches,1,'the Worker rejects the host before transferring any file bytes');

let fragmentStorageFetches=0;
globalThis.fetch=async(url,opts)=>{
  fragmentStorageFetches++;
  const target=new URL(url);
  if(target.pathname==='/api/v1/courses/1/assignments/2/submissions/self/files')
    return new Response(JSON.stringify({upload_url:'https://northstar-test-bucket.s3.us-east-1.amazonaws.com/signed#fragment',upload_params:{key:'k'}}),{status:200,headers:{'Content-Type':'application/json'}});
  throw Error('Fragment-bearing signed storage URLs must not be followed');
};
const fragmentStorage=await worker.fetch(uploadActionRequest('assignment',2,annotatedFile));
assert.equal(fragmentStorage.status,502);
assert.equal(fragmentStorageFetches,1,'fragment-bearing storage URLs are rejected before transfer');

// Unsafe and missing finalization locations must never be followed.
globalThis.fetch=async(url,opts)=>{
  const target=new URL(url);
  if(target.pathname==='/api/v1/courses/1/assignments/2/submissions/self/files')return new Response(JSON.stringify({upload_url:'https://northstar-test-bucket.s3.us-east-1.amazonaws.com/signed',upload_params:{key:'k'}}),{status:200,headers:{'Content-Type':'application/json'}});
  if(target.origin==='https://northstar-test-bucket.s3.us-east-1.amazonaws.com')return new Response(null,{status:302,headers:{Location:'https://evil.example/api/v1/files/503/create_success'}});
  throw Error('Unsafe finalization destination must never be fetched: '+target.href);
};
const unsafe=await worker.fetch(uploadActionRequest('assignment',2,annotatedFile));
assert.equal(unsafe.status,502);const unsafeBody=await unsafe.text();assert(!unsafeBody.includes('test-secret'));assert(!unsafeBody.includes('evil.example'));
globalThis.fetch=async(url,opts)=>{
  const target=new URL(url);
  if(target.pathname==='/api/v1/courses/1/assignments/2/submissions/self/files')return new Response(JSON.stringify({upload_url:'https://northstar-test-bucket.s3.us-east-1.amazonaws.com/signed',upload_params:{key:'k'}}),{status:200,headers:{'Content-Type':'application/json'}});
  if(target.origin==='https://northstar-test-bucket.s3.us-east-1.amazonaws.com')return new Response(null,{status:302});
  throw Error('Missing finalization Location must not be fetched');
};
const missingLocation=await worker.fetch(uploadActionRequest('assignment',2,annotatedFile));
assert.equal(missingLocation.status,502);
console.log('PASS: Canvas signed assignment and quiz uploads finalize through authenticated Canvas create_success requests');
