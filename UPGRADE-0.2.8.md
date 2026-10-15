# TC Modern Scene Library v0.2.8 - Upgrade and rollback

**Module ID:** `tc-modern-map-browser` (unchanged)
**Supported target:** Foundry VTT v14; World of Darkness `worldofdarkness` installation. Live v14 test pending.
**Release:** `tc-modern-scene-library-0.2.8.zip` - 2026-10-15.

## Preparation

1. Back up the installed `Z:\Data\modules\tc-modern-map-browser` directory, including the old `module.json` and all files.
2. Back up the relevant Foundry **world data** independently. World catalog overrides live in world settings; a module-folder backup alone does not restore them.
3. Stop Foundry before replacing module files over Samba. Keep the original creator modules installed and enabled.

## Install (direct from v0.2.2 or v0.2.7)

1. Extract the ZIP into `Z:\Data\modules\` so the actual path is `Z:\Data\modules\tc-modern-map-browser\module.json`.
2. Verify `module.json` identifies `tc-modern-map-browser`, version `0.2.8`. Avoid a double nested module folder.
3. Start Foundry, enable the module in the desired world if needed, and hard-refresh (`Ctrl+Shift+R`). Do not reinstall the 93 TC Modern creator modules.
4. Open **Scenes -> TC Modern Library** as GM. The location listing should have **Change Category** on each entry.
5. Search `Embassy`, click **Change Category**, select the category you want, and verify that the location moves into that category immediately, including all of its variants. This action does not import or change a world Scene.
6. Close/reopen the library to confirm the category is remembered. Use **Catalog tools -> Undo last mapping** to restore the prior classification if testing. For a long-term mapping backup, export the catalog CSV.

## Behavior and data safety

- The new control changes only the Scene Library's **world-level catalog override setting** for an entire indexed location. It never renames/reimports or relocates existing world Scenes, Journals, folders, Region IDs, native teleporters, or source compendium records.
- Categories affect the library list and **future, explicitly confirmed** Scene imports. They do not automatically move existing imported Scenes into new folders.
- The two unresolved locations are Embassy and News Broadcaster (8 source Scenes each). The module intentionally leaves them under Needs Review until a GM chooses the destination category.
- The existing Auto-open GM journal checkbox and its saved client preference are unchanged.
- Catalog CSV import/export is still available for bulk changes. Changing a category replaces the **one-step Undo** snapshot; use Export catalog CSV before a series of edits.

## Rollback

1. Stop Foundry, restore the backed-up module directory (v0.2.7 or your earlier known working version), restart Foundry and hard-refresh.
2. The stored world override setting remains, and older code may ignore it. To roll back catalog data, use **Catalog tools -> Undo last mapping** before uninstalling the new version or re-import your pre-edit catalog CSV while v0.2.8 is active.
3. If any world documents were deliberately imported or modified separately, restoring module files does **not** roll those back. Use a matching world backup if needed.

## Verification classification

- **Automated/mock-tested:** Node syntax, grouped overrides, prior-category restoration, settings persistence, UI markup, CSV import/export, prior Region/teleporter and Journal import regressions.
- **Live Foundry v14:** Not tested in this environment. First recommended check is **Change Category on Embassy and verify it remains changed after reopening the library**, then Undo.

**Owning handoff:** `11-TC-MODERN-SCENE-LIBRARY.md` (update after live confirmation). Shared `00-START-HERE.md` and `GLOBAL-04-DECISIONS-ROADMAP-RISKS.md` should record the confirmed status at the next handoff; no 12-/13- asset module contract changes.
