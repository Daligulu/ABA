// lib/score/scorer.ts
import type { CoachConfig } from '@/config/coach'
import { scoreLowerBody, scoreUpperBody, scoreBalance, scoreAlignment, mergeScores } from '@/lib/analyze/scoring'

export function scoreFromPose(_pose: any, cfg: CoachConfig) {
  // 这里直接用模拟值，后续可以从 pose 里取膝盖、髋部、手腕角度
  const legs = scoreLowerBody(100, cfg)
  const upper = scoreUpperBody(0.35, cfg)
  const balance = scoreBalance(0.18, cfg)
  const align = scoreAlignment(0.09, cfg)
  return mergeScores({ legs, upper, balance, align })
}
