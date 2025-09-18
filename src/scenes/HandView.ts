/**
 * HandView
 *
 * Responsibility:
 * - Render a player's hand into a provided Container.
 * - Provide small helper methods to rebuild / clear / refresh the hand UI.
 *
 * Design notes:
 * - Keeps BattleScene focused on control flow; HandView only knows about
 *   presentation of cards. Business logic (what cards are in the hand) is
 *   still owned by the match state / BattleScene.
 * - The implementation is intentionally small and DOM-like: create elements,
 *   attach to container, expose a clear() to remove them.
 *
 * Types:
 * - The TileContainer type is declared locally to avoid coupling with the main
 *   scene file; it's a thin shape describing the small UI pieces we use.
 *
 * Future:
 * - Add event handlers for drag/drop or click-to-queue here.
 */

import Phaser from "phaser";
import type { Card } from "../state/types";
import { needsDirection } from "../state/card";
import {
  CARD_W,
  CARD_H,
  CARD_RADIUS,
  CARD_GAP_X,
  CARD_GAP_Y,
  CARDS_PER_ROW,
  COLOR_CARD,
  COLOR_CARD_BORDER,
  HAND_LABEL_FONT,
} from "./constants";

type TileContainer = Phaser.GameObjects.Container & {
  bg?: Phaser.GameObjects.Graphics;
  lbl?: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Rectangle;
  badgeText?: Phaser.GameObjects.Text;
  isQueued?: boolean;
  enable?: () => void;
  disable?: () => void;
};

export default class HandView {
  private scene: Phaser.Scene;
  private layer: Phaser.GameObjects.Container;
  private tiles: TileContainer[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.layer = layer;
  }

  /**
   * Rebuild the hand UI from scratch.
   * - team: ActorID (string) so views are not limited to 'A'|'B'
   */
  build(team: string, hand: Card[], baseY: number, colorHex: string) {
    this.clear();
    this.tiles = [];

    // iterate and place cards into rows
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const row = Math.floor(i / CARDS_PER_ROW);
      const col = i % CARDS_PER_ROW;

      const x = col * (CARD_W + CARD_GAP_X) + CARD_W / 2;
      const y = baseY + row * (CARD_H + CARD_GAP_Y) + CARD_H / 2;

      const container = this.scene.add.container(x, y) as TileContainer;

      // background graphics
      const g = this.scene.add.graphics();
      g.fillStyle(COLOR_CARD, 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
      g.lineStyle(2, COLOR_CARD_BORDER, 1);
      g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
      container.add(g);
      container.bg = g;

      // label with card id (minimal; you can expand to show keywords)
      const lbl = this.scene.add.text(-CARD_W / 2 + 8, -CARD_H / 2 + 8, card.id || "card", {
        font: HAND_LABEL_FONT,
        color: colorHex,
      });
      container.add(lbl);
      container.lbl = lbl;

      // simple enable/disable helpers used by scene interactivity
      container.enable = () => {
        container.setAlpha(1);
      };
      container.disable = () => {
        container.setAlpha(0.5);
      };

      // Make the graphics interactive and forward events / handle clicks
      g.setInteractive(new Phaser.Geom.Rectangle(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H), Phaser.Geom.Rectangle.Contains);
      // hover visual
      g.on("pointerover", () => {
        g.clear();
        g.fillStyle(0x263040, 1); // hover color (using CARD_HOVER)
        g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
        g.lineStyle(2, COLOR_CARD_BORDER, 1);
        g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
      });
      g.on("pointerout", () => {
        g.clear();
        g.fillStyle(COLOR_CARD, 1);
        g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
        g.lineStyle(2, COLOR_CARD_BORDER, 1);
        g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
      });

      g.on("pointerup", () => {
        if (needsDirection(card)) {
          this.showRadial(team, card, container, i);
          return;
        }
        this.scene.game.events.emit("ui:queueRequested", { team, handIndex: i, card });
      });

      this.layer.add(container);
      this.tiles.push(container);
    }

    return this.tiles;
  }

  private showRadial(team: string, card: Card, tile: TileContainer, handIndex: number) {
    const overlay = this.scene.add.container(0, 0);
    const cx = (CARD_W) / 2;
    const cy = (CARD_H) / 2;

    const mkBtn = (lx:number, ly:number, label:string, dir:{dx:-1|0|1, dy:-1|0|1}) => {
      const zone = this.scene.add.zone(lx - CARD_W/2, ly - CARD_H/2, 28, 28).setOrigin(0).setInteractive();
      const bg = this.scene.add.circle(lx - CARD_W/2, ly - CARD_H/2, 14, 0x303b47).setStrokeStyle(2, 0x9aa5b1);
      const txt = this.scene.add.text(lx - CARD_W/2 - 6, ly - CARD_H/2 - 8, label, { color: "#fff", fontSize: "16px", fontStyle: "bold" });
      zone.on("pointerup", () => {
        // emit queue request with dir
        this.scene.game.events.emit("ui:queueRequested", { team, handIndex, card, dir });
        overlay.destroy(true);
      });
      overlay.add([bg, zone, txt]);
    };

    mkBtn(cx, cy - 28, "↑", { dx: 0, dy: -1 });
    mkBtn(cx + 28, cy, "→", { dx: 1, dy: 0 });
    mkBtn(cx, cy + 28, "↓", { dx: 0, dy: 1 });
    mkBtn(cx - 28, cy, "←", { dx: -1, dy: 0 });

    tile.add(overlay);
  }

  clear() {
    // destroy all created GameObjects and clear the array
    for (const t of this.tiles) {
      t.destroy(true);
    }
    this.tiles = [];
  }

  /**
   * Minimal refresh: update labels from card data array. Keeps render objects
   * but updates text in-place. Useful for low-cost updates.
   */
  refresh(hand: Card[]) {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const card = hand[i];
      if (tile && card && tile.lbl) {
        tile.lbl.setText(card.id || "card");
      }
    }
  }
}