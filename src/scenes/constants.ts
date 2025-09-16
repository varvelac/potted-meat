/**
 * Centralized constants for UI layout, sizing and colors.
 *
 * Purpose:
 * - Provide a single place to tweak visual & layout "knobs" used by scene
 *   code and view classes (HandView / QueueView).
 * - Keep these focused on presentation; game-rule constants remain in state/.
 *
 * Note:
 * - When migrating to a Phaser Tilemap, update layouts.ts / tileToPixel and
 *   any tile-size constants there. UI constants below should remain valid.
 */

export const CARD_W = 100;
export const CARD_H = 100;
export const CARD_RADIUS = 12;

export const CARD_GAP_X = 12;
export const CARD_GAP_Y = 12;

export const CARDS_PER_ROW = 7;
export const ROW_H = CARD_H + CARD_GAP_Y;

export const QUEUE_CARD_W = 200;
export const QUEUE_CARD_H = 60;
export const QUEUE_ROW_H = QUEUE_CARD_H + CARD_GAP_Y;

export const COLOR_BG = 0x101216;
export const COLOR_CARD = 0x1c222b;
export const COLOR_CARD_HOVER = 0x263040;
export const COLOR_CARD_BORDER = 0x3a4652;
export const COLOR_CARD_BORDER_HOVER = 0xa6e3a1;

export const COLOR_A = "#a6e3a1";
export const COLOR_B = "#f2b5ae";

export const HAND_LABEL_FONT = "14px Arial";
export const HUD_FONT = "18px Arial";

/**
 * Reminder / TODO kept in constants so anyone looking here sees the plan:
 * when moving to a tilemap, update tile coordinate conversion in layouts.ts.
 */
export const PLANNED_TILEMAP_NOTE =
  "When moving to a Tilemap: update layouts.ts and asset atlas mappings.";