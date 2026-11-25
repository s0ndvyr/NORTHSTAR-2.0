# NORTHSTAR 5.0 — Local Concurrent-Edit Recovery

## When this appears

NORTHSTAR stores its academic workspace in this browser. If two open tabs start from the same saved revision and both make changes, the later tab must not silently overwrite the first tab's work.

NORTHSTAR compares snapshot revisions and content. When it detects a competing write, it preserves both versions in a separate local conflict log and shows a conflict notice.

## What the notice means

- The primary saved workspace remains intact.
- The other tab's local snapshot is preserved separately.
- Further automatic writes are held while unresolved conflict copies exist.
- The conflict bundle contains both the local and saved snapshots for every unresolved conflict.
- After the bundle download begins, NORTHSTAR clears the exported conflict records and reloads the primary saved workspace.

## If you need the other version

1. Keep the downloaded northstar-conflict JSON file.
2. Open it in a text editor that can handle JSON.
3. Each entry in conflicts contains localBackup and savedBackup.
4. To restore one version, copy the complete desired backup object (localBackup or savedBackup) into a standalone JSON file.
5. In NORTHSTAR, open Settings and use the academic backup import workflow to restore that standalone backup.

Restoring a backup is an explicit replacement of the current local academic snapshot. Compare the versions before choosing.

## Important boundaries

- Conflict bundles include academic JSON snapshots, not binary assignment attachments stored separately in IndexedDB.
- This protects concurrent edits between tabs in the same browser origin. It is not cloud sync or a distributed database.
- It does not resolve Canvas/provider conflicts, ambiguous submission outcomes, account revocation or cross-device edits.
- If the browser is closed before a local edit is saved or conflict-preserved, unsaved in-memory work may be lost. Wait for the workspace save workflow to complete.
