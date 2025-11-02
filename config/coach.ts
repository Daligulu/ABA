export type CoachConfig = {
  modelPreference: 'blaze-full' | 'blaze-lite' | 'movent'
  enableSmartCrop: boolean
  enableOpenCV: boolean
  smooth: {
    minCutoff: number
    beta: number
    dCutoff: number
  }
  thresholds: {
    kneeMin: number
    kneeMax?: number
    followThrough: {
      target: number
      tolerance: number
    }
    alignment: {
      tolerance: number
    }
  }
  scoring: {
    balance: {
      /** 重心在这个范围内记 100 分 */
      center100: number
      /** 对齐的角度基准（度） */
      align100: number
    }
  }
}

export const DEFAULT_CONFIG: CoachConfig = {
  modelPreference: 'blaze-full',
  enableSmartCrop: true,
  enableOpenCV: false,
  smooth: {
    minCutoff: 1,
    beta: 0.02,
    dCutoff: 1,
  },
  thresholds: {
    kneeMin: 95,
    kneeMax: 140,
    followThrough: {
      target: 0.35,
      // 放宽挥臂容差，避免轻微动作导致 0 分
      tolerance: 0.25,
    },
    alignment: {
      // 这里和前端的打分逻辑配套，默认 0.12，前端会允许到 0.12 * 1.4
      tolerance: 0.12,
    },
  },
  scoring: {
    balance: {
      // 对应我们 scoring.ts 里用的 0.25
      center100: 0.25,
      // 这个是角度类基准，前端那里只是拿来展示
      align100: 4,
    },
  },
}
