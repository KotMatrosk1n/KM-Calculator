import type * as I from './interface';

import {Generations} from './index';
import {toID} from '../util';

interface SpeciesPatch {
  readonly baseStats?: Readonly<Partial<I.StatsTable>>;
  readonly types?: I.Specie['types'];
}

const SPECIES_PATCHES: Readonly<Record<string, SpeciesPatch>> = {
  Froslass: {baseStats: {atk: 100, spa: 100}},
  Galvantula: {baseStats: {atk: 100, spa: 100, spe: 110}},
  'Lycanroc-Dusk': {types: ['Rock', 'Psychic']},
  'Lycanroc-Midnight': {
    types: ['Rock', 'Dark'],
    baseStats: {hp: 95, atk: 145, def: 55, spa: 35, spd: 55, spe: 102},
  },
  Ninjask: {baseStats: {hp: 70, atk: 105, def: 40, spd: 40}},
};

const SMOKE_BALL: I.Item = Object.freeze({
  kind: 'Item',
  id: toID('Smoke Ball'),
  name: 'Smoke Ball' as I.ItemName,
});

class RoyalSwordSpecies implements I.Species {
  private readonly base: I.Species;
  private readonly patched = new Map<I.ID, I.Specie>();

  constructor(base: I.Species) {
    this.base = base;
    for (const [name, patch] of Object.entries(SPECIES_PATCHES)) {
      const id = toID(name);
      const species = base.get(id);
      if (!species) throw new Error(`Missing Royal Sword base species: ${name}`);
      this.patched.set(id, Object.freeze({
        ...species,
        types: patch.types || species.types,
        baseStats: Object.freeze({...species.baseStats, ...patch.baseStats}),
      }));
    }
  }

  get(id: I.ID) {
    return this.patched.get(id) || this.base.get(id);
  }

  *[Symbol.iterator]() {
    for (const species of this.base) yield this.get(species.id)!;
  }
}

class RoyalSwordItems implements I.Items {
  private readonly base: I.Items;

  constructor(base: I.Items) {
    this.base = base;
  }

  get(id: I.ID) {
    return id === SMOKE_BALL.id ? SMOKE_BALL : this.base.get(id);
  }

  *[Symbol.iterator]() {
    for (const item of this.base) yield item;
    if (!this.base.get(SMOKE_BALL.id)) yield SMOKE_BALL;
  }
}

class RoyalSwordGeneration implements I.Generation {
  readonly num = 8;
  readonly abilities: I.Abilities;
  readonly items: I.Items;
  readonly moves: I.Moves;
  readonly species: I.Species;
  readonly types: I.Types;
  readonly natures: I.Natures;

  constructor(base: I.Generation) {
    this.abilities = base.abilities;
    this.items = new RoyalSwordItems(base.items);
    this.moves = base.moves;
    this.species = new RoyalSwordSpecies(base.species);
    this.types = base.types;
    this.natures = base.natures;
  }
}

const royalSword = new RoyalSwordGeneration(Generations.get(8));

/**
 * Optional data profile for the original Royal Sword mod. Standard Generations remain
 * upstream-faithful; callers must explicitly pass RoyalSwordGenerations.get(8).
 */
export const RoyalSwordGenerations: I.Generations = Object.freeze({
  get(gen: I.GenerationNum) {
    return gen === 8 ? royalSword : Generations.get(gen);
  },
});
