// lib/analyze/scoring.ts
// 这里实现“放宽容差”的最终得分逻辑，VideoAnalyzer 可以直接 import
import type { CoachConfig } from '@/config/coach'

export type PhaseScores = {
  legs: number
  upper: number
  balance: number
  align: number
}

export function scoreLowerBody(kneeDepth: number, cfg: CoachConfig): number {
  const min = cfg.thresholds.kneeMin
  const max = cfg.thresholds.kneeMax ?? 140
  if (kneeDepth >= max) return 100
  if (kneeDepth >= min) return 85 + ((kneeDepth - min) / (max - min)) * 15
  return Math.max(55, 55 + ((kneeDepth - min) / min) * 35)
}

export function scoreUpperBody(followVal: number, cfg: CoachConfig): number {
  const target = cfg.thresholds.followThrough.target ?? 0.35
  const tol = cfg.thresholds.followThrough.tolerance ?? 0.25
  if (followVal >= target) return 95
  if (followVal >= target - tol) return 80 + ((followVal - (target - tol)) / tol) * 15
  return 60
}

export function scoreBalance(sway: number, cfg: CoachConfig): number {
  const center100 = cfg.scoring?.balance?.center100 ?? 0.25
  const minVal = Math.min(center100 * 1.4, 0.38)
  if (sway <= center100) {
    return 100 - sway * 50
  }
  if (sway <= minVal) {
    return 86 - (sway - center100) * 350
  }
  return 55
}

export function scoreAlignment(offset: number, cfg: CoachConfig): number {
  const tol = cfg.thresholds.alignment.tolerance ?? 0.12
  if (offset <= tol * 0.5) return 98
  if (offset <= tol) return 85 - (offset - tol * 0.5) * 420
  if (offset <= tol * 1.4) return 70 - (offset - tol) * 320
  return 58
}

export function clampToFloor(v: number, floor = 42) {
  return Math.max(v, floor)
}

export function mergeScores(p: PhaseScores) {
  return {
    lower: p.legs,
    upper: p.upper,
    balance: clampToFloor(p.balance, 42),
    align: clampToFloor(p.align, 45),
    overall: Math.round((p.legs * 0.28 + p.upper * 0.24 + p.balance * 0.24 + p.align * 0.24)),
  }
}
