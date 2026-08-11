// When using this library in the browser, a bundler like Webpack should be
// used to encapsulate the various interdependencies between internal packages.
// However, if you are requiring contents of this package in HTML <script>
// tags, the following loading order is required:
//
//   - util.js
//   - stats.js
//
//   - data/species.js
//   - data/types.js
//   - data/natures.js
//   - data/abilities.js
//   - data/moves.js
//   - data/items.js
//   - data/index.js
//   - data/royal-sword.js (optional Royal Sword profile)
//
//   - pokemon.js
//   - field.js
//   - move.js
//   - items.js
//
//   - mechanics/util.js
//   - mechanics/gen789.js
//   - mechanics/gen56.js
//   - mechanics/gen4.js
//   - mechanics/gen3.js
//   - mechanics/gen12.js
//
//   - calc.js
//   - desc.js
//   - result.ts
//
//   - adaptable.js
//   - index.js
//
// Furthermore, before anything is loaded, the following is required:
//
// <script type="text/javascript">
//		var calc = exports = {};
//		function require() { return exports; };
//	</script>

// If we're not being used as a module we're just going to rely on globals and
// that the correct loading order being followed.

import {Generations} from './data';
import type {State} from './state';
import type * as I from './data/interface';
import * as A from './adaptable';
import {toID} from './util';

// The loading strategy outlined in the comment above breaks in the browser when we start reusing
// names as we're doing here with our shim overrides. Because exporting calculate below tramples
// A.calculate, this ends up infinitely calling itself. As a workaround we save the original value
// of A.calculate (which would be exports.calculate if files are loaded as outlined above) so that
// we can call that instead.
//
// This is obviously kludge, use a bundler kids.
declare const exports: typeof A;
const Acalculate = exports.calculate;

function legacyGigantamaxBase(gen: I.Generation, name?: string) {
  if (gen.num !== 8 || !name?.endsWith('-Gmax')) return undefined;
  const base = name.slice(0, -'-Gmax'.length);
  return gen.species.get(toID(base))?.canGigantamax ? base : undefined;
}

export function calculate(
  gen: I.GenerationNum | I.Generation,
  attacker: A.Pokemon,
  defender: A.Pokemon,
  move: A.Move,
  field?: A.Field
): A.Result {
  return (Acalculate || A.calculate)(
    typeof gen === 'number' ? Generations.get(gen) : gen,
    attacker,
    defender,
    move,
    field
  );
}

export class Move extends A.Move {
  constructor(
    gen: I.GenerationNum | I.Generation,
    name: string,
    options: Partial<Omit<State.Move, 'ability' | 'item' | 'species'>> & {
      ability?: string;
      item?: string;
      species?: string;
      overrideMove?: string;
    } = {}
  ) {
    const generation = typeof gen === 'number' ? Generations.get(gen) : gen;
    const legacyBase = legacyGigantamaxBase(generation, options.species);
    const normalized = {...options};
    if (options.useMax && legacyBase && !options.overrideMove) {
      normalized.useMax = 'gmax';
      normalized.overrideMove = generation.species.get(toID(legacyBase))!.canGigantamax;
    }
    delete normalized.species;
    super(generation, name, normalized as any);
  }
}

export class Pokemon extends A.Pokemon {
  constructor(
    gen: I.GenerationNum | I.Generation,
    name: string,
    options: Partial<Omit<State.Pokemon, 'ability' | 'item' | 'nature' | 'moves'>> & {
      ability?: string;
      item?: string;
      nature?: string;
      moves?: string[];
      curHP?: number;
      ivs?: Partial<I.StatsTable> & {spc?: number};
      evs?: Partial<I.StatsTable> & {spc?: number};
      boosts?: Partial<I.StatsTable> & {spc?: number};
    } = {}
  ) {
    const generation = typeof gen === 'number' ? Generations.get(gen) : gen;
    const legacyBase = legacyGigantamaxBase(generation, name);
    if (legacyBase) {
      super(generation, legacyBase, {
        ...options,
        name: options.name || name,
        isDynamaxed: options.isDynamaxed ? 'gmax' : options.isDynamaxed,
      } as any);
    } else {
      super(generation, name, options as any);
    }
  }

  static getForme(
    gen: I.GenerationNum | I.Generation,
    speciesName: string,
    item?: string,
    moveName?: string
  ) {
    return A.Pokemon.getForme(
      typeof gen === 'number' ? Generations.get(gen) : gen,
      speciesName,
      item as I.ItemName,
      moveName as I.MoveName
    );
  }
}

export function calcStat(
  gen: I.GenerationNum | I.Generation,
  stat: I.StatID | 'spc',
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature?: string
) {
  return A.Stats.calcStat(
    typeof gen === 'number' ? Generations.get(gen) : gen,
    stat === 'spc' ? 'spa' : stat,
    base,
    iv,
    ev,
    level,
    nature
  );
}

export {Field, Side} from './field';
export {Result} from './result';
export {type GenerationNum, type StatsTable, type StatID} from './data/interface';
export {Generations} from './data/index';
export {RoyalSwordGenerations} from './data/royal-sword';
export {toID} from './util';
export {getFinalSpeed, getModifiedStat} from './mechanics/util';
export {type State} from './state';

export {ABILITIES} from './data/abilities';
export {ITEMS, MEGA_STONES} from './data/items';
export {MOVES} from './data/moves';
export {SPECIES} from './data/species';
export {NATURES} from './data/natures';
export {TYPE_CHART} from './data/types';
export {STATS, Stats} from './stats';
