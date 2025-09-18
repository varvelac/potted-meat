// -------------------------
// Identifiers & Core Types
// -------------------------

// ActorID is a string so the game can support arbitrary player IDs (A, B, C, ... or UUIDs).
export type ActorID = string;

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
  // Use ActorID here so an actor's team/owner can be any player id string.
  team: ActorID;
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
  // Use a dynamic teams map instead of fixed teamA/teamB so this supports
  // N players in future.
  teams: Record<ActorID, TeamState>;
  round: number;
  tick: number;
  handMax: number;
  rng: () => number;
  winner: ActorID | null;
}

//////////-------------------------
// Socket.io Types
// -------------------------

export const PROTOCOL_VERSION = 1 as const;

export type RoomId = string;
export type PlayerId = string;

export interface JoinReq { roomId: RoomId; name?: string }
export interface JoinedEvt { roomId: RoomId; playerId: PlayerId }

export interface PresenceEvt {
  players: { id: PlayerId; name: string }[];
  counts: { players: number; minPlayers: number; maxPlayers: number };
}

export interface SnapshotEvt {
  roomId: RoomId;
  serverTime: number;
  state: Record<string, unknown>;
  players: { id: PlayerId; name: string }[];
  version: number;
}

export interface ChatReq { text: string }
export interface ChatEvt { from: PlayerId; text: string; at: number }

export interface StateSetReq { state: Record<string, unknown> }
export interface StatePatchReq { patch: Record<string, unknown> }

export interface ErrorEvt { code: string; message: string }
