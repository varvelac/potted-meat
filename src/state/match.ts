import { makeBoard } from './board';
import { fighterStarter, drawTo } from './deck';
import type { Actor } from './types';

/**
 * Create a new match state with a board, two actors and starter decks for
 * each team. We position actors at (2,4) and (6,4) which are symmetric around
 * the center nexus at (4,4).
 */
export function newMatch(mode: 'Queue3'|'SingleCard') {
  const board = makeBoard();
  const actors: Record<'A'|'B', Actor> = {
    A: { id:'A', team:'A', hp:10, maxHp:10, pos:{x:2,y:4}, statuses:[] },
    B: { id:'B', team:'B', hp:10, maxHp:10, pos:{x:6,y:4}, statuses:[] }
  };

  const teamA = { actorId:'A', deck:fighterStarter(), drawPile:[], discard:[], hand:[], queue:[], vp:0 };
  const teamB = { actorId:'B', deck:fighterStarter(), drawPile:[], discard:[], hand:[], queue:[], vp:0 };

  // Draw initial hands directly from the (not yet shuffled) deck arrays. The
  // deck functions in deck.ts treat `deck` as the master list and `drawPile`
  // as the shuffled pile used for popping; here we simply draw from deck for
  // simplicity in setup.
  drawTo(teamA.hand, teamA.deck, 7);
  drawTo(teamB.hand, teamB.deck, 7);

  // mark starting tile occupancy for actors so movement checks know which tiles
  // are blocked at the start.
  const aPos = actors.A.pos;
  const bPos = actors.B.pos;
  const aTile = board.tiles[aPos.y]?.[aPos.x];
  const bTile = board.tiles[bPos.y]?.[bPos.x];
  if (aTile) aTile.occupiedBy = 'A';
  if (bTile) bTile.occupiedBy = 'B';

  return { mode, board, actors, teamA, teamB, round:1, tick:1, handMax:7, rng:Math.random, winner:null as string|null };
}

/**
 * Append a queued play (qp) onto the team's queue. The queue will later be
 * consumed by the resolver to apply actions/ticks.
 */
export function queuePlay(team:'A'|'B', state:any, qp:any) {
  state[team==='A'?'teamA':'teamB'].queue.push(qp);
}

/** Reset both teams' queues (e.g., at the start of a new round). */
export function resetQueues(state:any) {
  state.teamA.queue = [];
  state.teamB.queue = [];
}

/**
 * Award 1 VP to any actor standing on the nexus (hardcoded at 4,4). The checks
 * `A.x===4 && A.y===4` are explicit coordinate comparisons to see if the
 * actor occupies the nexus tile.
 */
export function atEndOfRoundScoreNexus(state:any) {
  const A = state.actors.A.pos;
  const B = state.actors.B.pos;
  if (A.x===4 && A.y===4) state.teamA.vp++;
  if (B.x===4 && B.y===4) state.teamB.vp++;
}

/**
 * Simple victory checks: actor HP reaching zero or a team reaching 3 VP wins
 * for the opposing/same team respectively. Returns winning team id or null.
 */
export function checkVictory(state:any) {
  if (state.actors.A.hp <= 0) return 'B';
  if (state.actors.B.hp <= 0) return 'A';
  if (state.teamA.vp >= 3) return 'A';
  if (state.teamB.vp >= 3) return 'B';
  return null;
}
