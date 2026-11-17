/* NORTHSTAR AI: Google Gemini (free tier) client. The API key is session-only,
   held in memory, and redacted from every error message. Requests go directly
   from the browser to Google — never through the Canvas bridge. */
(function (global) {
  'use strict';
  var DEFAULT_MODEL = 'gemini-2.0-flash';
  var ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

  function redactKey(text, key) {
    var out = String(text == null ? '' : text);
    if (key) out = out.split(String(key)).join('****');
    return out.replace(/key=[^&\s"']+/gi, 'key=****');
  }

  function endpoint(model, key) {
    return ENDPOINT + encodeURIComponent(model || DEFAULT_MODEL) + ':generateContent?key=' + encodeURIComponent(key || '');
  }

  function friendlyError(status, bodyText, key) {
    var msg = 'Gemini request failed (HTTP ' + status + ').';
    if (status === 400) msg = 'Gemini rejected the request (HTTP 400) — check the model name and key.';
    else if (status === 401 || status === 403) msg = 'Gemini refused the API key (HTTP ' + status + ') — it may be invalid, restricted, or billing-blocked.';
    else if (status === 404) msg = 'Gemini model not found (HTTP 404) — try a different model name in Settings.';
    else if (status === 429) msg = 'Gemini free-tier quota reached (HTTP 429) — wait a minute and try again.';
    else if (status >= 500) msg = 'Gemini is having trouble (HTTP ' + status + ') — try again shortly.';
    if (bodyText) msg += ' ' + redactKey(bodyText, key).slice(0, 200);
    return new Error(msg);
  }

  async function generate(prompt, opts) {
    opts = opts || {};
    var key = String(opts.key || '').trim();
    if (!key) { var e0 = new Error('No Gemini API key set. Add a free key in Settings.'); e0.kind = 'no-key'; throw e0; }
    var model = String(opts.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
    var fetchImpl = opts.fetchImpl || global.fetch;
    var body = { contents: [{ parts: [{ text: String(prompt || '') }] }] };
    if (opts.system) body.systemInstruction = { parts: [{ text: String(opts.system) }] };
    var res;
    try {
      res = await fetchImpl(endpoint(model, key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(30000) : undefined
      });
    } catch (err) {
      var e2 = new Error('Could not reach Gemini: ' + redactKey((err && err.message) || err, key));
      e2.kind = 'network'; throw e2;
    }
    var text = '';
    try { text = await res.text(); } catch { text = ''; }
    if (!res.ok) throw friendlyError(res.status, text, key);
    var data;
    try { data = JSON.parse(text); } catch { throw new Error('Gemini returned an unreadable response.'); }
    var parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    if (!Array.isArray(parts) || !parts.length) {
      var reason = data && data.candidates && data.candidates[0] && data.candidates[0].finishReason;
      throw new Error('Gemini did not return text' + (reason ? ' (finish reason: ' + reason + ')' : '') + '. Try rephrasing.');
    }
    return parts.map(function (p) { return p && p.text ? p.text : ''; }).join('').trim();
  }

  async function testKey(key, model, fetchImpl) {
    return generate('Reply with exactly: ok', { key: key, model: model, fetchImpl: fetchImpl });
  }

  var api = { DEFAULT_MODEL: DEFAULT_MODEL, generate: generate, testKey: testKey, redactKey: redactKey, endpoint: endpoint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.NorthstarAI = api;
})(typeof window !== 'undefined' ? window : globalThis);
