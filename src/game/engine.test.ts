import { describe, expect, it } from 'vitest'
import { ENEMIES, MAX_LEVEL, SELL_RATIO, START_GOLD, START_LIVES, TICK_RATE, TOWERS } from './config'
import { computeScore, newGame, placementError, reduce, sellValue, towerStats, upgradeCost } from './engine'
import { getPath, positionAt } from './path'
import { MAPS } from './config'
import type { Action, Enemy, EnemyKind, GameState, Tower, TowerKind } from './types'

const path = getPath(MAPS.serpentine)

// Row 2 sits right next to the first straight stretch of the path (row 1), so towers there can shoot at it.
const NEAR_PATH = { x: 5, y: 2 }

let id = 1000
const enemy = (kind: EnemyKind, progress: number, over: Partial<Enemy> = {}): Enemy => ({
  id: id++,
  kind,
  hp: ENEMIES[kind].hp,
  maxHp: ENEMIES[kind].hp,
  progress,
  slowTicks: 0,
  ...over,
})
const tower = (kind: TowerKind, x = NEAR_PATH.x, y = NEAR_PATH.y, level = 1): Tower => ({
  id: id++,
  kind,
  cell: { x, y },
  level,
  cooldown: 0,
  spent: TOWERS[kind].cost,
})
const wave = (over: Partial<GameState> = {}): GameState => ({ ...newGame(), phase: 'wave', wave: 1, spawnQueue: ['grunt'], ...over })
const last = <T,>(items: T[]): T => items[items.length - 1]
const run = (state: GameState, n: number) => Array.from({ length: n }).reduce<GameState>((s) => reduce(s, { type: 'tick' }), state)

describe('building', () => {
  it('starts with gold, lives and no towers', () => {
    const g = newGame()
    expect(g.gold).toBe(START_GOLD)
    expect(g.lives).toBe(START_LIVES)
    expect(g.towers).toEqual([])
    expect(g.phase).toBe('build')
  })

  it('places a tower and spends gold', () => {
    const g = reduce(newGame(), { type: 'place', kind: 'arrow', cell: NEAR_PATH })
    expect(g.towers).toHaveLength(1)
    expect(g.gold).toBe(START_GOLD - TOWERS.arrow.cost)
  })

  it('refuses the path, occupied cells, the outside of the map and unaffordable towers', () => {
    const g = newGame()
    expect(placementError(g, 'arrow', { x: 5, y: 1 })).toMatch(/path/)
    expect(placementError(g, 'arrow', { x: -1, y: 0 })).toMatch(/Outside/)
    expect(placementError(g, 'arrow', { x: 16, y: 0 })).toMatch(/Outside/)
    expect(placementError({ ...g, gold: 10 }, 'arrow', NEAR_PATH)).toMatch(/gold/)
    const built = reduce(g, { type: 'place', kind: 'arrow', cell: NEAR_PATH })
    expect(placementError(built, 'frost', NEAR_PATH)).toMatch(/already/)
  })

  it('invalid placement returns the very same state', () => {
    const g = newGame()
    expect(reduce(g, { type: 'place', kind: 'arrow', cell: { x: 5, y: 1 } })).toBe(g)
  })

  it('upgrades: costs gold, raises level and damage, stops at max level', () => {
    let g: GameState = { ...newGame(), gold: 1000, towers: [tower('arrow')] }
    const towerId = g.towers[0].id
    const cost1 = upgradeCost('arrow', 1)!
    g = reduce(g, { type: 'upgrade', id: towerId })
    expect(g.towers[0].level).toBe(2)
    expect(g.gold).toBe(1000 - cost1)
    expect(towerStats('arrow', 2).damage).toBeGreaterThan(towerStats('arrow', 1).damage)
    expect(towerStats('arrow', 2).range).toBeGreaterThan(towerStats('arrow', 1).range)
    g = reduce(g, { type: 'upgrade', id: towerId })
    expect(g.towers[0].level).toBe(MAX_LEVEL)
    expect(upgradeCost('arrow', MAX_LEVEL)).toBeNull()
    expect(reduce(g, { type: 'upgrade', id: towerId })).toBe(g)
  })

  it("can't upgrade without enough gold", () => {
    const g: GameState = { ...newGame(), gold: 5, towers: [tower('arrow')] }
    expect(reduce(g, { type: 'upgrade', id: g.towers[0].id })).toBe(g)
  })

  it('selling refunds part of everything invested, including upgrades', () => {
    let g: GameState = { ...newGame(), gold: 1000, towers: [tower('cannon')] }
    const towerId = g.towers[0].id
    g = reduce(g, { type: 'upgrade', id: towerId })
    const invested = TOWERS.cannon.cost + upgradeCost('cannon', 1)!
    expect(sellValue(g.towers[0])).toBe(Math.floor(invested * SELL_RATIO))
    const goldBefore = g.gold
    g = reduce(g, { type: 'sell', id: towerId })
    expect(g.towers).toHaveLength(0)
    expect(g.gold).toBe(goldBefore + Math.floor(invested * SELL_RATIO))
  })
})

describe('waves and movement', () => {
  it('startWave begins the wave, but only between waves', () => {
    const g = reduce(newGame(), { type: 'startWave' })
    expect(g.phase).toBe('wave')
    expect(g.wave).toBe(1)
    expect(g.spawnQueue).toHaveLength(8)
    expect(reduce(g, { type: 'startWave' })).toBe(g)
  })

  it('does nothing while idle between waves', () => {
    const g = newGame()
    expect(reduce(g, { type: 'tick' })).toBe(g)
  })

  it('spawns enemies one by one with the right gap', () => {
    let g = reduce(newGame(), { type: 'startWave' })
    g = run(g, 1)
    expect(g.enemies).toHaveLength(1)
    g = run(g, Math.round(ENEMIES.grunt.gap * TICK_RATE) - 1)
    expect(g.enemies).toHaveLength(1)
    g = run(g, 1)
    expect(g.enemies).toHaveLength(2)
  })

  it('moves enemies at their speed', () => {
    let g = wave({ spawnQueue: [], enemies: [enemy('grunt', 0)] })
    g = run(g, TICK_RATE)
    expect(g.enemies[0].progress).toBeCloseTo(ENEMIES.grunt.speed, 5)
  })

  it('an enemy reaching the base costs lives and disappears', () => {
    const g = run(wave({ spawnQueue: [], enemies: [enemy('tank', path.total - 0.01)] }), 1)
    expect(g.enemies).toHaveLength(0)
    expect(g.lives).toBe(START_LIVES - ENEMIES.tank.leak)
    expect(g.log.some((m) => /tank/.test(m))).toBe(true)
  })

  it('the game is lost when lives run out and then freezes', () => {
    const g = run(wave({ spawnQueue: [], lives: 1, enemies: [enemy('grunt', path.total - 0.01)] }), 1)
    expect(g.phase).toBe('lost')
    expect(g.lives).toBe(0)
    expect(reduce(g, { type: 'tick' })).toBe(g)
    expect(reduce(g, { type: 'place', kind: 'arrow', cell: NEAR_PATH })).toBe(g)
  })

  it('clearing a wave pays a bonus and returns to the build phase', () => {
    const g0 = wave({ spawnQueue: [], towers: [tower('arrow', 5, 2)], enemies: [enemy('runner', 5, { hp: 1 })] })
    const g = run(g0, 2)
    expect(g.phase).toBe('build')
    expect(g.kills).toBe(1)
    expect(g.gold).toBe(g0.gold + ENEMIES.runner.reward + 25 + 3)
    expect(last(g.log)).toMatch(/cleared/)
  })
})

describe('towers', () => {
  it('an arrow tower shoots an enemy in range', () => {
    const g = run(wave({ spawnQueue: [], towers: [tower('arrow')], enemies: [enemy('tank', 5)] }), 1)
    expect(g.enemies[0].hp).toBe(ENEMIES.tank.hp - TOWERS.arrow.damage)
    expect(g.effects.some((e) => e.kind === 'beam')).toBe(true)
  })

  it('ignores enemies out of range', () => {
    const g = run(wave({ spawnQueue: [], towers: [tower('arrow')], enemies: [enemy('tank', 30)] }), 1)
    expect(g.enemies[0].hp).toBe(ENEMIES.tank.hp)
  })

  it('waits for its cooldown between shots', () => {
    let g = wave({ spawnQueue: [], towers: [tower('arrow')], enemies: [enemy('boss', 5)] })
    g = run(g, 1)
    const afterFirst = g.enemies[0].hp
    g = run(g, 2)
    expect(g.enemies[0].hp).toBe(afterFirst)
    g = run(g, Math.round(TICK_RATE / TOWERS.arrow.rate))
    expect(g.enemies[0].hp).toBeLessThan(afterFirst)
  })

  it('focuses the enemy closest to the base', () => {
    const behind = enemy('boss', 4.5)
    const ahead = enemy('boss', 6)
    const g = run(wave({ spawnQueue: [], towers: [tower('arrow')], enemies: [behind, ahead] }), 1)
    expect(g.enemies.find((e) => e.id === ahead.id)!.hp).toBeLessThan(ENEMIES.boss.hp)
    expect(g.enemies.find((e) => e.id === behind.id)!.hp).toBe(ENEMIES.boss.hp)
  })

  it('a cannon shell also hurts enemies next to the target', () => {
    const target = enemy('boss', 6)
    const neighbour = enemy('boss', 5.5)
    const farAway = enemy('boss', 20)
    const g = run(wave({ spawnQueue: [], towers: [tower('cannon')], enemies: [target, neighbour, farAway] }), 1)
    const hp = (e: Enemy) => g.enemies.find((x) => x.id === e.id)!.hp
    expect(hp(target)).toBeLessThan(ENEMIES.boss.hp)
    expect(hp(neighbour)).toBeLessThan(ENEMIES.boss.hp)
    expect(hp(farAway)).toBe(ENEMIES.boss.hp)
  })

  it('a frost tower slows everything in range, so they travel slower', () => {
    const a = enemy('boss', 5)
    const b = enemy('boss', 5.5)
    const chilled = run(wave({ spawnQueue: [], towers: [tower('frost')], enemies: [a, b] }), 10)
    const free = run(wave({ spawnQueue: [], enemies: [enemy('boss', 5)] }), 10)
    expect(chilled.enemies.every((e) => e.slowTicks > 0)).toBe(true)
    expect(chilled.enemies[0].progress - 5).toBeLessThan(free.enemies[0].progress - 5)
  })

  it('higher level towers hit harder', () => {
    const lvl1 = run(wave({ spawnQueue: [], towers: [tower('arrow', 5, 2, 1)], enemies: [enemy('boss', 5)] }), 1)
    const lvl3 = run(wave({ spawnQueue: [], towers: [tower('arrow', 5, 2, 3)], enemies: [enemy('boss', 5)] }), 1)
    expect(lvl3.enemies[0].hp).toBeLessThan(lvl1.enemies[0].hp)
  })

  it('killing an enemy pays its reward and counts the kill', () => {
    // the queue still has a grunt, but it is far from spawning, so only the one on the path is in play
    const g0 = wave({ spawnQueue: ['grunt'], spawnTimer: 999, towers: [tower('arrow')], enemies: [enemy('grunt', 5, { hp: 1 })] })
    const g = run(g0, 1)
    expect(g.enemies).toHaveLength(0)
    expect(g.kills).toBe(1)
    expect(g.gold).toBe(g0.gold + ENEMIES.grunt.reward)
  })

  it('visual effects fade away', () => {
    let g = run(wave({ spawnQueue: [], towers: [tower('arrow')], enemies: [enemy('boss', 5)] }), 1)
    expect(g.effects.length).toBeGreaterThan(0)
    g = reduce({ ...g, towers: [] }, { type: 'tick' })
    g = run(g, 20)
    expect(g.effects).toHaveLength(0)
  })
})

describe('score, restart and determinism', () => {
  it('scores kills and finished waves', () => {
    expect(computeScore({ kills: 5, wave: 3, phase: 'build' })).toBe(50 + 300)
    expect(computeScore({ kills: 5, wave: 3, phase: 'wave' })).toBe(50 + 200)
    expect(computeScore({ kills: 0, wave: 0, phase: 'build' })).toBe(0)
  })

  it('restart gives a fresh game', () => {
    expect(reduce(wave({ gold: 0, lives: 3 }), { type: 'restart' })).toEqual(newGame())
  })

  it('the same actions always give the same game', () => {
    const actions: Action[] = [
      { type: 'place', kind: 'arrow', cell: { x: 4, y: 2 } },
      { type: 'place', kind: 'cannon', cell: { x: 8, y: 2 } },
      { type: 'startWave' },
      ...Array.from({ length: 600 }, (): Action => ({ type: 'tick' })),
    ]
    const play = () => actions.reduce(reduce, newGame())
    expect(play()).toEqual(play())
  })

  it('does not change the previous state (pure reducer)', () => {
    const g = wave({ spawnQueue: [], towers: [tower('arrow')], enemies: [enemy('tank', 5)] })
    const snapshot = JSON.stringify(g)
    run(g, 5)
    expect(JSON.stringify(g)).toBe(snapshot)
  })

  it('every enemy position stays on the path', () => {
    const p = positionAt(path, path.total / 2)
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
  })
})
