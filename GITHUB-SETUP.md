# Publish TC Modern Scene Library to GitHub — minimal-intervention guide

**Status:** Release v0.2.9 prepared locally; no repository or GitHub Release has been published yet.

## One-time action from the GitHub account owner

1. Open **https://github.com/new** while signed in as `rebsiot`.
2. Repository name: **`tc-modern-map-browser`**. Visibility: **Public** (necessary for ordinary unauthenticated Foundry downloads). Initialize with **Add a README file** (default branch `main`). Choose **no license template**; the prepared project contains a proprietary `LICENSE.md`.
3. Click **Create repository** and tell the assistant **"Created"**. Do not supply passwords, personal access tokens, Patreon files, or assets.

A connected assistant with write access can then upload the vetted source and workflow into that existing repository. If those specific write permissions are unavailable, as a fallback upload the unzipped contents of `repository-files/` to the repository's `main` branch (preserving directories, notably the hidden `.github/workflows/`), using GitHub Desktop or GitHub's upload interface. **Do not upload the outer release-starter ZIP as one file.**

## GitHub's automated release

When `module.json` and `.github/workflows/publish.yml` are committed to `main`, the **Publish Foundry module** GitHub Action automatically:

- Validates JS syntax and runs mocked tests (Node 22); refuses to publish a failing build.
- Builds a clean Foundry-installable ZIP with `module.json` at its root and only allowlisted code, tests, styles and reviewed documentation.
- Refuses to overwrite a release tag/version already published.
- Creates `v0.2.9` and attaches `module.json` and `tc-modern-map-browser.zip`, including the AI/proprietary/creator-license notices.

Monitor the Actions page: https://github.com/rebsiot/tc-modern-map-browser/actions
Once successful, GitHub Releases: https://github.com/rebsiot/tc-modern-map-browser/releases/latest
Foundry's stable manifest URL: https://github.com/rebsiot/tc-modern-map-browser/releases/latest/download/module.json

The release manifest URL **will return 404 until the GitHub Action actually succeeds**. Later versions require incrementing `module.json`'s `version` and committing the code changes and version together; the same action publishes the new version automatically. GitHub's built-in action token manages release uploads; no user PAT, Patreon login, new Foundry server ports, or web-server changes are required.

**Suggested GitHub repository description:** `Unofficial AI-assisted Foundry Scene Library. Proprietary personal-use license; third-party assets required. As-is, no support.`

## Licensing, safety and remaining verification

- **Proprietary, personal non-commercial use only** under `LICENSE.md`. Selling, redistributing, rehosting or publishing changed versions requires written permission. A public GitHub repository still allows on-platform viewing/forking under GitHub's Terms of Service; it cannot prevent copying or guarantee copyright enforceability.
- Creator materials are never included. Users obtain required Scene modules, maps and Patreon/purchased assets independently and lawfully, under each owner's license. See `THIRD-PARTY-CONTENT.md`.
- The software was substantially AI-assisted and is experimental; it is provided as-is without warranty, support commitment or guaranteed working behavior.
- Make a Foundry world backup and save the existing `tc-modern-map-browser` module before changing any installation. See `UPGRADE-0.2.9.md`. Manually installed older builds without a `manifest` URL may need a one-time backed-up Setup reinstall.
- **Automated tests are not a live Foundry test.** Verify GitHub release, manifest install, browse/change-category, and a controlled import/teleport in the user's Foundry v14 world before declaring deployment successful.

Official Foundry background: https://foundryvtt.com/article/module-development/ and https://foundryvtt.com/article/package-management/ .
