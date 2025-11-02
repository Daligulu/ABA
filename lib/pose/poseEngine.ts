// lib/pose/poseEngine.ts
// 真正使用 TensorFlow.js MoveNet 的前端姿态引擎（仅在客户端运行）
export type PoseResult = {
  keypoints: { name: string; x: number; y: number; score?: number }[]
  timestamp: number
}

let _detector: any | null = null

export async function loadPoseEngine() {
  if (_detector) {
    return { estimate }
  }
  // 动态引入，避免 SSR 阶段和打包体积压力
  const tf = await import('@tensorflow/tfjs-core')
  await import('@tensorflow/tfjs-backend-webgl')
  const posed = await import('@tensorflow-models/pose-detection')
  // 选择 webgl 后端
  await tf.setBackend('webgl')
  await tf.ready()

  _detector = await posed.createDetector(
    posed.SupportedModels.MoveNet,
    { modelType: posed.movenet.modelType.SINGLEPOSE_LIGHTNING }
  )

  async function estimate(video: HTMLVideoElement): Promise<PoseResult> {
    const res = await _detector.estimatePoses(video, {
      maxPoses: 1,
      flipHorizontal: false,
    })
    const w = video.videoWidth || 640
    const h = video.videoHeight || 360
    const kp = (res?.[0]?.keypoints || []).map((k: any) => ({
      name: k.name || k.part,
      x: Math.max(0, Math.min(w, k.x)),
      y: Math.max(0, Math.min(h, k.y)),
      score: k.score,
    }))
    return { keypoints: kp, timestamp: Date.now() }
  }

  return { estimate }
}
