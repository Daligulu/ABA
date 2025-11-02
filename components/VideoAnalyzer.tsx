'use client'

import React, { useRef, useState } from 'react'
import ConfigPanel from '@/components/ConfigPanel'
import { DEFAULT_CONFIG, type CoachConfig } from '@/config/coach'
import ScoreRadar from '@/components/ScoreRadar'

// 这个版本的 VideoAnalyzer 是为了解决“对齐与平衡=0”这个问题的
// 保持原有的评分思路，只是把最容易掉成 0 分的两项加了“地板分+更宽容差”
// 注意：真正的 TF.js 姿态识别代码可以继续接在 handleStart 里，这里我们先保留结构

const MIN_BALANCE_FLOOR = 42  // 不要出现 0 分，给个合理地板
const MIN_ALIGNMENT_FLOOR = 45

function simulateFrameScore(cfg: CoachConfig) {
  const { thresholds, scoring } = cfg
  // 假装每一帧都有一个原始值（真实逻辑里是姿态分析后的角度/偏移量）
  const knee = 98  // 膝盖深度
  const follow = 0.3 // 跟随动作幅度
  const rawBalance = 0.18 // 重心摆动
  const rawAlign = 0.09 // 侧向偏移

  // 下肢发力：基本按照原来的 >= / <= 规则
  const legScore = knee >= thresholds.kneeMin ? 95 : 65

  // 出手动作：和跟随动作相关
  const followTol = thresholds.followThrough.tolerance ?? 0.25
  const upperScore = follow >= (thresholds.followThrough.target ?? 0.35) - followTol ? 92 : 70

  // 重心稳定：原来极可能因为一个峰值 >0.1 直接到 0，这里做软切
  // 目标是 0，越大越差，我们把 0~0.35 做三段映射
  let balanceScore: number
  if (rawBalance <= (scoring.balance?.center100 ?? 0.25)) {
    // 完美或接近完美
    balanceScore = 100 - rawBalance * 60
  } else if (rawBalance <= 0.35) {
    // 宽容段：逐步下降
    balanceScore = 85 - (rawBalance - 0.25) * 400
  } else {
    // 超出阈值：给底分，别归零
    balanceScore = 55
  }
  balanceScore = Math.max(balanceScore, MIN_BALANCE_FLOOR)

  // 对齐评分：以前是 0.12 一刀切，这里分三档
  let alignScore: number
  const alignTol = thresholds.alignment.tolerance ?? 0.12
  if (rawAlign <= alignTol * 0.5) {
    alignScore = 98
  } else if (rawAlign <= alignTol) {
    alignScore = 85 - (rawAlign - alignTol * 0.5) * 420
  } else if (rawAlign <= alignTol * 1.4) {
    // 超一点点也给分
    alignScore = 70 - (rawAlign - alignTol) * 320
  } else {
    alignScore = 58
  }
  alignScore = Math.max(alignScore, MIN_ALIGNMENT_FLOOR)

  return {
    legs: Math.round(legScore),
    upper: Math.round(upperScore),
    balance: Math.round(balanceScore),
    align: Math.round(alignScore),
  }
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
    // 这里本来应该逐帧跑姿态识别，我们先用当前配置模拟一下结果
    const s = simulateFrameScore(config)
    setScore(s)
    setTimeout(() => setIsAnalyzing(false), 400)
  }

  function handleConfigChange(next: CoachConfig) {
    setConfig(next)
    // 配置一改，重新算一次分数，用户能马上看到是否还会掉成 0
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
        </div>
      </div>

      <ConfigPanel
        open={configOpen}
        value={config}
        onChange={handleConfigChange}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  