'use client'

import React, { useEffect, useRef, useState } from 'react'
import ConfigPanel from '@/components/ConfigPanel'
import ScoreRadar from '@/components/ScoreRadar'
import { DEFAULT_CONFIG, type CoachConfig } from '@/config/coach'
import { loadPoseEngine, type PoseResult } from '@/lib/pose/poseEngine'
import { scoreFromPose } from '@/lib/score/scorer'
import { smoothPose } from '@/lib/pose/smoothing'

const MIN_BALANCE_FLOOR = 42
const MIN_ALIGNMENT_FLOOR = 45
const DEMO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

export default function VideoAnalyzer() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const engineRef = useRef<Awaited<ReturnType<typeof loadPoseEngine>> | null>(null)
  const lastTsRef = useRef<number>(0)
  const filteredRef = useRef<PoseResult | null>(null)

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [config, setConfig] = useState<CoachConfig>(DEFAULT_CONFIG)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [score, setScore] = useState({ legs: 0, upper: 0, balance: 0, align: 0, total: 0 })
  const [finalScore, setFinalScore] = useState<typeof score | null>(null)

  // 小窗口滑动均值，降低数字抖动；视频结束时取窗口均值作为终态分
  const scoreWinRef = useRef<number[][]>([]) // [[L,U,B,A,T], ...] 近期 15 帧
  const WIN = 15

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setVideoUrl(url)
    resetState()
  }
  function handleUseDemo(){ setVideoUrl(DEMO_URL); resetState() }
  function resetState(){
    setScore({ legs: 0, upper: 0, balance: 0, align: 0, total: 0 })
    setFinalScore(null)
    filteredRef.current = null
    scoreWinRef.current = []
  }

  useEffect(() => {
    function syncSize() {
      const v = videoRef.current, c = canvasRef.current
      if (!v || !c) return
      c.width = v.videoWidth || 640
      c.height = v.videoHeight || 360
    }
    const v = videoRef.current
    if (v) {
      v.addEventListener('loadedmetadata', syncSize)
      v.addEventListener('ended', handleFreeze)
    }
    syncSize()
    return () => {
      const vv = videoRef.current
      if (vv){ vv.removeEventListener('loadedmetadata', syncSize); vv.removeEventListener('ended', handleFreeze) }
    }
  }, [])

  function drawPose(p: PoseResult) {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width, h = c.height
    ctx.clearRect(0, 0, w, h)
    const by = (n: string) => p.keypoints.find(k => k.name === n)

    // 躯干（蓝）
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(59,130,246,0.95)'
    const trunk: [string, string][] = [['left_shoulder','right_shoulder'],['left_hip','right_hip'],['left_shoulder','left_hip'],['right_shoulder','right_hip']]
    for (const [a,b] of trunk){ const A=by(a),B=by(b); if(A&&B){ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke()} }
    // 上肢（红）
    ctx.strokeStyle = 'rgba(239,68,68,0.95)'
    const arms: [string,string][] = [['left_shoulder','left_elbow'],['left_elbow','left_wrist'],['right_shoulder','right_elbow'],['right_elbow','right_wrist']]
    for (const [a,b] of arms){ const A=by(a),B=by(b); if(A&&B){ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke()} }
    // 下肢（绿）
    ctx.strokeStyle = 'rgba(34,197,94,0.95)'
    const legs: [string,string][] = [['left_hip','left_knee'],['left_knee','left_ankle'],['right_hip','right_knee'],['right_knee','right_ankle']]
    for (const [a,b] of legs){ const A=by(a),B=by(b); if(A&&B){ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke()} }
    // 关键点
    ctx.fillStyle = 'rgba(56,189,248,0.95)'
    for (const k of p.keypoints){ ctx.beginPath(); ctx.arc(k.x,k.y,3,0,Math.PI*2); ctx.fill() }
  }

  async function handleStart() {
    if (!videoUrl) return
    const v = videoRef.current
    if (!v) return

    if (!engineRef.current) { engineRef.current = await loadPoseEngine() }

    setIsAnalyzing(true)
    lastTsRef.current = performance.now()
    v.play().catch(() => {/* ignore */})

    const loop = async () => {
      const vv = videoRef.current
      if (!engineRef.current || !vv) return
      try {
        const now = performance.now()
        const dt = (now - lastTsRef.current) / 1000
        lastTsRef.current = now
        // 限速到 ~30fps 估计，减轻抖动 & 负载
        if (dt < 1/45) { rafRef.current = requestAnimationFrame(loop); return }

        const raw = await engineRef.current.estimate(vv)
        // 平滑
        const smooth = smoothPose(filteredRef.current, raw, dt, { alpha: (config.smooth?.minCutoff ?? 0.35), beta: (config.smooth?.beta ?? 0.15) })
        filteredRef.current = smooth
        drawPose(smooth)
        const s = scoreFromPose(smooth, config)
        const safe = {
          legs: s.lower, upper: s.upper,
          balance: Math.max(s.balance, MIN_BALANCE_FLOOR),
          align: Math.max(s.align, MIN_ALIGNMENT_FLOOR),
          total: s.overall,
        }
        // 窗口均值平滑分数显示
        const vec = [safe.legs, safe.upper, safe.balance, safe.align, safe.total]
        const win = scoreWinRef.current
        win.push(vec); while (win.length > WIN) win.shift()
        const avg = (i:number)=> Math.round(win.reduce((a,b)=>a+b[i],0)/win.length)
        if (!finalScore) setScore({ legs: avg(0), upper: avg(1), balance: avg(2), align: avg(3), total: avg(4) })
      } catch {}
      rafRef.current = requestAnimationFrame(loop)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  function handleFreeze(){
    // 视频结束或手动“锁定”时，取窗口均值作为最终分，停止更新
    const win = scoreWinRef.current
    if (win.length){ const avg=(i:number)=> Math.round(win.reduce((a,b)=>a+b[i],0)/win.length); setFinalScore({ legs: avg(0), upper: avg(1), balance: avg(2), align: avg(3), total: avg(4) }) }
    setIsAnalyzing(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const display = finalScore ?? score
  const L = Math.round(display.legs)
  const U = Math.round(display.upper)
  const B = Math.round(display.balance)
  const A = Math.round(display.align)
  const T = Math.round(display.total)

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 bg-slate-800/70 px-4 py-2 rounded cursor-pointer text-slate-50">
            <span>上传视频</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
          <button onClick={handleUseDemo} className="px-3 py-2 rounded bg-slate-700 text-xs text-slate-200">使用示例视频</button>
          <button onClick={() => setConfigOpen(true)} className="px-3 py-2 rounded bg-slate-700 text-xs text-slate-200">调整评分标准</button>
          <button onClick={handleStart} disabled={!videoUrl || isAnalyzing} className={'px-4 py-2 rounded text-sm ' + (videoUrl && !isAnalyzing ? 'bg-cyan-400/90 text-black' : 'bg-slate-600 text-slate-400 cursor-not-allowed')}>{isAnalyzing ? '正在分析...' : '开始分析'}</button>
          <button onClick={handleFreeze} disabled={!isAnalyzing} className={'px-3 py-2 rounded text-xs ' + (isAnalyzing ? 'bg-amber-400/90 text-black' : 'bg-slate-600 text-slate-400 cursor-not-allowed')}>锁定得分</button>
        </div>
        <div className="relative bg-black/70 rounded-lg overflow-hidden max-w-[720px]">
          <video ref={videoRef} src={videoUrl ?? ''} controls className="w-full h-auto object-contain bg-black" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>
      </div>

      <div className="space-y-4">
        <ScoreRadar lower={L} upper={U} balance={B} align={A} />
        <div className="bg-slate-800/60 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between"><span>下肢发力</span><span className="font-mono">{L}</span></div>
          <div className="flex justify-between"><span>上身/跟随</span><span className="font-mono">{U}</span></div>
          <div className="flex justify-between"><span>重心稳定</span><span className="font-mono">{B}</span></div>
          <div className="flex justify-between"><span>对齐与平衡</span><span className="font-mono">{A}</span></div>
          <div className="flex justify-between border-t border-slate-700 pt-2 mt-2 text-slate-200"><span>综合得分{finalScore ? '（终态）' : ''}</span><span className="font-mono">{T}</span></div>
        </div>
      </div>

      <ConfigPanel open={configOpen} value={config} onChange={setConfig} onClose={() => setConfigOpen(false)} />
    </div>
  )
}
