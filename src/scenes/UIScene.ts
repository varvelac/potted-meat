import Phaser from 'phaser';
import HandView from './HandView';
import QueueView from './QueueView';
import { COLOR_A, COLOR_B } from './constants';

/**
 * UIScene
 * - Listens for a global 'matchStateUpdated' event and redraws hands/queues.
 * - Owns its own containers so it can sit above BattleScene.
 */
export default class UIScene extends Phaser.Scene {
  private handLayerA!: Phaser.GameObjects.Container;
  private handLayerB!: Phaser.GameObjects.Container;
  private queueLayerA!: Phaser.GameObjects.Container;
  private queueLayerB!: Phaser.GameObjects.Container;

  private handViewA!: HandView;
  private handViewB!: HandView;
  private queueViewA!: QueueView;
  private queueViewB!: QueueView;

  constructor() {
    super('UI');
  }

  create() {
    // Create top-level layers for the UI and keep a high depth so it overlays the board.
    this.handLayerA = this.add.container(0, 0).setDepth(1200);
    this.handLayerB = this.add.container(0, 0).setDepth(1200);
    this.queueLayerA = this.add.container(0, 0).setDepth(1100);
    this.queueLayerB = this.add.container(0, 0).setDepth(1100);

    this.handViewA = new HandView(this, this.handLayerA);
    this.handViewB = new HandView(this, this.handLayerB);
    this.queueViewA = new QueueView(this, this.queueLayerA);
    this.queueViewB = new QueueView(this, this.queueLayerB);

    // Listen for global updates from the BattleScene
    this.game.events.on('matchStateUpdated', this.onMatchStateUpdated, this);
  }

  shutdown() {
    this.game.events.off('matchStateUpdated', this.onMatchStateUpdated, this);
  }

  private onMatchStateUpdated(payload: any) {
    // payload: { state, layout }
    const state = payload.state;
    const layout = payload.layout ?? {};

    // Position our layers using layout values provided by BattleScene
    const gridLeft = layout.gridLeft ?? 100;
    const handATopY = layout.handATopY ?? (this.scale.height - 200);
    const handBBotY = layout.handBBotY ?? 100;
    const rightPanelX = layout.rightPanelX ?? (gridLeft + 600);

    // set container positions (HandView / QueueView do internal placement)
    this.handLayerA.setPosition(gridLeft, handATopY);
    this.handLayerB.setPosition(gridLeft, handBBotY);
    this.queueLayerA.setPosition(rightPanelX, 0);
    this.queueLayerB.setPosition(rightPanelX, 0);

    // Build / refresh hands
    this.handViewA.build('A', state.teamA.hand, 0, COLOR_A);
    this.handViewB.build('B', state.teamB.hand, 0, COLOR_B);

    // QueueView expects Card[]; we map queued plays -> card for simple display.
    this.queueViewA.build('A', state.teamA.queue.map((q: any) => q.card), 40, COLOR_A);
    this.queueViewB.build('B', state.teamB.queue.map((q: any) => q.card), 40, COLOR_B);
  }
}