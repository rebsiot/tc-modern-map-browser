# TC Modern Scene Library v0.2.11 — test report

**Scope:** Presentation-only release: Foundry module title, version, description, README, documentation and distribution ZIP allowlist. The module's JavaScript/CSS/catalog files are identical to the v0.2.10 published source at GitHub commit `a98e7da2889232486ceac3a5424bd907caae5770` (tag `v0.2.10`), and to the corresponding v0.2.9 source.

## Automated and static checks (2026-10-18)

- **Passed locally on 2026-10-18 with Node v22.16.0:** syntax checks for all 7 module scripts and both maintained test files; `node --test tests/*.test.mjs` passed 2 test files (0 failures). See the separate GitHub Actions release run for remote verification.
- Module identity stays `tc-modern-map-browser`; Foundry display title is now `TC Modern Scene Library`, version `0.2.11`.
- Source JS, CSS, reviewed catalog and LICENSE hashes must remain byte-for-byte identical to v0.2.9; ZIP integrity, manifest at root, release URL matching and exclusion of creator assets checked during packaging.
- Local tests exercise catalog mapping/undo, Scene/Journal import mocks and teleporter preflight mocks; these are **not a Foundry v14 live regression**.

## Live Foundry v14 testing — NOT YET RUN

1. Update or install via released manifest in Setup, open Manage Modules in a world and confirm **TC Modern Scene Library** appears exactly once and can be enabled (no settings loss).
2. Open Scenes → TC Modern Library, search a location, change its category and Undo; confirm the override persists when reopened.
3. In a backed-up test world, import one selected variant with optional matching GM Journal, check GM/player permissions and verify existing import/creator source IDs remain unaffected.
4. Where available, verify native Region teleporter transitions in both directions and original Scene/Region UUID targets. Confirm auto-open GM Journal checkbox behavior and that non-GM viewers do not see GM notes.

**No live Foundry v14 compatibility, permission or teleporter success is claimed.** See the [upgrade/rollback instructions](UPGRADE-0.2.11.md) before a manual-to-GitHub transition.
