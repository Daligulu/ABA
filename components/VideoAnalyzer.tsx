'use client'

import React, { useRef, useState } from 'react'
import ConfigPanel from '@/components/ConfigPanel'
import ScoreRadar from '@/components/ScoreRadar'
import { DEFAULT_CONFIG, type CoachConfig } from '@/config/coach'

// 这版是修掉 Vercel 报的 “Unexpected eof” 的完整文件版
// 同时保留了你要的：对齐与平衡、重心稳定不要动不动就是 0 分

const MIN_BALANCE_FLOOR = 42
const MIN_ALIGNMENT_FLOOR = 45

function simulateFrameScore(cfg: CoachConfig) {
  // 这里模拟一帧的原始数据，真实情况你就换成姿态识别的输出
  const rawKneeDepth = 98 // 膝盖深度
  const rawFollow = 0.32  // 随挥程度
  const rawBalance = 0.18 // 重心横向摆动（越小越好）
  const rawAlign = 0.09   // 肩/髋出手对齐角（越小越好）

  // 下肢
  const kneeMin = cfg.thresholds.kneeMin
  const kneeMax = cfg.thresholds.kneeMax ?? 140
  let legs: number
  if (rawKneeDepth >= kneeMax) {
    legs = 100
  } else if (rawKneeDepth >= kneeMin) {
    const t = (rawKneeDepth - kneeMin) / (kneeMax - kneeMin || 1)
    legs = 85 + t * 15
  } else {
    legs = 55
  }

  // 上肢
  const followTarget = cfg.thresholds.followThrough.target ?? 0.35
  const followTol = cfg.thresholds.followThrough.tolerance ?? 0.25
  let upper: number
  if (rawFollow >= followTarget) {
    upper = 95
  } else if (rawFollow >= followTarget - followTol) {
    const t = (rawFollow - (followTarget - followTol)) / (followTol || 1)
    upper = 80 + t * 15
  } else {
    upper = 60
  }

  // 重心稳定（最关键：给宽容 + 地板分）
  const center100 = cfg.scoring?.balance?.center100 ?? 0.25
  let balance: number
  if (rawBalance <= center100) {
    balance = 100 - rawBalance * 50
  } else if (rawBalance <= center100 * 1.4) {
    balance = 86 - (rawBalance - center100) * 350
  } else {
    balance = 55
  }
  balance = Math.max(balance, MIN_BALANCE_FLOOR)

  // 对齐评分（同样三段 + 地板）
  const alignTol = cfg.thresholds.alignment.tolerance ?? 0.12
  let align: number
  if (rawAlign <= alignTol * 0.5) {
    align = 98
  } else if (rawAlign <= alignTol) {
    align = 85 - (rawAlign - alignTol * 0.5) * 420
  } else if (rawAlign <= alignTol * 1.4) {
    align = 70 - (rawAlign - alignTol) * 320
  } else {
    align = 58
  }
  align = Math.max(align, MIN_ALIGNMENT_FLOOR)

  const total = Math.round(legs * 0.28 + upper * 0.24 + balance * 0.24 + align * 0.24)

  return { legs: Math.round(legs), upper: Math.round(upper), balance: Math.round(balance), align: Math.round(align), total }
}

export default function VideoAnalyzer() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [config, setConfig] = useState<CoachConfig>(DEFAULT_CONFIG)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [score, setScore] = useState(() => simulateFrameScore(DEFAULT_CONFIG))

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setVideoUrl(url)
  }

  function handleStart() {
    if (!videoUrl) return
    setIsAnalyzing(true)
    const s = simulateFrameScore(config)
    setScore(s)
    setTimeout(() => setIsAnalyzing(false), 300)
  }

  function handleConfigChange(next: CoachConfig) {
    setConfig(next)
    const s = simulateFrameScore(next)
    setScore(s)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 bg-slate-800/70 px-4 py-2 rounded cursor-pointer text-slate-50">
            <span>上传视频</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
          <button
            onClick={() => setConfigOpen(true)}
            className="px-3 py-2 rounded bg-slate-700 text-xs text-slate-200"
          >
            调整评分标准
          </button>
          <button
            onClick={handleStart}
            disabled={!videoUrl}
            className={
              'px-4 py-2 rounded text-sm ' +
              (videoUrl ? 'bg-cyan-400/90 text-black' : 'bg-slate-600 text-slate-400 cursor-not-allowed')
            }
          >
            {isAnalyzing ? '正在分析...' : '开始分析'}
          </button>
        </div>

        <div className="relative bg-black/70 rounded-lg overflow-hidden aspect-video max-w-[640px]">
          {videoUrl ? (
            <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-contain bg-black" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">请先上传一段投篮训练视频</div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <ScoreRadar
          lower={score.legs}
          upper={score.upper}
          balance={Math.round((score.balance + score.align) / 2)}
        />
        <div className="bg-slate-800/60 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span>下肢发力</span>
            <span className="font-mono">{score.legs}</span>
          </div>
          <div className="flex justify-between">
            <span>上身/跟随</span>
            <span className="font-mono">{score.upper}</span>
          </div>
          <div className="flex justify-between">
            <span>重心稳定</span>
            <span className="font-mono">{score.balance}</span>
          </div>
          <div className="flex justify-between">
            <span>对齐与平衡</span>
            <span className="font-mono">{score.align}</span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-2 mt-2 text-slate-200">
            <span>综合得分</span>
            <span className="font-mono">{score.total}</span>
          </div>
        </div>
      </div>

      <ConfigPanel
        open={configOpen}
        value={config}
        onChange={handleConfigChange}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  )
}
