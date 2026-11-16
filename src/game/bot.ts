import { MAPS, TOWERS } from './config'
import { reduce, towerStats, upgradeCost } from './engine'
import { getPath, key, positionAt } from './path'
import type { Action, Cell, GameState, TowerKind } from './types'

// A simple greedy player used by the tests to play whole games.
// Not part of the app: nothing in src/ imports this file.

const coverageCache = new Map<string, { cell: Cell; score: number }[]>()

/** Every free cell, with a score for how much of the path a tower there could reach. Best first. */
function rankedCells(mapId: string, range: number) {
  const cacheKey = `${mapId}:${range}`
  const cached = coverageCache.get(cacheKey)
  if (cached) return cached

  const map = MAPS[mapId]
  const path = getPath(map)
  const samples = []
  for (let p = 0; p <= path.total; p += 0.5) samples.push(positionAt(path, p))

  const cells: { cell: Cell; score: number }[] = []
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (path.cells.has(key({ x, y }))) continue
      const score = samples.filter((s) => Math.hypot(s.x - (x + 0.5), s.y - (y + 0.5)) <= range).length
      cells.push({ cell: { x, y }, score })
    }
  }
  cells.sort((a, b) => b.score - a.score || a.cell.y - b.cell.y || a.cell.x - b.cell.x)
  coverageCache.set(cacheKey, cells)
  return cells
}

/** Which tower type to build next, keeping a mix of roughly 3 arrows : 1 cannon : 1 frost. */
function nextKind(state: GameState): TowerKind {
  const count = (k: TowerKind) => state.towers.filter((t) => t.kind === k).length
  if (count('cannon') * 2 < count('arrow') && state.gold >= TOWERS.cannon.cost) return 'cannon'
  if (count('frost') * 3 < count('arrow') && state.gold >= TOWERS.frost.cost) return 'frost'
  return 'arrow'
}

/** Spends all the gold it sensibly can on new towers and upgrades. */
export function spendGold(start: GameState): { state: GameState; actions: Action[] } {
  let state = start
  const actions: Action[] = []

  for (let guard = 0; guard < 200; guard++) {
    const kind = nextKind(state)
    const free = rankedCells(state.mapId, towerStats(kind, 1).range).find(
      ({ cell }) => !state.towers.some((t) => t.cell.x === cell.x && t.cell.y === cell.y),
    )

    // cheapest possible upgrade
    const upgrades = state.towers
      .map((t) => ({ t, cost: upgradeCost(t.kind, t.level) }))
      .filter((u): u is { t: (typeof state.towers)[number]; cost: number } => u.cost !== null && u.cost <= state.gold)
      .sort((a, b) => a.cost - b.cost || a.t.id - b.t.id)

    const buildCost = TOWERS[kind].cost
    const canBuild = !!free && state.gold >= buildCost && state.towers.length < 40
    const best = upgrades[0]

    let action: Action | null = null
    if (best && (!canBuild || best.cost <= buildCost)) action = { type: 'upgrade', id: best.t.id }
    else if (canBuild) action = { type: 'place', kind, cell: free.cell }
    if (!action) break

    const next = reduce(state, action)
    if (next === state) break
    state = next
    actions.push(action)
  }
  return { state, actions }
}

/** Plays one full wave: spend gold, start it, and tick until it ends. */
export function playWave(start: GameState, onTick?: (s: GameState) => void): GameState {
  let state = spendGold(start).state
  state = reduce(state, { type: 'startWave' })
  for (let i = 0; i < 30 * 600 && state.phase === 'wave'; i++) {
    state = reduce(state, { type: 'tick' })
    onTick?.(state)
  }
  return state
}
