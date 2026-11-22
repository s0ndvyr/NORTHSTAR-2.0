import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const workspace = require('../scripts/workspace.js');
const submissions = require('../scripts/submissions.js');

const supported = type => ({id:1, question_type:type, answers:
  ['multiple_choice_question','true_false_question','multiple_answers_question'].includes(type)
    ? [{id:11,text:'A'},{id:12,text:'B'}]
    : type==='matching_question'
      ? [{id:1,answer_match_left:'Left A'},{id:2,answer_match_left:'Left B'},{id:11,answer_match_right:'Right A'},{id:12,answer_match_right:'Right B'}]
      : ['fill_in_multiple_blanks_question','multiple_dropdowns_question'].includes(type)
        ? [{id:11,blank_id:'color'},{id:12,blank_id:'shape'}]
        : []
});
for (const type of ['multiple_choice_question','true_false_question','multiple_answers_question','essay_question','short_answer_question','numerical_question','calculated_question','matching_question','fill_in_multiple_blanks_question','multiple_dropdowns_question','text_only_question']) {
  const row = supported(type);
  if (['essay_question','short_answer_question','numerical_question','calculated_question','text_only_question'].includes(type)) row.question_type=type;
  assert.equal(workspace.questionSupported(row), true, type+' should be supported');
}
assert.equal(workspace.questionSupported({id:2,question_type:'matching_question',answers:[{id:1,answer_match_left:'L'}]}), false, 'malformed matching question is not claimed as supported');
assert.equal(workspace.questionSupported({id:3,question_type:'unsupported_vendor_question',answers:[]}), false, 'unknown question formats remain on Canvas fallback');

assert.deepEqual(submissions.payload('online_upload',[101,102]).submission.file_ids,[101,102], 'multiple Canvas file IDs can be submitted together');
assert.deepEqual(submissions.payload('online_upload',101).submission.file_ids,[101], 'single file compatibility is preserved');
assert.throws(()=>submissions.payload('online_upload',[101,'bad']),/Upload every selected file/, 'invalid file ID blocks submission');
assert.throws(()=>submissions.payload('online_upload',Array.from({length:11},(_,i)=>i+1)),/at most 10/, 'more than ten attachments is blocked');

const calls=[];
const fetchMock=async (url, options={}) => {
  const target=new URL(url);
  if (target.origin==='https://bridge.example') {
    const path=target.searchParams.get('path');
    calls.push({kind:'bridge',path,method:options.method||'GET',body:options.body});
    if (path.endsWith('/api/v1/users/self')) {
      return new Response(JSON.stringify({id:7}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    if (/\\/api\\/v1\\/courses\\/1\\/assignments\\/9\\/submissions\\/7\\/files$/.test(path)) {
      return new Response(JSON.stringify({upload_url:'https://upload.example/receive',upload_params:{token:'signed-upload'}}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    throw new Error('Unexpected bridge request: '+path);
  }
  if (target.origin==='https://upload.example') {
    calls.push({kind:'signed-upload',method:options.method,hasAuthorization:!!options.headers?.Authorization,body:options.body});
    assert.equal(options.method,'POST');
    assert.equal(!!options.headers?.Authorization,false,'Canvas bearer token must not be sent to the signed upload host');
    return new Response(JSON.stringify({id:500+calls.filter(x=>x.kind==='signed-upload').length,display_name:'Uploaded attachment'}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  throw new Error('Unexpected request origin: '+target.origin);
};
const files=[new File(['one'],'one.txt',{type:'text/plain'}),new File(['two'],'two.txt',{type:'text/plain'})];
const progress=[];
const uploaded=await workspace.uploadAssignmentFiles({
  credentials:{base:'https://school.instructure.com',token:'secret-token',proxy:'https://bridge.example/worker'},
  courseId:1,assignmentId:9,files,onProgress:event=>progress.push(event),fetchImpl:fetchMock
});
assert.equal(uploaded.length,2);
assert.deepEqual(uploaded.map(file=>file.id),[501,502]);
assert.equal(calls.filter(x=>x.kind==='bridge'&&x.path==='/api/v1/users/self').length,2,'student lookup uses the bridge for each file initialization');
assert.equal(calls.filter(x=>x.kind==='bridge'&&x.path==='/api/v1/courses/1/assignments/9/submissions/7/files').length,2,'file initializations use the numeric Canvas student endpoint');
assert.equal(calls.filter(x=>x.kind==='signed-upload').length,2);
assert.equal(progress.filter(x=>x.phase==='uploaded').length,2,'upload progress is reported for every completed file');
assert.deepEqual(submissions.payload('online_upload',uploaded.map(file=>file.id)).submission.file_ids,[501,502], 'uploaded file IDs are accepted for final submission');

console.log('PASS: Phase 4 completion unit tests (expanded Classic Quiz types, multi-file payloads and staged Canvas uploads)');
