'use client'
import React from 'react'

type Props = {
  lower: number
  upper: number
  balance: number
  align: number
}

/**
 * 简化的三角雷达图（下肢/上肢/平衡），
 * 同时在标题下方补全四项摘要，并全部用整数显示。
 */
export default function ScoreRadar({ lower, upper, balance, align }: Props) {
  const l = Math.max(0, Math.min(100, Math.round(lower)))
  const u = Math.max(0, Math.min(100, Math.round(upper)))
  const b = Math.max(0, Math.min(100, Math.round(balance)))
  const a = Math.max(0, Math.min(100, Math.round(align)))

  return (
    <div className="bg-slate-900/50 rounded-lg p-4">
      <div className="text-slate-100 mb-2">投篮姿态评分雷达图</div>
      <svg width={300} height={300} viewBox="0 0 300 300" className="mx-auto">
        {/* 外三角 */}
        <polygon points="150,40 260,225 40,225" fill="none" stroke="#1f2937" strokeWidth={1.2} />
        <polygon points="150,65 235,207 65,207" fill="none" stroke="#1f2937" strokeWidth={1} />
        {/* 数据三角 */}
        {(() => {
          const maxR = 110
          const center = 150
          const angStep = (Math.PI * 2) / 3
          const pts = [l, u, b].map((val, idx) => {
            const ang = -Math.PI / 2 + idx * angStep
            const r = (val / 100) * maxR
            const x = center + r * Math.cos(ang)
            const y = center + r * Math.sin(ang)
            return `${x},${y}`
          })
          return (
            <polygon points={pts.join(' ')} fill="rgba(56,189,248,0.35)" stroke="#38bdf8" strokeWidth={2} />
          )
        })()}
        {/* 轴标签 */}
        <text x="150" y="28" textAnchor="middle" fill="#e2e8f0" fontSize="12">下肢</text>
        <text x="270" y="230" textAnchor="end" fill="#e2e8f0" fontSize="12">上肢</text>
        <text x="30" y="230" textAnchor="start" fill="#e2e8f0" fontSize="12">平衡</text>
      </svg>
      <div className="mt-3 text-xs text-slate-400 leading-5">
        下肢：{l}，上肢：{u}，平衡：{b}，对齐：{a}
      </div>
    </div>
  )
}
