# App workspace

The app provides five sections: Calculator, Encounters, Trainers, Route Items, and Team & Boxes. The live calculator stays mounted when switching sections, preserving the matchup and each section's position.

During startup, the original calculator markup stays invisible until the workspace, profile, and initial tab are assembled. The desktop window waits for both page load and first paint before appearing. If workspace initialization fails, the startup surface displays an error instead of exposing the unfinished layout.

The Theme dropdown offers four identities based on [KM Editor's palettes](https://github.com/KotMatrosk1n/KM-Editor/blob/master/apps/desktop/src/styles.css): Classic (navy and indigo), Renegade (charcoal and crimson), Royal (ivory and gold), and Sovereign (obsidian and amber). Classic is the default. A selection applies immediately and is restored before startup content appears. Tabs, selected rows, fields, menus, notes, and dialogs share the theme, with separate keyboard focus indicators. Speed borders and damage colors retain their battle meanings.

## Calculator

Player and Trainer editors sit beside a damage comparison. The desktop layout fits both populated teams, doubles slot cards, and all four moves without nested scrolling. It uses the available CSS viewport, including Windows display scaling and window chrome, and scales through 4K. Smaller than desktop widths stack the results below the editors.

At larger usable sizes, stats appear inline and all four doubles damage tables are visible. In compact windows, Stats & details opens a dialog, and Slot 1 / Slot 2 switches the result tables. Both arrangements use the same live controls. Choosing a slot or damage result also selects its detailed result. Forms, stat stages, and input values survive resizing.

Battlefield opens a dialog with global weather, terrain, and field effects above matching Me and Opponent grids. Each side retains its own hazards, screens, support effects, and evenly sized Spikes controls. Preferences opens separately. The AI Battle Simulator entry is hidden. Notes remain available, with Clear Notes in the notes window.

Team & Boxes replaces the former scrolling dock. It provides all five destinations and an import column, with larger named sprites, drag-and-drop, and the existing assignment menus. Large collections use pages sized for the available space; searching, sorting, and moving Pokémon retain the underlying collection. Box tools open in a dialog. Import from the calculator opens this full view.

Finder and color-code help open above box tools as native modal dialogs, with topic buttons instead of a scrolling body. Closing help returns focus to its opener. Notes has a larger resizable editor, consistent line-number sizing, and a footer that stays outside the editing area; its position and resize behavior account for workspace scaling. About, help, Notes, and Settings use the selected theme.

Export on either calculator side opens Team & Boxes and selects the generated set text for copying.

Catch logs show eight records per page, keep newly added catches visible, and retain keyboard focus after removing a record. Update release notes use measured pages that preserve all source text. Long editable notes, imported team text, and searchable dropdowns retain normal scrolling.

The profile chooser uses the supplied Royal Sword artwork and labels its author as Creator: Matroskin. Attribution and licensing records remain available in the app's documentation.

The layout follows [Windows responsive-design guidance](https://learn.microsoft.com/en-us/windows/apps/design/layout/responsive-design): adapt to effective window dimensions, reflow controls, and show secondary details when space allows. Controls use consistent heights and spacing within each task.

The shared app shell does not choose mechanics or input policies. Registered profile layouts still run their reversible lifecycle, and the active profile determines generation, EV policy, trainer data, save context, and optional features.

## Profile reference sections

Each reference section has search, filters, a selectable location or trainer list, and a detail view. Arrow keys, Home, and End navigate the section tabs. A profile without bundled reference data displays an empty state instead of another profile's tables.

Reference lists use content-sized rows with separate name and metadata lines. Names wrap inside their selection target. Previous/Next controls and a page selector replace the nested scrolling lists, with page sizes calculated from the available window space. The selected entry and catch controls retain keyboard focus after updates.

Details use the same paging pattern. Trainer teams and route items share aligned card columns; encounter tables split between rows when a compact window cannot display a whole method. Every catch control keeps its original identity and odds continue to use the full encounter method, including entries on other pages. Trainer stats appear directly beneath the moves in six aligned columns. Source evidence and location notes open in dialogs. This follows [Carbon's guidance on readable sizing, spacious data placement and pagination](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines).

The Royal Sword reference includes:

- Encounters grouped by location, method, and weather, with Normal, Royalocke, and Nuzlocke tabs. Each mode has its own saved progress and reset. Normal allows unlimited catches, including repeats of the same species or evolution family. Its checkboxes record catches, show quantities, and remove one record at a time; the catch log adds further copies. Normal never closes a location or adjusts its base odds.
- Royalocke follows the workbook: eight Wild Area pairs share six catches per pair, and Lake of Outrage allows six alone. City of Motostoke allows one fishing encounter and the Aron trade; Town of Hulbury allows one fishing encounter and the Cottonee trade. Route 2 gifts, Route 5's Togepi gift, and Galar Mine No. 2's static encounter share their location's single allowance with its other encounters. Other locations allow one catch. Closing either paired area early closes both, and reopening either clears both manual overrides.
- Nuzlocke allows exactly one encounter per individual location. Gifts, trades, statics, and starters consume that location's same allowance. There are no shared Wild Area allowances or extra city trades, and manual catches require a location.
- In Royalocke and Nuzlocke, caught evolution families are crossed out and disabled everywhere else, including manual catch-log submissions. Missed/used locations do not exclude a family. Exhausted allowances prevent further catches while recorded catches remain removable. A family stays excluded until its last saved catch is removed. Available odds renormalize the full method table after family exclusions; search does not change them. Exhausted allowances, manually closed locations, and special encounters have no available random rate. Weather tables combine the first seven land slots with the three replacement slots.
- Trainer cards include a sprite, levels, held items, abilities, natures, moves, and all six recorded stats inline. Sprites prefer bundled animations, with matching static forms when an animation is unavailable. Workbook names and regional/form variants have explicit sprite mappings. A persistent Beaten checkbox beside the battle format strikes out the trainer in the left list; unchecking restores it. Battle notes remain visible separately from the name. Browsing these tables does not replace the active calculator team or trainer packs.
- Trainer rewards show money and awarded items separately from held items. No verified reward data is currently bundled, so both fields say Not recorded. A trainer can supply `rewards: {money: 12500, items: [{name: "Rare Candy", quantity: 2}]}`; money `0` and an empty item array explicitly mean zero and no items. Missing fields remain unknown.
- A Sword/Shield 1.3.2 base-game item guide covering pickups, gifts, shops, and berry trees. It is not a verified Royal Sword placement list. Edition limits, location corrections, uncertain placements, match explanations, and source links remain attached to the entries. A placement match is not in-game verification, and stored pool weights must not be interpreted as runtime odds.

Bundled reference assets are keyed by the exact profile ID in `window.KMCalculatorReferenceData`. Their fields are rendered as text, not HTML. New datasets must include reviewed provenance and redistribution permission; importing a trainer pack does not implicitly grant it reference tables or executable UI code. No source workbook macros are required by the runtime.

Encounter progress is saved separately for each exact profile ID and mode through the app's storage bridge. Existing runs load into Royalocke only; the other modes start independently. The last selected mode is remembered per profile. Bundled data contains no personal run progress. Royal Sword supplies its own evolution-family registry, including branched evolutions and regional forms, plus explicit aliases for differing encounter spellings. Species absent from the registry use exact-species matching. Royalocke catch-log locations can be left unassigned for a family-only record; Normal permits unassigned records, and Nuzlocke requires a location.

Royalocke allowances are declared in each profile's reference data. Existing saved catches are retained, including those above a newly applied limit. Older records are matched to their allowance from their species and encounter method; unmatched records remain in the catch log with a review message and still exclude their family. Profiles without explicit Royalocke allowance rules use one catch per location and do not inherit Royal Sword's paired areas. Trainer Beaten progress is saved separately per profile and is independent of encounter modes.
