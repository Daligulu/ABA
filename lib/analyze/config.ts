// lib/analyze/config.ts
// 把高层的 config/coach.ts 里的结构透传给分析层使用
import { DEFAULT_CONFIG, type CoachConfig } from '@/config/coach'

export type { CoachConfig } from '@/config/coach'
export const DEFAULT_COACH_CONFIG: CoachConfig = DEFAULT_CONFIG
