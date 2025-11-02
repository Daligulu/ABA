// lib/filters/oneEuro.ts
// 简易 One Euro filter，平滑关节点
export class OneEuro {
  private value = 0
  private readonly alpha: number
  constructor(alpha = 0.4) {
    this.alpha = alpha
  }
  next(v: number) {
    this.value = this.alpha * v + (1 - this.alpha) * this.value
    return this.value
  }
}
