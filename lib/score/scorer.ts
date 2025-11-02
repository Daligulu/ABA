import type { CoachConfig } from '@/config/coach'
import type { PoseResult } from '@/lib/pose/poseEngine'

export function scoreFromPose(pose: PoseResult, cfg: CoachConfig) {
  const by = (n: string) => pose.keypoints.find(k => k.name === n)
  const req = (n: string) => by(n) || { x: 0, y: 0 }
  const w = 640, h = 360

  // 关节点
  const ls = req('left_shoulder'), rs = req('right_shoulder')
  const lh = req('left_hip'), rh = req('right_hip')
  const lk = req('left_knee'), rk = req('right_knee')
  const la = req('left_ankle'), ra = req('right_ankle')
  const le = req('left_elbow'), re = req('right_elbow')
  const lw = req('left_wrist'), rw = req('right_wrist')

  const mid = (a: any, b: any) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y)
  const angle = (a: any, b: any, c: any) => {
    // ∠ABC，返回度数
    const abx = a.x - b.x, aby = a.y - b.y
    const cbx = c.x - b.x, cby = c.y - b.y
    const dot = abx * cbx + aby * cby
    const mab = Math.hypot(abx, aby)
    const mcb = Math.hypot(cbx, cby)
    if (!mab || !mcb) return 0
    const cos = Math.min(1, Math.max(-1, dot / (mab * mcb)))
    return (Math.acos(cos) * 180) / Math.PI
  }

  // 下肢：取双腿膝角平均，角度越大越伸直
  const kneeL = angle(lh, lk, la)
  const kneeR = angle(rh, rk, ra)
  const knee = (kneeL + kneeR) / 2 || 0
  const legs = knee >= cfg.thresholds.kneeMin ? 85 + Math.min(15, (knee - cfg.thresholds.kneeMin) * 0.2) : 55

  // 上肢/随挥：取腕高于肩+肘伸展的综合（简单线性）
  const wristHigher = ((rw.y + lw.y) / 2) < ((rs.y + ls.y) / 2) ? 1 : 0
  const elbowExt = (180 - ((angle(ls, le, lw) + angle(rs, re, rw)) / 2)) // 越小越伸直
  const followVal = wristHigher ? 0.4 : 0.2
  const upper = followVal >= (cfg.thresholds.followThrough.target - cfg.thresholds.followThrough.tolerance) ? 90 + Math.min(10, (0.5 - followVal) * 20) : 70

  // 重心稳定：躯干与竖直的夹角（肩中心-髋中心连线）
  const ms = mid(ls, rs), mh = mid(lh, rh)
  const torsoDx = (ms.x - mh.x)
  const torsoDy = (ms.y - mh.y)
  const torsoAng = Math.abs((Math.atan2(torsoDy, torsoDx) * 180) / Math.PI - 90) // 0 越好
  const sway = Math.min(0.4, Math.abs(torsoAng) / 60) // 0~0.4
  let balance = 0
  if (sway <= (cfg.scoring.balance.center100 ?? 0.25)) balance = 100 - sway * 50
  else if (sway <= 0.35) balance = 86 - (sway - (cfg.scoring.balance.center100 ?? 0.25)) * 350
  else balance = 55

  // 对齐：肩中心与髋中心的水平偏移占图宽度的比例
  const offset = Math.abs(ms.x - mh.x) / (dist({x:0,y:0},{x:w,y:0}) || 1) // 0~1
  let align = 0
  const tol = cfg.thresholds.alignment.tolerance ?? 0.12
  if (offset <= tol * 0.5) align = 98
  else if (offset <= tol) align = 85 - (offset - tol * 0.5) * 420
  else if (offset <= tol * 1.4) align = 70 - (offset - tol) * 320
  else align = 58

  const overall = Math.round(legs * 0.28 + upper * 0.24 + balance * 0.24 + align * 0.24)
  return { lower: Math.round(legs), upper: Math.round(upper), balance: Math.round(balance), align: Math.round(align), overall }
}
