// lib/pose/oneEuro2d.ts
import { OneEuro } from '@/lib/filters/oneEuro'

export class OneEuro2D {
  private fx = new OneEuro(0.35)
  private fy = new OneEuro(0.35)
  next(p: { x: number; y: number }) {
    return { x: this.fx.next(p.x), y: this.fy.next(p.y) }
  }
}
