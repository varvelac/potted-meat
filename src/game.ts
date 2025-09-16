import Phaser from 'phaser';
import BootScene from './scenes/BootScene'
import BattleScene from './scenes/BattleScene';
import UIScene from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1500,
  height: 1100,
  scene: [BootScene, BattleScene, UIScene], // <-- add UIScene so it can overlay BattleScene
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};
export default config;



export class Game extends Phaser.Game {
    constructor() {
        super(config);
    }
}

// // Entry point
// window.onload = () => {
//     const game = new Game();
// };