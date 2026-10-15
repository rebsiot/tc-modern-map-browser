# TC Modern Scene Library v0.2.9 — install/upgrade and rollback

**Module ID stays `tc-modern-map-browser`.** This is a **distribution/documentation-only update** to v0.2.8 functionality, with no data format or world Scene changes. v0.2.8 Change Category behavior, source IDs, current catalog, catalog overrides, and existing scene imports are preserved.

## Before installation

- Back up the Foundry world **and** the currently installed `Z:\Data\modules\tc-modern-map-browser` folder. Backup your catalog mappings using the library's **Export catalog CSV**, when available. Keep a copy of the last working module ZIP.
- Keep all creator modules/compendiums installed; never reinstall creator packs merely to update the Scene Library.
- Stop the running Foundry world before package replacement. Perform the transition from Foundry's **Setup** screen, not during an active game.

## Preferred: remote install using Foundry Setup

1. Once the GitHub release is actually published, copy the manifest URL:

   `https://github.com/rebsiot/tc-modern-map-browser/releases/latest/download/module.json`

2. In **Foundry Setup > Add-on Modules > Install Module**, paste it into **Manifest URL** and select **Install**. The installer will download the v0.2.9 ZIP, extracting its contents directly under the module ID folder.
3. If the module ID is already installed **manually** (the old manifest has no `manifest` URL), Foundry may refuse a duplicate installation, and an ordinary Update may not know where to fetch releases. With backups verified, you may uninstall **only the Scene Library module** from Setup and then reinstall it from the GitHub manifest. **Do not uninstall the creator modules or delete imported world Scenes.** If you cannot safely back up the world/module before this one-time transition, postpone it until you can.
4. Enable the module in the desired world, reload/hard-refresh the browser, confirm `v0.2.9`, then verify opening the library, changing an Embassy category, reopening it, and using Undo. Do not test by importing dozens of creator maps.

The module ID did not change. Existing world Scenes are independent documents and are not migrated by this installer. World-scoped catalog settings are expected to remain associated with the unchanged module ID, but **a verified world backup is the reliable rollback protection**.

## Manual install when server access is available

Stop Foundry. Extract the *contents* of the GitHub release ZIP into `Z:\Data\modules\tc-modern-map-browser\` so `module.json` is at the **top of that folder**. The GitHub ZIP intentionally has `module.json` at archive root: extracting directly into `Z:\Data\modules\` would be incorrect. Restart Foundry and hard-refresh.

## Rollback

Restore the prior backed-up `tc-modern-map-browser` folder / last working ZIP and restart Foundry. World Scene imports/edits done after the update are not undone by source code rollback; use a matching world backup as needed. The v0.2.8 catalog override mechanism is unchanged; preserve an exported catalog CSV if you plan to revert category changes.

## Verification

- **Automated/mock-tested:** Node 22 syntax + two integration test files; catalog 729 IDs, versioned ZIP integrity and manifest URLs.
- **Pending:** GitHub Actions remote release, manifest installation and updating in the user's Ubuntu Foundry v14 instance, creator compendium browsing and teleporters in a real world.

**Project ownership:** `11-TC-MODERN-SCENE-LIBRARY.md`; preserve existing interfaces with `12-`/`13-` creator acquisition and asset browser modules.
