// lib/pose/skeleton.ts
export type Keypoint = { name: string; x: number; y: number; score?: number }
export const DEFAULT_SKELETON = [
  ['left_shoulder', 'right_shoulder'],
  ['left_hip', 'right_hip'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
]
