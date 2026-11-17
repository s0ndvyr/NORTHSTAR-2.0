import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const dbg = require('../scripts/canvas-debug.js');

// --- token redaction: no Canvas token may survive any display path ---
const bearer = 'Bearer supersecrettoken1234567890abcdef';
assert.equal(dbg.redact('Authorization: ' + bearer), '****');
assert.equal(dbg.redact('header Authorization: Bearer abc.def.ghi-jkl'), 'header ****');
assert.equal(dbg.redact('jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U more'), 'jwt **** more');
assert.equal(dbg.redact('URL https://x.example/?access_token=abcd1234efgh'), 'URL https://x.example/?****');
assert.equal(dbg.redact('api_key=f_abcd1234efghijklmn'), 'api_key=****');
assert.equal(dbg.redact('plain text with no secrets at all'), 'plain text with no secrets at all');
assert.ok(!dbg.redact('Bearer ' + bearer).includes('supersecrettoken'));

// --- Retry-After parsing ---
assert.equal(dbg.parseRetryAfter('30'), 30);
assert.equal(dbg.parseRetryAfter(' 120 '), 120);
assert.equal(dbg.parseRetryAfter(''), null);
assert.equal(dbg.parseRetryAfter(null), null);
assert.equal(dbg.parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT', Date.parse('Wed, 21 Oct 2026 07:27:00 GMT')), 60);

// --- direct-mode 403 (the user's suspected org block) ---
let e = dbg.buildEvent({mode:'direct', status:403, server:'cloudflare', contentType:'application/json', path:'/api/v1/courses'});
assert.equal(e.kind, 'forbidden');
assert.match(e.verdict, /403/);
assert.match(e.httpError, /403/);
assert.match(e.hint, /organization/i);
assert.ok(e.actions.length >= 2);

// HTML body on a 403 → proxy/WAF page, not a Canvas API error
e = dbg.buildEvent({mode:'direct', status:403, server:'cloudflare', contentType:'text/html', path:'/api/v1/courses'});
assert.match(e.httpError, /HTML/);

// --- 401 ---
e = dbg.buildEvent({mode:'direct', status:401, server:'apache', path:'/api/v1/courses'});
assert.equal(e.kind, 'unauthorized');
assert.match(e.verdict, /401/);

// --- bridge-generated 403 (Worker itself refused: bodyError present) ---
e = dbg.buildEvent({mode:'bridge', status:403, contentType:'application/json', bodyError:'Path not allowed', path:'/api/v1/courses'});
assert.equal(e.kind, 'forbidden');
assert.match(e.verdict, /bridge/i);
assert.match(e.hint, /Worker itself/);
assert.ok(e.actions.some(a => /CANVAS_ORIGIN/.test(a)));

// --- bridge origin refusal ---
e = dbg.buildEvent({mode:'bridge', status:403, bodyError:'Origin not allowed', path:'/api/v1/courses'});
assert.match(e.verdict, /origin/i);
assert.ok(e.actions.some(a => /ALLOWED_ORIGIN/.test(a)));

// --- upstream Canvas 403 through the bridge (no bridge bodyError) ---
e = dbg.buildEvent({mode:'bridge', status:403, contentType:'application/json', path:'/api/v1/courses'});
assert.equal(e.kind, 'forbidden');
assert.match(e.hint, /organization/i);
assert.ok(!/Worker itself/.test(e.hint));

// --- bridge 502 upstream failures ---
e = dbg.buildEvent({mode:'bridge', status:502, bodyError:'Canvas redirected the request; verify your Canvas origin', path:'/api/v1/courses'});
assert.equal(e.kind, 'redirect');
assert.match(e.verdict, /redirect/i);
e = dbg.buildEvent({mode:'bridge', status:502, bodyError:'Could not reach Canvas', path:'/api/v1/courses'});
assert.equal(e.kind, 'network');
assert.match(e.verdict, /cannot reach/i);

// --- 429 with Retry-After ---
e = dbg.buildEvent({mode:'direct', status:429, retryAfter:'45', path:'/api/v1/courses'});
assert.equal(e.kind, 'rate-limited');
assert.equal(e.retryAfter, 45);
assert.match(e.httpError, /45s/);

// --- non-JSON (HTML login/WAF page) ---
e = dbg.buildEvent({mode:'direct', status:200, nonJson:true, contentType:'text/html; charset=utf-8', path:'/api/v1/courses'});
assert.equal(e.kind, 'non-json');
assert.match(e.verdict, /HTML/);

// --- network failure, direct mode, probes: host up, unauth probe readable, no redirect
//     → classic CORS/preflight (org WAF) conclusion ---
e = dbg.buildEvent({mode:'direct', status:null, thrown:{kind:'network', message:'Failed to fetch'},
  probes:{reachable:true, probe:{readable:true, status:401, redirected:false, finalUrl:'x'}, originAllowed:null},
  hostHint:'school.instructure.com'});
assert.equal(e.kind, 'network');
assert.match(e.verdict, /preflight/i);
assert.match(e.hint, /Authorization header/);
assert.ok(e.actions.some(a => /bridge/i.test(a)));

// unauth probe readable AND redirected → redirect verdict with final URL
e = dbg.buildEvent({mode:'direct', status:null, thrown:{kind:'network', message:'Failed to fetch'},
  probes:{reachable:true, probe:{readable:true, status:200, redirected:true, finalUrl:'https://sso.school.edu/login'}, originAllowed:null}});
assert.match(e.verdict, /redirect/i);
assert.match(e.hint, /sso\.school\.edu/);

// host unreachable
e = dbg.buildEvent({mode:'direct', status:null, thrown:{kind:'network', message:'Failed to fetch'},
  probes:{reachable:false, probe:null, originAllowed:null}, hostHint:'school.instructure.com'});
assert.match(e.verdict, /unreachable/i);
assert.match(e.hint, /DNS/i);

// --- network failure, bridge mode: ALLOWED_ORIGIN refusal detected by OPTIONS probe ---
e = dbg.buildEvent({mode:'bridge', status:null, thrown:{kind:'network', message:'Failed to fetch'},
  probes:{reachable:true, probe:{readable:false, error:'Failed to fetch'}, originAllowed:false}});
assert.match(e.verdict, /ALLOWED_ORIGIN/i);
assert.match(e.hint, /never saw the request/);

// bridge reachable + origin allowed + unauth probe readable
e = dbg.buildEvent({mode:'bridge', status:null, thrown:{kind:'network', message:'Failed to fetch'},
  probes:{reachable:true, probe:{readable:true, status:401, redirected:false}, originAllowed:true}});
assert.match(e.hint, /extension|Authorization/i);

// --- timeout with probe evidence ---
e = dbg.buildEvent({mode:'direct', status:null, thrown:{kind:'timeout', message:'timed out'},
  probes:{reachable:true, probe:{readable:true, status:401, redirected:false}, originAllowed:null}});
assert.equal(e.kind, 'timeout');
assert.match(e.hint, /specific to the authenticated request/);

// --- redirect thrown (Firefox-style) with probe confirming final URL ---
e = dbg.buildEvent({mode:'direct', status:null, thrown:{kind:'redirect', message:'The user aborted a request.'},
  probes:{reachable:true, probe:{readable:true, status:200, redirected:true, finalUrl:'https://vanity.school.edu/canvas'}, originAllowed:null}});
assert.equal(e.kind, 'redirect');
assert.equal(e.redirectLocation, 'https://vanity.school.edu/canvas');

// --- success ---
e = dbg.buildEvent({mode:'direct', status:200, path:'/api/v1/courses'});
assert.equal(e.kind, 'success');
assert.equal(e.verdict, 'Request accepted');

// --- verdictForFailure fallbacks (no event attached) ---
assert.equal(dbg.verdictForFailure({kind:'invalid-input', message:'Enter your Canvas access token.'}).verdict, 'Check your entries');
assert.equal(dbg.verdictForFailure(null).verdict, '');
assert.equal(dbg.verdictForFailure({kind:'network'}).verdict, 'Blocked before Canvas answered');
// with an event attached, the event's verdict wins
assert.equal(dbg.verdictForFailure({kind:'network', event:{verdict:'Blocked by CORS/preflight (org policy or WAF)'}}).verdict, 'Blocked by CORS/preflight (org policy or WAF)');

// --- report building redaction contract: redact is idempotent and total ---
const sample = dbg.redact('attempt 1 · Bearer ' + bearer + ' · eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
assert.ok(!sample.includes('supersecrettoken'));
assert.ok(!sample.includes('eyJhbGciOiJIUzI1NiJ9.eyJzdWIi'));
assert.equal(dbg.redact(sample), sample);

console.log('PASS: debug console redaction, event classification (403 org/bridge/CORS, 401, redirect, timeout), probes, and verdicts');
