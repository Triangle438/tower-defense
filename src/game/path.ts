import type { MapDef } from './config'
import type { Cell, Vec } from './types'

export interface PathInfo {
  /** waypoint centres in tile units */
  points: Vec[]
  /** total length in tiles */
  total: number
  /** every cell the path covers, as "x,y" keys */
  cells: Set<string>
  /** lengths[i] = distance from the start to points[i] */
  lengths: number[]
}

export const key = (c: Cell) => `${c.x},${c.y}`

const cache = new Map<string, PathInfo>()

export function getPath(map: MapDef): PathInfo {
  const cached = cache.get(map.id)
  if (cached) return cached

  const points = map.waypoints.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 }))
  const lengths = [0]
  const cells = new Set<string>([key(map.waypoints[0])])

  for (let i = 1; i < map.waypoints.length; i++) {
    const a = map.waypoints[i - 1]
    const b = map.waypoints[i]
    lengths.push(lengths[i - 1] + Math.abs(b.x - a.x) + Math.abs(b.y - a.y))
    // segments are straight lines, so walking one step at a time covers every cell
    const dx = Math.sign(b.x - a.x)
    const dy = Math.sign(b.y - a.y)
    for (let x = a.x, y = a.y; x !== b.x || y !== b.y; x += dx, y += dy) cells.add(key({ x: x + dx, y: y + dy }))
  }

  const info = { points, total: lengths[lengths.length - 1], cells, lengths }
  cache.set(map.id, info)
  return info
}

/** Where an enemy is, given how far along the path it has travelled. */
export function positionAt(path: PathInfo, progress: number): Vec {
  const p = Math.min(Math.max(progress, 0), path.total)
  for (let i = 1; i < path.points.length; i++) {
    if (p <= path.lengths[i]) {
      const t = (p - path.lengths[i - 1]) / (path.lengths[i] - path.lengths[i - 1])
      const a = path.points[i - 1]
      const b = path.points[i]
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
  }
  return path.points[path.points.length - 1]
}
