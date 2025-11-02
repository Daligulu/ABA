// lib/pose/smoothing.ts
// 轻量平滑工具：对关键点做指数滑动平均 + 简易一阶速度自适应
import type { PoseResult } from '@/lib/pose/poseEngine'

export type SmoothParams = {
  alpha?: number // 0~1, 越小越平滑
  beta?: number  // 速度增强项
}

export function smoothPose(prev: PoseResult | null, curr: PoseResult, dt: number, params: SmoothParams = {}): PoseResult {
  const alphaBase = clamp(params.alpha ?? 0.35, 0.05, 0.9)
  const beta = clamp(params.beta ?? 0.15, 0, 1)
  const lastMap = new Map<string, {x:number;y:number}>()
  if (prev) for (const k of prev.keypoints) lastMap.set(k.name, {x:k.x, y:k.y})

  const kps = curr.keypoints.map(k => {
    const last = lastMap.get(k.name)
    if (!last) return k
    const vx = (k.x - last.x) / Math.max(dt, 1e-3)
    const vy = (k.y - last.y) / Math.max(dt, 1e-3)
    const v = Math.hypot(vx, vy)
    // 速度越大，alpha 越大（更跟手）；速度小则更平滑
    const alpha = clamp(alphaBase + beta * Math.tanh(v / 80), 0.05, 0.95)
    return { ...k, x: lerp(last.x, k.x, alpha), y: lerp(last.y, k.y, alpha) }
  })
  return { keypoints: kps, timestamp: curr.timestamp }
}

function lerp(a:number,b:number,t:number){ return a + (b - a) * t }
function clamp(x:number,min:number,max:number){ return Math.max(min, Math.min(max, x)) }
