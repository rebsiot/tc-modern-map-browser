# TC Modern Scene Library v0.2.9 — October 15, 2026

**Personal, non-commercial use only. Redistribution, selling, commercial use, or publishing modified builds requires the copyright holder's prior written permission.** See [LICENSE.md](https://github.com/rebsiot/tc-modern-map-browser/blob/main/LICENSE.md). This is proprietary, source-available software, not an open-source grant.

**Experimental, AI-assisted software provided as-is.** Code, documentation and tests were substantially developed with AI assistance. No warranty of operation, security, compatibility or maintenance; no support commitment. Local syntax and mock tests passed, **live Foundry v14 verification is still pending**.

**Bring your own authorized creator material:** Compatible Foundry Scene packs, maps and artwork must be obtained separately from their original creators (including the appropriate Patreon tier, purchase or applicable free-use authorization where required) and installed independently. This release distributes **no TC Modern artwork, Scene/Journal compendiums, paid archives, or Patreon credentials**. Neither Foundry Gaming LLC nor TC Modern/Tom Cartos endorses this project. See [third-party content notice](https://github.com/rebsiot/tc-modern-map-browser/blob/main/THIRD-PARTY-CONTENT.md).

### Changes

- **v0.2.9 distribution-only update:** Foundry manifest/ZIP packaging, automated GitHub publication, AI development disclosure, proprietary license and third-party asset notices. **No gameplay/catalog behavior changes compared with v0.2.8.**

- **Change Category** button on each Scene Library location; reclassifies that location and all variants, remembers the world override, and updates the library organization without modifying existing imported Scenes.
- Existing catalog CSV import/export and **Undo last mapping** remain available.
- Reviewed **729 Scene metadata entries** across 93 source compendiums and 112 locations carried forward from v0.2.7. Embassy and News Broadcaster remain **Needs Review** pending user-selected categories.
- GitHub distribution manifest and automated release workflow added; this release contains the module's source code and metadata only.

### Install / upgrade

**Back up the Foundry world and the installed module before changing anything.** In Foundry Setup, install using the manifest URL below. For an existing manually installed module, first check whether Foundry offers a normal update. If it cannot switch the installation to the manifest, use a backed-up uninstall/reinstall of **this library only** (do not uninstall creator content), or wait until you have safe server file access. Do not overwrite world Scenes or folders.

`https://github.com/rebsiot/tc-modern-map-browser/releases/latest/download/module.json`

Manual archive installation: extract ZIP contents into `Data/modules/tc-modern-map-browser/`; `module.json` is at ZIP root. Verify the same module ID after installation, enable it in the intended world, and test one safe library browse and location categorization before importing Scenes.

**Rollback:** Restore the backed-up version of `tc-modern-map-browser` and, if needed, the matching world backup for any imports done after the update. Code rollback alone cannot undo deliberately imported Scenes.
