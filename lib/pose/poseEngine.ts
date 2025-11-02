// lib/pose/poseEngine.ts
// 这里写一个很轻量的姿态引擎占位，后续可换成真正的 tfjs model
export type PoseResult = {
  keypoints: { name: string; x: number; y: number; score?: number }[]
  timestamp: number
}

export async function loadPoseEngine() {
  return {
    async estimate(video: HTMLVideoElement): Promise<PoseResult> {
      const w = video.videoWidth || 640
      const h = video.videoHeight || 360
      return {
        keypoints: [
          { name: 'left_shoulder', x: w * 0.4, y: h * 0.35, score: 0.9 },
          { name: 'right_shoulder', x: w * 0.6, y: h * 0.35, score: 0.9 },
          { name: 'left_hip', x: w * 0.45, y: h * 0.62, score: 0.85 },
          { name: 'right_hip', x: w * 0.55, y: h * 0.62, score: 0.85 },
        ],
        timestamp: Date.now(),
      }
    },
  }
}
