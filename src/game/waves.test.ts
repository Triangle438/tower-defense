import { describe, expect, it } from 'vitest'
import { hpMultiplier, waveBonus, waveQueue } from './waves'

const count = (wave: number, kind: string) => waveQueue(wave).filter((k) => k === kind).length

describe('waves', () => {
  it('starts with a handful of grunts only', () => {
    expect(waveQueue(1)).toEqual(Array(8).fill('grunt'))
  })

  it('introduces runners at wave 3 and tanks at wave 5', () => {
    expect(count(2, 'runner')).toBe(0)
    expect(count(3, 'runner')).toBe(2)
    expect(count(4, 'tank')).toBe(0)
    expect(count(5, 'tank')).toBe(1)
    expect(count(8, 'tank')).toBe(2)
  })

  it('sends a boss every tenth wave, at the very end', () => {
    expect(count(9, 'boss')).toBe(0)
    const queue = waveQueue(10)
    expect(queue[queue.length - 1]).toBe('boss')
    expect(count(20, 'boss')).toBe(2)
  })

  it('is fully deterministic', () => {
    expect(waveQueue(7)).toEqual(waveQueue(7))
  })

  it('makes enemies tougher and bonuses bigger over time', () => {
    expect(hpMultiplier(1)).toBe(1)
    expect(hpMultiplier(2)).toBeCloseTo(1.12)
    expect(hpMultiplier(11)).toBeCloseTo(1.12 ** 10)
    expect(hpMultiplier(30)).toBeGreaterThan(20)
    expect(waveBonus(5)).toBeGreaterThan(waveBonus(1))
  })
})
