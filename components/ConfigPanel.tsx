'use client'
import React, { useState } from 'react'
import { DEFAULT_CONFIG, type CoachConfig } from '../config/coach'

// 显式列出基准键，避免构建环境的类型推断退化
const BASELINE_KEYS = ['kneeDepth','extendSpeed','releaseAngle','wristFlex','followThrough','elbowCurve','stability','alignment'] as const
type BaselineKey = typeof BASELINE_KEYS[number]

export default function ConfigPanel({
  open, value, onChange, onClose,
}:{
  open:boolean; value:CoachConfig; onChange:(v:CoachConfig)=>void; onClose:()=>void
}){
  if(!open) return null
  const cfg = value
  const defaultBaseline: any = (DEFAULT_CONFIG as any)?.scoring?.baseline || {}
  const [showHelp, setShowHelp] = useState<string | null>(null)
  const helpOf: Record<string,string> = {
    kneeDepth: '膝关节夹角，越接近目标越好。',
    extendSpeed: '起跳时膝盖伸展的角速度，越快分越高。',
    releaseAngle: '出手瞬间前臂与地面的夹角。',
    wristFlex: '手腕主动发力角度。',
    followThrough: '出手后保持随挥的时间。',
    elbowCurve: '出手过程中肘部的横向漂移百分比，越小越好。',
    stability: '投篮整个过程身体重心的水平摆动百分比，越小越好。',
    alignment: '对齐',
  }

  const renderControl = (label: string, key: BaselineKey) => {
    const rule =(defaultBaseline as any)?.kneeDepth||{}
    const val = (cfg.thresholds as any)[label] || rule.kneeDepth
    return (
      <div className="flex flex-wrap items-center gap