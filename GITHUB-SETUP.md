# GitHub and Foundry updates — TC Modern Scene Library

**Repository:** https://github.com/rebsiot/tc-modern-map-browser  
**Module ID:** `tc-modern-map-browser` (unchanged)  
**Current source release:** v0.2.11 (live Foundry v14 verification still pending)

## Install or update via Foundry Setup

1. Back up the Foundry world and the existing Scene Library module directory first.
2. In **Foundry Setup → Add-on Modules → Install Module**, use `https://github.com/rebsiot/tc-modern-map-browser/releases/latest/download/module.json` for a fresh install. For a pinned v0.2.11 install, use `https://github.com/rebsiot/tc-modern-map-browser/releases/download/v0.2.11/module.json`.
3. Future versions published via GitHub can be obtained through Foundry's normal Update option. **Enablement is managed per world**, not by GitHub; check **Game Settings → Manage Modules**.
4. Manually installed older copies may require a backed-up one-time transition as described in `UPGRADE-0.2.11.md`.

## Publishing process

Commits to `main` that change `module.json` trigger `.github/workflows/publish.yml`. The action runs Node syntax/tests, builds a complete root-manifest ZIP via `release-tools/build_release.py`, refuses to overwrite an existing release version and attaches `module.json` and `tc-modern-map-browser.zip` to a tag-specific GitHub release.

The `module.json` **version**, release tag, pinned download URL and ZIP need to match. A successful GitHub Action is not proof of a successful live Foundry upgrade. Keep `LICENSE.md`, `THIRD-PARTY-CONTENT.md`, the AI disclosure and release test limitations intact; never publish creator art, Patreon archives, subscriber credentials or world/character data. The software is proprietary and provided as-is.
