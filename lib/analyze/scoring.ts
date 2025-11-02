// lib/analyze/scoring.ts
// PoseResult -> 面板分数 的唯一入口。
// 说明：这版是按你这次说的‘对齐与平衡不要太容易打到 0’做了放宽。

import type { PoseResult } from '../pose/poseEngine';
import { loadAnalyzeConfig } from './config';

export type AnalyzeScore = {
  total: number;
  lower: {
    score: number;
    squat: { score: number; value: string };
    kneeExt: { score: number; value: string };
  };
  upper: {
    score: number;
    releaseAngle: { score: number; value: string };
    armPower: { score: number; value: string };
    follow: { score: number; value: string };
    elbowTight: { score: number; value: string };
  };
  balance: {
    score: number;
    center: { score: number; value: string };
    align: { score: number; value: string };
  };
};

export const EMPTY_SCORE: AnalyzeScore = {
  total: 0,
  lower: {
    score: 0,
    squat: { score: 0, value: '未检测' },
    kneeExt: { score: 0, value: '未检测' },
  },
  upper: {
    score: 0,
    releaseAngle: { score: 0, value: '未检测' },
    armPower: { score: 0, value: '未检测' },
    follow: { score: 0, value: '未检测' },
    elbowTight: { score: 0, value: '未检测' },
  },
  balance: {
    score: 0,
    center: { score: 0, value: '未检测' },
    align: { score: 0, value: '未检测' },
  },
};

function clamp100(n: number) {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function safeKp(p: PoseResult, name: string) {
  const k = p.keypoints?.[name as keyof PoseResult['keypoints']];
  if (!k) return null;
  if (typeof k.x !== 'number' || typeof k.y !== 'number') return null;
  return k as { x: number; y: number; score?: number };
}

export function scoreFromPose(pose: PoseResult | null): AnalyzeScore {
  if (!pose) return EMPTY_SCORE;
  const cfg = loadAnalyzeConfig();

  // 1. 下肢：下蹲深度 (膝角)
  const lk = safeKp(pose, 'left_knee');
  const lh = safeKp(pose, 'left_hip');
  let squatScore = 0;
  let squatValue = '未检测';
  if (lk && lh) {
    // 这里用 y 轴差当成膝角的近似，因为浏览器端没法做真正的 3D 夹角
    const depth = Math.abs(lk.y - lh.y);
    const target = cfg.thresholds.lower.squat100;
    squatScore = clamp100((depth / target) * 100);
    squatValue = depth.toFixed(2) + 'px';
  }

  // 2. 下肢：伸膝速度（这里还是用常量，你原版也是常量 260）
  const kneeExtVal = cfg.thresholds.lower.kneeExt100;
  const kneeExtScore = 100;

  // 3. 上肢：出手角度
  const lw = safeKp(pose, 'left_wrist');
  const le = safeKp(pose, 'left_elbow');
  let releaseScore = 0;
  let releaseValue = '未检测';
  if (lw && le) {
    const dy = lw.y - le.y;
    const dx = Math.abs(lw.x - le.x) || 1;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const target = cfg.thresholds.upper.releaseAngle100;
    const diff = Math.abs(angle - target);
    // 25° 之内都给分
    releaseScore = clamp100(100 - (diff / 25) * 100);
    releaseValue = angle.toFixed(2) + '度';
  }

  // 4. 上肢：手臂发力（肘 -> 腕 的角速度）——单帧给常量
  const armPowerVal = cfg.thresholds.upper.armPower100;
  const armPowerScore = 100;

  // 5. 随挥保持 —— 单帧给常量
  const followVal = cfg.thresholds.upper.follow100;
  const followScore = 100;

  // 6. 肘部路径紧凑 —— 单帧给常量
  const elbowVal = cfg.thresholds.upper.elbowTight100;
  const elbowScore = 93;

  // 7. 对齐与平衡 
  const rh = safeKp(pose, 'right_hip');
  const laa = safeKp(pose, 'left_ankle');
  const raa = safeKp(pose, 'right_ankle');

  // (1) 重心稳定（横摆）
  let centerScore = 0;
  let centerVal = '未检测';
  if (lh && rh) {
    const midx = (lh.x + rh.x) / 2;
    const bodyWidth = Math.abs(lh.x - rh.x);
    const footMid = laa && raa ? (laa.x + raa.x) / 2 : midx;
    const diffPx = Math.abs(midx - footMid);
    const percent = bodyWidth ? (diffPx / bodyWidth) * 100 : 0;

    // 放宽容差：配置里还是写 2.5%，这里再 *3，当成 7.5% 用
    const baseTarget = cfg.thresholds.balance.center100;
    const widenedTarget = baseTarget * 3;
    const raw = 100 - (percent / widenedTarget) * 100;
    centerScore = clamp100(raw);
    if (centerScore < 25) centerScore = 25;
    centerVal = percent.toFixed(2) + '%';
  }

  // (2) 对齐（躯干与脚的夹角）
  let alignScore = 0;
  let alignVal = '未检测';
  if (lh && rh && laa && raa) {
    const torsoAngle = Math.atan2(lh.y - rh.y, lh.x - rh.x);
    const footAngle = Math.atan2(laa.y - raa.y, laa.x - raa.x);
    const diff = Math.abs(torsoAngle - footAngle) * (180 / Math.PI);

    // 放宽到原来的 2.5 倍，配合上面把默认阈值调到 4°，等价 10° 左右才会扣完
    const baseTarget = cfg.thresholds.balance.align100;
    const widenedTarget = baseTarget * 2.5;
    const raw = 100 - (diff / widenedTarget) * 100;
    alignScore = clamp100(raw);
    if (alignScore < 25) alignScore = 25;

    alignVal = diff.toFixed(2) + '度';
  }

  const lowerScore = Math.round((squatScore + kneeExtScore) / 2);
  const upperScore = Math.round((releaseScore + armPowerScore + followScore + elbowScore) / 4);
  const balanceScore = Math.round((centerScore + alignScore) / 2);
  const total = Math.round((lowerScore + upperScore + balanceScore) / 3);

  return {
    total,
    lower: {
      score: lowerScore,
      squat: { score: squatScore, value: squatValue },
      kneeExt: { score: kneeExtScore, value: `${kneeExtVal}(度/秒)` },
    },
    upper: {
      score: upperScore,
      releaseAngle: { score: releaseScore, value: releaseValue },
      armPower: { score: armPowerScore, value: `${armPowerVal}度` },
      follow: { score: followScore, value: `${followVal}秒` },
      elbowTight: { score: elbowScore, value: `${elbowVal}%` },
    },
    balance: {
      score: balanceScore,
      center: { score: centerScore, value: centerVal },
      align: { score: alignScore, value: alignVal },
    },
  };
}
