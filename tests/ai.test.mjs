import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const AI = require('../scripts/ai.js');

const KEY = 'AIza-test-secret-key-12345';
const okFetch = async (url, opts) => {
  assert.ok(url.includes('generativelanguage.googleapis.com'));
  assert.ok(!url.includes(KEY), 'API key must not be placed in the URL');
  assert.equal(opts.headers['x-goog-api-key'], KEY, 'API key is sent in the request header');
  assert.equal(opts.method, 'POST');
  const body = JSON.parse(opts.body);
  assert.ok(body.contents[0].parts[0].text.length > 0);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Hello from Gemini'}]}}]}), {status:200, headers:{'Content-Type':'application/json'}});
};

// success
assert.equal(await AI.generate('Explain photosynthesis', {key:KEY, fetchImpl:okFetch}), 'Hello from Gemini');
// testKey
assert.equal(await AI.testKey(KEY, 'gemini-2.0-flash', okFetch), 'Hello from Gemini');

// no key
await assert.rejects(() => AI.generate('hi', {key:'', fetchImpl:okFetch}), /No Gemini API key/);

// HTTP error: friendly + key redacted
const badFetch = async () => new Response(JSON.stringify({error:{message:'API key not valid. key=' + KEY}}), {status:400});
await assert.rejects(() => AI.generate('hi', {key:KEY, fetchImpl:badFetch}), (e) => {
  assert.ok(!e.message.includes(KEY), 'key must be redacted from errors');
  assert.match(e.message, /HTTP 400/);
  return true;
});

// quota
const quotaFetch = async () => new Response('quota', {status:429});
await assert.rejects(() => AI.generate('hi', {key:KEY, fetchImpl:quotaFetch}), /quota/);

// network failure: key redacted even if the error echoes the URL
const netFetch = async (url) => { throw new Error('fetch failed for ' + url); };
await assert.rejects(() => AI.generate('hi', {key:KEY, fetchImpl:netFetch}), (e) => {
  assert.ok(!e.message.includes(KEY), 'key must be redacted from network errors');
  return true;
});

// empty candidates (safety block)
const emptyFetch = async () => new Response(JSON.stringify({candidates:[{finishReason:'SAFETY'}]}), {status:200});
await assert.rejects(() => AI.generate('hi', {key:KEY, fetchImpl:emptyFetch}), /did not return text/);

console.log('PASS: Gemini client (success, key redaction, friendly errors, empty-response handling)');
