# TC Modern Scene Library - v0.2.8 Test Report

**Date:** 2026-10-15
**Module ID:** `tc-modern-map-browser`, release version `0.2.8`
**Status:** Automated and mock integration tests passed. **Live Foundry v14 tests not run**.

## Source and scope

- Built by inspecting the complete v0.2.7 working software ZIP (same module ID), not by recreating the module from handoff notes.
- Retained reviewed metadata mapping for 729 immutable source Scene keys, 93 Scene compendiums and 112 location groups. No paid assets, scene document exports, credentials or subscriber files included.
- No world Scene/Journal/Folder documents, native Region IDs, creator compendiums or teleport links changed by catalog reclassification.

## Tested automatically

| Check | Result | Method |
|---|---|---|
| Syntax of all module scripts and tests | Passed | Node `--check` |
| Bundled metadata identity/grouping | 729 unique source IDs, 93 compendiums, 112 locations | Pure tests, real editorial metadata |
| Two unresolved locations | Embassy 8 Scene IDs; News Broadcaster 8 Scene IDs | Pure tests |
| Location-wide reclassification | All 8 Embassy Scenes changed in the catalog; other locations unchanged | Pure tests |
| Stable identity and variant/floor grouping | No Scene key changed, 112 groups preserved; six Outdoor Park Courts variants preserved | Pure tests |
| Category name validation | Empty, traversal/path separators, markup/control characters and oversized names rejected | Pure tests |
| Reassigning the same category | Idempotent, no unnecessary setting writes | Pure and Foundry-shaped tests |
| Restore bundled category / Undo last mapping | Prior world override restored; redundant overrides removed | Pure and Foundry-shaped tests |
| Inline Change Category controls and custom choice | Location row button and category picker markup verified | Foundry-shaped DOM mock |
| World-settings persistence / reopened library | Saved category remains active across new library instances | Foundry-shaped mock |
| No world document mutation | Original Scene, Journal and folder snapshots unchanged | Foundry-shaped mock |
| CSV catalog import/export, native Region teleporter preflight and existing pack imports | Previous regression suite still passes | Pure and Foundry-shaped mocks |

## Live tests pending

1. Upgrade in the user's Foundry v14 world; verify the **Change Category** button is visible on each library location.
2. Search Embassy, change its category, confirm the location moves immediately, close/reopen and verify persistence, then **Undo last mapping**.
3. Check that previously imported world Scene folders and Region teleporters are unchanged.
4. If desired, test a newly imported variant in a backed-up test world to confirm the *new* category folder is used without altering existing imports.

## Release scope and rollback

Install by backing up world/module data, stopping Foundry, replacing `Z:\Data\modules\tc-modern-map-browser`, restarting and hard-refreshing. Roll back code by restoring the backed-up module folder. Undo/CSV restores catalog overrides; neither action restores world documents modified through separate deliberate imports.

**Owning handoff:** `11-TC-MODERN-SCENE-LIBRARY.md`. Shared project decision/status docs need updates after a live confirmation, not merely after syntax/mock tests.

## GitHub publication v0.2.9 checks (2026-10-15)

- AI-assisted development and no-support disclosures included in README and GitHub release notes.
- Proprietary personal-use license and independent creator asset requirements included.
- GitHub Actions publishing from versioned `module.json` on main is prepared, **not yet executed on GitHub**.
- Release builder puts `module.json` at ZIP root for Foundry manifest installation. ZIP integrity and source allowlist are locally verified; live manifest update/install is pending a published release and Foundry test.
