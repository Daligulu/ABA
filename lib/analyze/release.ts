// lib/analyze/release.ts
// 出手阶段的一些简单判断，给评分逻辑调用
import type { CoachConfig } from '@/config/coach'

export type ReleaseMetrics = {
  wristFlex: number
  releaseAngle: number
  isFollowThrough: boolean
}

export function evaluateRelease(m: ReleaseMetrics, cfg: CoachConfig) {
  const followOk = m.isFollowThrough ? 1 : 0.55
  const target = cfg.thresholds?.followThrough?.target ?? 0.35
  const tol = cfg.thresholds?.followThrough?.tolerance ?? 0.25
  const angleScore = m.releaseAngle >= target - tol ? 1 : 0.8
  return {
    followScore: followOk,
    angleScore,
    final: Math.round((followOk * 0.6 + angleScore * 0.4) * 100),
  }
}
