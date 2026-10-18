# TC Modern Scene Library

**Find a location → choose a scene variant → import only the Scene(s) you need and, optionally, the matching GM Journal.** This is a GM-side browser for **TC Modern creator compendiums you already obtained and installed**. It does **not** supply or redistribute paid maps, artwork, Scene packs or Journal content.

## What you can do

- **Search** installed TC Modern Scene compendiums by location, map or variant; filter by category, **Not yet imported**, or **Teleporters only**.
- Browse **category → location → variant pack → individual Scene/floor**, preview the selected map, and **Import previewed scene only** or import a variant pack with linked floors after a preflight review.
- Optionally **Include associated GM Journals** on import. Imported map keys are intended to remain GM-only.
- Use **Change Category** beside a location to reorganize the *browser catalog* without changing already imported world Scenes. **Catalog tools → Undo last mapping** restores the previous catalog mapping.
- Use **Catalog tools → Export catalog CSV** to back up or review labels; **Import corrected CSV** previews catalog changes. These operations are not world Scene backups.

## Requirements and compatibility

- Foundry VTT v13 or later (v14 targeted). **The current release has automated/mock testing; live v14 import, Journal-permission and teleporter checks remain pending.** No WoD20 game-system dependency is required.
- GM permissions in your world, plus separately **lawfully obtained and installed TC Modern creator Scene compendiums** for any maps you want to use. Depending on the creator pack, access may require a relevant Patreon tier, an independent purchase, or permission under a free-content license.
- This software contains **no paid creator maps, Scenes, Journals, compendiums, previews or credentials**. Creator modules remain the source of their own assets. See [Third-party content](THIRD-PARTY-CONTENT.md).

## Install or update

1. **Back up your Foundry world and your installed `tc-modern-map-browser` module folder** before updating. Keep your last working ZIP. An optional **Catalog tools → Export catalog CSV** also backs up category choices.
2. From **Foundry Setup → Add-on Modules → Install Module**, supply the [stable manifest URL](https://github.com/rebsiot/tc-modern-map-browser/releases/latest/download/module.json) if installing for the first time. For a specific build, use the [v0.2.11 manifest](https://github.com/rebsiot/tc-modern-map-browser/releases/download/v0.2.11/module.json).
3. If you already installed the module through GitHub, use Foundry's module **Update** option when available. For older manual installs without an update URL, follow the [backup-safe transition guide](UPGRADE-0.2.11.md); do not uninstall creator content.
4. Enable **TC Modern Scene Library** in the world under **Game Settings → Manage Modules**, then refresh the client. The unchanged internal module ID is `tc-modern-map-browser`.

## First use (GM)

1. In a world with authorized creator compendiums installed, open **Scenes → TC Modern Library**.
2. Use **Search locations, maps or variants...** and **All categories** to find a location; select it from **Creator locations** on the left.
3. Under **Choose a variant pack**, select the desired variant. Open **View individual scenes and floors** to choose and preview a particular Scene.
4. To import just that Scene, click **Import previewed scene only**. Alternatively click **Import [variant] pack** to review the linked Scenes before accepting. Check **Include associated GM Journals** if you want matching map keys when offered.
5. Verify the imported Scene in your **Scenes** directory. If the Scene includes teleporters, test the intended destination in a controlled world; check the Journal permissions with a non-GM client before relying on them.

**Other useful controls:** **Change Category** is beside each location. **Catalog tools** (in the library header) holds **Export catalog CSV**, **Import corrected CSV**, **Undo last mapping**, and optional compendium organization. The **Auto-open GM journal** checkbox controls whether matching Journals pop up as you change viewed Scenes.

## Important behavior and limitations

- The module attempts to preserve creator Scene IDs, Region/teleporter UUID references and matching GM Journal access. It checks for import collisions and previews linked Scene imports. **Live teleport behavior, full GM/player permissions and existing/manual-install upgrades have not been confirmed on Foundry v14 for this release.**
- Changing a location's category changes browsing and **future** import destinations only. It does **not** move, rename, delete or migrate Scenes or Journals already in your world.
- Existing creator compendiums and artwork are not modified. Import selected locations only; do not bulk-import all creator packs.
- **Installed is not enabled:** a successful Setup download does not enable the module in a world. Confirm its checkbox in **Manage Modules**.

## License, creator rights, AI development, support

**Proprietary personal, non-commercial use only.** Copyright © 2026 rebsiot. Selling, republishing, mirroring, distributing, or sharing modified builds requires the copyright holder's prior written permission. A public GitHub repository is **not** an open-source license. See [LICENSE.md](LICENSE.md).

The software was **substantially developed with AI assistance**, including code, documentation and tests. It is an unofficial, experimental personal project, **provided as-is, with no warranty, guarantee of functionality or support/maintenance obligation**. It is not endorsed by Foundry Gaming LLC, Tom Cartos / TC Modern, or Patreon. Obtain each third-party creator's content separately and follow their terms; using or forking this software does not grant rights to those assets. See [Third-party content and creator requirements](THIRD-PARTY-CONTENT.md).

## Updates and details

- [Latest release](https://github.com/rebsiot/tc-modern-map-browser/releases/latest) · [Changelog](CHANGELOG.md) · [Testing and unverified items](TEST-REPORT.md)
- [Installation and rollback](UPGRADE-0.2.11.md) · [Catalog details](CATALOG-REVIEW-GUIDE.md)
- [Issues](https://github.com/rebsiot/tc-modern-map-browser/issues) are available for reports, but no response, fix, or support commitment is made.
