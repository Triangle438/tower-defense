import { describe, expect, it } from 'vitest'
import { playWave } from './bot'
import { newGame } from './engine'
import { key } from './path'
import type { GameState } from './types'

function assertInvariants(s: GameState, label: string) {
  expect(s.gold, `${label}: gold never negative`).toBeGreaterThanOrEqual(0)
  expect(s.lives, `${label}: lives`).toBeGreaterThanOrEqual(0)

  const cells = new Set<string>()
  for (const t of s.towers) {
    expect(cells.has(key(t.cell)), `${label}: two towers on one cell`).toBe(false)
    cells.add(key(t.cell))
    expect(t.level).toBeGreaterThanOrEqual(1)
    expect(t.level).toBeLessThanOrEqual(3)
  }

  const ids = new Set<number>()
  for (const e of s.enemies) {
    expect(ids.has(e.id), `${label}: duplicate enemy id`).toBe(false)
    ids.add(e.id)
    expect(e.progress).toBeGreaterThanOrEqual(0)
    expect(e.hp).toBeGreaterThan(0)
    expect(e.hp).toBeLessThanOrEqual(e.maxHp)
  }
}

describe('full-game simulation', () => {
  it('a bot plays up to 15 waves and the rules hold on every single tick', () => {
    let state = newGame()
    let tickCount = 0
    for (let w = 0; w < 15 && state.phase !== 'lost'; w++) {
      state = playWave(state, (s) => {
        tickCount++
        assertInvariants(s, `wave ${s.wave}, tick ${s.tick}`)
      })
    }
    expect(tickCount).toBeGreaterThan(1000)
    expect(state.wave).toBeGreaterThanOrEqual(5)
  })

  it('is reproducible: the same bot plays the same game twice', () => {
    const play = () => {
      let s = newGame()
      for (let w = 0; w < 6 && s.phase !== 'lost'; w++) s = playWave(s)
      return s
    }
    expect(play()).toEqual(play())
  })
})
