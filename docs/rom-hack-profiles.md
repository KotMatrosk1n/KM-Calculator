# ROM-Hack Profiles

KM Calculator keeps each supported ROM hack in a profile so custom data never leaks into another game or into the canonical generation data.

At startup, the app asks **Which ROM Hack are you playing?** Selecting a tile activates one profile, switches to its base generation, resolves its calculator data provider, filters the trainer list, applies its save-import rules, and enables only the features declared by that profile. The active choice is intentionally not remembered between launches.

## Profile Layers

Each profile declares:

- a stable profile ID, display name, version, and base generation from 1 through 9
- the calculator generation provider or override provider it uses
- the trainer-data pack associated with the profile
- the save-import generation and adapter
- optional profile-only features, such as Royal Sword's Sword/Shield AI simulator
- tile text and icon
- authors, source, license or permission, and attribution notes

Royal Sword is the first bundled profile. It uses canonical Generation 8 as its base and resolves `calc.RoyalSwordGenerations.get(8)` for its custom species, items, and mechanics. A normal numeric Generation 8 lookup remains canonical.

## Adding Trainer-Only Support

For a mod whose battle data matches a canonical generation, create a trainer pack that follows [`trainer-pack-v1.schema.json`](schemas/trainer-pack-v1.schema.json) and test it through **Import Trainer Data**. A single-generation imported pack becomes a selectable tile automatically and uses the canonical calculator data for that generation.

See [Trainer Data Packs](trainer-data-packs.md) and the [example pack](examples/trainer-pack.example.json) for the complete format and attribution requirements.

## Adding A Full Data Overlay

Mods that change species, forms, base stats, types, moves, abilities, items, or damage mechanics need a bundled profile and a generation override provider in addition to a trainer pack.

1. Register the profile in `src/js/data/rom_hacks.js`.
2. Add a calculator `Generation` provider that composes the canonical base generation with the mod's overrides.
3. If the legacy UI needs data not represented by the `Generation` iterables, implement `getLegacyData(kind, base, calc, profile, context)` for `species`, `moves`, `abilities`, `items`, or `types`.
4. Set the profile's trainer pack and save-import generation. If the hack changes its base game's save container, register a stable adapter through `window.KM_SAVE_IMPORT.registerSaveAdapter(...)` and set `saveImport.adapter` to that adapter ID. KM Calculator rejects cross-generation saves before changing Team/Box data.
5. Declare profile-only features explicitly. Do not make another mod inherit Royal Sword behavior by default.
6. Validate the provider, chooser, calculator, trainer data, and save import locally before publication.

The browser registry is exposed as `window.kmRomHackRegistry`. Its stable integration points include `registerProfile`, `registerGenerationProvider`, `registerProfileOverrideProvider`, `activateProfile`, `getActiveProfile`, `getActiveContext`, `getActiveGeneration`, `requestChooser`, and the `kmcalculator:romhackchange` event.

## Data And Credit Requirements

Every bundled or imported profile must identify the people or team who created its data, its public source, and the license or explicit permission that allows redistribution. Keep profile data versioned and isolated. Do not include ROM files, private research, saves, credentials, personal paths, or proprietary assets.
