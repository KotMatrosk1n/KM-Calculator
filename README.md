# KM Calculator

![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078D6)
![Built with](https://img.shields.io/badge/built%20with-Electron%2042-47848F)
![Calculation engine](https://img.shields.io/badge/calculation%20engine-Generations%201--9-red)
![Bundled profile](https://img.shields.io/badge/bundled%20profile-Royal%20Sword-blue)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

KM Calculator is a Windows desktop damage calculator built for Pokémon ROM hacks and the game generations beneath them.

It keeps each hack's trainers, calculation data, save rules, input policies, layout, and optional tools inside an explicit profile. That makes Royal Sword the first supported game, not the boundary of the calculator.

Different hacks can share a generation. Their data should never share a namespace by accident.

[Learn about ROM-hack profiles](docs/rom-hack-profiles.md) | [Browse release history](https://github.com/KotMatrosk1n/KM-Calculator/releases) | [Report an issue](https://github.com/KotMatrosk1n/KM-Calculator/issues/new/choose)

## Calculate Across Generations And ROM Hacks

KM Calculator's canonical calculation foundation covers Generations 1 through 9. An installed ROM-hack profile chooses its base generation, then layers only that hack's species, forms, stats, types, moves, abilities, items, trainers, save-import rules, and special features over the canonical data it actually changes.

Every launch begins with **Which ROM Hack are you playing?** The available tiles come from installed profiles. Royal Sword is currently bundled and loads its data over Generation 8. A **Change ROM Hack** control lets you return to the chooser without restarting the app.

Profiles use the standard damage-calculator layout unless bundled code explicitly selects a registered custom layout. The standard layout keeps the original calculator's generation-appropriate IV, DV, EV, level, set, field, and format controls, then adds KM Calculator's shared workflow tools. Every profile receives Team/Box, Player Notes and Clear Notes, the trainer dropdown and trainer team sprites, save import and border controls, and the enhanced Singles and Doubles experience. While a profile is active, its generation is locked to the base generation declared by that profile.

Royal Sword explicitly selects its custom arrangement and independently disables EV input. Its layout can reposition the shared workflow tools, but those tools are not Royal Sword-only features. Royal Sword also includes its trainer data and Sword/Shield battle simulator. Those profile-specific choices do not pass to another hack unless its own bundled profile declares them.

Community trainer packs can be imported without editing the built-in data files. A single-generation pack can become its own selectable tile and use that generation's canonical calculation data and standard layout, while a full game-data mod can register a dedicated overlay provider. Imported JSON cannot select or execute a custom layout.

## Your Data Stays Under Your Control

Save files and trainer-pack JSON are read locally by the desktop app. They are not uploaded to a server. Imported trainer packs and Team/Box state are stored in the app's local data, and each trainer pack keeps its author, source, version, and redistribution terms attached.

The selected ROM hack is intentionally requested again on every launch. Switching profiles reloads the associated generation and rebuilds the active species, move, ability, item, trainer, and feature views so one hack's overrides do not leak into another.

If a save format or modded layout cannot be recognized safely, import stops instead of guessing. Hacked saves that change the base game's storage layout may require a profile-specific adapter.

## Supported Coverage

| Area | Current coverage |
| --- | --- |
| Calculation engine | Canonical Pokémon Generations 1 through 9 |
| Bundled ROM-hack profile | Pokémon Royal Sword over Generation 8 |
| Profile layouts | Standard calculator layout by default; bundled Royal Sword custom layout |
| Shared profile workflows | Team/Box; Player Notes and Clear Notes; trainer dropdown and team sprites; save import and border controls; enhanced Singles and Doubles |
| Trainer data | Built-in profile packs and attributed `trainer-pack-v1` JSON imports |
| Main-series save families | R/B/Y; G/S/C; R/S/E and FR/LG; D/P/Pt and HG/SS; B/W and B2/W2; X/Y and OR/AS; S/M and US/UM; LGPE; Sw/Sh; BD/SP; Legends: Arceus; S/V; Legends: Z-A |
| Standalone Pokémon files | `.pk1` through `.pk9`, `.pb7`, `.pb8`, `.pa8`, `.pa9`, and their supported encrypted variants |
| Profile-only tools | Royal Sword Sword/Shield battle simulator |

Format-family recognition does not make every species or form available in every calculator profile. An import stops before replacing Team/Box data when a supported entry cannot be resolved through the active profile.

Save compatibility depends on the exact regional dump, storage layout, game update, and third-party tool involved. Keep a backup of the original save before importing it anywhere.

## Getting Started

1. Build KM Calculator from source using the instructions below.
2. Open the generated desktop app.
3. At **Which ROM Hack are you playing?**, choose **Pokémon Royal Sword** or another installed profile.
4. Select the trainer or Pokémon sets you want to compare and configure the battle field.
5. Use **Import / Export** to load a compatible save, import community trainer data, or move sets into Team/Box.
6. Use **Change ROM Hack** whenever you need to return to the startup chooser.

KM Calculator does not include ROM files, console keys, save files, or private mod data. You are responsible for obtaining and using game data in compliance with applicable law.

Packaged KM Calculator builds do not require Node.js, Git, a web server, or a separate backend. The generated `dist/` directory is the packaged interface, not a separately supported hosted site.

## Trainer Data And Community Mods

A trainer pack is a UTF-8 JSON file that identifies its game or mod, base generation, authors, public source, license or redistribution permission, and trainer teams. KM Calculator validates the pack before storing it and prevents an imported file from replacing a bundled pack. Trainer-pack JSON is data only: a custom profile layout requires a reviewed, bundled code provider.

| What do you need? | Start here |
| --- | --- |
| Import or author trainer data | [Trainer Data Packs](docs/trainer-data-packs.md) |
| Validate a trainer pack | [Trainer Pack v1 Schema](docs/schemas/trainer-pack-v1.schema.json) |
| Start from a working file | [Example Trainer Pack](docs/examples/trainer-pack.example.json) |
| Add a full calculation overlay | [ROM-Hack Profiles](docs/rom-hack-profiles.md) |
| Review the upstream calculation baseline | [Calculation Upstream Notes](calc/UPSTREAM.md) |
| Review project and data acknowledgements | [Credits](CREDITS.md) |

Before bundling another person's data, confirm that redistribution is allowed and preserve the creator names, source, license or permission, and pack version. Trainer packs must not contain ROM data, save files, credentials, private research, or local filesystem paths.

## Updates And Network Use

Installed releases check GitHub for newer versions and can guide the user through a supported update. Packaging also downloads the Pokémon sprite set used by the desktop app from Pokémon Showdown when preparing a build.

Update checks contact GitHub. The build-time sprite download contacts Pokémon Showdown. Save files, trainer packs, calculations, notes, and Team/Box data remain local and are not uploaded by either request.

## Building From Source

The existing release history predates the KM Calculator rebrand. Until a KM Calculator build is published, use the following steps to work on the source or create a local desktop build.

Development currently requires:

- Windows 10 or Windows 11 on x64
- Git
- Node.js 24 or a later compatible release
- npm
- PowerShell 7 (`pwsh`)
- .NET SDK 8 or later
- Windows 10 or 11 SDK `signtool.exe` plus a trusted code-signing PFX for release builds

Clone the repository and install the locked dependencies:

```powershell
git clone https://github.com/KotMatrosk1n/KM-Calculator.git
Set-Location .\KM-Calculator

npm ci
```

Start the desktop development build:

```powershell
npm run electron:dev
```

Build the Windows installer:

```powershell
npm run electron:pack
pwsh -NoProfile -File installer/windows/scripts/Build-KmCalculatorWindowsSetup.ps1 -AcceptWixEula
```

The Windows installer uses WiX Toolset v7. WiX requires explicit acceptance of its OSMF EULA; review [the WiX OSMF terms](https://wixtoolset.org/osmf/) before supplying `-AcceptWixEula`. Automated release builds fail closed unless an authorized repository environment sets `WIX_V7_EULA_ACCEPTED=true`.

Local builds may be unsigned. Release builds are fail-closed and require a password-protected code-signing PFX: the build signs and verifies the stamped application executable, MSI, embedded Burn bundle, and public launcher with SHA-256 plus an RFC 3161 timestamp. The exact certificate subject is written into the packaged `app-update.yml`, so `electron-updater` rejects an installer signed by a different publisher. GitHub Actions expects `KM_WINDOWS_SIGNING_CERTIFICATE_BASE64` and `KM_WINDOWS_SIGNING_CERTIFICATE_PASSWORD` secrets and never publishes when either credential or any signature is missing.

The generated Burn setup, `latest.yml`, checksums, smoke-test output, and local build logs remain in ignored local paths and are not source files. See [Windows setup documentation](installer/windows/README.md) for the installer identity, signing controls, migration safeguards, and updater argument contract.

Before submitting a change, build the app and check the public source:

```powershell
npm run build
npm run lint
npm run check:workspace
npm run check:third-party-notices
```

The root `package.json` contains the current development, build, and packaging commands.

## Contributing

KM Calculator is open source, and focused fixes, compatibility reports, trainer-pack contributions, and carefully sourced ROM-hack profiles are welcome.

New profile work should keep canonical generation data untouched, be validated locally, and document every bundled data source and author. Found a bug or have a feature request? [Open an issue](https://github.com/KotMatrosk1n/KM-Calculator/issues/new/choose).

Read the [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a change. Direct project contributions are recorded in [Contributors](CONTRIBUTORS.md), while inherited and third-party work remains documented in [Credits](CREDITS.md).

Suspected vulnerabilities should be reported privately through the [Security Policy](SECURITY.md), not through a public issue or pull request.

## Third-Party Assets And Project Status

KM Calculator is built on the Smogon damage calculator and uses data or compatibility references from Pokémon Showdown, PokéAPI, PKHeX, and the projects listed in [Credits](CREDITS.md). The [Dependency Notices](THIRD_PARTY_NOTICES.md) inventory the JavaScript dependency trees and bundled browser libraries; source-revision notices for generated save-import data are kept separately in [Save-Import Third-Party Notices](import/THIRD_PARTY_NOTICES.md).

Pokémon sprites are downloaded from Pokémon Showdown's public `gen5` and `ani` directories for desktop packaging. The [Pokémon Showdown credits](https://pokemonshowdown.com/credits) document contributing artists and upstream sources. These assets are excluded from KM Calculator's MIT license, and this repository does not grant additional rights to them.

KM Calculator is an unofficial fan-made project and is not affiliated with or endorsed by Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company, or the creators of third-party supported ROM hacks. Pokémon names, trademarks, and artwork belong to their respective owners.

KM Calculator source code is distributed under the [MIT License](LICENSE). Third-party code, data, references, and assets remain subject to their own applicable licenses and terms.
