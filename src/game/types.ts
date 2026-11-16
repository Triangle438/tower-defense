export type TowerKind = 'arrow' | 'cannon' | 'frost'
export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'boss'

/** A tile on the grid. */
export interface Cell {
  x: number
  y: number
}

/** A point in tile units (a tile's centre is at x + 0.5, y + 0.5). */
export interface Vec {
  x: number
  y: number
}

export interface Tower {
  id: number
  kind: TowerKind
  cell: Cell
  level: number
  /** ticks until the tower can fire again */
  cooldown: number
  /** gold invested so far, used to work out the sell price */
  spent: number
}

export interface Enemy {
  id: number
  kind: EnemyKind
  hp: number
  maxHp: number
  /** distance travelled along the path, in tiles */
  progress: number
  /** ticks of slow left */
  slowTicks: number
}

/** Short-lived visual effect, kept in the state so the renderer stays a pure function of it. */
export interface Effect {
  id: number
  kind: 'beam' | 'blast' | 'pulse'
  tower: TowerKind
  from: Vec
  to: Vec
  radius: number
  ttl: number
  maxTtl: number
}

export type Phase = 'build' | 'wave' | 'lost'

export interface GameState {
  mapId: string
  tick: number
  /** number of the wave that is running, or the last one that ran */
  wave: number
  phase: Phase
  lives: number
  gold: number
  kills: number
  towers: Tower[]
  enemies: Enemy[]
  effects: Effect[]
  spawnQueue: EnemyKind[]
  spawnTimer: number
  nextId: number
  log: string[]
}

export type Action =
  | { type: 'tick' }
  | { type: 'startWave' }
  | { type: 'place'; kind: TowerKind; cell: Cell }
  | { type: 'upgrade'; id: number }
  | { type: 'sell'; id: number }
  | { type: 'restart' }

export const samePos = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y
