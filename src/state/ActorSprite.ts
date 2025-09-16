import type Phaser from 'phaser';
import { tileToPixel, TILE, PADDING } from '../scenes/layouts';

// Facing directions used to select per-direction spritesheets / animations.
type Facing = 'up' | 'down' | 'left' | 'right';

// Number of frames in each directional spritesheet. If your sheets differ,
// change this constant to match the content of your texture atlas / sprites.
const FRAMES_PER_DIR = 6;

// Order of directions we expect; used when creating animations programmatically.
const DIR_ORDER: Facing[] = ['up', 'right', 'down', 'left'];

/**
 * Ensure per-direction walk animations exist on the scene's animation manager.
 * We create one looping animation per direction that uses frames [0..FRAMES_PER_DIR-1]
 * from the spritesheet whose key matches `walk_<dir>` (e.g. `walk_up`).
 */
function ensureAnimations(scene: Phaser.Scene) {
  // Avoid re-creating animations if already present.
  if (scene.anims.exists('walk_up')) return;
  for (let i = 0; i < DIR_ORDER.length; i++) {
    const dir = DIR_ORDER[i];
    const key = `walk_${dir}`;
    // generate frame numbers assuming frames are indexed 0..FRAMES_PER_DIR-1
    const frames = scene.anims.generateFrameNumbers(key, { start: 0, end: FRAMES_PER_DIR - 1 });
    scene.anims.create({
      key: `walk_${dir}`,
      frames,
      frameRate: 10,
      repeat: -1,
    });
  }
}

/**
 * Small wrapper class that owns a Phaser sprite and keeps it synced with a
 * logical actor's tile coordinates. The sprite is centered on the tile center
 * (tileToPixel) and we use tweens to animate movement between tile centers.
 */
export default class ActorSprite {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private tileX: number;
  private tileY: number;
  

  // initialTextureKey should be a per-direction spritesheet key like 'walk_down'.
  constructor(scene: Phaser.Scene, _id: 'A' | 'B', initialTextureKey = 'walk_down') {
    this.scene = scene;
    // Ensure animations are registered once for the scene.
    ensureAnimations(scene);
    // Create the sprite using the chosen directional spritesheet.
    this.sprite = scene.add.sprite(0, 0, initialTextureKey);
    // Display size: slightly smaller than the tile so the sprite fits inside
    // tile borders and looks visually centered. TILE * 0.9 scales it relative
    // to the GRID tile size.
    this.sprite.setDisplaySize(TILE * 0.9, TILE * 0.9);
    // Depth determines draw order; higher depth draws above tiles.
    this.sprite.setDepth(10);
    this.tileX = 0;
    this.tileY = 0;
  }

  /**
   * Immediately set sprite to match actor state without any tweening.
   * This is typically used on scene startup or when synchronizing after a
   * large state jump.
   */
  initFromState(actorState: any) {
    this.tileX = actorState.pos.x;
    this.tileY = actorState.pos.y;
    // Prefer scene-provided grid origin (gridLeft/gridTop) when available so
    // sprite centers match the rendered grid. Fall back to PADDING otherwise.
    const originX = (this.scene as any).gridLeft ?? PADDING;
    const originY = (this.scene as any).gridTop ?? PADDING;
    const p = tileToPixel(this.tileX, this.tileY, originX, originY);
    // Place sprite at the center of the tile.
    this.sprite.setPosition(p.x, p.y);
    this.setFacing(actorState.facing);
  }

  /**
   * Switch the sprite texture to the per-direction spritesheet and set the
   * first frame as an idle pose for that facing. Using textures keyed as
   * `walk_<dir>` lets us reuse the same sprite for both idle and walking
   * animation by swapping textures.
   */
  setFacing(facing?: Facing) {
    const dir = facing ?? 'down';
    this.sprite.setTexture(`walk_${dir}`);
    // Frame 0 is used as the idle frame.
    this.sprite.setFrame(0);
  }

  /**
   * Animate sprite to match actorState.pos. We compute how many tile-steps the
   * actor moved using Manhattan distance (|dx| + |dy|). The duration of the
   * tween is msPerStep * steps so multi-tile moves take proportionally more
   * time.
   *
   * Calculations explained:
   *   steps = |targetX - tileX| + |targetY - tileY|
   *     - Manhattan distance gives number of orthogonal tile steps between
   *       the old and new positions. This assumes movement only in 4
   *       directions.
   *   duration = max(1, steps) * msPerStep
   *     - ensures a minimum non-zero duration so tweens play even for a
   *       single-step move; if steps is 0 (no movement) we still use 1 to
   *       avoid a 0ms tween.
   */
  updateFromState(actorState: any, msPerStep = 120) {
    const targetX = actorState.pos.x;
    const targetY = actorState.pos.y;
    // steps is Manhattan distance between current and target tile.
    const steps = Math.abs(targetX - this.tileX) + Math.abs(targetY - this.tileY);
    const duration = Math.max(1, steps) * msPerStep;

    const facing: Facing = actorState.facing ?? 'down';
    const isMoving = steps > 0;

    // Ensure sprite uses the correct directional texture; we switch texture
    // before playing the walk animation so the right frames show.
    this.sprite.setTexture(`walk_${facing}`);

    if (isMoving) {
      // Play looping walk animation for the facing.
      this.sprite.anims.play(`walk_${facing}`, true);
    } else {
      // Stop animation and set idle frame for facing.
      this.sprite.anims.stop();
      this.setFacing(facing);
    }

    const pixel = tileToPixel(targetX, targetY, (this.scene as any).gridLeft ?? PADDING, (this.scene as any).gridTop ?? PADDING);
    // Kill any existing tweens affecting this sprite to prevent conflicts.
    this.scene.tweens.killTweensOf(this.sprite);

    // Add a linear tween moving the sprite to the target tile center.
    this.scene.tweens.add({
      targets: this.sprite,
      x: pixel.x,
      y: pixel.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        // Update internal tile coords and ensure we end on idle frame.
        this.tileX = targetX;
        this.tileY = targetY;
        this.sprite.anims.stop();
        this.setFacing(facing);
      },
    });
  }

  destroy() {
    this.sprite.destroy();
  }
}