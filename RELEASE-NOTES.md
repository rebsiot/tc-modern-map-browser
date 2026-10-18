# TC Modern Scene Library v0.2.10 — Clearer name

The Foundry Module Management entry now reads **TC Modern — Scene Library**, so it is easy to distinguish from **TC Modern — Asset Browser**. The technical module ID, existing catalog, imported Scenes, Journals, permissions, World settings and Region/teleporter behavior are unchanged. This update does not import or delete any world content.

**What changed**
- Simplified the module display name. This is a presentation-only release based on v0.2.9.
- Clarified that the TC Modern Windows downloader and asset indexer are **not** Foundry modules and therefore have no enable/disable checkbox.

**Before updating**
- Back up your world and `Data/modules/tc-modern-map-browser`. Keep creator modules and their paid content separate; do not reinstall those 93 modules to update this add-on.
- In Foundry Setup, update using the existing manifest below or manually install the entire versioned ZIP into `Data/modules/tc-modern-map-browser` (with `module.json` directly inside). Restart, enable/check it in the desired world and hard-refresh.

**Manifest:** https://github.com/rebsiot/tc-modern-map-browser/releases/latest/download/module.json

**Rollback:** Restore the backed-up module folder. The rename has no migration, but deliberately imported or edited world Scenes remain until rolled back separately from a matching world backup.

**Testing:** GitHub Actions runs Node syntax checks and automated/mocked tests when this release is published. Successful automation is not a live Foundry v14 test; the GM should verify the name and one existing catalog workflow after updating. No live test is claimed here.

**Distribution and limitations:** This remains unofficial, AI-assisted, experimental, proprietary personal-use software supplied as-is, with no warranty or support guarantee. Creator TC Modern maps, artwork and compendiums must be obtained separately and lawfully and are NOT included; no creator artwork, credentials, browser sessions or world data are distributed. See LICENSE.md and THIRD-PARTY-CONTENT.md in the repository. It is not endorsed by TC Modern/Tom Cartos or Foundry Gaming LLC.
