// Level Editor for Marble Mayhem
// Drag-and-drop level builder with export to LevelDef JSON

import Phaser from 'phaser';
import { LevelDef, SurfaceType, PlatformDef, PortalDef, EnemyDef, GemDef, CheckpointDef, GoalDef, SpringDef, SeesawDef, SpeedPadDef } from '../types/LevelDef';

// Default empty level definition
const DEFAULT_LEVEL: LevelDef = {
  id: 'editor_level',
  world: 1,
  level: 1,
  bgTheme: 'city_night',
  worldW: 4000,
  groundY: 528,
  spawnX: 100,
  spawnY: 492,
  platforms: [],
  portals: [],
  springs: [],
  enemies: [],
  gems: [],
  checkpoints: [],
  goal: { x: 3800, y: 448 },
  signs: [],
  seesaws: [],
  speedPads: [],
};

// Types of objects that can be placed
type ObjectType = 'platform' | 'portal' | 'spring' | 'enemy' | 'gem' | 'checkpoint' | 'goal' | 'spawn' | 'sign' | 'seesaw' | 'speedpad';

interface EditorObject {
  type: ObjectType;
  data: any; // specific def
  gfx: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image | null;
  selected: boolean;
}

export class LevelEditor extends Phaser.Scene {
  private levelDef!: LevelDef;
  private objects: EditorObject[] = [];
  private selectedObject: EditorObject | null = null;
  private currentTool: ObjectType = 'platform';
  private currentSurface: SurfaceType = SurfaceType.CONCRETE;
  private gridSize: number = 32;
  private gridEnabled: boolean = true;
  private cameraPanning: boolean = false;
  private panStart: { x: number; y: number } = { x: 0, y: 0 };
  private keys!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; W: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; SHIFT: Phaser.Input.Keyboard.Key; };
  private drawing: boolean = false;
  private drawStart: { x: number; y: number } = { x: 0, y: 0 };
  private previewGfx: Phaser.GameObjects.Graphics | null = null;
  private dragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super({ key: 'LevelEditor' });
  }

  init(data: { levelDef?: LevelDef }): void {
    this.levelDef = data.levelDef || { ...DEFAULT_LEVEL };
  }

  create(): void {
    this.setupInput();
    this.buildUI();
    this.renderLevel();
    this.cameras.main.setBackgroundColor('#1a1a2e');
  }

  private setupInput(): void {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointermove', this.onPointerMove, this);

    this.keys = this.input.keyboard!.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }) as any;
    this.input.keyboard!.on('keydown', this.onKeyDown, this);
  }

  private buildUI(): void {
    // TODO: Add palette buttons, export buttons, etc.
    this.add.text(10, 10, 'Level Editor', { fontSize: '20px', color: '#fff' }).setScrollFactor(0);
  }

  private renderLevel(): void {
    // Clear existing graphics
    this.objects.forEach(obj => obj.gfx?.destroy());
    this.objects = [];

    // Render platforms
    this.levelDef.platforms.forEach(plat => {
      const gfx = this.add.graphics();
      gfx.fillStyle(this.getSurfaceColor(plat.surface), 1);
      gfx.fillRect(plat.x, plat.y, plat.w, plat.h);
      gfx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      this.objects.push({
        type: 'platform',
        data: plat,
        gfx,
        selected: false,
      });
    });

    // TODO: Render other object types
  }

  private getSurfaceColor(surface: SurfaceType): number {
    const colors: Record<SurfaceType, number> = {
      [SurfaceType.CONCRETE]: 0x374151,
      [SurfaceType.GRASS]: 0x166534,
      [SurfaceType.SAND]: 0xa16207,
      [SurfaceType.MUD]: 0x431407,
      [SurfaceType.ICE]: 0x164e63,
      [SurfaceType.SNOW]: 0xcbd5e1,
      [SurfaceType.WET_METAL]: 0x1e293b,
      [SurfaceType.BOUNCE_PAD]: 0x78350f,
      [SurfaceType.CONVEYOR]: 0x1e3a5f,
    };
    return colors[surface] || 0x666666;
  }

  private snapToGrid(x: number, y: number): { x: number; y: number } {
    if (!this.gridEnabled) return { x, y };
    const g = this.gridSize;
    return { x: Math.round(x / g) * g, y: Math.round(y / g) * g };
  }

  private findObjectAt(x: number, y: number): EditorObject | null {
    // Simple bounding box check for platforms
    for (const obj of this.objects) {
      if (obj.type === 'platform') {
        const plat = obj.data as PlatformDef;
        if (x >= plat.x && x <= plat.x + plat.w && y >= plat.y && y <= plat.y + plat.h) {
          return obj;
        }
      }
      // TODO: other object types
    }
    return null;
  }

  private selectObject(obj: EditorObject): void {
    if (this.selectedObject) {
      // Deselect previous
      this.selectedObject.selected = false;
      // TODO: update visual
    }
    this.selectedObject = obj;
    obj.selected = true;
    // TODO: highlight selected object
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snapped = this.snapToGrid(worldPoint.x, worldPoint.y);
    if (pointer.rightButtonDown()) {
      // Start camera pan
      this.cameraPanning = true;
      this.panStart = { x: pointer.x, y: pointer.y };
      return;
    }
    // Left button
    // Check if we clicked on an existing object
    const clickedObj = this.findObjectAt(snapped.x, snapped.y);
    if (clickedObj) {
      // Select object and start dragging
      this.selectObject(clickedObj);
      this.dragging = true;
      this.dragOffset = { x: snapped.x - clickedObj.data.x, y: snapped.y - clickedObj.data.y };
      return;
    }
    // Otherwise start drawing a new platform (if tool is platform)
    if (this.currentTool === 'platform') {
      this.drawing = true;
      this.drawStart = snapped;
      this.previewGfx = this.add.graphics();
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.cameraPanning = false;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.cameraPanning && pointer.isDown) {
      const cam = this.cameras.main;
      cam.scrollX -= (pointer.x - this.panStart.x) / cam.zoom;
      cam.scrollY -= (pointer.y - this.panStart.y) / cam.zoom;
      this.panStart = { x: pointer.x, y: pointer.y };
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    // TODO: Handle keyboard shortcuts (delete, copy, etc.)
  }

  update(): void {
    // Camera pan with keys
    const speed = this.keys.SHIFT.isDown ? 20 : 10;
    if (this.keys.A.isDown) this.cameras.main.scrollX -= speed;
    if (this.keys.D.isDown) this.cameras.main.scrollX += speed;
    if (this.keys.W.isDown) this.cameras.main.scrollY -= speed;
    if (this.keys.S.isDown) this.cameras.main.scrollY += speed;
  }
}