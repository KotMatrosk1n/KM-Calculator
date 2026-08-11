# Upstream calculation baseline

The standard calculation data and mechanics track
[`smogon/damage-calc`](https://github.com/smogon/damage-calc) `master` at commit
`ced3fc6136487b7506f591f181dbb92e4d0ccb68` (2026-08-02).

This audit compared the fork from its shared commit
`1711f7e8d23af7c4727ea81b3ac9375105116e23` through that upstream revision. The
last calculation-package change in that range is
`6287bda767daeee7eec3ad10f70a0f94fbd4e803` (`Implement Gigantamax properly`).

Intentional local differences are kept outside the standard generation data:

- `RoyalSwordGenerations.get(8)` overlays the original Royal Sword species and
  item changes. `Generations.get(1)` through `Generations.get(9)` remain the
  upstream-compatible paths.
- Noncanonical Pokemon Champions generation-zero mechanics and data, along
  with Legends: Z-A additions from the pinned upstream revision, are excluded
  from canonical Generations 1 through 9. Future support belongs in explicit
  profile overlays.
- The public `Pokemon` and `Move` wrappers accept legacy `-Gmax` species names
  used by the existing desktop app and translate them to the upstream
  Gigantamax toggle model.
- Butterfree maps to `G-Max Befuddle`; the compared upstream revision maps it
  to the nonexistent `G-Max Flutterby` move.
- `getFinalSpeed` and `getModifiedStat` remain public for the local battle
  simulator.
