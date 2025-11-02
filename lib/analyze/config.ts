// lib/analyze/config.ts
// 前端可调的分析配置，全放这里。
// VideoAnalyzer 会把它存到 localStorage，改完马上生效。

export type AnalyzeThresholds = {
  lower: {
    squat100: number;     // 下蹲膝角达到这个就是 100 分，角度越小越好
    kneeExt100: number;   // 伸膝角速度达到这个就是 100 分
  };
  upper: {
    releaseAngle100: number; // 出手角接近这个就是 100 分
    armPower100: number;     // 肘->腕 的摆动角速度
    follow100: number;       // 随挥保持时间（秒）
    elbowTight100: number;   // 肘部路径偏差在这个百分比以内给 100
  };
  balance: {
    center100: number;   // 重心横向偏移小于这个百分比，100
    align100: number;    // 躯干/脚尖对齐角，小于这个角度给 100
  };
};

export type AnalyzeConfig = {
  pose: {
    modelComplexity: 'lite' | 'full';
    smoothMinCutoff: number;
    smoothBeta: number;
    kpMinScore: number;
  };
  thresholds: AnalyzeThresholds;
};

export const DEFAULT_ANALYZE_CONFIG: AnalyzeConfig = {
  pose: {
    modelComplexity: 'full',
    smoothMinCutoff: 1.15,
    smoothBeta: 0.05,
    kpMinScore: 0.35,
  },
  thresholds: {
    lower: {
      squat100: 150,
      kneeExt100: 260,
    },
    upper: {
      releaseAngle100: 158,
      armPower100: 35,
      follow100: 0.4,
      elbowTight100: 2,
    },
    balance: {
      center100: 2.5,   // 原来是 1，放宽到 2.5%
      align100: 4,      // 原来是 2°，放宽到 4°
    },
  },
};

const STORAGE_KEY = 'basketball-analyze-config-v1';

export function loadAnalyzeConfig(): AnalyzeConfig {
  if (typeof window === 'undefined') return DEFAULT_ANALYZE_CONFIG;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_ANALYZE_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<AnalyzeConfig>;
    return {
      pose: {
        ...DEFAULT_ANALYZE_CONFIG.pose,
        ...(parsed.pose ?? {}),
      },
      thresholds: {
        lower: {
          ...DEFAULT_ANALYZE_CONFIG.thresholds.lower,
          ...(parsed.thresholds?.lower ?? {}),
        },
        upper: {
          ...DEFAULT_ANALYZE_CONFIG.thresholds.upper,
          ...(parsed.thresholds?.upper ?? {}),
        },
        balance: {
          ...DEFAULT_ANALYZE_CONFIG.thresholds.balance,
          ...(parsed.thresholds?.balance ?? {}),
        },
      },
    };
  } catch (err) {
    console.warn('[analyze-config] parse failed', err);
    return DEFAULT_ANALYZE_CONFIG;
  }
}

export function saveAnalyzeConfig(cfg: AnalyzeConfig) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}
