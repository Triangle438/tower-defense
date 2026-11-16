import { ENEMIES } from '../game/config'
import { waveQueue } from '../game/waves'
import type { Speed } from '../hooks/useTowerDefense'
import type { GameState } from '../game/types'

interface Props {
  state: GameState
  speed: Speed
  paused: boolean
  onStartWave: () => void
  onSpeed: (speed: Speed) => void
  onPause: () => void
  onRestart: () => void
}

function describeWave(wave: number) {
  const counts = new Map<string, number>()
  for (const kind of waveQueue(wave)) counts.set(kind, (counts.get(kind) ?? 0) + 1)
  return [...counts].map(([kind, n]) => `${n} ${ENEMIES[kind as keyof typeof ENEMIES].name.toLowerCase()}${n > 1 ? 's' : ''}`).join(', ')
}

export function Controls({ state, speed, paused, onStartWave, onSpeed, onPause, onRestart }: Props) {
  const building = state.phase === 'build'

  return (
    <section className="panel" aria-label="Wave controls">
      <button className="btn btn--wide" onClick={onStartWave} disabled={!building}>
        {building ? `Start wave ${state.wave + 1}` : `Wave ${state.wave} in progress`} {building && <kbd>Space</kbd>}
      </button>
      {building && <p className="muted">Next: {describeWave(state.wave + 1)}</p>}

      <div className="row" role="group" aria-label="Game speed">
        {([1, 2, 4] as const).map((s) => (
          <button key={s} className="btn btn--ghost btn--small" aria-pressed={speed === s} onClick={() => onSpeed(s)}>
            {s}x
          </button>
        ))}
        <button className="btn btn--ghost btn--small" aria-pressed={paused} onClick={onPause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="btn btn--ghost btn--small" onClick={onRestart}>
          Restart
        </button>
      </div>
    </section>
  )
}
