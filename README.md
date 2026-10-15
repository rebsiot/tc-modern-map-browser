# TC Modern - Scene Library & Organizer v0.2.9

**Release date:** 2026-10-15  
**Module ID:** `tc-modern-map-browser` (unchanged from v0.2.2)  
**Foundry:** v13 minimum; v14 compatibility declared (live v14 smoke test pending)

## Unofficial personal-use project — creator content required

**This is a catalog and importer, not a map/asset distribution.** It was built for a private World of Darkness campaign. **The software is proprietary and licensed for personal, non-commercial use only. Redistribution, republishing, or distributing modified versions requires the copyright holder's prior written permission.** See [LICENSE.md](LICENSE.md). This project is not affiliated with or endorsed by Tom Cartos / TC Modern, Patreon, or Foundry Gaming LLC.

**To use actual maps:** Obtain the applicable creator's **Foundry Scene packs and artwork separately and lawfully**, through the creator's Patreon at the required tier where applicable, a direct purchase, or an applicable free-content license. Install and enable those creator modules in your own Foundry world. Merely installing this Scene Library will **not** supply any maps, walls, lighting, Regions, teleporters, or assets. Existing map artwork remains hosted in its original separately installed modules.

**Nothing paid is redistributed here.** This repository/release contains the module code and an ID-keyed name/category mapping only—no creator images, Scene/Journal files, compendium packs, subscriber downloads, or credentials. **Do not upload creator content into any repository or release.** Rights to creator content remain with the original owners. A GitHub fork provides neither access to creator files nor permission to redistribute this software or third-party content. Read **[Third-party content and requirements](THIRD-PARTY-CONTENT.md)** before using or publishing a fork.

**Requirements:** A licensed Foundry VTT installation (module declares v13+ and targets v14; live v14 testing remains pending), GM permissions for catalog management, and separately installed/enabled creator Scene compendiums for any maps you wish to import. The module does not require nor handle your Patreon login. **Our code license is proprietary (see [LICENSE.md](LICENSE.md))**. Permission is given for private personal use, not for redistribution. A public GitHub repository permits viewing and on-platform forking under GitHub's terms, but it is not an open-source license or permission to publish copies elsewhere.

## AI-assisted development and experimental status

This project was **substantially developed with assistance from artificial intelligence**, including AI-generated code, documentation and tests. The maintainer directed the project and its intended behavior, but the software **has not undergone comprehensive independent code review or live Foundry v14 verification**. Automated syntax and mock tests do not prove that the module will work reliably in every world, on every Foundry version, or alongside every other module.

**Provided strictly as-is, with no warranty, guaranteed functionality, security assurance, maintenance commitment or support obligation.** Back up your world and existing module installation before testing or updating it. You use it at your own risk. See [LICENSE.md](LICENSE.md) and [TEST-REPORT.md](TEST-REPORT.md).

## What this module does

A GM-only interface for searching TC Modern creator Scene compendiums, browsing category -> actual location -> variant pack -> individual source Scenes, importing only selected variant packs, examining native Region teleport destinations, and importing associated GM-only Journals. It uses Foundry native Scene/Journal/Region documents. Creator packs and all artwork remain in their original modules.

## v0.2.9: GitHub release and publication notices

This update packages the existing v0.2.8 functionality for direct **Foundry manifest installation/updates**, adds explicit AI-development disclosure and the non-commercial personal-use-only proprietary license, and documents the requirement to obtain creator assets independently. **No application behavior or catalog identities changed from v0.2.8.** Live Foundry v14 installation/update testing remains pending. See the [GitHub release notes](RELEASE-NOTES.md) and [installation/rollback guide](UPGRADE-0.2.9.md).

## v0.2.8: Change Category from any location row

Each location in the left-side list now has a **Change Category** button. Choose an existing category (it saves immediately), or **Create new category...** and type a new name. The change applies to **all source Scenes/floors/variants of that one location**, then re-sorts the Scene Library. The result is stored in the existing GM-only per-world `catalogOverrides` setting and survives closing/reopening Foundry. The existing **Catalog tools -> Undo last mapping** restores the prior world mapping after either an inline category change or a CSV import. Export catalog CSV first if you want a longer-term backup of multiple edits.

This updates **catalog labels and destinations for future imports only**. It **never** renames, reimports, moves or modifies imported world Scenes/Journals, world folders, original compendiums, walls, Regions or teleporters. Embassy and News Broadcaster remain under Needs Review until the GM selects their intended category; the module does not guess those destinations.

## Important v0.2.7 change

Previous releases (including v0.2.6) treated each Scene compendium as one location even when it contained several unrelated maps. v0.2.7 bundles a **reviewed ID-keyed catalog of 729 Scenes from 93 source compendiums, grouped into 112 actual locations**. Only metadata and names are bundled, no paid artwork or source Scenes.

Examples:

- **City Streets 03** contains independently browsable **City Park**, **Overflow Channel**, and **Road Bridge**; Road Bridge has its own variant choices.
- **City Streets 05** contains **Beachfront Promenade**, **Vehicle Lockup**, **Maintenance Tunnels**.
- **City Streets 08** contains **Police Roadblock**, **Street Market**, **Parade Route**, and provisional **City Streets 08 - Combined**.
- **Outdoor Park Courts** has Basketball, Futsal, Open, Open / Clean, Tennis, Volleyball as selectable choices.
- Strip Club is **Commercial**; approved spellings include Dusty Skull Cantina, Nakatomi Plaza, Luxury Rooftop Bar, Blast Furnace, Quarantine Checkpoint and McCallister Residence.
- **Embassy** and **News Broadcaster** remain in **Needs Review** (16 Scene rows) until the GM chooses categories.

**Original creator IDs, Scene names, assets and Regions do not change.** Previously imported world Scenes and folders do not move. New imports are placed in the corrected category/location world folders, while keeping their original Scene IDs and source names.

## Installation / upgrade from v0.2.2 through v0.2.8

No intermediate release is required. Back up the existing module folder and Foundry world. **For remote installs, use Foundry Setup's manifest installer; for manual installs, extract the ZIP contents directly into `Z:\Data\modules\tc-modern-map-browser` (the ZIP has `module.json` at its root, without an enclosing folder).** Restart Foundry if you manually copied files; verify module version and enablement and hard-refresh. Do not reinstall the creator modules. Full instructions and rollback: **`UPGRADE-0.2.9.md`**.

## GM workflow

1. Open **Scenes -> TC Modern Library**. Indexing reads active creator Scene compendium indexes, not imported world Scenes.
2. Search or filter the category list, select one **location**, then choose a **variant pack**.
3. Expand **View individual scenes and floors** to inspect the set. Preview the original source name and thumbnail.
4. Click **Import [variant] pack**. A read-only preflight checks native Teleport Token destination UUIDs, adds linked Scenes from the same creator module, checks existing imports and world ID collisions, and previews everything before confirmation.
5. After confirmation, new Scenes are imported with their original Scene IDs into `Scenes / TC Modern / <category> / <location>`. A linked Scene from a second location goes into its *own* correct location folder. Existing Scenes are skipped; a conflicting ID blocks the batch before it writes.
6. Optionally include GM-only source module Journals. Journal imports use the original creator module as their association and skip previously imported Journals. They are never exposed to non-GM users.
7. **Import previewed scene only** remains available. If the original Scene ID is occupied by an unrelated world Scene, this action stops rather than silently generating a new ID.

**Teleporters:** The module retains the native Region/Scene IDs. Links outside the selected creator module or compendium-scoped destinations are warned, not guessed or rewritten. Perform one live teleport test in your Foundry world after the first upgrade.

## Editing / backing up the catalog (GM only)

Expand **Catalog tools** in the header:

- **Export catalog CSV:** Downloads every indexed Scene and the currently active labels, even if you have filtered the list. This is a re-importable backup of your catalog choices (not a backup of world Scenes).
- **Import corrected CSV:** Select a locally saved **CSV UTF-8** file, not XLSX. Matching uses Source Compendium ID + Source Scene ID + Source Key. The tool validates duplicate rows and category conflicts, previews all changes/skipped entries, asks before saving, and changes a **world setting only**. Other worlds retain their own overrides.
- **Undo last mapping:** Restores the world override settings saved before the latest inline category change or CSV import. It does not move/import/remove documents.
- **Organize compendiums / Undo compendium grouping:** Existing optional pack-folder controls, kept separate from catalog mappings and world Scene folders.

Editable CSV columns: Category, Location, Variant Pack, Scene Display Name, Floor; Review Notes is a human reference column. **Do not change `[KEEP]` source identity columns**. Sorting/reordering CSV rows is safe. Missing installed sources are reported and skipped; omitted rows keep their previous mapping. The reviewed catalog is already bundled, so you do **not** need to import a file immediately after installation.

Detailed instructions: **`CATALOG-REVIEW-GUIDE.md`**.

## World data / permissions / rollback

- Updating module source files never reorganizes previously imported world Scenes/Journals/folders. A separate previewable migration would be needed to do that.
- Importing a variant is a deliberate world data modification: back up the world first. Failed imports can be partial and should be resumed after investigating the error; do not delete existing Scenes simply to resolve an ID conflict.
- Creator Scene and Journal compendiums remain untouched. GM map keys remain GM-only.
- Restore the previous backed-up module folder for code rollback; world settings added by v0.2.7 are ignored by v0.2.2 and are not auto-deleted. Reverting actual world document imports requires a matching world backup.

## Testing / boundaries

Run locally with Node 22+:

```sh
for f in scripts/*.mjs; do node --check "$f"; done
node tests/catalog-mapping.test.mjs
node tests/scene-library.test.mjs
```

`TEST-REPORT.md` distinguishes the automated/mock results from pending live Foundry v14 verification. The built-in reviewed catalog applies to the exact source IDs inventoried on 2026-10-14; additional creator modules use safe fallback grouping until separately reviewed. It does not provide artwork for missing locations.

**Owning handoff:** `11-TC-MODERN-SCENE-LIBRARY.md`. Also update `00-START-HERE.md` and `GLOBAL-04-DECISIONS-ROADMAP-RISKS.md` after successful live confirmation. No source/API changes are required in `12-TC-MODERN-ASSET-ACQUISITION.md` or `13-TC-MODERN-ASSET-BROWSER.md`.
