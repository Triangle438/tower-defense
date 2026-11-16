import { TOWERS } from '../game/config'
import { sellValue, towerStats, upgradeCost } from '../game/engine'
import type { Tower } from '../game/types'

interface Props {
  tower: Tower | null
  gold: number
  onUpgrade: () => void
  onSell: () => void
}

export function TowerInfo({ tower, gold, onUpgrade, onSell }: Props) {
  if (!tower) {
    return (
      <section className="panel" aria-label="Selected tower">
        <p className="muted">Click a tower to upgrade or sell it.</p>
      </section>
    )
  }

  const stats = towerStats(tower.kind, tower.level)
  const cost = upgradeCost(tower.kind, tower.level)
  const dps = stats.damage * stats.rate

  return (
    <section className="panel" aria-label="Selected tower">
      <h2>
        {TOWERS[tower.kind].name} <span className="level">level {tower.level}</span>
      </h2>
      <ul className="tower-stats">
        <li>Damage {stats.damage}{stats.splash ? ` (area ${stats.splash})` : ''}</li>
        <li>Range {stats.range}</li>
        <li>~{dps.toFixed(1)} damage/s</li>
      </ul>
      <div className="row">
        <button className="btn" onClick={onUpgrade} disabled={cost === null || gold < cost}>
          {cost === null ? 'Max level' : `Upgrade ${cost}g`} <kbd>U</kbd>
        </button>
        <button className="btn btn--ghost" onClick={onSell}>
          Sell {sellValue(tower)}g <kbd>X</kbd>
        </button>
      </div>
    </section>
  )
}
