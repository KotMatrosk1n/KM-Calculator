import {Field} from './field';
import type {Generation} from './data/interface';
import type {Move} from './move';
import type {Pokemon} from './pokemon';
import {calculateRBYGSC} from './mechanics/gen12';
import {calculateADV} from './mechanics/gen3';
import {calculateDPP} from './mechanics/gen4';
import {calculateBWXY} from './mechanics/gen56';
import {calculateSMSSSV} from './mechanics/gen789';

const MECHANICS = {
  1: calculateRBYGSC,
  2: calculateRBYGSC,
  3: calculateADV,
  4: calculateDPP,
  5: calculateBWXY,
  6: calculateBWXY,
  7: calculateSMSSSV,
  8: calculateSMSSSV,
  9: calculateSMSSSV,
};

export function calculate(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field?: Field,
) {
  return MECHANICS[gen.num](
    gen,
    attacker.clone(),
    defender.clone(),
    move.clone(),
    field ? field.clone() : new Field()
  );
}
