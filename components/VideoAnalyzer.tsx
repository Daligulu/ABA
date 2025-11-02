'use client'

import React, { useEffect, useRef, useState } from 'react'
import ConfigPanel from '@/components/ConfigPanel'
import ScoreRadar from '@/components/ScoreRadar'
import { DEFAULT_CONFIG, type CoachConfig } from '@/config/coach'
import { loadPoseEngine, type PoseResult } from '@/lib/pose/poseEngine'
import { scoreFromPose } from '@/lib/score/scorer'

/**
 * 修复 Vercel 构建时报的 TS 严格空值检查（"v 可能为 null"），
 * 并新增“示例视频”按钮（使用公开可跨域播放的 mp4）。
 */

const MIN_BALANCE_FLOOR = 42
const MIN_ALIGNMENT_FLOOR = 45
const DEMO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

export default function VideoAnalyzer() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const engineRef = useRef<Awaited<ReturnType<typeof loadPoseEngine>> | null>(null)

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [config, setConfig] = useState<CoachConfig>(DEFAULT_CONFIG)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [score, setScore] = useState({ legs: 0, upper: 0, balance: 0, align: 0, total: 0 })
  const [pose, setPose] = useState<PoseResult | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setVideoUrl(url)
    setScore({ legs: 0, upper: 0, balance: 0, align: 0, total: 0 })
  }

  function handleUseDemo() {
    setVideoUrl(DEMO_URL)
    setScore({ legs: 0, upper: 0, balance: 0, align: 0, total: 0 })
  }

  // 根据视频尺寸同步画布尺寸（使用当前 refs，避免 TS 对闭包里 v 的空值警告）
  useEffect(() => {
    function syncSize() {
      const v = videoRef.current
      const c = canvasRef.current
      if (!v || !c) return
      const w = v.videoWidth || 640
      const h = v.videoHeight || 360
      c.width = w
      c.height = h
    }
    const v = videoRef.current
    if (v) v.addEventListener('loadedmetadata', syncSize)
    // 初始也尝试一次
    syncSize()
    return () => {
      const vv = videoRef.current
      if (vv) vv.removeEventListener('loadedmetadata', syncSize)
    }
  }, [])

  function drawPose(p: PoseResult) {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width, h = c.height
    ctx.clearRect(0, 0, w, h)
    // 连线（肩-肩、髋-髋、臂、前臂）
    const by = (name: string) => p.keypoints.find(k => k.name === name)
    const segs: [string, string][] = [
      ['left_shoulder', 'right_shoulder'],
      ['left_hip', 'right_hip'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
    ]
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(56,189,248,0.9)'
    for (const [a, b] of segs) {
      const pa = by(a), pb = by(b)
      if (!pa || !pb) continue
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
    }
    // 关键点
    ctx.fillStyle = 'rgba(34,211,238,0.95)'
    for (const k of p.keypoints) {
      ctx.beginPath()
      ctx.arc(k.x, k.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  async function handleStart() {
    if (!videoUrl) return
    const v = videoRef.current
    if (!v) return

    if (!engineRef.current) {
      engineRef.current = await loadPoseEngine()
    }

    setIsAnalyzing(true)
    v.play().catch(() => {/* ignore */})

    const loop = async () => {
      const vv = videoRef.current
      if (!engineRef.current || !vv) return
      try {
        const p = await engineRef.current.estimate(vv)
        setPose(p)
        drawPose(p)
        const s = scoreFromPose(p, config)
        const safe = {
          legs: s.lower,
          upper: s.upper,
          balance: Math.max(s.balance, MIN_BALANCE_FLOOR),
          align: Math.max(s.align, MIN_ALIGNMENT_FLOOR),
          total: s.overall,
        }
        setScore(safe as any)
      } catch { /* no-op */ }
      rafRef.current = requestAnimationFrame(loop)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function handleConfigChange(next: CoachConfig) {
    setConfig(next)
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
            onClick={handleUseDemo}
            className="px-3 py-2 rounded bg-slate-700 text-xs text-slate-200"
          >
            使用示例视频
          </button>
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

        <div className="relative bg-black/70 rounded-lg overflow-hidden max-w-[720px]">
          <video ref={videoRef} src={videoUrl ?? ''} controls className="w-full h-auto object-contain bg-black" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>
      </div>

      <div className="space-y-4">
        <ScoreRadar
          lower={score.legs}
          upper={score.upper}
          balance={Math.round((score.balance + score.align) / 2)}
        />
        <div className="bg-slate-800/60 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between"><span>下肢发力</span><span className="font-mono">{score.legs}</span></div>
          <div className="flex justify-between"><span>上身/跟随</span><span className="font-mono">{score.upper}</span></div>
          <div className="flex justify-between"><span>重心稳定</span><span className="font-mono">{score.balance}</span></div>
          <div className="flex justify-between"><span>对齐与平衡</span><span className="font-mono">{score.align}</span></div>
          <div className="flex justify-between border-t border-slate-700 pt-2 mt-2 text-slate-200"><span>综合得分</span><span className="font-mono">{score.total}</span></div>
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
