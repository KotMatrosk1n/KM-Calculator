# Trainer Data Packs

KM Calculator trainer packs let mod authors and community maintainers distribute trainer teams without editing the calculator's built-in data file.

## Format

A pack is a UTF-8 JSON file that follows `docs/schemas/trainer-pack-v1.schema.json`. Start with `docs/examples/trainer-pack.example.json`.

Every pack declares:

- the schema and schema version
- a stable pack ID and version
- one generation or a list of supported generations
- the mod, game, or project represented by the data
- credited authors
- a public source URL
- the license or permission governing redistribution
- one or more trainer records and their Pokemon

`profileId` is optional and defaults to the pack ID. It associates the trainers with one ROM-hack tile so two hacks built on the same base generation never mix their trainer lists.

KM Calculator requires attribution fields so a trainer pack cannot silently separate community data from its creators and source project.

Trainer and Pokemon records may target legacy or modern games. Stat maps accept either calculator keys (`at`, `df`, `sl`, `sa`, `sd`, `sp`) or common keys (`atk`, `def`, `spc`, `spa`, `spd`, `spe`). Schema version 1 supports Single and Double battle teams.

A standalone imported mod pack should declare one base generation. KM Calculator then creates a selectable ROM-hack tile for it and layers the pack's trainers over that generation. A pack whose `profileId` matches an already installed profile can supplement that profile instead of creating another tile.

## Importing A Pack

1. Open **Import / Export**.
2. Choose **Import Trainer Data**.
3. Select the pack JSON file.
4. Review the pack name, version, author, source, and imported trainer count shown by the calculator.

Imported packs are saved in the desktop app's local storage and filtered to their declared generation. Importing the same pack ID again replaces that imported version. Built-in packs cannot be overwritten by an imported file.

Use **Remove Imported Trainer Data** to clear community packs without changing the built-in data.

## Preparing Data For Bundling

Import the pack locally first and verify every trainer in each declared generation. Species, forms, moves, abilities, items, levels, IVs, DVs, EVs, battle types, and generation boundaries should match the source mod.

Before bundling another project's data in KM Calculator, confirm that its author and redistribution terms allow inclusion. Keep the author names, source URL, license or permission statement, and pack version intact. Add the project to the public credits when the pack becomes part of a release.

Do not include ROM data, save files, private research, local paths, credentials, or copied proprietary assets in a trainer pack.
