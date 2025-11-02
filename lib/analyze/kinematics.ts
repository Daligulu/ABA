// lib/analyze/kinematics.ts
// 一些简单的运动学工具，供 VideoAnalyzer 内部或者后续 TFJS 管线调用

export type Vec2 = { x: number; y: number }

export function distance2D(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function angleDeg(a: Vec2, b: Vec2, c: Vec2): number {
  // 计算 ∠ABC
  const abx = a.x - b.x
  const aby = a.y - b.y
  const cbx = c.x - b.x
  const cby = c.y - b.y
  const dot = abx * cbx + aby * cby
  const mab = Math.hypot(abx, aby)
  const mcb = Math.hypot(cbx, cby)
  if (!mab || !mcb) return 0
  const cos = Math.min(1, Math.max(-1, dot / (mab * mcb)))
  return (Math.acos(cos) * 180) / Math.PI
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
