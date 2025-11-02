// lib/angles.ts
export function deg(rad: number) {
  return (rad * 180) / Math.PI
}
export function rad(deg: number) {
  return (deg * Math.PI) / 180
}
