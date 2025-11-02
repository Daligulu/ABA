// lib/ball/ballTracker.ts
// 这里先留一个空实现，后面接入真正的检测模型
export type BallTrack = { x: number; y: number; t: number }
export function trackBall(_frame: ImageData): BallTrack | null {
  return null
}
