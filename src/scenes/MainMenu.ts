import Phaser from 'phaser';

// MainMenu scene — shows start screen, waits for player to start, handles attract mode
export class MainMenu extends Phaser.Scene {
  private idleTimer: number = 0;
  private idleTimeout: number = 45000; // 45 seconds of inactivity
  private lastInputTime: number = 0;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    // Initialize idle timer
    this.idleTimer = 0;
    this.lastInputTime = this.time.now;

    // Set up input listeners to reset idle timer
    this.setupInputListeners();

    // Expose reset function for window
    (window as any).resetIdleTimer = () => {
      this.lastInputTime = this.time.now;
    };

    // Expose attract mode ended flag
    (window as any).attractModeEnded = false;
  }

  update(time: number, delta: number): void {
    // Check for attract mode trigger
    const timeSinceLastInput = time - this.lastInputTime;

    if (timeSinceLastInput >= this.idleTimeout) {
      // Start attract mode
      this.startAttractMode();
      // Reset timer to prevent continuous triggering
      this.lastInputTime = time;
    }

    // Check if attract mode ended and we need to return to title
    if ((window as any).attractModeEnded) {
      (window as any).attractModeEnded = false;
      this.returnToTitle();
    }
  }

  private setupInputListeners(): void {
    // Reset idle timer on any input
    this.input.on('pointerdown', () => {
      this.lastInputTime = this.time.now;
    });

    this.input.on('pointermove', () => {
      this.lastInputTime = this.time.now;
    });

    this.input.on('keydown', () => {
      this.lastInputTime = this.time.now;
    });

    // Also set up global window listeners for inputs outside Phaser canvas
    window.addEventListener('keydown', () => {
      this.lastInputTime = this.time.now;
    });

    window.addEventListener('pointermove', () => {
      this.lastInputTime = this.time.now;
    });

    window.addEventListener('pointerdown', () => {
      this.lastInputTime = this.time.now;
    });
  }

  private startAttractMode(): void {
    // Hide start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
      startScreen.style.display = 'none';
    }

    // Show HUD
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.display = 'block';
    }

    // Show mute button
    const muteButton = document.getElementById('mute-button');
    if (muteButton) {
      muteButton.style.display = 'block';
    }

    // Reset game state for attract mode
    const resetGameState = (window as any).resetGameState;
    if (resetGameState) {
      resetGameState();
    }

    // Start the game scene with attract mode flag — stop MainMenu first so only one scene runs
    (window as any).attractModeActive = true;
    window.game.scene.stop('MainMenu');
    window.game.scene.start('Game');
  }

  private returnToTitle(): void {
    // Stop game scene
    if (this.scene.get('Game')) {
      this.scene.stop('Game');
    }

    // Show start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
      startScreen.style.display = 'flex';
    }

    // Hide HUD
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.display = 'none';
    }

    // Hide mute button
    const muteButton = document.getElementById('mute-button');
    if (muteButton) {
      muteButton.style.display = 'none';
    }

    // Reset idle timer
    this.lastInputTime = this.time.now;
  }
}
