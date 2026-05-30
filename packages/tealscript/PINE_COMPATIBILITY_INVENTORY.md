# Pine Compatibility Inventory

This file defines the inventory format used to keep Pine parity work, docs, and
tests aligned. `PINE_COMPATIBILITY.md` is the human-readable matrix;
`PINE_PARITY_EPICS.md` is the long-term roadmap. New parity PRs should update
the matrix using the statuses and evidence checklist below.

## Status Values

| Status | Meaning |
| --- | --- |
| `Supported` | Syntax and runtime behavior are implemented and covered by tests. |
| `Partial` | Common usage works, but important Pine behavior, diagnostics, or UI integration is incomplete. |
| `Planned` | The feature is in scope but not implemented yet. |
| `Unsupported` | The feature should produce a clear diagnostic or documented rewrite path. |

## Topic Inventory Row

Use this shape when adding or refreshing compatibility rows:

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Parser, runtime, built-ins, visuals, data, alerts, or strategies | Pine feature or namespace | Status value | Test file, fixture, or diagnostic covering current behavior | Missing Pine behavior or reason unsupported |

Keep evidence specific enough that a reviewer can find the behavior without
reading the whole runtime.

## Parity PR Checklist

Every feature-parity PR should include the relevant items below. If an item is
not relevant, call that out in the PR description.

- Parser fixture for new syntax or grammar shape.
- Runtime fixture over deterministic local bars for new execution behavior.
- Reduced Pine idiom checkpoint for public or documented Pine patterns.
- Negative diagnostic fixture for unsupported or invalid forms.
- Compatibility matrix update.
- Roadmap update when the phase completes or a gap changes status.

## Checkpoint Fixture Rules

Checkpoint fixtures should be deterministic and small:

- Use local bar arrays from the existing fixture helpers.
- Assert concrete plot, drawing, alert, or error outputs.
- Preserve semantic shape from official docs or common public Pine idioms.
- Avoid depending on TradingView, network access, current market data, or random
  online scripts at test time.

