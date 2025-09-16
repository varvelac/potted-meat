import Phaser from "phaser";
// TODO: Update the path if the board module exists elsewhere, or create the file if missing.
import { BOARD_W, BOARD_H } from "../state/board"; // <-- Ensure this file exists at src/state/board.ts
import {
  newMatch,
  queuePlay,
  resetQueues,
  atEndOfRoundScoreNexus,
  checkVictory,
} from "../state/match";
import { drawTo, freshRound } from "../state/deck";
import { resolveOneTick } from "../state/resolver";
import ActorSprite from '../state/ActorSprite';
import { TILE } from './layouts';
// Card layout
import {
  ROW_H,
  COLOR_BG
} from './constants';

// Define TileContainer type to extend Phaser.GameObjects.Container with extra properties used in the code
// type TileContainer = Phaser.GameObjects.Container & {
//   bg?: Phaser.GameObjects.Graphics;
//   lbl?: Phaser.GameObjects.Text;
//   badge?: Phaser.GameObjects.Rectangle;
//   badgeText?: Phaser.GameObjects.Text;
//   isQueued?: boolean;
//   enable?: () => void;
//   disable?: () => void;
// };

export default class BattleScene extends Phaser.Scene {
  // state
  private state!: ReturnType<typeof newMatch>;
  private started = false;
  private mode: "Queue3" | "SingleCard" = "Queue3";

  // layers
  private gridG!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Text;
  private actorA?: ActorSprite;
  private actorB?: ActorSprite;
  // hands & queues
  private handLayerA!: Phaser.GameObjects.Container;
  private handLayerB!: Phaser.GameObjects.Container;
  private queueLayerA!: Phaser.GameObjects.Container;
  private queueLayerB!: Phaser.GameObjects.Container;


  // UI
  private toggleText!: Phaser.GameObjects.Text;
  private resolveBtn!: Phaser.GameObjects.Text;
  // ====== Scene ======
  constructor() {
    super("Battle");
  }

  preload() {
    // load each direction as its own spritesheet file (your files in assets/)
    // adjust frameWidth/frameHeight to match your sprite PNG frames
    this.load.spritesheet('walk_up', '/src/assets/Walk Up.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('walk_down', '/src/assets/Walk_Down.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('walk_left', '/src/assets/Walk Left.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('walk_right', '/src/assets/Walk Right.png', { frameWidth: 24, frameHeight: 24 });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR_BG);
    this.state = newMatch(this.mode);

    // create actor sprite wrappers BEFORE drawing rectangles so the old rectangle tokens are skipped/destroyed
    // pick initial texture based on actor facing (fallback to down)
    const aFacing = this.state.actors.A.facing ?? 'down';
    const bFacing = this.state.actors.B.facing ?? 'down';
    this.actorA = new ActorSprite(this, 'A', `walk_${aFacing}`);
    this.actorB = new ActorSprite(this, 'B', `walk_${bFacing}`);

    this.actorA.initFromState(this.state.actors.A);
    this.actorB.initFromState(this.state.actors.B);

    this.gridG = this.add.graphics();
    this.drawGrid();

    this.buildHudBase();

    // Launch the UI scene (which will render hands & queues) and send initial state/layout
    this.scene.launch('UI', { state: this.state });
    this.game.events.emit('matchStateUpdated', {
      state: this.state,
      layout: { gridLeft: this.gridLeft, handATopY: this.handATopY, handBBotY: this.handBBotY, rightPanelX: this.rightPanelX }
    });

    this.refreshHud();

    // hook state update event — ActorSprite will animate on update
    this.events.on('stateUpdated', () => {
      this.actorA!.updateFromState(this.state.actors.A);
      this.actorB!.updateFromState(this.state.actors.B);
    });

    // Listen for UI events from UIScene/HandView/QueueView
    this.game.events.on('ui:queueRequested', this.onUiQueueRequested, this);
    this.game.events.on('ui:removeQueued', this.onUiRemoveRequested, this);
  }

  shutdown() {
    // cleanup listeners to avoid leaks
    this.game.events.off('ui:queueRequested', this.onUiQueueRequested, this);
    this.game.events.off('ui:removeQueued', this.onUiRemoveRequested, this);
  }

  // ====== Layout helpers ======
  get gridWidth() {
    return BOARD_W * TILE;
  }
  get gridHeight() {
    return BOARD_H * TILE;
  }
  get gridLeft() {
    // to move the whole grid to the left edge, i'm manually inputing.  if you want the board in horizaintally centered, uncomment the line below
    //return Math.round((this.scale.width - this.gridWidth) / 2);
    return 100;
  }
  get gridTop() {
    return 300;
  }
  get gridRight() {
    return this.gridLeft + this.gridWidth;
  }
  get gridBottom() {
    return this.gridTop + this.gridHeight;
  }
  get rightPanelX() {
    return this.gridRight + 24;
  }

  /** Returns x,y for queue tile index placed in the right panel.
   * Player A stacks upward above the mode toggle; Player B stacks downward below the resolve button.
   */
  // private tileXYForRightPanelIndex(i: number, team: "A" | "B") {
  //   const x = this.rightPanelX;
  //   // vertical offsets relative to toggleText / resolveBtn
  //   const toggleY = this.toggleText ? this.toggleText.y : 450;
  //   const resolveY = this.resolveBtn ? this.resolveBtn.y : 650;

  //   if (team === "A") {
  //     // Player A now stacks downward from just below the resolve button (swap)
  //     const spacing = QUEUE_ROW_H;
  //     const y = resolveY + 28 + i * spacing;
  //     return { x, y };
  //   } else {
  //     // Player B stacks upward from just above the toggle
  //     const spacing = QUEUE_ROW_H;
  //     const y = toggleY - 8 - (i + 1) * spacing;
  //     return { x, y };
  //   }
  // }

  // Swap A/B vertical bands: place A's hand where B used to and B's where A used to
  get handATopY() {
    return this.gridBottom + 24;
  } // formerly handBBotY
  get queueATopY() {
    return this.handATopY + ROW_H * 2 + 8;
  }
  get handBBotY() {
    return this.gridTop - ROW_H;
  } // formerly handATopY
  get queueBBotY() {
    return this.handBBotY + ROW_H * 2 + 8;
  }

  // ====== Grid & actors ======
  private drawGrid() {
    this.gridG.clear().lineStyle(1, 0x3a3a46, 1);
    for (let y = 0; y < BOARD_H; y++) {
      for (let x = 0; x < BOARD_W; x++) {
        const gx = this.gridLeft + x * TILE,
          gy = this.gridTop + y * TILE;
        const isNexus = x === 4 && y === 4;
        this.gridG.strokeRect(gx, gy, TILE, TILE);
        if (isNexus) {
          this.gridG
            .fillStyle(0x224466, 0.22)
            .fillRect(gx + 1, gy + 1, TILE - 2, TILE - 2);
        }
      }
    }
  }
  // private redrawActors() {
  //   const A = this.state.actors.A.pos;
  //   const B = this.state.actors.B.pos;
  //   const ax = this.gridLeft + A.x * TILE + TILE / 2;
  //   const ay = this.gridTop + A.y * TILE + TILE / 2;
  //   const bx = this.gridLeft + B.x * TILE + TILE / 2;
  //   const by = this.gridTop + B.y * TILE + TILE / 2;

  //   // create-or-update actor A rect
  //   if (this.actorAObj) {
  //     this.actorAObj.setPosition(ax, ay);
  //   } else {
  //     this.actorAObj = this.add
  //       .rectangle(ax, ay, TILE - 8, TILE - 8, 0x4caf50)
  //       .setName("actorA");
  //     // keep actors visible above queue/hand layers
  //     this.actorAObj.setDepth(500);
  //   }

  //   // create-or-update actor B rect
  //   if (this.actorBObj) {
  //     this.actorBObj.setPosition(bx, by);
  //   } else {
  //     this.actorBObj = this.add
  //       .rectangle(bx, by, TILE - 8, TILE - 8, 0xf44336)
  //       .setName("actorB");
  //     this.actorBObj.setDepth(500);
  //   }
  // }

  // private drawActors() {
  //   this.redrawActors();
  // }

  // ====== HUD ======
  private buildHudBase() {
    // Mode toggle
    this.toggleText = this.add
      .text(this.rightPanelX, 450, `Mode: ${this.mode} (click to toggle)`, {
        color: "#ddd",
      })
      .setInteractive()
      .on("pointerup", () => {
        if (this.started) return;
        this.mode = this.mode === "Queue3" ? "SingleCard" : "Queue3";
        this.toggleText.setText(`Mode: ${this.mode} (click to toggle)`);
      });
    // keep HUD on top
    this.toggleText.setDepth(1000);

    // Start
    this.startBtn = this.add
      .text(this.rightPanelX, 500, "Start Match", { color: "#8ec07c" })
      .setInteractive()
      .on("pointerup", () => {
        if (this.started) return;
        this.started = true;
        this.state = newMatch(this.mode);
        // this.redrawActors();
        this.rebuildHandsAndQueues();
        this.refreshHud();
      });

    // Status lines
    this.hudText = this.add.text(this.rightPanelX, 550, "", { color: "#bbb" });
    this.hudText.setDepth(1000);

    // Resolve button (store so other layout can reference it)
    this.resolveBtn = this.add
      .text(this.rightPanelX, 650, "Resolve Next (tick)", { color: "#ffd166" })
      .setInteractive()
      .on("pointerup", () => this.resolveNextTick());
    // Ensure the resolve button is above dynamically added queue tiles
    this.resolveBtn.setDepth(1000);
    // and bring to top in the display list
    this.children.bringToTop(this.resolveBtn);
  }

  private refreshHud() {
    const A = this.state.actors.A,
      B = this.state.actors.B;
    this.hudText.setText(
      [
        `Round ${this.state.round}  Tick ${this.state.tick}`,
        `A HP:${A.hp}  VP:${this.state.teamA.vp}   B HP:${B.hp}  VP:${this.state.teamB.vp}`,
        `Winner: ${this.state.winner ?? "-"}`,
      ].join("\n")
    );
  }

  // ====== Hands & Queues ======
  private rebuildHandsAndQueues() {
    // Clear any local references and layers (we no longer render hands/queues here).
    // this.handTilesA = [];
    // this.handTilesB = [];
    // this.queueTilesA = [];
    // this.queueTilesB = [];
    if (this.handLayerA) this.handLayerA.destroy(true);
    if (this.handLayerB) this.handLayerB.destroy(true);
    if (this.queueLayerA) this.queueLayerA.destroy(true);
    if (this.queueLayerB) this.queueLayerB.destroy(true);

    // Notify UIScene to rebuild from authoritative state
    this.game.events.emit('matchStateUpdated', {
      state: this.state,
      layout: { gridLeft: this.gridLeft, handATopY: this.handATopY, handBBotY: this.handBBotY, rightPanelX: this.rightPanelX }
    });
  }

  // private buildHandTiles(
  //   team: "A" | "B",
  //   hand: Card[],
  //   layer: Phaser.GameObjects.Container,
  //   baseY: number,
  //   colorHex: string
  // ) {
  //   hand.forEach((card, i) => {
  //     const { x, y } = this.tileXYFromIndex(i, this.gridLeft, baseY);
  //     const tile = this.createCardTile(
  //       x,
  //       y,
  //       `Spd ${card.speed}
  //       ${card.id.replaceAll("_", " ")}`,
  //       colorHex,
  //       false
  //     );

  //     // Hover + click (click shows radial if needed; otherwise queues immediately)
  //     tile
  //       .on("pointerover", () => this.setTileHover(tile, true))
  //       .on("pointerout", () => this.setTileHover(tile, false))
  //       .on("pointerup", () => this.onHandTileClicked(team, i, card, tile));

  //     layer.add(tile);
  //     if (team === "A") this.handTilesA.push(tile);
  //     else this.handTilesB.push(tile);
  //   });
  // }

  // private buildQueueTiles(
  //   team: "A" | "B",
  //   queue: QueuedPlay[],
  //   layer: Phaser.GameObjects.Container,
  //   _baseY: number
  // ) {
  //   queue.forEach((qp, i) => {
  //     const { x, y } = this.tileXYForRightPanelIndex(i, team);
  //     const tile = this.createCardTile(
  //       x,
  //       y,
  //       qp.card.id,
  //       "#ddd",
  //       true,
  //       QUEUE_CARD_W,
  //       QUEUE_CARD_H
  //     );
  //     this.addNumberBadge(tile, i + 1);
  //     this.addDirectionMarker(tile, qp.dir, QUEUE_CARD_W, QUEUE_CARD_H);

  //     layer.add(tile);
  //     if (team === "A") this.queueTilesA.push(tile);
  //     else this.queueTilesB.push(tile);
  //   });
  // }

  // private tileXYFromIndex(i: number, baseX: number, baseY: number) {
  //   const col = i % CARDS_PER_ROW;
  //   const row = Math.floor(i / CARDS_PER_ROW);
  //   return { x: baseX + col * (CARD_W + CARD_GAP_X), y: baseY + row * ROW_H };
  // }

  // ====== Card tile & radial ======
  //   private createCardTile(
  //   x: number,
  //   y: number,
  //   label: string,
  //   colorHex: string,
  //   isQueued = false,
  //   w = CARD_W,
  //   h = CARD_H
  // ): TileContainer {
  //   const container = this.add.container(x, y) as TileContainer;
  //   container.setSize(w, h);

  //   const bg = this.add.graphics();
  //   const fill = isQueued ? 0x2a2f3a : COLOR_CARD;
  //   const stroke = isQueued ? 0x9aa5b1 : COLOR_CARD_BORDER;
  //   bg.lineStyle(2, stroke)
  //     .fillStyle(fill)
  //     .fillRoundedRect(0, 0, w, h, CARD_RADIUS)
  //     .strokeRoundedRect(0, 0, w, h, CARD_RADIUS);

  //   // Make the Graphics the interactive object with a precise hit area
  //   bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);

  //   // Forward pointer events from the graphics to the container so callers
  //   // can listen on the container (existing code expects tile.on(...)).
  //   bg.on('pointerover', (ptr: any) => container.emit('pointerover', ptr));
  //   bg.on('pointerout', (ptr: any) => container.emit('pointerout', ptr));
  //   bg.on('pointerup', (ptr: any) => container.emit('pointerup', ptr));
  //   bg.on('pointerdown', (ptr: any) => container.emit('pointerdown', ptr));

  //   const lbl = this.add.text(10, 10, label, {
  //     color: colorHex,
  //     fontSize: "14px",
  //     wordWrap: { width: w - 20 },
  //   });

  //   container.add([bg, lbl]);
  //   container.bg = bg;
  //   container.lbl = lbl;
  //   container.isQueued = isQueued;

  //   container.enable = () => {
  //     container.setAlpha(1);
  //     // enable interaction by enabling the graphics interactive area
  //     bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
  //   };
  //   container.disable = () => {
  //     container.setAlpha(0.5);
  //     // disable by removing graphics interactivity
  //     // @ts-ignore disableInteractive exists on GameObject
  //     bg.disableInteractive();
  //   };

  //   // NOTE: we no longer call container.setInteractive(...) because the
  //   // graphics now own the hit area and we forward events above.
  //   return container;
  // }

  // // private setTileHover(c: TileContainer, on: boolean) {
  // //   if (c.isQueued) return;
  // //   const bgCol = on ? COLOR_CARD_HOVER : COLOR_CARD;
  // //   const brCol = on ? COLOR_CARD_BORDER_HOVER : COLOR_CARD_BORDER;
  // //   const w = (c.width as number) || CARD_W;
  // //   const h = (c.height as number) || CARD_H;
  // //   c.bg?.clear()
  // //     .lineStyle(on ? 3 : 2, brCol)
  // //     .fillStyle(bgCol)
  // //     .fillRoundedRect(0, 0, w, h, CARD_RADIUS)
  // //     .strokeRoundedRect(0, 0, w, h, CARD_RADIUS);
  // // }

  // private addNumberBadge(c: TileContainer, n: number) {
  //   const badgeW = 20,
  //     badgeH = 20;
  //   const box = this.add
  //     .rectangle(-2, -2, badgeW, badgeH, 0x4e79a7)
  //     .setOrigin(0);
  //   box.setStrokeStyle(1, 0xffffff, 0.9);
  //   const t = this.add.text(3, 1, String(n), {
  //     color: "#fff",
  //     fontSize: "12px",
  //     fontStyle: "bold",
  //   });
  //   c.addAt(box, 0);
  //   c.add(t);
  //   c.badge = box;
  //   c.badgeText = t;
  // }

  /** Draws a simple 4-way radial over a tile; resolves dir and queues the card. */
  // private showRadial(team: "A" | "B", card: Card, tile: TileContainer) {
  //   // overlay container inside the card container
  //   const overlay = this.add.container(0, 0);
  //   const mkBtn = (
  //     lx: number,
  //     ly: number,
  //     label: string,
  //     dir: { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  //   ) => {
  //     const zone = this.add
  //       .zone(lx, ly, 28, 28)
  //       .setOrigin(0.5)
  //       .setInteractive();
  //     const bg = this.add
  //       .circle(lx, ly, 14, 0x303b47)
  //       .setStrokeStyle(2, 0x9aa5b1);
  //     const txt = this.add.text(lx - 6, ly - 8, label, {
  //       color: "#fff",
  //       fontSize: "16px",
  //       fontStyle: "bold",
  //     });
  //     zone.on("pointerup", () => {
  //       // queue with direction
  //       bg.setStrokeStyle(2, 0x9aa5b1);
  //       queuePlay(team, this.state, { card, dir });
  //       // also add a queued copy visually
  //       const list = team === "A" ? this.queueTilesA : this.queueTilesB;
  //       const { x, y } = this.tileXYForRightPanelIndex(list.length, team);
  //       const qt = this.createCardTile(
  //         x,
  //         y,
  //         card.id,
  //         "#ddd",
  //         true,
  //         QUEUE_CARD_W,
  //         QUEUE_CARD_H
  //       );
  //       this.addNumberBadge(qt, list.length + 1);
  //       this.addDirectionMarker(qt, dir, QUEUE_CARD_W, QUEUE_CARD_H);

  //       if (team === "A") {
  //         this.queueLayerA.add(qt);
  //         this.queueTilesA.push(qt);
  //       } else {
  //         this.queueLayerB.add(qt);
  //         this.queueTilesB.push(qt);
  //       }

  //       overlay.destroy(true);
  //     });
  //     overlay.add([bg, zone, txt]);
  //   };

  //   // positions relative to card center (use actual tile size so centers match)
  //   const cx = ((tile.width as number) || CARD_W) / 2;
  //   const cy = ((tile.height as number) || CARD_H) / 2;
  //   mkBtn(cx, cy - 28, "↑", { dx: 0, dy: -1 });
  //   mkBtn(cx + 28, cy, "→", { dx: 1, dy: 0 });
  //   mkBtn(cx, cy + 28, "↓", { dx: 0, dy: 1 });
  //   mkBtn(cx - 28, cy, "←", { dx: -1, dy: 0 });

  //   // attach to tile container
  //   tile.add(overlay);
  // }
  // ====== Interactions ======
  // private onHandTileClicked(
  //   team: "A" | "B",
  //   _handIndex: number,
  //   card: Card,
  //   tile: TileContainer
  // ) {
  //   if (!this.started) return;
  //   const side = team === "A" ? this.state.teamA : this.state.teamB;
  //   const limit = this.state.mode === "Queue3" ? 3 : 1;
  //   if (side.queue.length >= limit) return;

  //   // If card needs direction, show radial overlay; otherwise queue instantly.
  //   if (needsDirection(card)) {
  //     this.showRadial(team, card, tile);
  //     return;
  //   }

  //   // queue immediately
  //   queuePlay(team, this.state, { card });

  //   // add queued copy visually with order (right panel)
  //   const list = team === "A" ? this.queueTilesA : this.queueTilesB;
  //   const { x, y } = this.tileXYForRightPanelIndex(list.length, team);
  //   const qt = this.createCardTile(
  //     x,
  //     y,
  //     card.id,
  //     "#ddd",
  //     true,
  //     QUEUE_CARD_W,
  //     QUEUE_CARD_H
  //   );
  //   this.addNumberBadge(qt, side.queue.length);
  //   if (team === "A") {
  //     this.queueLayerA.add(qt);
  //     this.queueTilesA.push(qt);
  //   } else {
  //     this.queueLayerB.add(qt);
  //     this.queueTilesB.push(qt);
  //   }

  //   // disable hand tile
  //   // tile.disable();
  //   // tile.lbl.setColor("#788089");
  // }

  private onUiQueueRequested(payload: any) {
    const { team, handIndex, card, dir } = payload;
    if (!this.started) return;
    const side = team === "A" ? this.state.teamA : this.state.teamB;
    const limit = this.state.mode === "Queue3" ? 3 : 1;
    if (side.queue.length >= limit) return;

    // queue via state API; BattleScene owns game logic
    queuePlay(team, this.state, { card, dir });

    // After mutating state, notify UIScene to refresh visuals
    this.game.events.emit('matchStateUpdated', {
      state: this.state,
      layout: { gridLeft: this.gridLeft, handATopY: this.handATopY, handBBotY: this.handBBotY, rightPanelX: this.rightPanelX }
    });
    this.refreshHud();
  }

  private onUiRemoveRequested(payload: any) {
    const { team, index } = payload;
    if (!this.started) return;
    const arr = team === "A" ? this.state.teamA.queue : this.state.teamB.queue;
    if (index < 0 || index >= arr.length) return;
    arr.splice(index, 1);

    // notify UIScene to refresh visuals
    this.game.events.emit('matchStateUpdated', {
      state: this.state,
      layout: { gridLeft: this.gridLeft, handATopY: this.handATopY, handBBotY: this.handBBotY, rightPanelX: this.rightPanelX }
    });
    this.refreshHud();
  }

  // ====== Tick resolution loop ======
  private resolveNextTick() {
    if (!this.started || this.state.winner) return;

    const aPlay = this.state.teamA.queue.shift();
    const bPlay = this.state.teamB.queue.shift();
    resolveOneTick(this.state, aPlay, bPlay);

    // game logic updated actor positions/hp etc.
    this.events.emit('stateUpdated');

    // Round/tick bookkeeping
    if (this.mode === "Queue3") {
      if (this.state.tick >= 3) {
        atEndOfRoundScoreNexus(this.state);
        resetQueues(this.state);
        freshRound(this.state.teamA, this.state.handMax, this.state.rng);
        freshRound(this.state.teamB, this.state.handMax, this.state.rng);
        this.state.round += 1;
        this.state.tick = 1;
        // notify UI to rebuild hands/queues for fresh cards
        this.game.events.emit('matchStateUpdated', {
          state: this.state,
          layout: { gridLeft: this.gridLeft, handATopY: this.handATopY, handBBotY: this.handBBotY, rightPanelX: this.rightPanelX }
        });
      } else {
        this.state.tick += 1;
        // simply refresh UI numbering
        this.game.events.emit('matchStateUpdated', {
          state: this.state,
          layout: { gridLeft: this.gridLeft, handATopY: this.handATopY, handBBotY: this.handBBotY, rightPanelX: this.rightPanelX }
        });
      }
    } else {
      // SingleCard: draw up and keep going
      drawTo(this.state.teamA.hand, this.state.teamA.drawPile, this.state.handMax);
      drawTo(this.state.teamB.hand, this.state.teamB.drawPile, this.state.handMax);
      this.state.tick += 1;
      this.game.events.emit('matchStateUpdated', {
        state: this.state,
        layout: { gridLeft: this.gridLeft, handATopY: this.handATopY, handBBotY: this.handBBotY, rightPanelX: this.rightPanelX }
      });
    }

    this.state.winner = checkVictory(this.state);
    this.refreshHud();
  }

  // private popFrontQueueTile(team: "A" | "B") {
  //   const tiles = team === "A" ? this.queueTilesA : this.queueTilesB;
  //   if (!tiles.length) return;
  //   const first = tiles.shift()!;
  //   first.destroy(true);

  //   // re-layout & re-number remaining
  //   tiles.forEach((t, i) => {
  //     const { x, y } = this.tileXYForRightPanelIndex(i, team);
  //     t.setPosition(x, y);
  //     if (t.badgeText) t.badgeText.setText(String(i + 1));
  //   });
  // }

  // private refreshQueueNumbers() {
  //   const renum = (arr: TileContainer[]) =>
  //     arr.forEach((t, i) => t.badgeText?.setText(String(i + 1)));
  //   renum(this.queueTilesA);
  //   renum(this.queueTilesB);
  // }

  // private addDirectionMarker(
  //   c: TileContainer,
  //   dir: { dx: -1 | 0 | 1; dy: -1 | 0 | 1 } | undefined,
  //   w = QUEUE_CARD_W,
  //   h = QUEUE_CARD_H
  // ) {
  //   if (!dir) return;
  //   const arrow =
  //     dir.dy === -1
  //       ? "↑"
  //       : dir.dy === 1
  //       ? "↓"
  //       : dir.dx === 1
  //       ? "→"
  //       : dir.dx === -1
  //       ? "←"
  //       : "?";
  //   const marker = this.add
  //     .text(w - 22, h - 22, arrow, {
  //       color: "#fff",
  //       fontSize: "14px",
  //       fontStyle: "bold",
  //     })
  //     .setOrigin(0);
  //   c.add(marker);
  // }
}
