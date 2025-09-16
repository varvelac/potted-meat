import { inBounds, getTile } from "./board";

/**
 * Resolve a single tick of queued plays for the two actors.
 *
 * Rules implemented here:
 * - If a queued play specifies a `.dir` and movement.tiles, attempt to move
 *   that many tiles step-by-step.
 * - Movement is resolved step-by-step so collisions (two actors moving into
 *   the same tile simultaneously) can be detected and cancelled for that
 *   step.
 * - If both actors play non-movement cards (or nothing), we still apply a
 *   minimal damage rule of 1 HP to each when both played. This preserves a
 *   small interaction from earlier prototypes.
 */
export function resolveOneTick(state: any, aPlay: any, bPlay: any) {
  if (!aPlay && !bPlay) return;

  const a = state.actors.A;
  const b = state.actors.B;

  // Determine how many tile-steps a play should attempt.
  // Logic:
  // - If play.card.movement.tiles is a number, use that value (but ensure
  //   it's non-negative with Math.max(0, ...)).
  // - If play.dir exists but movement.tiles is unspecified, treat it as a
  //   single-step intention.
  // - Otherwise 0 steps.
  const stepsFor = (_playParam: any) => {
    const play = _playParam;
    if (!play) return 0;
    if (
      play.card &&
      play.card.movement &&
      typeof play.card.movement.tiles === "number"
    ) {
      return Math.max(0, play.card.movement.tiles);
    }
    // default: if a dir exists but no movement.tiles declared, treat as single-step
    if (play.dir) return 1;
    return 0;
  };

  const aSteps = stepsFor(aPlay);
  const bSteps = stepsFor(bPlay);

  // We'll iterate for the maximum number of steps either actor wants so we
  // can interleave partial moves (one actor might move 2 steps while the
  // other moves 1 step).
  const maxSteps = Math.max(aSteps, bSteps);

  for (let step = 0; step < maxSteps; step++) {
    // compute candidate destination for this step for a given actor/play.
    const computeStepTarget = (actor: any, play: any) => {
      if (!play || !play.dir) return null;
      // If this actor has already used up their allowed steps, they don't move
      // in subsequent iterations.
      const allowed = stepsFor(play);
      if (step >= allowed) return null;

      // On the first step, set the actor facing so visuals align with the
      // chosen direction. This maps dx/dy vectors to a string facing.
      if (step === 0) {
        if (play.dir.dx === 0 && play.dir.dy === -1) actor.facing = "up";
        else if (play.dir.dx === 0 && play.dir.dy === 1) actor.facing = "down";
        else if (play.dir.dx === -1 && play.dir.dy === 0) actor.facing = "left";
        else if (play.dir.dx === 1 && play.dir.dy === 0) actor.facing = "right";
      }

      // Candidate target coordinates are current pos + dir delta.
      const tx = actor.pos.x + play.dir.dx;
      const ty = actor.pos.y + play.dir.dy;
      // If target is off-board, blocked, or occupied by the opponent, the
      // move is invalid and we return null.
      if (!inBounds(state.board, tx, ty)) return null;
      const t = getTile(state.board, tx, ty);
      if (!t) return null;
      if (t.blocksMovement) return null;
      // cannot move into a tile that is currently occupied by the other actor
      // (we don't attempt to swap positions here); simultaneous intentions
      // are checked at a higher level.
      if (t.occupiedBy && t.occupiedBy !== actor.id) return null;
      return { x: tx, y: ty };
    };

    const aCand = computeStepTarget(a, aPlay);
    const bCand = computeStepTarget(b, bPlay);

    // If both actors intend to move into the same tile this step, cancel
    // both moves for this step. This is a simple simultaneous-resolution
    // rule to avoid complex pushing/swap logic.
    if (aCand && bCand && aCand.x === bCand.x && aCand.y === bCand.y) {
      // do nothing this step
    } else {
      // Move A if they have a valid candidate for this step.
      if (aCand) {
        const oldTile = getTile(state.board, a.pos.x, a.pos.y);
        if (oldTile && oldTile.occupiedBy === "A") oldTile.occupiedBy = null;
        a.pos.x = aCand.x;
        a.pos.y = aCand.y;
        const newTile = getTile(state.board, a.pos.x, a.pos.y);
        if (newTile) newTile.occupiedBy = "A";
      }

      // Move B similarly.
      if (bCand) {
        const oldTile = getTile(state.board, b.pos.x, b.pos.y);
        if (oldTile && oldTile.occupiedBy === "B") oldTile.occupiedBy = null;
        b.pos.x = bCand.x;
        b.pos.y = bCand.y;
        const newTile = getTile(state.board, b.pos.x, b.pos.y);
        if (newTile) newTile.occupiedBy = "B";
      }
    }
  }

  // Minimal damage rule: if both sides played something this tick, both
  // take 1 HP. This is intentionally simple placeholder combat logic.
  if (aPlay && bPlay) {
    a.hp -= 1;
    b.hp -= 1;
  }
}
