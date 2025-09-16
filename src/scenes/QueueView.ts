/**
 * QueueView
 *
 * Responsibility:
 * - Render queued plays (or preview slots) for a team.
 * - The queue UI is typically a vertical stack; this class encapsulates that.
 *
 * Notes:
 * - Kept API surface similar to HandView for consistency.
 * - If you later add drag/drop from HandView to QueueView, keep the cross-
 *   component communication in BattleScene (owner/coordinator).
 */

import Phaser from "phaser";
import type { Card } from "../state/types";
import {
  QUEUE_CARD_W,
  QUEUE_CARD_H,
  QUEUE_ROW_H,
  CARD_GAP_X,
  COLOR_CARD,
  COLOR_CARD_BORDER,
  HAND_LABEL_FONT,
} from "./constants";

type TileContainer = Phaser.GameObjects.Container & {
  bg?: Phaser.GameObjects.Graphics;
  lbl?: Phaser.GameObjects.Text;
  isQueued?: boolean;
  enable?: () => void;
  disable?: () => void;
};

export default class QueueView {
  private scene: Phaser.Scene;
  private layer: Phaser.GameObjects.Container;
  private tiles: TileContainer[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.layer = layer;
  }

  build(team: "A" | "B", queue: Card[], baseY: number, colorHex: string) {
    this.clear();
    this.tiles = [];

    for (let i = 0; i < queue.length; i++) {
      const card = queue[i];
      const x = 0;
      const y = baseY + i * QUEUE_ROW_H + QUEUE_CARD_H / 2;

      const container = this.scene.add.container(x, y) as TileContainer;

      const g = this.scene.add.graphics();
      g.fillStyle(COLOR_CARD, 1);
      g.fillRect(-QUEUE_CARD_W / 2, -QUEUE_CARD_H / 2, QUEUE_CARD_W, QUEUE_CARD_H);
      g.lineStyle(2, COLOR_CARD_BORDER, 1);
      g.strokeRect(-QUEUE_CARD_W / 2, -QUEUE_CARD_H / 2, QUEUE_CARD_W, QUEUE_CARD_H);
      container.add(g);
      container.bg = g;

      const lbl = this.scene.add.text(-QUEUE_CARD_W / 2 + 8, -QUEUE_CARD_H / 2 + 8, card.id || "queue", {
        font: HAND_LABEL_FONT,
        color: colorHex,
      });
      container.add(lbl);
      container.lbl = lbl;

      container.enable = () => container.setAlpha(1);
      container.disable = () => container.setAlpha(0.45);

      // Make queue slot interactive to allow removal / reordering requests
      g.setInteractive(new Phaser.Geom.Rectangle(-QUEUE_CARD_W / 2, -QUEUE_CARD_H / 2, QUEUE_CARD_W, QUEUE_CARD_H), Phaser.Geom.Rectangle.Contains);
      // capture index in closure
      ((idx) => {
        g.on("pointerup", () => {
          // request removal of queued play at index
          this.scene.game.events.emit("ui:removeQueued", { team, index: idx });
        });
      })(i);

      this.layer.add(container);
      this.tiles.push(container);
    }

    return this.tiles;
  }

  clear() {
    for (const t of this.tiles) t.destroy(true);
    this.tiles = [];
  }

  refresh(queue: Card[]) {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const card = queue[i];
      if (tile && card && tile.lbl) tile.lbl.setText(card.id || "queue");
    }
  }
}