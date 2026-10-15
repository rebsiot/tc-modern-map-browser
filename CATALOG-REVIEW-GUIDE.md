# TC Modern Scene Catalog: GM review and remapping (v0.2.8)

## Default catalog

The module includes the 2026-10-14 catalog mapping proposal and GM corrections for 729 source Scenes in 93 TC Modern Scene compendiums, grouped into 112 encounter locations. City Streets packs are split into their actual independent locations, not one card per original Foundry module. Source artwork, Regions, journals and Scene IDs never change when a catalog is loaded.

The **Needs Review** category currently contains **Embassy** and **News Broadcaster** (16 Scenes), because their categories were not approved. `City Streets 08 - Combined` is a provisional display name.

## Quick reclassification (no CSV required)

1. As GM, open **Scenes -> TC Modern Library** and find the desired location (for example Embassy).
2. Click **Change Category** directly on that location entry.
3. Select an existing category. The change is saved immediately for **all floors and variants in that location**. To invent a category, select **Create new category...**, type its name and click Save (or press Enter).
4. The library refreshes and sorts the location into the new category. If you were filtering on its former category, the filter switches to All so the edited location stays discoverable.
5. **Catalog tools -> Undo last mapping** reverses the most recent category change. For multiple edits or an off-world backup, first use **Export catalog CSV**.

The GM has not yet specified approved categories for **Embassy** or **News Broadcaster**. Both deliberately remain in Needs Review until classified.

**Scope:** Only per-world catalog mapping settings change. This is NOT a migration of already-imported world Scene folders. Source compendiums/Regions/IDs, existing Scene and Journal records, and teleport links remain untouched. New voluntary imports go into the new category.

## Export for review / backup

1. Open Foundry as GM and select **Scenes -> TC Modern Library**.
2. Wait for all source compendiums to finish indexing. If any pack reports failure, try **Refresh** before exporting.
3. Open **Catalog tools -> Export catalog CSV** to download `tc-modern-scene-catalog-YYYY-MM-DD.csv` (or a filename containing `PARTIAL` when explicitly confirmed).
4. The export includes the full indexed inventory regardless of current search/category filters; one row per source Scene, not one row per creator module.
5. Save that file as a backup before changing or importing another mapping. It is a catalog-label backup, not a Foundry world-data backup.

## Editing in Excel

| CSV column | Usage |
|---|---|
| Category [EDIT] | Your category, e.g. `Commercial`, `City Streets`, `Industrial`. A blank category becomes `Needs Review`. |
| Location [EDIT] | One independent location; use the exact same location name for all its floors/variants. Cannot be blank. |
| Variant Pack [EDIT] | E.g. `Standard`, `Basic`, `Clean`, `Night`, `No Traffic`, `Futsal`. Rows with the same location and variant belong to one selectable pack. |
| Scene Display Name [EDIT] | Label shown in the Scene Library's individual-scene view; creator source name stays unchanged. |
| Floor [EDIT] | Optional floor label, e.g. `01 Lobby`, `Basement`, `Roof`. Empty is allowed. |
| Review Notes [EDIT] | Editorial notes for your own review; not used to group Scenes. |
| Original Source Pack | Original pack label; reference only. |
| Original Scene Name | Original native source title; reference only. |
| Original Image Path | Reference path in installed creator module. Do not copy source art into the software ZIP. |
| Source Compendium ID [KEEP] | **Never change.** Original compendium identity. |
| Source Scene ID [KEEP] | **Never change.** Original Scene document ID. |
| Source Key [KEEP] | **Never change.** Exact `compendiumId:sceneId` identity. |
| Imported In World | Snapshot status at export time; catalog import does not import that Scene. |

The 729-scene reconciliation CSV from the October 14 review contains additional reference columns; these are fine. Import requires the listed `[EDIT]` and `[KEEP]` identity columns but ignores extra historical reference columns.

Examples:

- `City Streets 03` has distinct locations `City Park`, `Overflow Channel`, `Road Bridge`; use `Road Bridge / No Traffic` as its own variant within Road Bridge.
- `City Streets 08` has independent locations `Police Roadblock`, `Street Market`, `Parade Route`, and `City Streets 08 - Combined`.
- `Outdoor Park Courts` holds the basketball/futsal/tennis/volleyball/open court variants.

When editing the category for a multi-floor location, change the entire location's rows consistently. Mixing `Commercial` and `Industrial` within one same-named location in one source compendium is treated as an error and prevents import. It is safe to sort/filter rows and to import a *subset* of the scene rows; unlisted Scenes retain their current labels.

Excel **Save As -> CSV UTF-8 (*.csv)**. Foundry's importer accepts CSV, not `.xlsx`, and understands quoted commas, quotations and multiline Review Notes.

## Import / preview / undo

1. In **Catalog tools**, choose **Import corrected CSV** and select the edited CSV.
2. The import preflight checks `[KEEP]` source identity triples against the *currently indexed* Foundry source compendiums. Duplicate/mismatched IDs and contradictory location/category assignments block the operation. Missing/unavailable source Scenes are reported and skipped, not invented.
3. Review the number of changes, examples, and skipped sources. Click Confirm only when satisfied.
4. Foundry saves only **world-level catalog override settings**. It also stores the previous setting for **Undo last mapping** (also used by Change Category). No Scene/Journals, world folders, original compendiums or Region/teleporter UUIDs are edited.
5. You can use **Undo last mapping** for the previous version of the world mapping, or re-import your exported CSV backup.

No automatic reorganization of previously imported world Scenes is provided. New voluntary Scene imports will use the updated category/location folder labels, preserving the source IDs and native data. For a full Foundry world rollback, restore your backed-up world snapshot.
