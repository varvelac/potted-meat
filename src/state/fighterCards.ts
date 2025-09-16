import type { Card } from './types';

export const FIGHTER_CARDS: Card[] = [
{
    id: "ftr_cleave", class: "Fighter", usage: "At-Will", cooldownTurns: 0,
    type: "Attack", action: "Standard",
    keywords: ["Weapon","Melee","Multi-target"],
    speed: 2, aimMode: "target_snapshot",
    attackProfile: { kind: "melee_sweep", primaryReach: 1, splash: 1 },
    attackVs: "AC",
    damage: { dice: "2", bonus: 0 },
    effects: [{ name: "mark", durationTurns: 1 }],
    interactionTags: ["bonus_if_adjacent_wall"],
    copiesAllowed: 2
  },
  {
    id: "ftr_reaping_strike", class: "Fighter", usage: "At-Will", cooldownTurns: 0,
    type: "Attack", action: "Standard",
    keywords: ["Weapon","Melee","Reliability"],
    speed: 2, aimMode: "target_snapshot",
    attackProfile: { kind: "melee", reach: 1 },
    attackVs: "AC",
    damage: { dice: "2", bonus: 0 },
    miss: { chip: 1 },
    effects: [],
    interactionTags: [],
    copiesAllowed: 2
  },
  {
    id: "ftr_shield_push", class: "Fighter", usage: "At-Will", cooldownTurns: 0,
    type: "Attack", action: "Standard",
    keywords: ["Weapon","Melee","Control"],
    speed: 1, aimMode: "target_snapshot",
    attackProfile: { kind: "melee", reach: 1 },
    attackVs: "AC",
    damage: { dice: "1", bonus: 1 },
    effects: [{ name: "push_target", tiles: 1 }, { name: "self_shift", tiles: 1 }],
    interactionTags: ["push_into_hazard_bonus"],
    copiesAllowed: 2
  },
  {
    id: "ftr_line_charge", class: "Fighter", usage: "Encounter", cooldownTurns: 3,
    type: "Hybrid", action: "Standard",
    keywords: ["Movement","Weapon"],
    speed: 2, aimMode: "direction_prequeued",
    movement: { tiles: 2, direction: "chosen_line", mustEndAdjacentEnemy: true },
    attackProfile: { kind: "melee", reach: 1 },
    attackVs: "AC",
    damage: { dice: "3", bonus: 0 },
    effects: [],
    interactionTags: ["extra_if_into_wall_or_hazard"],
    copiesAllowed: 1
  },
  {
    id: "ftr_guardian_stance", class: "Fighter", usage: "Encounter", cooldownTurns: 3,
    type: "Utility", action: "Minor",
    keywords: ["Stance","Defense"],
    speed: 1, aimMode: "self",
    effects: [
      { name: "mark_zone", radius: 1, durationTurns: 2 },
      { name: "resist", value: 1, durationTurns: 2, condition: "weapon" }
    ],
    interactionTags: [],
    copiesAllowed: 1
  },
  {
    id: "ftr_brute_finish", class: "Fighter", usage: "Daily", cooldownTurns: 6,
    type: "Attack", action: "Standard",
    keywords: ["Weapon","Melee","High-damage"],
    speed: 4, aimMode: "target_snapshot",
    attackProfile: { kind: "melee", reach: 1 },
    attackVs: "AC",
    damage: { dice: "5", bonus: 1 },
    miss: { halfDamage: true },
    effects: [],
    interactionTags: [],
    copiesAllowed: 1
  },
  { id: "move_step", class: "Fighter", usage: "At-Will", cooldownTurns: 0,
    type: "Movement", action: "Move",
    keywords: ["Movement"], speed: 1, aimMode: "self",
    movement: { tiles: 1, direction: "any" }, effects: [], copiesAllowed: 4
  },
  { id: "move_dash", class: "Fighter", usage: "Encounter", cooldownTurns: 3,
    type: "Movement", action: "Move",
    keywords: ["Movement"], speed: 3, aimMode: "self",
    movement: { tiles: 2, direction: "any", ignoresOpportunity: true },
    effects: [], copiesAllowed: 2
  }
];
