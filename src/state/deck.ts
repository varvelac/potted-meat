import { FIGHTER_CARDS } from './card';
import type { Card } from './types';

/**
 * Simple shuffle using Array.sort with a random comparator. This is concise
 * but not a perfectly unbiased shuffle; for most gameplay/testing purposes
 * it's fine, but for a production shuffle use Fisher-Yates.
 *
 * Equation used in comparator: rng() - 0.5
 * - rng() returns a value in [0,1). Subtracting 0.5 yields a negative or
 *   positive number roughly half the time, which randomizes order sufficiently
 *   for casual usage.
 */
export function shuffle<T>(arr: T[], rng = Math.random): T[] {
  return arr.slice().sort(() => rng() - 0.5);
}

/**
 * Build the fighter starter deck by respecting each card's copiesAllowed and
 * then shuffle the result. We clone each card object with `{...c}` to avoid
 * accidental shared references between copies.
 */
export function fighterStarter(): Card[] {
  const deck: Card[] = [];
  FIGHTER_CARDS.forEach(c => {
    for (let i=0;i<c.copiesAllowed;i++) deck.push({...c});
  });
  return shuffle(deck);
}

/**
 * Draw cards from the drawPile into hand until hand has `max` cards or the
 * draw pile is exhausted. We pop from the end of drawPile which assumes the
 * pile is treated as a stack (top at end). Popping is O(1) and avoids shifting.
 */
export function drawTo(hand: Card[], drawPile: Card[], max: number) {
  while (hand.length < max && drawPile.length) {
    hand.push(drawPile.pop()!);
  }
}

/**
 * Prepare a fresh round for a team: shuffle the deck into a new draw pile,
 * clear discard/hand, and draw up to `handMax` cards. Using `teamState.deck.slice()`
 * clones the original deck array so shuffle doesn't mutate the authoritative
 * deck order stored on the team.
 */
export function freshRound(teamState: any, handMax: number, rng = Math.random) {
  const newPile = shuffle(teamState.deck.slice(), rng);
  teamState.drawPile = newPile;
  teamState.discard = [];
  teamState.hand = [];
  drawTo(teamState.hand, teamState.drawPile, handMax);
}
