import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { MAPS, TICK_MS, TOWER_ORDER } from '../game/config'
import { newGame, placementError, reduce } from '../game/engine'
import type { Cell, TowerKind } from '../game/types'

export type Speed = 1 | 2 | 4

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLButtonElement || t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement

export function useTowerDefense() {
  const [state, dispatch] = useReducer(reduce, undefined, () => newGame())
  const [build, setBuild] = useState<TowerKind | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [cursor, setCursor] = useState<Cell | null>(null)
  const [speed, setSpeed] = useState<Speed>(1)
  const [paused, setPaused] = useState(false)
  const [notice, setNotice] = useState('')

  const map = MAPS[state.mapId]
  const selected = state.towers.find((t) => t.id === selectedId) ?? null
  const running = state.phase !== 'lost' && !paused

  // Game loop: real time is turned into fixed 1/30 s ticks, so the game plays the same on any screen.
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    let acc = 0

    const frame = (now: number) => {
      acc += Math.min(now - last, 250) * speed
      last = now
      let steps = 0
      while (acc >= TICK_MS && steps < 8) {
        dispatch({ type: 'tick' })
        acc -= TICK_MS
        steps++
      }
      if (steps === 8) acc = 0
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [running, speed])

  // Feedback messages disappear on their own.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  const buildError = build && cursor ? placementError(state, build, cursor) : 'no cell'
  const canPlace = buildError === null

  const chooseBuild = useCallback((kind: TowerKind | null) => {
    setBuild((current) => (current === kind ? null : kind))
    setSelectedId(null)
  }, [])

  /** Clicking or pressing Enter on a cell: select a tower, or build one. */
  const activateCell = useCallback(
    (cell: Cell) => {
      const tower = state.towers.find((t) => t.cell.x === cell.x && t.cell.y === cell.y)
      if (tower) {
        setSelectedId(tower.id)
        setBuild(null)
      } else if (build) {
        const error = placementError(state, build, cell)
        if (error) setNotice(error)
        else dispatch({ type: 'place', kind: build, cell })
      } else {
        setSelectedId(null)
      }
    },
    [state, build],
  )

  const startWave = useCallback(() => dispatch({ type: 'startWave' }), [])
  const upgrade = useCallback(() => selected && dispatch({ type: 'upgrade', id: selected.id }), [selected])
  const sell = useCallback(() => {
    if (!selected) return
    dispatch({ type: 'sell', id: selected.id })
    setSelectedId(null)
  }, [selected])
  const cancel = useCallback(() => {
    setBuild(null)
    setSelectedId(null)
  }, [])
  const restart = useCallback(() => {
    dispatch({ type: 'restart' })
    cancel()
    setPaused(false)
  }, [cancel])

  // Keyboard shortcuts. The handler is kept in a ref so the listener is only attached once.
  const handler = useRef<(e: KeyboardEvent) => void>(() => {})
  handler.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const key = e.key.toLowerCase()

    const towerIndex = ['1', '2', '3'].indexOf(key)
    if (towerIndex >= 0) return chooseBuild(TOWER_ORDER[towerIndex])

    const moves: Record<string, Cell> = { arrowup: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, arrowleft: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 } }
    if (moves[key]) {
      e.preventDefault()
      setCursor((c) => {
        const from = c ?? { x: Math.floor(map.cols / 2), y: Math.floor(map.rows / 2) }
        return {
          x: Math.min(map.cols - 1, Math.max(0, from.x + moves[key].x)),
          y: Math.min(map.rows - 1, Math.max(0, from.y + moves[key].y)),
        }
      })
      return
    }

    // Space and Enter also "click" the focused button, so leave them alone when a button has focus.
    if ((key === ' ' || key === 'enter') && isTyping(e.target)) return
    if (key === ' ') {
      e.preventDefault()
      startWave()
    } else if (key === 'enter' && cursor) {
      e.preventDefault()
      activateCell(cursor)
    } else if (key === 'u') upgrade()
    else if (key === 'x') sell()
    else if (key === 'escape') cancel()
    else if (key === 'p') setPaused((p) => !p)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handler.current(e)
    // After a mouse click a button keeps focus, and Space would press it again instead of starting the wave.
    // Clicks made with the keyboard have detail 0 and keep their focus, so keyboard navigation still works.
    const onClick = (e: MouseEvent) => {
      if (e.detail > 0 && e.target instanceof HTMLButtonElement) e.target.blur()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return {
    state,
    build,
    selected,
    cursor,
    canPlace,
    speed,
    paused,
    notice,
    setCursor,
    setSpeed,
    setPaused,
    chooseBuild,
    activateCell,
    startWave,
    upgrade,
    sell,
    cancel,
    restart,
  }
}
