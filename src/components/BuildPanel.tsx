import { TOWERS, TOWER_ORDER } from '../game/config'
import type { TowerKind } from '../game/types'

interface Props {
  gold: number
  build: TowerKind | null
  onChoose: (kind: TowerKind) => void
}

export function BuildPanel({ gold, build, onChoose }: Props) {
  const active = build ? TOWERS[build] : null

  return (
    <section className="panel" aria-label="Build towers">
      <h2>Build</h2>
      <div className="build">
        {TOWER_ORDER.map((kind) => {
          const def = TOWERS[kind]
          const afford = gold >= def.cost
          return (
            <button
              key={kind}
              className={`tower-btn tower-btn--${kind}`}
              aria-pressed={build === kind}
              disabled={!afford && build !== kind}
              onClick={() => onChoose(kind)}
            >
              <span className="tower-btn__name">{def.name}</span>
              <span className="tower-btn__cost">{def.cost}g</span>
              <kbd>{def.hotkey}</kbd>
            </button>
          )
        })}
      </div>
      <p className="muted">{active ? active.description : 'Pick a tower, then click a free tile next to the path.'}</p>
    </section>
  )
}
