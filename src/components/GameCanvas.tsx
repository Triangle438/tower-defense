import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'
import { MAPS } from '../game/config'
import { TILE, drawGame, type Overlay } from '../game/render'
import type { Cell, GameState } from '../game/types'

interface Props {
  state: GameState
  overlay: Overlay
  onCell: (cell: Cell) => void
  onHover: (cell: Cell | null) => void
  onCancel: () => void
}

export function GameCanvas({ state, overlay, onCell, onHover, onCancel }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const map = MAPS[state.mapId]

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    // Draw at the screen's pixel density so lines and text stay sharp.
    const dpr = window.devicePixelRatio || 1
    canvas.width = map.cols * TILE * dpr
    canvas.height = map.rows * TILE * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawGame(ctx, state, overlay)
  }, [state, overlay, map])

  // Converts a mouse or touch position into a grid cell, whatever size the canvas is shown at.
  const cellAt = (e: MouseEvent | PointerEvent): Cell => {
    const rect = ref.current!.getBoundingClientRect()
    return {
      x: Math.min(map.cols - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * map.cols))),
      y: Math.min(map.rows - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * map.rows))),
    }
  }

  return (
    <canvas
      ref={ref}
      className="canvas"
      role="img"
      aria-label={`Battlefield. Wave ${state.wave}, ${state.lives} lives left, ${state.towers.length} towers built.`}
      onPointerMove={(e) => onHover(cellAt(e))}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => onCell(cellAt(e))}
      onContextMenu={(e) => {
        e.preventDefault()
        onCancel()
      }}
    />
  )
}
