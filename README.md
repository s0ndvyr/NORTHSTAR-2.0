# NORTHSTAR | Academic Command Center

A redesigned, iPad-friendly academic dashboard for GitHub Pages. The interface starts with **example data**, clearly labeled; connecting Canvas replaces that data with your live courses and assignments.

## Run and publish

Upload the contents of this folder to the root of your GitHub repository (replace the files with matching paths). GitHub Pages must be enabled on the `main` branch, root folder. Visit `https://s0ndvyr.github.io/NORTHSTAR/`. Or run a local server such as `python3 -m http.server 8000` and open `http://localhost:8000`.

## Connect Canvas

1. Open **Connect**. Enter your school's Canvas origin, e.g. `https://school.instructure.com` (no path), and an access token from Canvas **Account → Settings → New Access Token**. Do not send your token in chat, paste it into the code, or commit it.
2. Tap **Connect & sync**. If your Canvas instance permits direct browser requests, your courses and assignments will load. A correct token can still fail when a school blocks cross-origin requests (CORS).
3. If direct sync fails, deploy the optional bridge below, enter its HTTPS origin in the **private Canvas bridge URL** field, and reconnect.

The token is held in browser session storage only. It is sent in the Authorization header, never in a URL or through a public CORS proxy. It is still accessible to JavaScript on this site: avoid using this on a shared device and revoke the token if you suspect exposure. Close the session or tap Disconnect to remove it. Notes and drafts are saved locally in the browser, not encrypted or backed up.

**Important:** the previous version stored your token unencrypted and sent it to public proxy services in URL query strings if direct access failed. If you previously tried that version, revoke that token in Canvas and create a new one.

### Connection troubleshooting checklist

- [ ] **School URL:** Use the exact HTTPS Canvas origin, with no path, for the school where the token was created.
- [ ] **Token:** Check that it is current and belongs to the same school account. A 401 usually means Canvas rejected it. Create a fresh token if needed.
- [ ] **Permissions:** A 403 can mean a token, account, school policy, or bridge restriction. Ask the Canvas administrator if you cannot resolve it.
- [ ] **Browser access:** If a valid token still cannot connect, the school may block cross-origin browser requests. Set up the optional private bridge below.
- [ ] **Bridge:** Ensure `CANVAS_ORIGIN` matches the school's Canvas origin and `ALLOWED_ORIGIN` matches the exact Northstar site origin; redeploy the Worker after changing them.
- [ ] **No courses:** Confirm the account has active enrollments. The sync fetches active courses, not every historical or inaccessible course.
- [ ] **Token security:** Revoke any token used with the old app, which may have sent it to public proxies. Never share tokens in chat or commit them to a repository.

The checklist also appears in the Connect panel, and opens automatically on connection or sync failure. Checkmarks last only while the page is open. If you ask an administrator for help, share the status message without your token or other sensitive details.

### Debug console

The Connect panel also contains a **debug console** that traces every request an attempt makes. Each entry shows the timing, HTTP status, `Server`/`Content-Type` headers, a truncated response body (for example a Canvas `{"errors":[…]}` payload or a bridge `{"error":"Path not allowed"}`), a `X-Request-Id` you can give your administrator, and a plain-language diagnosis. When a request never completes, the console runs three probes — host reachability, an **unauthenticated** request to the same URL (to tell a CORS/preflight block from a dead host), and, in bridge mode, an origin check against `ALLOWED_ORIGIN` — and states which one failed. Typical verdicts: `Blocked (403 — org policy, scopes, or WAF)`, `Blocked by CORS/preflight (org policy or WAF)`, `Blocked by bridge config (403, path/origin)`, `Token rejected (401)`, `URL redirects away from Canvas`, `Canvas host unreachable`. Use **Copy report** to copy the full trace for support; the token is redacted from everything the console displays or copies.

### Set up your own optional bridge

GitHub Pages cannot run server-side code. The included `canvas-bridge/worker.js` is an optional read-only Cloudflare Worker for your personal use; you need a Cloudflare account.

1. In the Cloudflare dashboard, create a Worker. Replace its code with `canvas-bridge/worker.js`.
2. Change `CANVAS_ORIGIN` to the exact HTTPS origin of your school’s Canvas instance, e.g. `https://school.instructure.com`. Change `ALLOWED_ORIGIN` to the exact origin where you use Northstar. For the provided Pages URL this is `https://s0ndvyr.github.io` (not the `/NORTHSTAR/` path). For localhost testing use your exact origin, for example `http://localhost:8000`.
3. Deploy. Paste the Worker’s origin (e.g. `https://northstar-bridge.example.workers.dev`) into Northstar's bridge field, then connect.
4. Keep the bridge under your control. It only forwards GET requests for courses and assignments to your configured Canvas host, and never stores or logs tokens in code. The origin check helps browsers enforce access but is **not authentication**: someone can forge an Origin header outside a browser. Monitor the deployment and add platform-level access controls/rate limits as appropriate. Treat the bridge operator and hosting provider as trusted with the token and Canvas responses.

If your school's Canvas security policy blocks external access, ask the Canvas administrator. The bridge cannot fix an expired token, inadequate permissions, or a blocked account.

## What works and what is not connected

- Canvas sync reads active courses and paginated assignments including due dates, points and submission status. It does not fetch grades or StudentVUE data.
- Open an assignment to keep a device-local draft or follow its link to Canvas. **No submission is made by Northstar.**
- Notebook and assignment drafts save locally. The study timer and example flashcards are in-browser utilities. The study guide is rule-based, not AI.
- Example grades, charts, and analytics in demo mode are illustrative, not real records. What-if calculations are disabled for synced Canvas data because grading weights and credits aren't known.
- No backend is deployed by this ZIP. Connecting through the optional bridge cannot be verified until it is configured with your school and deployed.
