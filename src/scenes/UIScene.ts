import Phaser from 'phaser';
import HandView from './HandView';
import QueueView from './QueueView';
import { COLOR_A, COLOR_B } from './constants';

/**
 * UIScene
 * - Now supports dynamic teams: it creates per-team layers/views on demand
 *   and iterates state.teams when redrawing.
 */
export default class UIScene extends Phaser.Scene {
  private handLayers: Record<string, Phaser.GameObjects.Container> = {};
  private queueLayers: Record<string, Phaser.GameObjects.Container> = {};
  private handViews: Record<string, HandView> = {};
  private queueViews: Record<string, QueueView> = {};

  constructor() {
    super('UI');
  }

  create() {
    // no per-team creation here; we create containers when first needed
    this.game.events.on('matchStateUpdated', this.onMatchStateUpdated, this);
  }

  shutdown() {
    this.game.events.off('matchStateUpdated', this.onMatchStateUpdated, this);
  }

  private ensureTeamViews(teamId: string) {
    if (!this.handLayers[teamId]) {
      this.handLayers[teamId] = this.add.container(0, 0).setDepth(1200);
      this.handViews[teamId] = new HandView(this, this.handLayers[teamId]);
    }
    if (!this.queueLayers[teamId]) {
      this.queueLayers[teamId] = this.add.container(0, 0).setDepth(1100);
      this.queueViews[teamId] = new QueueView(this, this.queueLayers[teamId]);
    }
  }

  private onMatchStateUpdated(payload: any) {
    const state = payload.state;
    const layout = payload.layout ?? {};

    const gridLeft = layout.gridLeft ?? 100;
    const rightPanelX = layout.rightPanelX ?? (gridLeft + 600);

    // Position and draw each team's hand/queue
    const teams = state.teams ?? {};
    const teamIds = Object.keys(teams);

    // Layout helpers: vertical offsets - basic scheme for two teams, for N teams you can expand later.
    let idx = 0;
    for (const tid of teamIds) {
      this.ensureTeamViews(tid);
      const handLayer = this.handLayers[tid];
      const queueLayer = this.queueLayers[tid];

      // simple stacking: alternate or spread — keep previous behavior for first two.
      const handTopY = idx === 0 ? (this.scale.height - 200) : 100;
      const queueTopY = 0;

      handLayer.setPosition(gridLeft, handTopY);
      queueLayer.setPosition(rightPanelX + idx * 220, queueTopY);

      const teamState = teams[tid];
      // Build hands & queues using the per-team view objects
      this.handViews[tid].build(tid, teamState.hand, 0, tid === 'A' ? COLOR_A : COLOR_B);
      this.queueViews[tid].build(tid, teamState.queue.map((q: any) => q.card), 40, tid === 'A' ? COLOR_A : COLOR_B);

      idx++;
    }
  }
}