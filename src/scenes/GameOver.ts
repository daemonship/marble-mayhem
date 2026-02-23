import Phaser from 'phaser';

// GameOver scene — displays final stats and Play Again button
// TODO (Task 4): Show DOM game-over overlay with stats, wire Play Again
export class GameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    // TODO: display game-over screen with time, level, kills
  }
}
