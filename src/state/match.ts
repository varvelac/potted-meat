import { makeBoard } from './board';
import { fighterStarter, drawTo } from './deck';
import type { Actor, ActorID } from './types';
/**
 * Create a new match state with a board, two actors and starter decks for
 * each team. We position actors at (2,4) and (6,4) which are symmetric around
 * the center nexus at (4,4).
 */
export function newMatch(mode: 'Queue3'|'SingleCard') {
  const board = makeBoard();
  const actors: Record<ActorID, Actor> = {
    A: { id: 'A', team: 'A', hp: 10, maxHp: 10, pos: { x: 2, y: 4 }, statuses: [] },
    B: { id: 'B', team: 'B', hp: 10, maxHp: 10, pos: { x: 6, y: 4 }, statuses: [] },
  };

  const teamA = { actorId: 'A', deck: fighterStarter(), drawPile: [], discard: [], hand: [], queue: [], vp: 0 };
  const teamB = { actorId: 'B', deck: fighterStarter(), drawPile: [], discard: [], hand: [], queue: [], vp: 0 };

  // Draw initial hands
  drawTo(teamA.hand, teamA.deck, 7);
  drawTo(teamB.hand, teamB.deck, 7);

  // mark starting tile occupancy
  const aPos = actors.A.pos;
  const bPos = actors.B.pos;
  const aTile = board.tiles[aPos.y]?.[aPos.x];
  const bTile = board.tiles[bPos.y]?.[bPos.x];
  if (aTile) aTile.occupiedBy = 'A';
  if (bTile) bTile.occupiedBy = 'B';

  // return teams map instead of separate teamA/teamB
  const teams: Record<ActorID, typeof teamA> = {
    A: teamA,
    B: teamB,
  };

  return { mode, board, actors, teams, round: 1, tick: 1, handMax: 7, rng: Math.random, winner: null as ActorID | null };
}

/**
 * Append a queued play (qp) onto the team's queue.
 * - actorId: ActorID (string) so this works for N players
 */
export function queuePlay(actorId: ActorID, state:any, qp:any) {
  state.teams[actorId].queue.push(qp);
}

/** Reset all teams' queues (e.g., at the start of a new round). */
export function resetQueues(state:any) {
  for (const k of Object.keys(state.teams || {})) {
    state.teams[k].queue = [];
  }
}

/**
 * Award 1 VP to any actor standing on the nexus (hardcoded at 4,4).
 */
export function atEndOfRoundScoreNexus(state:any) {
  for (const aid of Object.keys(state.actors)) {
    const pos = state.actors[aid].pos;
    if (pos.x === 4 && pos.y === 4) {
      const team = state.teams[aid];
      if (team) team.vp++;
    }
  }
}

/**
 * Simple victory checks. Returns winning ActorID or null.
 */
export function checkVictory(state:any) {
  // actor HP zero check
  for (const aid of Object.keys(state.actors)) {
    if (state.actors[aid].hp <= 0) {
      // return first other actor id (simple two-player rule preserved)
      for (const other of Object.keys(state.actors)) {
        if (other !== aid) return other;
      }
      return null;
    }
  }

  // VP threshold check: pick any team that reached 3
  for (const aid of Object.keys(state.teams || {})) {
    if (state.teams[aid].vp >= 3) return aid;
  }
  return null;
}
