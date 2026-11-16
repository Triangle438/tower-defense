import { MAPS } from './config'
import { getPath, key, positionAt } from './path'
import { towerStats } from './engine'
import type { Cell, EnemyKind, GameState, TowerKind } from './types'

export const TILE = 48

const TOWER_COLOR: Record<TowerKind, string> = { arrow: '#3ddbc0', cannon: '#ff9f43', frost: '#6ec1ff' }
const ENEMY_STYLE: Record<EnemyKind, { color: string; radius: number }> = {
  grunt: { color: '#7bd66b', radius: 0.26 },
  runner: { color: '#ffd84a', radius: 0.19 },
  tank: { color: '#d9664a', radius: 0.34 },
  boss: { color: '#b46bff', radius: 0.46 },
}

export interface Overlay {
  /** the cell the cursor is on */
  cursor: Cell | null
  /** tower type being placed, if any */
  build: TowerKind | null
  /** id of the selected tower, if any */
  selectedId: number | null
  /** whether a tower of the build type can be placed at the cursor */
  canPlace: boolean
}

const px = (v: number) => v * TILE

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(px(x), px(y), px(r), 0, Math.PI * 2)
}

function drawTower(ctx: CanvasRenderingContext2D, kind: TowerKind, cell: Cell, level: number) {
  const cx = cell.x + 0.5
  const cy = cell.y + 0.5
  const color = TOWER_COLOR[kind]

  ctx.fillStyle = '#232a3d'
  ctx.strokeStyle = '#3a4466'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(px(cell.x) + 4, px(cell.y) + 4, TILE - 8, TILE - 8, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  if (kind === 'arrow') {
    ctx.moveTo(px(cx), px(cy - 0.28))
    ctx.lineTo(px(cx + 0.26), px(cy + 0.2))
    ctx.lineTo(px(cx - 0.26), px(cy + 0.2))
    ctx.closePath()
  } else if (kind === 'cannon') {
    ctx.rect(px(cx - 0.22), px(cy - 0.22), px(0.44), px(0.44))
  } else {
    ctx.moveTo(px(cx), px(cy - 0.3))
    ctx.lineTo(px(cx + 0.26), px(cy))
    ctx.lineTo(px(cx), px(cy + 0.3))
    ctx.lineTo(px(cx - 0.26), px(cy))
    ctx.closePath()
  }
  ctx.fill()

  // one pip per upgrade level
  ctx.fillStyle = '#ffd24a'
  for (let i = 0; i < level; i++) {
    ctx.beginPath()
    ctx.arc(px(cell.x) + 10 + i * 8, px(cell.y + 1) - 9, 2.6, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Draws the whole battlefield. It only reads the state, so the same state always gives the same picture. */
export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, overlay: Overlay) {
  const map = MAPS[state.mapId]
  const path = getPath(map)

  // ground
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const onPath = path.cells.has(key({ x, y }))
      ctx.fillStyle = onPath ? '#6a5a3c' : (x + y) % 2 === 0 ? '#1d2b21' : '#1a271d'
      ctx.fillRect(px(x), px(y), TILE, TILE)
      if (onPath) {
        ctx.strokeStyle = '#584a2f'
        ctx.lineWidth = 1
        ctx.strokeRect(px(x) + 0.5, px(y) + 0.5, TILE - 1, TILE - 1)
      }
    }
  }

  // entrance and base
  const start = map.waypoints[0]
  const end = map.waypoints[map.waypoints.length - 1]
  ctx.font = `bold ${TILE * 0.36}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ff6b6b'
  ctx.fillText('IN', px(start.x + 0.5), px(start.y + 0.5))
  ctx.fillStyle = '#7bd66b'
  ctx.fillText('BASE', px(end.x + 0.5), px(end.y + 0.5))

  // range circle of the selected tower or of the one being placed
  const selected = state.towers.find((t) => t.id === overlay.selectedId)
  const rangeOf = selected
    ? { cell: selected.cell, range: towerStats(selected.kind, selected.level).range, color: TOWER_COLOR[selected.kind] }
    : overlay.build && overlay.cursor
      ? { cell: overlay.cursor, range: towerStats(overlay.build, 1).range, color: TOWER_COLOR[overlay.build] }
      : null
  if (rangeOf) {
    circle(ctx, rangeOf.cell.x + 0.5, rangeOf.cell.y + 0.5, rangeOf.range)
    ctx.fillStyle = `${rangeOf.color}22`
    ctx.fill()
    ctx.strokeStyle = `${rangeOf.color}99`
    ctx.lineWidth = 2
    ctx.stroke()
  }

  for (const t of state.towers) drawTower(ctx, t.kind, t.cell, t.level)

  if (selected) {
    ctx.strokeStyle = '#ffd24a'
    ctx.lineWidth = 3
    ctx.strokeRect(px(selected.cell.x) + 2, px(selected.cell.y) + 2, TILE - 4, TILE - 4)
  }

  // enemies, furthest along drawn last so they sit on top
  const enemies = [...state.enemies].sort((a, b) => a.progress - b.progress)
  for (const e of enemies) {
    const pos = positionAt(path, e.progress)
    const style = ENEMY_STYLE[e.kind]
    circle(ctx, pos.x, pos.y, style.radius)
    ctx.fillStyle = style.color
    ctx.fill()
    ctx.strokeStyle = e.slowTicks > 0 ? '#6ec1ff' : '#00000066'
    ctx.lineWidth = e.slowTicks > 0 ? 3 : 1.5
    ctx.stroke()

    const w = Math.max(0.5, style.radius * 2)
    const bx = px(pos.x - w / 2)
    const by = px(pos.y - style.radius - 0.16)
    ctx.fillStyle = '#000000aa'
    ctx.fillRect(bx, by, px(w), 4)
    ctx.fillStyle = e.hp / e.maxHp > 0.4 ? '#5fd35f' : '#ff6b6b'
    ctx.fillRect(bx, by, px(w) * Math.max(0, e.hp / e.maxHp), 4)
  }

  // shots, blasts and frost pulses
  for (const fx of state.effects) {
    const t = fx.ttl / fx.maxTtl
    ctx.globalAlpha = Math.min(1, t * 1.4)
    if (fx.kind === 'beam') {
      ctx.strokeStyle = TOWER_COLOR.arrow
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(px(fx.from.x), px(fx.from.y))
      ctx.lineTo(px(fx.to.x), px(fx.to.y))
      ctx.stroke()
    } else if (fx.kind === 'blast') {
      circle(ctx, fx.to.x, fx.to.y, fx.radius * (1.2 - t * 0.6))
      ctx.fillStyle = '#ff9f4388'
      ctx.fill()
      ctx.strokeStyle = '#ffd24a'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      circle(ctx, fx.from.x, fx.from.y, fx.radius * (1 - t * 0.5))
      ctx.strokeStyle = '#8fd3ff'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // cursor: green if the tower can be built here, red if not
  if (overlay.cursor && overlay.build && !selected) {
    ctx.strokeStyle = overlay.canPlace ? '#5fd35f' : '#ff6b6b'
    ctx.lineWidth = 3
    ctx.strokeRect(px(overlay.cursor.x) + 2, px(overlay.cursor.y) + 2, TILE - 4, TILE - 4)
  } else if (overlay.cursor) {
    ctx.strokeStyle = '#ffffff55'
    ctx.lineWidth = 2
    ctx.strokeRect(px(overlay.cursor.x) + 1, px(overlay.cursor.y) + 1, TILE - 2, TILE - 2)
  }
}
