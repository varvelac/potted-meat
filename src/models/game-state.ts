import type { MatchState } from "../state/types";

/**
 * GameStateModel
 * - Wraps a local MatchState and exposes a JSON-safe serialization for sending
 *   to the downstream server (Relay).
 * - Removes non-serializable fields (functions like rng) and strips undefined
 *   values so the resulting object is a plain JSON object.
 */
export default class GameStateModel {
  private state: MatchState;

  constructor(state: MatchState) {
    this.state = state;
  }

  /** Produce a plain JSON-safe object representing the full match state. */
  toPlain(): Record<string, unknown> {
    // shallow clone w/out function fields (notably `rng`)
    const { rng, ...rest } = (this.state as any);
    return sanitize(rest);
  }

  /** Optional convenience if you want to snapshot only a sub-piece later. */
  toPartial(fields: string[]) {
    const plain = this.toPlain();
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      if (f in plain) out[f] = (plain as any)[f];
    }
    return out;
  }
}

/** Recursively remove functions and undefined values, keep arrays/objects. */
function sanitize(x: any): any {
  if (x === null) return null;
  if (x === undefined) return undefined;
  const t = typeof x;
  if (t === "number" || t === "string" || t === "boolean") return x;
  if (t === "function") return undefined;
  if (Array.isArray(x)) {
    return x.map((v) => sanitize(v)).filter((v) => v !== undefined);
  }
  if (t === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(x)) {
      const v = sanitize(x[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  // fallback
  return undefined;
}