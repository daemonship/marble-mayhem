// SeesawSystem — custom-physics tilting pivot platforms.
// Phaser Arcade Physics doesn't support rotating bodies, so we simulate
// torque/angular-velocity ourselves and do position-based marble contact.
//
// Coordinate conventions (Phaser: y increases DOWNWARD):
//   angle > 0  → right arm tilts DOWN (clockwise)
//   angle < 0  → left arm tilts DOWN  (counter-clockwise)
//   pivotY     → Y of the plank's top surface at angle=0 (the "resting" level)
//   torque > 0 → clockwise acceleration

import Phaser from 'phaser';
import { SeesawDef } from '../types/LevelDef';

const GRAVITY    = 980;   // must match MarblePlatform
const PLANK_H    = 8;     // visual thickness of the plank (px)
const SNAP_RANGE = 6;     // px above plank top where contact activates

interface SeesawState {
  def:        SeesawDef;
  angle:      number;   // radians; positive = right side down
  angularVel: number;   // radians / second
  gfx:        Phaser.GameObjects.Graphics;
}

export interface SeesawContact {
  onSeesaw:    boolean;
  plankTopY:   number;   // Y of plank top surface at marble X
  surfaceVy:   number;   // vertical velocity of plank surface at marble X (px/s)
  slideAccelX: number;   // horizontal gravity component along slope (px/s²)
}

export class SeesawSystem {
  private seesaws: SeesawState[] = [];

  constructor(private scene: Phaser.Scene) {}

  build(defs: SeesawDef[]): void {
    for (const def of defs) {
      const gfx = this.scene.add.graphics().setDepth(5);
      this.seesaws.push({ def, angle: 0, angularVel: 0, gfx });
    }
  }

  /**
   * Update seesaw physics and return marble contact info for this frame.
   * Call once per frame with the marble's CURRENT position (after Phaser physics).
   */
  update(dt: number, marbleX: number, marbleY: number, R: number): SeesawContact {
    const result: SeesawContact = { onSeesaw: false, plankTopY: 0, surfaceVy: 0, slideAccelX: 0 };

    for (const sw of this.seesaws) {
      const { def } = sw;
      const halfLen = def.length / 2;
      const cosA    = Math.cos(sw.angle);
      const sinA    = Math.sin(sw.angle);
      const dx      = marbleX - def.pivotX;

      // ── Plank top surface Y at marble X ────────────────────────────────────
      // Derived from: point on plank at offset d = dx/cosA along the plank.
      // Y at that point = pivotY + sinA * d = pivotY + (sinA/cosA) * dx = pivotY + tan(θ) * dx
      const plankTopY = def.pivotY + (cosA > 0.001 ? (sinA / cosA) * dx : 0);

      // ── X-extent of plank (approximate using cosA*halfLen) ─────────────────
      const extentX = cosA * halfLen;
      const overPlank = marbleX >= def.pivotX - extentX - 2 &&
                        marbleX <= def.pivotX + extentX + 2;

      // ── Contact: marble bottom within [plankTop-SNAP, plankTop+PLANK_H+R] ──
      const marbleBottom = marbleY + R;
      const touching = overPlank &&
        marbleBottom >= plankTopY - SNAP_RANGE &&
        marbleBottom <= plankTopY + PLANK_H + R;

      // ── Torque: Σ(mass * g * horizontal distance from pivot) ───────────────
      // Positive dx  → clockwise (right side down) → positive torque ✓
      let torque = 0;
      if (touching) torque += 1.0 * GRAVITY * dx;   // marble mass = 1.0
      for (const gem of def.gems ?? []) {
        torque += gem.mass * GRAVITY * gem.xOffset;
      }

      // ── Integrate rotation ─────────────────────────────────────────────────
      sw.angularVel += (torque / def.rotMass) * dt;
      // Per-frame damping normalised to 60fps (def.damping is the 60fps factor)
      sw.angularVel *= Math.pow(def.damping, dt / 0.01667);
      sw.angle      += sw.angularVel * dt;
      sw.angle       = Phaser.Math.Clamp(sw.angle, -def.maxAngle, def.maxAngle);

      // Hard stop at angular limits — absorb most angular momentum
      if (Math.abs(sw.angle) >= def.maxAngle) {
        sw.angularVel *= 0.05;
      }

      // ── Surface velocity at marble X ────────────────────────────────────────
      // d/dt [tan(θ) * dx] ≈ (1/cos²θ) * angularVel * dx   (dx is fixed for this frame)
      const cosA2    = cosA * cosA;
      const surfaceVy = (cosA2 > 0.001 ? sw.angularVel / cosA2 : sw.angularVel) * dx;

      if (touching) {
        result.onSeesaw    = true;
        result.plankTopY   = plankTopY;
        result.surfaceVy   = surfaceVy;
        // Gravity component along slope — pushes marble toward lower arm
        result.slideAccelX = GRAVITY * sinA;
      }
    }

    return result;
  }

  draw(): void {
    for (const sw of this.seesaws) {
      const gfx = sw.gfx;
      gfx.clear();

      const { def } = sw;
      const halfLen = def.length / 2;
      const cosA    = Math.cos(sw.angle);
      const sinA    = Math.sin(sw.angle);

      // ── Plank endpoints (top-surface left and right corners) ────────────────
      const lx = def.pivotX - cosA * halfLen;
      const ly = def.pivotY - sinA * halfLen;
      const rx = def.pivotX + cosA * halfLen;
      const ry = def.pivotY + sinA * halfLen;

      // ── "Downward" perpendicular from the plank surface ─────────────────────
      // Plank direction: (cosA, sinA).  Rotating CCW by 90°: (-sinA, cosA).
      // At angle=0: (-0, 1) = (0, 1) = screen-downward ✓
      const downX = -sinA, downY = cosA;

      // Four corners of plank rectangle
      const p0 = [lx,                        ly                       ];
      const p1 = [rx,                        ry                       ];
      const p2 = [rx + downX * PLANK_H,      ry + downY * PLANK_H    ];
      const p3 = [lx + downX * PLANK_H,      ly + downY * PLANK_H    ];

      // Fill plank body — warm wood tone
      gfx.fillStyle(0x8b5e3c);
      gfx.beginPath();
      gfx.moveTo(p0[0], p0[1]);
      gfx.lineTo(p1[0], p1[1]);
      gfx.lineTo(p2[0], p2[1]);
      gfx.lineTo(p3[0], p3[1]);
      gfx.closePath();
      gfx.fillPath();

      // Top-surface highlight stripe
      gfx.lineStyle(2, 0xd4a574);
      gfx.lineBetween(lx, ly, rx, ry);

      // ── Triangle fulcrum below pivot ────────────────────────────────────────
      gfx.fillStyle(0x374151);
      gfx.beginPath();
      gfx.moveTo(def.pivotX - 14, def.pivotY + PLANK_H + 22);
      gfx.lineTo(def.pivotX + 14, def.pivotY + PLANK_H + 22);
      gfx.lineTo(def.pivotX,      def.pivotY + PLANK_H     );
      gfx.closePath();
      gfx.fillPath();

      // ── Pivot pin ──────────────────────────────────────────────────────────
      gfx.fillStyle(0x4a4a4a);
      gfx.fillCircle(def.pivotX, def.pivotY, 5);
      gfx.lineStyle(1.5, 0x888888);
      gfx.strokeCircle(def.pivotX, def.pivotY, 5);

      // ── Gems resting on plank ──────────────────────────────────────────────
      for (const gem of def.gems ?? []) {
        // Gem center-X follows the plank at the given xOffset
        const gx = def.pivotX + cosA * gem.xOffset;
        const gy = def.pivotY + sinA * gem.xOffset;  // plank top-surface Y at gem

        // Small diamond sitting on the plank top surface
        // The "up" direction from plank = (sinA, -cosA)
        const upX = sinA, upY = -cosA;
        const h = 10;  // gem height
        gfx.fillStyle(0x06b6d4, 1);
        gfx.beginPath();
        gfx.moveTo(gx,                       gy - h                       );  // top tip
        gfx.lineTo(gx + upY * 5,             gy - upX * 5                 );  // right point
        gfx.lineTo(gx + upX * 2,             gy + upY * 2                 );  // bottom tip (on plank)
        gfx.lineTo(gx - upY * 5,             gy + upX * 5                 );  // left point
        gfx.closePath();
        gfx.fillPath();
        // Facet highlight
        gfx.fillStyle(0xffffff, 0.35);
        gfx.fillTriangle(
          gx,             gy - h,
          gx + upY * 5,  gy - upX * 5,
          gx,             gy - h * 0.5,
        );
      }
    }
  }
}
