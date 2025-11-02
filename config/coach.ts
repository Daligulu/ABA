// config/coach.ts

export type ScoreBetter = 'closer' | '>=|' | '<=|'

export type ScoreRule = {
  target: number
  tolerance: number
  unit?: 'deg' | 'pct' | 'px' | 's'
  better?: ScoreBetter
}

export type WeightItem = {
  key: string
  label: string
  weight: number
  rule: ScoreRule
}

export type WeightBucket = {
  name: '下肢动力链' | '上肢出手' | '对齐与平衡' | string
  weight: number
  items: WeightItem[]
}

export type ReleaseDetectConfig = {
  minElbowDeg?: number
  bodyWidthScale?: number
}

export type ScoringWindow = {
  preReleaseSec?: number
  postReleaseSec?: number
}

export type CoachConfig = {
  modelPreference: 'blaze-full' | 'blaze-lite' | 'movenet'
  enableSmartCrop: boolean
  enableOpenCV: boolean
  smooth: { minCutoff: number; beta: number; dCutoff: number }
  thresholds: {
    kneeMin: number
    kneeMax: number
    releaseAngleIdeal: number
    lateralOffsetMaxPct: number
  }
  scoring?: ScoringWindow
  releaseDetect?: ReleaseDetectConfig
  weights: WeightBucket[]
}

export const DEFAULT_CONFIG: CoachConfig = {
  modelPreference: 'movenet',
  enableSmartCrop: true,
  enableOpenCV: false,
  smooth: {
    minCutoff: 1,
    beta: 0.02,
    dCutoff: 1,
  },
  thresholds: {
    kneeMin: 60,
    kneeMax: 140,
    releaseAngleIdeal: 115,
    lateralOffsetMaxPct: 0.12,
  },
  scoring: {
    preReleaseSec: 0.45,
    postReleaseSec: 0.4,
    releaseAllowance: { minElbowDeg: 15 },
    balance: {
      center100: 2.5,
      align100: 4,
    },
  },
  weights: [
    {
      name: '我新络',
      weight: 0.4,
      items: [
        {
          key: 'kneeDepth',
          label: '膝关节夹角，越接近�fý',
          weight: 0.3,
          rule: {
            target: 95,
            tolerance: 10,
            unit: 'deg',
            better: '==|',
          },
        },
        {
          key: 'extendSpeed',
          label: '起跳时膝盖伸展',
          weight: 0.3,
          rule: {
            target: 45,
            tolerance: 30,
            unit: 'p