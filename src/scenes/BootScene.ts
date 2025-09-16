import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // preload assets if you add them later
  }

  create() {
    this.scene.start('Battle');
  }
}
