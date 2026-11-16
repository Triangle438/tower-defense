import type { Cell, EnemyKind, TowerKind } from './types'

export const TICK_RATE = 30
export const TICK_MS = 1000 / TICK_RATE

export const START_GOLD = 160
export const START_LIVES = 20
export const MAX_LEVEL = 3
export const SELL_RATIO = 0.7
export const SLOW_FACTOR = 0.5
export const SLOW_TICKS = 2 * TICK_RATE

export interface EnemyDef {
  name: string
  hp: number
  /** tiles per second */
  speed: number
  reward: number
  /** lives lost when it reaches the base */
  leak: number
  /** seconds between this enemy and the next one in the wave */
  gap: number
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt: { name: 'Grunt', hp: 20, speed: 1.6, reward: 4, leak: 1, gap: 0.7 },
  runner: { name: 'Runner', hp: 12, speed: 3.0, reward: 3, leak: 1, gap: 0.4 },
  tank: { name: 'Tank', hp: 90, speed: 1.0, reward: 14, leak: 3, gap: 1.5 },
  boss: { name: 'Boss', hp: 600, speed: 0.8, reward: 80, leak: 10, gap: 2 },
}

export interface TowerDef {
  name: string
  hotkey: string
  cost: number
  /** tiles */
  range: number
  damage: number
  /** shots per second */
  rate: number
  /** area damage radius in tiles, 0 for single target */
  splash: number
  description: string
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  arrow: { name: 'Arrow', hotkey: '1', cost: 50, range: 3, damage: 8, rate: 1.6, splash: 0, description: 'Fast and cheap. Hits the enemy closest to your base.' },
  cannon: { name: 'Cannon', hotkey: '2', cost: 110, range: 2.6, damage: 28, rate: 0.7, splash: 1.1, description: 'Slow, but its shells damage everything around the target.' },
  frost: { name: 'Frost', hotkey: '3', cost: 80, range: 2.4, damage: 3, rate: 0.8, splash: 0, description: 'Chills every enemy in range and slows them by half.' },
}

export const TOWER_ORDER: TowerKind[] = ['arrow', 'cannon', 'frost']

export interface MapDef {
  id: string
  name: string
  cols: number
  rows: number
  /** corners of the enemy path, each segment is a straight horizontal or vertical line */
  waypoints: Cell[]
}

export const MAPS: Record<string, MapDef> = {
  serpentine: {
    id: 'serpentine',
    name: 'Serpentine',
    cols: 16,
    rows: 10,
    waypoints: [
      { x: 0, y: 1 },
      { x: 13, y: 1 },
      { x: 13, y: 4 },
      { x: 2, y: 4 },
      { x: 2, y: 8 },
      { x: 15, y: 8 },
    ],
  },
}

export const DEFAULT_MAP = 'serpentine'
