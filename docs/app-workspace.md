# App workspace

The app uses the available window width and provides four sections: Calculator, Encounters, Trainers, and Route Items. The live calculator stays mounted when switching sections, preserving the matchup and each section's scroll position.

## Calculator

Player and Trainer editors sit beside a live damage comparison on wide windows. On smaller windows, results follow the editors. Calculation preferences, battlefield conditions, detailed stats, and box tools expand on demand. Team/Box and Import remain below the matchup, with shortcuts near the page heading. Notes, the profile's optional battle simulator, save import, trainer import, enhanced Singles and Doubles, and generation-specific controls remain available.

The shared app shell does not choose mechanics or input policies. Registered profile layouts still run their reversible lifecycle, and the active profile determines generation, EV policy, trainer data, save context, and optional features.

## Profile reference sections

Each reference section has search, filters, a selectable location or trainer list, and a detail view. Arrow keys, Home, and End navigate the section tabs. A profile without bundled reference data displays an empty state instead of another profile's tables.

The Royal Sword reference includes:

- Encounters grouped by location, method, and weather. Rates are unmodified base slot rates, without personal caught-state or duplicate-family adjustments. Weather tables combine the first seven land slots with the three weather replacement slots. Special encounters have no random rate.
- Trainer teams grouped by story split, with levels, items, abilities, natures, moves, and recorded stats. These are reference tables; browsing them does not replace the active calculator team or trainer packs.
- A Sword/Shield 1.3.2 base-game item guide covering pickups, gifts, shops, and berry trees. It is not a verified Royal Sword placement list. Edition limits, location corrections, uncertain placements, match explanations, and source links remain attached to the entries. A placement match is not in-game verification, and stored pool weights must not be interpreted as runtime odds.

Bundled reference assets are keyed by the exact profile ID in `window.KMCalculatorReferenceData`. Their fields are rendered as text, not HTML. New datasets must include reviewed provenance and redistribution permission; importing a trainer pack does not implicitly grant it reference tables or executable UI code. No source workbook macros are required by the runtime.
