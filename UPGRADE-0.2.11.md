# TC Modern Scene Library v0.2.11 — installation and rollback

**Display name:** TC Modern Scene Library  
**Module ID (unchanged):** `tc-modern-map-browser`  
**Code/data changes:** None; the rename and README edits do not migrate any Foundry world data.

## Backup first

- Back up the **Foundry world** separately from the installed `Data/modules/tc-modern-map-browser/` directory. Keep the current module ZIP or a recoverable copy of its folder.
- Optionally open the Scene Library and choose **Catalog tools → Export catalog CSV** to back up catalog labels (not your actual world Scenes/Journals).
- Do **not** remove/reinstall the creator's Scene compendiums or purchased map packs.

## Recommended Setup update

1. In Foundry Setup, choose **Add-on Modules** and use **Update** if this module was already installed from a GitHub manifest.
2. For a first install, choose **Install Module** and enter the manifest URL: `https://github.com/rebsiot/tc-modern-map-browser/releases/latest/download/module.json`.
3. For an exact version instead of latest, use `https://github.com/rebsiot/tc-modern-map-browser/releases/download/v0.2.11/module.json`.
4. **If an older manually copied installation blocks installing this module by the same ID**, first verify your world/module backups, then remove *only* the old Scene Library package in Foundry Setup and reinstall it using the manifest. Do not remove world Scenes, Journals or creator modules. If backup/recovery isn't possible remotely, postpone the transition.
5. Enable the module **in each desired world** using **Game Settings → Manage Modules**, confirm the **TC Modern Scene Library** title and the `0.2.11` version, then refresh the browser.

## Manual installation if Setup update is unavailable

Stop Foundry before replacing module files. Extract the ZIP **contents** to `Data/modules/tc-modern-map-browser/` (for this environment: `Z:\Data\modules\tc-modern-map-browser`) with `module.json` at the top of that folder, then restart Foundry. Do not extract an extra enclosing module folder.

## Rollback and live checks

Restore the prior backed-up module folder or the [v0.2.10 GitHub release](https://github.com/rebsiot/tc-modern-map-browser/releases/tag/v0.2.10); restart Foundry and refresh clients. Reverting code does **not** revert world document changes made by deliberate Scene/Journal imports; use the matching world backup if needed.

**First smoke test:** In a world, find **TC Modern Scene Library** in **Manage Modules**, confirm its enablement, open **Scenes → TC Modern Library**, then check a location's category and associated GM Journal without importing anything. Additional real import/teleport/GM-player tests are still pending.

No promises of compatibility, security, fixes or ongoing support are made; see `LICENSE.md` and `TEST-REPORT.md`.
