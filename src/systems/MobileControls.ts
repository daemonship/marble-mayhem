// MobileControls — touch-friendly on-screen controls for Marble Mayhem
// Renders a D-pad on the left and a jump button on the right.

import Phaser from 'phaser';

export interface MobileControlsConfig {
  /** Whether controls are visible (auto-detected on init) */
  enabled: boolean;
  /** D-pad X position (0-1 of screen) */
  dpadX: number;
  /** D-pad Y position (0-1 of screen) */
  dpadY: number;
  /** Jump button X position (0-1 of screen) */
  jumpX: number;
  /** Jump button Y position (0-1 of screen) */
  jumpY: number;
}

export class MobileControls {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private dpadContainer!: Phaser.GameObjects.Container;
  private jumpButton!: Phaser.GameObjects.Container;
  
  // Control state (read by game)
  public leftPressed = false;
  public rightPressed = false;
  public jumpPressed = false;
  public jumpJustPressed = false;
  
  // Visual feedback
  private leftBtn!: Phaser.GameObjects.Graphics;
  private rightBtn!: Phaser.GameObjects.Graphics;
  private jumpBtn!: Phaser.GameObjects.Graphics;
  
  // Button states
  private leftDown = false;
  private rightDown = false;
  private jumpDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createControls();
  }

  private createControls(): void {
    const { width, height } = this.scene.cameras.main;
    
    // Only create on mobile/touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    
    const dpadSize = 90;
    const btnSize = 70;
    const dpadX = 80;
    const dpadY = height - 100;
    const jumpX = width - 90;
    const jumpY = height - 100;

    // D-pad container
    this.dpadContainer = this.scene.add.container(dpadX, dpadY);
    
    // D-pad background (semi-transparent circle)
    const dpadBg = this.scene.add.graphics();
    dpadBg.fillStyle(0x1f2937, 0.5);
    dpadBg.fillCircle(0, 0, dpadSize);
    dpadBg.lineStyle(2, 0x4b5563, 0.8);
    dpadBg.strokeCircle(0, 0, dpadSize);
    this.dpadContainer.add(dpadBg);

    // Left button
    this.leftBtn = this.scene.add.graphics();
    this.leftBtn.fillStyle(0x374151, 0.9);
    this.leftBtn.fillCircle(-30, 0, 25);
    this.leftBtn.fillStyle(0x9ca3af, 1);
    this.leftBtn.fillTriangle(-40, 0, -25, -10, -25, 10);
    this.dpadContainer.add(this.leftBtn);
    this.dpadContainer.add(
      this.scene.add.text(-30, 0, '◀', {
        fontSize: '20px', color: '#e5e7eb'
      }).setOrigin(0.5).setDepth(1)
    );

    // Right button
    this.rightBtn = this.scene.add.graphics();
    this.rightBtn.fillStyle(0x374151, 0.9);
    this.rightBtn.fillCircle(30, 0, 25);
    this.rightBtn.fillStyle(0x9ca3af, 1);
    this.rightBtn.fillTriangle(40, 0, 25, -10, 25, 10);
    this.dpadContainer.add(this.rightBtn);
    this.dpadContainer.add(
      this.scene.add.text(30, 0, '▶', {
        fontSize: '20px', color: '#e5e7eb'
      }).setOrigin(0.5).setDepth(1)
    );

    this.container.add(this.dpadContainer);

    // Jump button
    this.jumpButton = this.scene.add.container(jumpX, jumpY);
    
    const jumpBg = this.scene.add.graphics();
    jumpBg.fillStyle(0x1f2937, 0.5);
    jumpBg.fillCircle(0, 0, btnSize);
    jumpBg.lineStyle(3, 0x3b82f6, 0.9);
    jumpBg.strokeCircle(0, 0, btnSize);
    this.jumpButton.add(jumpBg);

    this.jumpBtn = this.scene.add.graphics();
    this.jumpBtn.fillStyle(0x3b82f6, 0.9);
    this.jumpBtn.fillCircle(0, 0, 40);
    this.jumpButton.add(this.jumpBtn);
    this.jumpButton.add(
      this.scene.add.text(0, 0, '⏎', {
        fontSize: '24px', color: '#ffffff'
      }).setOrigin(0.5).setDepth(1)
    );

    this.container.add(this.jumpButton);

    // Make interactive
    this.setupInteraction();
  }

  private setupInteraction(): void {
    const { width, height } = this.scene.cameras.main;
    const dpadX = 80;
    const dpadY = height - 100;
    const jumpX = width - 90;
    const jumpY = height - 100;

    // Input handling
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check D-pad left
      const leftDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, dpadX - 30, dpadY);
      if (leftDist < 35) {
        this.leftDown = true;
        this.updateLeftVisual(true);
      }
      
      // Check D-pad right
      const rightDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, dpadX + 30, dpadY);
      if (rightDist < 35) {
        this.rightDown = true;
        this.updateRightVisual(true);
      }
      
      // Check jump button
      const jumpDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, jumpX, jumpY);
      if (jumpDist < 50) {
        this.jumpDown = true;
        this.jumpJustPressed = true;
        this.updateJumpVisual(true);
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Check left release
      const leftDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, dpadX - 30, dpadY);
      if (this.leftDown && leftDist >= 35) {
        this.leftDown = false;
        this.updateLeftVisual(false);
      }
      
      // Check right release  
      const rightDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, dpadX + 30, dpadY);
      if (this.rightDown && rightDist >= 35) {
        this.rightDown = false;
        this.updateRightVisual(false);
      }
      
      // Check jump release
      const jumpDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, jumpX, jumpY);
      if (this.jumpDown && jumpDist >= 50) {
        this.jumpDown = false;
        this.updateJumpVisual(false);
      }
    });
    
    // Handle touch move to track buttons
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      
      // Left button tracking
      const leftDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, dpadX - 30, dpadY);
      if (leftDist < 35 && !this.leftDown) {
        this.leftDown = true;
        this.updateLeftVisual(true);
      } else if (leftDist >= 35 && this.leftDown) {
        this.leftDown = false;
        this.updateLeftVisual(false);
      }
      
      // Right button tracking
      const rightDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, dpadX + 30, dpadY);
      if (rightDist < 35 && !this.rightDown) {
        this.rightDown = true;
        this.updateRightVisual(true);
      } else if (rightDist >= 35 && this.rightDown) {
        this.rightDown = false;
        this.updateRightVisual(false);
      }
      
      // Jump button tracking
      const jumpDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, jumpX, jumpY);
      if (jumpDist < 50 && !this.jumpDown) {
        this.jumpDown = true;
        this.jumpJustPressed = true;
        this.updateJumpVisual(true);
      } else if (jumpDist >= 50 && this.jumpDown) {
        this.jumpDown = false;
        this.updateJumpVisual(false);
      }
    });
  }

  private updateLeftVisual(pressed: boolean): void {
    this.leftBtn.clear();
    if (pressed) {
      this.leftBtn.fillStyle(0x3b82f6, 1);
      this.leftBtn.fillCircle(-30, 0, 28);
    } else {
      this.leftBtn.fillStyle(0x374151, 0.9);
      this.leftBtn.fillCircle(-30, 0, 25);
    }
    this.leftBtn.fillStyle(0x9ca3af, 1);
    this.leftBtn.fillTriangle(-40, 0, -25, -10, -25, 10);
  }

  private updateRightVisual(pressed: boolean): void {
    this.rightBtn.clear();
    if (pressed) {
      this.rightBtn.fillStyle(0x3b82f6, 1);
      this.rightBtn.fillCircle(30, 0, 28);
    } else {
      this.rightBtn.fillStyle(0x374151, 0.9);
      this.rightBtn.fillCircle(30, 0, 25);
    }
    this.rightBtn.fillStyle(0x9ca3af, 1);
    this.rightBtn.fillTriangle(40, 0, 25, -10, 25, 10);
  }

  private updateJumpVisual(pressed: boolean): void {
    this.jumpBtn.clear();
    if (pressed) {
      this.jumpBtn.fillStyle(0x22c55e, 1);
      this.jumpBtn.fillCircle(0, 0, 45);
    } else {
      this.jumpBtn.fillStyle(0x3b82f6, 0.9);
      this.jumpBtn.fillCircle(0, 0, 40);
    }
  }

  // Called each frame to update control state
  update(): void {
    this.leftPressed = this.leftDown;
    this.rightPressed = this.rightDown;
    
    // Jump is handled as a hold-down for charging
    // Reset justPressed after one frame
    if (this.jumpJustPressed) {
      this.jumpPressed = true;
      this.jumpJustPressed = false;
    } else if (this.jumpDown) {
      this.jumpPressed = true;
    } else {
      this.jumpPressed = false;
    }
  }
  
  // Check if jump was just pressed this frame
  consumeJumpJustPressed(): boolean {
    const result = this.jumpJustPressed;
    this.jumpJustPressed = false;
    return result;
  }
  
  // Cleanup
  destroy(): void {
    if (this.container) {
      this.container.destroy();
    }
  }
}
