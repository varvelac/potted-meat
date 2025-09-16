// -------------------------
// Identifiers & Core Types
// -------------------------

export type ActorID = 'A' | 'B';

export interface Board {
  w: number;
  h: number;
  tiles: Tile[][];
}

export interface Tile {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'nexus' | 'hazard';
  occupiedBy?: ActorID | null;
  hazard?: {
    kind: 'fire' | 'smoke' | 'holy' | 'spikes';
    expiresOnTick: number;
  } | null;
  blocksLOS?: boolean;
  blocksMovement?: boolean;
}

// -------------------------
// Actor
// -------------------------

export interface Actor {
  id: ActorID;
  team: 'A' | 'B';
  hp: number;
  maxHp: number;
  pos: { x: number; y: number };
  statuses: Status[];
  facing?: 'up' | 'down' | 'left' | 'right'; // added: token front direction
}

export interface Status {
  name: string;
  value?: number;
  expiresOnTick?: number;
}

// -------------------------
// Card Schema
// -------------------------

export type Usage = 'At-Will' | 'Encounter' | 'Daily';
export type CardType = 'Attack' | 'Movement' | 'Utility' | 'Hybrid';
export type ActionType = 'Standard' | 'Move' | 'Minor' | 'Immediate';
export type AimMode = 'direction_prequeued' | 'target_snapshot' | 'self';

export interface Card {
  id: string;
  class: 'Fighter';                // for now, only Fighter
  usage: Usage;
  cooldownTurns: number;
  type: CardType;
  action: ActionType;
  keywords: string[];
  speed: number;                   // lower = faster
  aimMode: AimMode;
  copiesAllowed: number;

  // Attack profile
  attackProfile?: (
    | { kind: 'melee'; reach: 1 | 2 }
    | { kind: 'melee_sweep'; primaryReach: 1; splash: 1 }
    | { kind: 'ranged_target'; range: number }
    | { kind: 'projectile_line'; range: number; projectileSpeed: number }
    | { kind: 'close_blast'; size: number }
  );
  attackVs?: 'AC' | 'Fortitude' | 'Reflex' | 'Will';
  damage?: { dice: string; bonus: number };
  miss?: { halfDamage?: boolean; chip?: number } | null;

  // Movement
  movement?: {
    tiles: number;
    direction: 'any' | 'chosen_line';
    beforeAttack?: boolean;
    ignoresOpportunity?: boolean;
    mustEndAdjacentEnemy?: boolean;
  };

  // Zone / conjurations
  zone?: {
    shape: 'square' | 'burst';
    size: number;
    durationTurns: number;
    blocksLOS?: boolean;
    friendlyHealEachTurn?: number;
    enemyDotEachTurn?: number;
  } | null;

  // Effects (marks, buffs, etc.)
  effects?: Effect[];
  interactionTags?: string[];
}

export interface Effect {
  name: string;
  value?: number;
  tiles?: number;
  radius?: number;
  durationTurns?: number;
  condition?: string;
}

// -------------------------
// Queued Play
// -------------------------

export interface QueuedPlay {
  card: Card;
  dir?: { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }; // set by radial for moves/lines
  targetSnapshot?: { x: number; y: number }; // for target_snapshot
}

// -------------------------
// Team & Match State
// -------------------------

export interface TeamState {
  actorId: ActorID;
  deck: Card[];
  drawPile: Card[];
  discard: Card[];
  hand: Card[];
  queue: QueuedPlay[];
  vp: number;
}

export interface MatchState {
  mode: 'Queue3' | 'SingleCard';
  board: Board;
  actors: Record<ActorID, Actor>;
  teamA: TeamState;
  teamB: TeamState;
  round: number;
  tick: number;
  handMax: number;
  rng: () => number;
  winner: ActorID | null;
}
