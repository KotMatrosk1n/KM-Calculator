# Credits

KM Calculator was created and is maintained by Matroskin as a multi-generation damage calculator and ROM-hack platform.

Repository: <https://github.com/KotMatrosk1n/KM-Calculator>

The KM Calculator name, desktop integration, ROM-hack profile framework, trainer-pack framework, and bundled Royal Sword integration are maintained by Matroskin. The current KM Calculator icon was provided by the project maintainer.

## Bundled ROM-Hack Profiles

### Pokémon Royal Sword

- Profile, calculation overlay, mechanics integration, and bundled trainer data: Matroskin
- Base calculation generation: Generation 8
- Redistribution terms for the bundled profile code and data: [MIT](LICENSE)

Royal Sword is the first bundled profile. Its data is kept separate from canonical Generation 8 so it does not change standard generation lookups or future ROM-hack profiles.

## Damage Calculator Lineage

KM Calculator is built on the [Smogon Pokémon damage calculator](https://github.com/smogon/damage-calc), distributed under the MIT License.

- Original calculator: Honko
- Primary upstream maintainers: Austin and jetou
- Generations 1–6 implementation: Honko
- Omega Ruby and Alpha Sapphire update: gamut-was-taken and Austin
- Generation 7 update: Austin
- Generation 8 update: Austin and Kris
- Generation 9 update: Austin and Kris
- Pokémon Showdown-style CSS: Zarel
- Additional work: the broader [Smogon damage-calc contributor community](https://github.com/smogon/damage-calc/graphs/contributors)

The canonical calculation engine currently tracks the upstream revision documented in [`calc/UPSTREAM.md`](calc/UPSTREAM.md). KM Calculator's Royal Sword data overlay and compatibility shims are intentional local extensions.

## Data, Save-Format, And Workflow Sources

### Pokémon Showdown

[Pokémon Showdown](https://github.com/smogon/pokemon-showdown), created by Guangcong Luo and maintained by its contributors, is used for permissively licensed name data and as the source of the Pokémon sprite directories downloaded for desktop packaging. Its source code and applicable data are distributed under the MIT License. Sprite artwork and other media remain subject to their own rights; see the [Pokémon Showdown credits](https://pokemonshowdown.com/credits).

### PokéAPI

[PokéAPI](https://github.com/PokeAPI/pokeapi), by Paul Hallett and PokéAPI contributors, supplies permissively licensed factual game-index and growth-rate data used by the generated save-import lookup bundle. That data is used under the BSD 3-Clause License.

The pinned Pokémon Showdown and PokéAPI revisions and their complete license notices are recorded in [`import/THIRD_PARTY_NOTICES.md`](import/THIRD_PARTY_NOTICES.md).

### PKHeX

[PKHeX](https://github.com/kwsch/PKHeX), by kwsch and contributors, is a GPL-3.0 project used as an external behavioral compatibility reference when auditing save families, entity layouts, offsets, and expected parsing results. The PKHeX application is not intentionally bundled. Save-import source and data provenance are reviewed separately; PKHeX attribution alone is not a claim that every compatibility constant has independent provenance.

One pre-existing 127-byte Switch save-container interoperability constant remains isolated in the importer with unresolved historical provenance. It is documented for legal review rather than being represented as permissively licensed implementation code.

### ForwardFeed Run & Bun Calculator

[ForwardFeed/runbuncalc](https://github.com/ForwardFeed/runbuncalc), distributed under the MIT License, was consulted for Team/Box and related calculator workflow ideas. KM Calculator does not ship the Run & Bun AI model or its rules data.

## Bundled Libraries And Build Tools

- [jQuery 1.9.1](https://jquery.com/) — jQuery Foundation and contributors, MIT License
- [Select2 3.4.5](https://github.com/select2/select2) — Igor Vaynberg and contributors, Apache License 2.0 or GPL-2.0 dual-license terms as distributed in the bundled file
- [normalize.css 3.0.2](https://github.com/necolas/normalize.css) — Nicolas Gallagher and Jonathan Neal, MIT License; bundled in the legacy stylesheet named `bootstrap.css`
- [Bootstrap](https://github.com/twbs/bootstrap) — Twitter and Bootstrap contributors, MIT License; the bundled legacy stylesheet includes Bootstrap-derived component CSS, but its exact upstream release is not recorded
- [Electron](https://github.com/electron/electron) — OpenJS Foundation and Electron contributors, MIT License
- [electron-builder](https://github.com/electron-userland/electron-builder) and [electron-updater](https://github.com/electron-userland/electron-builder) — Electron Userland contributors, MIT License
- [electron-winstaller](https://github.com/electron/windows-installer) — Electron contributors, MIT License
- [WiX Toolset v7](https://wixtoolset.org/) - FireGiant, .NET Foundation, and WiX contributors; used to build the MSI and Burn bundle, which embeds the WiX Burn engine and WixStdBA runtime. WiX source is available under the [Microsoft Reciprocal License](https://github.com/wixtoolset/wix/blob/main/LICENSE.TXT), while obtaining and using the v7 build packages is separately subject to the [Open Source Maintenance Fee EULA](https://wixtoolset.org/osmf/). EULA acceptance is an external build-environment decision and is not recorded by this repository.
- [TypeScript](https://github.com/microsoft/TypeScript) — Microsoft and contributors, Apache License 2.0
- [ESLint](https://github.com/eslint/eslint) — JS Foundation and contributors, MIT License
- [`@pkmn/eslint-config`](https://github.com/pkmn/ps) — pkmn contributors, MIT License
- [subpkg](https://github.com/scheibo/subpkg) — Kirk Scheibelhut, MIT License

The package manifests and lockfiles record the installed dependency versions and transitive package graph. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the generated dependency-license inventory; each distributed dependency remains subject to its own license and notice requirements.

## Pokémon And Third-Party Assets

Pokémon names, character names, game titles, trademarks, and artwork are owned by their respective rights holders. KM Calculator is an unofficial fan-made tool and is not affiliated with or endorsed by Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company, or the creators of third-party supported ROM hacks.

The [KM Calculator MIT License](LICENSE) applies to the project source covered by that license. Third-party code, generated data, external references, and artwork remain under their own licenses and applicable rights.
