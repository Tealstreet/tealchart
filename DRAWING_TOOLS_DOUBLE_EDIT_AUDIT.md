# Drawing Tools Double Edit Audit

Epic D2 checks whether double-click and double-tap editing routes the same user
intent on web Canvas and mobile Skia. This audit records the current evidence
for text edit, non-text properties, app-owned callbacks, and built-in fallback
surfaces.

## Current Model

Double-edit behavior is shared:

- Shared intent resolver: `resolveUserDrawingEditIntentAtPoint`.
- Shared properties resolver: `resolveUserDrawingPropertiesIntent`.
- Web double-click consumes the shared intent and dispatches the returned
  command sequence.
- Mobile double-tap consumes the shared intent through
  `resolveMobileUserDrawingDoubleTapEditIntent`.
- Text edit and properties mutations route through shared command/history
  reducers after the intent is resolved.

## Evidence Map

| Area | Web evidence | Mobile evidence | Shared evidence |
| --- | --- | --- | --- |
| Text drawings | Web double-click routes text-capable hits to `beginTextEdit` and renders the web text editor. | Mobile double-tap applies the same text commands and opens mobile text edit state. | `editIntent.test.ts` covers every text annotation kind. |
| Non-text drawings | Web double-click opens app-owned or built-in properties for non-text body hits. | Mobile double-tap opens app-owned or built-in properties for non-text body hits. | `resolveUserDrawingPropertiesIntent` returns selected, explicit-target, editable, and read-only intents. |
| App-owned callbacks | Web widget APIs expose properties open callbacks and built-in fallbacks. | Skia props/handles expose the same properties open callback shape and built-in sheet fallback. | Shared intent and properties models avoid platform-specific action inference. |
| Locked/missing targets | Web/shared locked text hits fall back to pane behavior under default hit testing. | Mobile double-tap now has a sibling locked-text no-mutation guard. | Shared properties intent marks locked selected targets read-only and returns null for stale IDs. |
| History | Web text/property commits use shared command/history dispatch. | Mobile text/property commits use the same shared command/history dispatch. | History tests cover begin/update/cancel as transient and commit as one undoable transaction. |

## Findings

- D2 is not missing a shared intent model. Text, properties, point-handle, and
  pane fallback intents are already represented in one resolver.
- Web and mobile both consume the shared intent rather than implementing
  separate double-interaction classifications.
- Remaining D-domain risk is duplicate/modifier workflow polish, especially
  web Shift-drag and mobile duplicate-edit-mode ergonomics.

## Next Useful Gap

Move to D3:

1. Verify web Shift-drag duplicate is reliable, undoable, and does not conflict
   with placement constraints.
2. Verify mobile duplicate-edit mode gives the same duplicate-then-drag
   semantics through touch-native host controls.
3. Add the smallest shared/web/mobile fix needed by a reproduced mismatch.
