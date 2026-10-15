# Release history — TC Modern Scene Library

## v0.2.9 — 2026-10-15 — GitHub distribution and publication notices

- Added GitHub Releases manifest and automated source-only release workflow. Versioned ZIP puts `module.json` directly at archive root for Foundry manifest installation.
- Added explicit AI-assisted development disclosure and proprietary personal-use / no-redistribution license, with third-party creator asset requirements and no warranty/support promise.
- **No functional code, creator metadata, IDs, Scene/Journals, Region/teleporter or world settings changes from v0.2.8.**
- Local Node syntax/mock tests and ZIP integrity/metadata audit pass; actual GitHub publishing and live Foundry v14 manifest installation still unverified.
- Back up world and installed module before replacing v0.2.8. Existing manual installs lacking a `manifest` field may require a backed-up Setup reinstall to switch update channels.


## v0.2.8 — 2026-10-15

- **GitHub distribution documentation (no behavior changes):** Added explicit third-party content/prerequisite notice and personal-use/fork disclaimer. Source modules/artwork must be acquired from the original creator; release ZIP continues to contain code and catalog identifiers only. No creator files are redistributed.

- **Added:** Per-location **Change Category** button in every Scene Library location row. Choose an existing category to save immediately or type a new category; applies to all Scene IDs/floors/variants in that location as one unit.
- **Persistence:** Reuses the GM-only world catalog override setting introduced in v0.2.7. Refresh/reopen retains edits; categories and location sorting update immediately; edited locations remain visible when moving out of a category filter.
- **Undo:** Inline changes use the same previous-mapping snapshot as CSV import, so **Catalog tools -> Undo last mapping** reverses the latest category or CSV change. Export CSV for a backup before making several edits.
- **No world migration:** Original source compendiums, already-imported world Scenes/Journals/folders, Region UUIDs, artwork, teleporter data and names remain intact. Changed category names affect only browsing and future voluntary import destinations.
- **Unresolved categories:** Embassy and News Broadcaster (8 Scenes each) remain **Needs Review** pending GM category selection. No guessed classification or silent edit.
- **Unchanged:** Current catalog (729 Scene IDs, 93 compendiums, 112 locations), pack import, teleport scanning, CSV import/export, the auto-open GM Journal checkbox and existing permission protections.
- **Checks:** Syntax, pure category-planning tests, mocked Foundry UI/settings persistence/undo and prior import/teleporter regressions passed. **Live Foundry v14 testing pending.**
- **Upgrade/rollback:** Direct replacement of `tc-modern-map-browser` from v0.2.7 (or earlier v0.2.2). Back up world and module directory, stop Foundry, replace module files and restart/hard-refresh. Restore the prior module folder to roll back code; current world overrides are preserved, not automatically removed.
- **Owner:** `11-TC-MODERN-SCENE-LIBRARY.md`. Mark as confirmed live only after the user's smoke test.

## v0.2.7 - 2026-10-14: Reviewed location catalog and CSV remapping

- **Bundled the actual user-reviewed catalog metadata**: 729 source Scene IDs from 93 Foundry Scene compendiums grouped into 112 locations. One creator module may contain multiple independently browsable locations (e.g., City Streets 03 and 08). No paid map art is included.
- **Location -> variant-pack browser** uses reviewed Category, Location, Variant Pack, Scene Display Name, and Floor fields rather than making one location from every creator compendium. Source scene names, IDs, assets, Region UUIDs and Journals are not altered.
- Incorporated corrected classifications and labels including Strip Club -> Commercial, Dusty Skull Cantina, Nakatomi Plaza, Blast Furnace, Quarantine Checkpoint, McCallister Residence, Outdoor Park Courts variants, City Streets 05 and City Streets 08 separate locations.
- Explicitly flags 16 source Scenes within two unresolved locations (Embassy and News Broadcaster) as **Needs Review** rather than guessing categories. City Streets 08 - Combined is a provisional catalog display label.
- **Catalog tools** -> Export catalog CSV, Import corrected CSV (preview and per-world setting), and Undo last mapping (one-step world-setting backup). Import matches immutable compendium ID + Scene ID + source key, detects duplicate/conflicting categories, reports missing sources, and never moves existing Scenes.
- **New imports** use `Scenes / TC Modern / <mapped category> / <mapped location>` for each original source Scene, including connected scenes in a different mapped location within the same creator module. Linked destination IDs are checked through the existing native Region preflight.
- **Single Scene import hardening**: an unrelated world Scene occupying the source ID now blocks the import instead of generating a different ID that could invalidate native teleporter links.
- GM Journals remain GM-only, associated with the original source module, imported once, and never exposed to players. Source module IDs and world origin flags are preserved.
- Direct replacement upgrade is supported from v0.2.2; no incremental installation of v0.2.3 through v0.2.6 is needed.
- **Not included**: automatic migration/reorganization of pre-existing world Scenes/Journals/folders, rewrite of original compendium names, or automated artwork copying.
- Automated/mock verification: Node syntax, 729-ID and 112-location metadata check, CSV round-trip/validation, world-setting import/undo, selected variant/linked Scene import, collision handling, GM Journal permissions. Live Foundry v14 regression: **NOT YET RUN**.
- Rollback: restore the prior `tc-modern-map-browser` module folder/ZIP after stopping Foundry. The new world mapping setting is ignored by older module code; restore a matching world snapshot if you need to reverse any world Scene/Journal imports that you performed.


## v0.2.6 — 2026-10-14

- **Added:** One-click, GM-only **Export catalog CSV** to download the complete indexed original Scene inventory, independent of active search/category/filter or the visible-card limit. Output is UTF-8 BOM CSV suitable for Excel editing and return upload.
- **Editable review fields:** Category, independent Location, Variant Pack, friendly Scene Display Name, Floor and Review Notes; populated from the existing heuristic catalog and explicitly designated *suggestions*, not confirmed creator categories.
- **Stable reconciliation fields:** Original source pack/scene titles, indexed background image path, source compendium ID, original Scene ID, stable compound key, and whether the Scene was imported into the current world. One row per original source Scene, not one row per compendium; sorting/review edits do not require changing IDs.
- **Safeguards:** Partial catalog exports require acknowledgement and include PARTIAL in the filename. CSV quoting and formula-like string protection. **Export creates no Foundry documents, changes no original pack data, and does not write changes to the world.** Edited CSV is not imported in v0.2.6; mapping is a subsequent reviewed release.
- **Preserved:** Existing inferred categories, variant grouping/import preflight, teleporter behavior, imported Scenes/Journals, module ID, settings and GM permissions; no data migrations or asset redistribution.
- **Tests:** Node 22 syntax and pure/mock integration checks including 729-row scale, stable IDs, CSV quoting/BOM/Excel formula hardening, GM action, filtered-view completeness, and existing import flow. **Live Foundry v14 not tested.**
- **Upgrade/rollback:** Back up world/module; stop Foundry and replace the module folder in `Z:\Data\modules\tc-modern-map-browser`; restart/hard-refresh. Restore the prior v0.2.5 folder/ZIP to roll back the code; no Scenes are migrated by export.
- **Ownership:** `11-TC-MODERN-SCENE-LIBRARY.md`; the next handoff should record the review export workflow. No changes to adjacent TC Modern asset or downloader contract.

## v0.2.5 — 2026-10-14

- **Fixed:** Added a GM-specified **Commercial** category override for these 18 creator locations: Retro Diner, Dive Bar, Office Block, Fast Food, Cafe, Bodega, Local Pub, Leisure Center, Boxing Gym, Local Gamestore, Noodle Bar, Sports Bar, Luxury Rooftop Bar, Winery, Nakatomi Tower, Dusky Skull Cantina, Jewellry Boutique, and Tailor.
- **Matching:** Recognizes common source-title prefixes, floor/variant suffixes and spelling variants (Café, Leisure Centre, Local Game Store, Jewellery/Jewelry Boutique). Overrides broad Entertainment / Retail & Offices / Streets & Urban category heuristics **only** where a listed location name matches.
- **Preserved:** Location-first variant packs, importer/preflight, teleporter IDs and Regions, matching GM Journals, existing imports, all other category rules and module ID.
- **No automatic migration:** This changes where locations appear in the browser and the category folder **for future imports**. Existing Scenes/Journals and their Foundry folders are not moved, deleted or rewritten. Moving prior imports requires a separate previewable, user-approved operation.
- **Tests:** Node 22 syntax checks and mock integration regression; explicit assertions cover all 18 Commercial names, common spelling alternatives, variant/floor names, 18 location packs and unrelated categories. **Live Foundry v14 testing pending.**
- **Upgrade:** Back up world and module folder; replace `Z:\Data\modules\tc-modern-map-browser` after stopping Foundry. Restart and hard-refresh. Roll back by restoring the previous module folder or v0.2.4 ZIP; no data migration is run.
- **Ownership:** Update `11-TC-MODERN-SCENE-LIBRARY.md` and shared roadmap only after live confirmation; no other module data contracts changed.

## v0.2.4 — 2026-10-13

- **Added:** Pack-first creator-location browsing to replace scrolling through hundreds of individual Scene choices. Variant packs are inferred from source titles (e.g. Day / Night / Snowstorm / Standard) and show included floor counts.
- **Added:** **Import variant pack** with an exact preview/confirmation of every included scene, matching GM Journals, and extra reachable native Teleport Token destinations discovered in the same creator module.
- **Added:** **Import missing only** behavior for partially imported packs, plus **Check / import linked scenes** for variants whose listed scenes are already in the world.
- **Added:** Read-only import preflight to block Scene ID collisions, detect previously remapped linked source IDs, identify unreadable source Scenes, and flag external or compendium-scoped teleporter links requiring manual review. No automatic overwrites or mass world reorganization.
- **Retained:** Individual Scene import, source compendium opener, pack category filter, live teleporter scanner, Journal import/auto-open, GM-only permissions, source origin flags, and compendium organization/undo.
- **No world migration:** Updating module code does not edit imported Scenes or Journals. Imports are explicit and confirmed by the GM.
- **Known limitations:** Heuristic variant labels; no source-world link rewrite for external or compendium UUIDs; partial imports need retry rather than automatic rollback.
- **Tests:** Node syntax checks and pure/mock integration tests passed. **Live Foundry v14 not tested.**
- **Upgrade/rollback:** Back up the module directory and the world; replace `Z:\Data\modules\tc-modern-map-browser`; stop/restart Foundry. Revert to backed-up v0.2.3 source to roll back code, noting new world Scenes are not removed automatically.

## v0.2.3 — previous working source (2026-10-13)

- GM-only per-viewed-scene Journal auto-open, one-time per scene switch without closing unrelated GM windows.
- Optional import of missing associated Journals, off by default; Journal deduplication and GM-only permissions.
- Existing location/variant scene list, scene-level imports, organizer, category and teleporter scanner retained as the baseline for v0.2.4.

## v0.2.2 and earlier

Historical full notes are not available in this source ZIP. No earlier release history has been invented here.
