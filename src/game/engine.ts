import {
  DEFAULT_MAP,
  ENEMIES,
  MAPS,
  MAX_LEVEL,
  SELL_RATIO,
  SLOW_TICKS,
  START_GOLD,
  START_LIVES,
  TICK_RATE,
  TOWERS,
  type MapDef,
} from './config'
import { getPath, key, positionAt } from './path'
import { hpMultiplier, waveBonus, waveQueue } from './waves'
import { samePos, type Action, type Cell, type Effect, type Enemy, type GameState, type Tower, type TowerKind, type Vec } from './types'

const LOG_SIZE = 5
const BEAM_TTL = 6
const BLAST_TTL = 9
const PULSE_TTL = 12

export const getMap = (state: Pick<GameState, 'mapId'>): MapDef => MAPS[state.mapId]

export function newGame(mapId: string = DEFAULT_MAP): GameState {
  return {
    mapId,
    tick: 0,
    wave: 0,
    phase: 'build',
    lives: START_LIVES,
    gold: START_GOLD,
    kills: 0,
    towers: [],
    enemies: [],
    effects: [],
    spawnQueue: [],
    spawnTimer: 0,
    nextId: 1,
    log: ['Build some towers, then start the first wave.'],
  }
}

// ---------- tower stats ----------

export interface TowerStats {
  damage: number
  range: number
  rate: number
  splash: number
}

/** Each upgrade level adds 50% damage and a quarter tile of range. */
export function towerStats(kind: TowerKind, level: number): TowerStats {
  const def = TOWERS[kind]
  return {
    damage: def.damage * (1 + 0.5 * (level - 1)),
    range: def.range + 0.25 * (level - 1),
    rate: def.rate,
    splash: def.splash,
  }
}

/** Gold needed to take a tower from `level` to `level + 1`, or null at max level. */
export const upgradeCost = (kind: TowerKind, level: number): number | null =>
  level >= MAX_LEVEL ? null : Math.round(TOWERS[kind].cost * 0.7 * level)

export const sellValue = (tower: Tower) => Math.floor(tower.spent * SELL_RATIO)

export const computeScore = (s: Pick<GameState, 'kills' | 'wave' | 'phase'>) => {
  const completed = s.phase === 'build' ? s.wave : s.wave - 1
  return s.kills * 10 + Math.max(0, completed) * 100
}

// ---------- building ----------

/** Why a tower can't be built on this cell, or null if it can. */
export function placementError(state: GameState, kind: TowerKind, cell: Cell): string | null {
  const map = getMap(state)
  if (state.phase === 'lost') return 'The game is over.'
  if (cell.x < 0 || cell.y < 0 || cell.x >= map.cols || cell.y >= map.rows) return 'Outside the map.'
  if (getPath(map).cells.has(key(cell))) return 'You cannot build on the path.'
  if (state.towers.some((t) => samePos(t.cell, cell))) return 'There is already a tower here.'
  if (state.gold < TOWERS[kind].cost) return `Not enough gold (${TOWERS[kind].cost} needed).`
  return null
}

// ---------- simulation ----------

const centre = (c: Cell): Vec => ({ x: c.x + 0.5, y: c.y + 0.5 })
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
const ticks = (seconds: number) => Math.max(1, Math.round(seconds * TICK_RATE))

/**
 * Advances the game by one tick (1/30 s). There is no randomness anywhere,
 * so the same actions always give exactly the same game.
 */
function tick(state: GameState): GameState {
  if (state.phase === 'lost') return state
  // Nothing happens between waves except the last effects fading out.
  if (state.phase === 'build' && state.effects.length === 0) return state

  const map = getMap(state)
  const path = getPath(map)
  let { gold, lives, kills, nextId, spawnQueue, spawnTimer } = state
  let phase = state.phase
  const log: string[] = []

  let effects = state.effects.map((e) => ({ ...e, ttl: e.ttl - 1 })).filter((e) => e.ttl > 0)
  let enemies = state.enemies.map((e) => ({ ...e }))
  const towers = state.towers.map((t) => ({ ...t }))

  // 1. spawn the next enemy of the wave
  if (phase === 'wave' && spawnQueue.length > 0) {
    spawnTimer -= 1
    if (spawnTimer <= 0) {
      const kind = spawnQueue[0]
      const hp = Math.round(ENEMIES[kind].hp * hpMultiplier(state.wave))
      enemies.push({ id: nextId++, kind, hp, maxHp: hp, progress: 0, slowTicks: 0 })
      spawnQueue = spawnQueue.slice(1)
      spawnTimer = ticks(ENEMIES[kind].gap)
    }
  }

  // 2. move enemies, and let the ones that reach the base hurt you
  const walking: Enemy[] = []
  for (const e of enemies) {
    const slow = e.slowTicks > 0 ? 0.5 : 1
    e.slowTicks = Math.max(0, e.slowTicks - 1)
    e.progress += (ENEMIES[e.kind].speed * slow) / TICK_RATE
    if (e.progress >= path.total) {
      lives -= ENEMIES[e.kind].leak
      log.push(`A ${ENEMIES[e.kind].name.toLowerCase()} got through! -${ENEMIES[e.kind].leak} lives.`)
    } else {
      walking.push(e)
    }
  }
  enemies = walking

  if (lives <= 0) {
    return {
      ...state,
      tick: state.tick + 1,
      phase: 'lost',
      lives: 0,
      enemies,
      effects,
      kills,
      log: [...state.log, ...log, `Your base fell on wave ${state.wave}.`].slice(-LOG_SIZE),
    }
  }

  // 3. towers fire
  const addEffect = (e: Omit<Effect, 'id' | 'maxTtl'>) => effects.push({ ...e, id: nextId++, maxTtl: e.ttl })

  for (const tower of towers) {
    tower.cooldown = Math.max(0, tower.cooldown - 1)
    if (tower.cooldown > 0) continue

    const stats = towerStats(tower.kind, tower.level)
    const from = centre(tower.cell)
    const inRange = enemies.filter((e) => e.hp > 0 && dist(from, positionAt(path, e.progress)) <= stats.range)
    if (inRange.length === 0) continue

    if (tower.kind === 'frost') {
      for (const e of inRange) {
        e.hp -= stats.damage
        e.slowTicks = SLOW_TICKS
      }
      addEffect({ kind: 'pulse', tower: 'frost', from, to: from, radius: stats.range, ttl: PULSE_TTL })
    } else {
      // focus the enemy that is closest to your base
      const target = inRange.reduce((best, e) => (e.progress > best.progress ? e : best))
      const targetPos = positionAt(path, target.progress)

      if (tower.kind === 'cannon') {
        for (const e of enemies) {
          if (e.hp > 0 && dist(positionAt(path, e.progress), targetPos) <= stats.splash) e.hp -= stats.damage
        }
        addEffect({ kind: 'blast', tower: 'cannon', from, to: targetPos, radius: stats.splash, ttl: BLAST_TTL })
      } else {
        target.hp -= stats.damage
        addEffect({ kind: 'beam', tower: 'arrow', from, to: targetPos, radius: 0, ttl: BEAM_TTL })
      }
    }
    tower.cooldown = ticks(1 / stats.rate)
  }

  // 4. collect rewards for the dead
  enemies = enemies.filter((e) => {
    if (e.hp > 0) return true
    gold += ENEMIES[e.kind].reward
    kills += 1
    return false
  })

  // 5. wave cleared?
  if (phase === 'wave' && spawnQueue.length === 0 && enemies.length === 0) {
    phase = 'build'
    const bonus = waveBonus(state.wave)
    gold += bonus
    for (const t of towers) t.cooldown = 0
    log.push(`Wave ${state.wave} cleared! +${bonus} gold.`)
  }

  return {
    ...state,
    tick: state.tick + 1,
    phase,
    lives,
    gold,
    kills,
    towers,
    enemies,
    effects,
    spawnQueue,
    spawnTimer,
    nextId,
    log: log.length ? [...state.log, ...log].slice(-LOG_SIZE) : state.log,
  }
}

/** The whole game is one pure function: (state, action) => new state. Invalid actions return the same state. */
export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'restart':
      return newGame(state.mapId)

    case 'tick':
      return tick(state)

    case 'startWave': {
      if (state.phase !== 'build') return state
      const wave = state.wave + 1
      return {
        ...state,
        phase: 'wave',
        wave,
        spawnQueue: waveQueue(wave),
        spawnTimer: 1,
        log: [...state.log, `Wave ${wave} is coming!`].slice(-LOG_SIZE),
      }
    }

    case 'place': {
      if (placementError(state, action.kind, action.cell)) return state
      const cost = TOWERS[action.kind].cost
      const tower: Tower = { id: state.nextId, kind: action.kind, cell: action.cell, level: 1, cooldown: 0, spent: cost }
      return { ...state, gold: state.gold - cost, towers: [...state.towers, tower], nextId: state.nextId + 1 }
    }

    case 'upgrade': {
      const tower = state.towers.find((t) => t.id === action.id)
      if (!tower || state.phase === 'lost') return state
      const cost = upgradeCost(tower.kind, tower.level)
      if (cost === null || state.gold < cost) return state
      return {
        ...state,
        gold: state.gold - cost,
        towers: state.towers.map((t) => (t === tower ? { ...t, level: t.level + 1, spent: t.spent + cost } : t)),
      }
    }

    case 'sell': {
      const tower = state.towers.find((t) => t.id === action.id)
      if (!tower || state.phase === 'lost') return state
      return { ...state, gold: state.gold + sellValue(tower), towers: state.towers.filter((t) => t !== tower) }
    }
  }
}
