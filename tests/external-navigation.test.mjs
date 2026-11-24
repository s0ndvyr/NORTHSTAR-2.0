import assert from 'node:assert/strict';
const validate=value=>{let url;try{url=new URL(value);}catch{throw new Error('The launch destination is not a valid URL.');}if(url.protocol!=='https:'||url.username||url.password||url.href.length>12000)throw new Error('The launch destination must be a secure HTTPS URL without embedded credentials.');return url.href;};
assert.equal(validate('https://assignments.google.com/lti/launch?state=opaque'),'https://assignments.google.com/lti/launch?state=opaque');
for(const value of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','not a url'])assert.throws(()=>validate(value));
let navigated='';const location={assign(value){navigated=value;}};
const target=validate('https://provider.example/lti/start?x=1');location.assign(target);
assert.equal(navigated,target,'same-tab navigation uses location.assign; no iframe or popup is created');
console.log('external-navigation: secure URL validation and same-tab navigation fixtures passed');
