import { computeScore } from '../game/engine'
import type { GameState } from '../game/types'

export function Hud({ state, best }: { state: GameState; best: number }) {
  return (
    <section className="panel" aria-label="Game status">
      <dl className="stats">
        <div className="stat stat--lives">
          <dt>Lives</dt>
          <dd>{state.lives}</dd>
        </div>
        <div className="stat stat--gold">
          <dt>Gold</dt>
          <dd>{state.gold}</dd>
        </div>
        <div className="stat">
          <dt>Wave</dt>
          <dd>{state.wave}</dd>
        </div>
        <div className="stat">
          <dt>Kills</dt>
          <dd>{state.kills}</dd>
        </div>
        <div className="stat">
          <dt>Score</dt>
          <dd>{computeScore(state)}</dd>
        </div>
        <div className="stat">
          <dt>Best</dt>
          <dd>{best}</dd>
        </div>
      </dl>
    </section>
  )
}
