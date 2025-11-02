// lib/pose/poseEngine.ts
// 完整骨架占位引擎：返回更丰富的关键点，便于画出完整的上肢/躯干/下肢骨架
export type PoseResult = {
  keypoints: { name: string; x: number; y: number; score?: number }[]
  timestamp: number
}

export async function loadPoseEngine() {
  return {
    async estimate(video: HTMLVideoElement): Promise<PoseResult> {
      const w = video.videoWidth || 640
      const h = video.videoHeight || 360

      // 以人物居中站立为近似，构造一套全身骨架关键点（用于 UI 占位与连线演示）
      const cx = w * 0.52
      const shY = h * 0.35
      const hipY = h * 0.62
      const kneeY = h * 0.78
      const anY = h * 0.92
      const dxS = w * 0.1
      const dxE = w * 0.17
      const dxW = w * 0.22
      const dxHip = w * 0.07
      const dxKnee = w * 0.06
      const dxAnk = w * 0.06

      const kp = [
        // 头部/面部
        { name: 'nose', x: cx, y: shY - 35, score: 0.9 },
        { name: 'left_ear', x: cx - 18, y: shY - 30, score: 0.9 },
        { name: 'right_ear', x: cx + 18, y: shY - 30, score: 0.9 },
        // 肩
        { name: 'left_shoulder', x: cx - dxS, y: shY, score: 0.95 },
        { name: 'right_shoulder', x: cx + dxS, y: shY, score: 0.95 },
        // 肘
        { name: 'left_elbow', x: cx - dxE, y: shY + 28, score: 0.9 },
        { name: 'right_elbow', x: cx + dxE, y: shY - 28, score: 0.9 },
        // 腕
        { name: 'left_wrist', x: cx - dxW, y: shY + 58, score: 0.88 },
        { name: 'right_wrist', x: cx + dxW, y: shY - 58, score: 0.88 },
        // 髋
        { name: 'left_hip', x: cx - dxHip, y: hipY, score: 0.95 },
        { name: 'right_hip', x: cx + dxHip, y: hipY, score: 0.95 },
        // 膝
        { name: 'left_knee', x: cx - dxKnee, y: kneeY, score: 0.92 },
        { name: 'right_knee', x: cx + dxKnee, y: kneeY, score: 0.92 },
        // 踝
        { name: 'left_ankle', x: cx - dxAnk, y: anY, score: 0.9 },
        { name: 'right_ankle', x: cx + dxAnk, y: anY, score: 0.9 },
      ]

      return { keypoints: kp, timestamp: Date.now() }
    },
  }
}
