'use client'

import React from 'react'
import type { CoachConfig } from '@/config/coach'

interface ConfigPanelProps {
  open: boolean
  value: CoachConfig
  onChange: (cfg: CoachConfig) => void
  onClose: () => void
}

function numberInput(
  label: string,
  val: number,
  onChange: (n: number) => void,
  min = 0,
  max = 999,
) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-200">{label}</span>
      <input
        type="number"
        className="w-24 rounded bg-slate-900/40 border border-slate-700 px-2 py-1 text-right"
        value={Number.isFinite(val) ? val : ''}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </label>
  )
}

export default function ConfigPanel({ open, value, onChange, onClose }: ConfigPanelProps) {
  if (!open) return null

  const cfg = value

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] max-h-[90vh] overflow-y-auto rounded-lg bg-slate-800/95 border border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">评分参数</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white">×</button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-400">这里的值会直接影响"重心稳定"和"对齐"打分，已经做了更宽容的前端映射。</p>

          {numberInput('膝盖最小深度 (kneeMin)', cfg.thresholds.kneeMin, (n) =>
            onChange({ ...cfg, thresholds: { ...cfg.thresholds, kneeMin: n } }),
            70,
            160,
          )}

          {numberInput('膝盖最大深度 (kneeMax)', cfg.thresholds.kneeMax ?? 140, (n) =>
            onChange({ ...cfg, thresholds: { ...cfg.thresholds, kneeMax: n } }),
            90,
            180,
          )}

          {numberInput('挥臂目标 (follow target)', cfg.thresholds.followThrough.target, (n) =>
            onChange({
              ...cfg,
              thresholds: { ...cfg.thresholds, followThrough: { ...cfg.thresholds.followThrough, target: n } },
            }),
            0,
            1,
          )}

          {numberInput('挥臂容差 (follow tolerance)', cfg.thresholds.followThrough.tolerance, (n) =>
            onChange({
              ...cfg,
              thresholds: { ...cfg.thresholds, followThrough: { ...cfg.thresholds.followThrough, tolerance: n } },
            }),
            0,
            1,
          )}

          {numberInput('对齐容差 (alignment tol)', cfg.thresholds.alignment.tolerance, (n) =>
            onChange({
              ...cfg,
              thresholds: { ...cfg.thresholds, alignment: { tolerance: n } },
            }),
            0,
            1,
          )}

          {numberInput('重心100分阈值 (balance.center100)', cfg.scoring.balance.center100, (n) =>
            onChange({
              ...cfg,
              scoring: { ...cfg.scoring, balance: { ...cfg.scoring.balance, center100: n } },
            }),
            0,
            1,
          )}
        </div>

        <p className="text-xs text-slate-500">※ 你如果这里设得更松，前端的得分会更不容易掉成 0。</p>
      </div>
    </div>
  )
}
