import { describe, expect, it } from 'vitest'
import { MAPS } from './config'
import { getPath, key, positionAt } from './path'

const path = getPath(MAPS.serpentine)

describe('path', () => {
  it('has the expected total length (sum of straight segments)', () => {
    expect(path.total).toBe(13 + 3 + 11 + 4 + 13)
  })

  it('covers every cell between the corners, and nothing else nearby', () => {
    expect(path.cells.has(key({ x: 0, y: 1 }))).toBe(true)
    expect(path.cells.has(key({ x: 7, y: 1 }))).toBe(true)
    expect(path.cells.has(key({ x: 13, y: 3 }))).toBe(true)
    expect(path.cells.has(key({ x: 2, y: 6 }))).toBe(true)
    expect(path.cells.has(key({ x: 15, y: 8 }))).toBe(true)
    expect(path.cells.has(key({ x: 7, y: 2 }))).toBe(false)
    expect(path.cells.has(key({ x: 7, y: 6 }))).toBe(false)
  })
})

describe('positionAt', () => {
  it('starts at the first waypoint and ends at the last', () => {
    expect(positionAt(path, 0)).toEqual({ x: 0.5, y: 1.5 })
    expect(positionAt(path, path.total)).toEqual({ x: 15.5, y: 8.5 })
  })

  it('moves along the first straight segment', () => {
    expect(positionAt(path, 4)).toEqual({ x: 4.5, y: 1.5 })
  })

  it('turns the corner correctly', () => {
    expect(positionAt(path, 13)).toEqual({ x: 13.5, y: 1.5 })
    expect(positionAt(path, 14.5)).toEqual({ x: 13.5, y: 3 })
  })

  it('clamps values outside the path', () => {
    expect(positionAt(path, -5)).toEqual(positionAt(path, 0))
    expect(positionAt(path, 999)).toEqual(positionAt(path, path.total))
  })
})
