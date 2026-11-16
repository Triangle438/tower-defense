import { useEffect, useMemo } from 'react'
import { BuildPanel } from './components/BuildPanel'
import { Controls } from './components/Controls'
import { GameCanvas } from './components/GameCanvas'
import { Hud } from './components/Hud'
import { MessageLog } from './components/MessageLog'
import { TowerInfo } from './components/TowerInfo'
import { computeScore } from './game/engine'
import type { Overlay } from './game/render'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTowerDefense } from './hooks/useTowerDefense'

export default function App() {
  const game = useTowerDefense()
  const { state } = game
  const [best, setBest] = useLocalStorage<number>('tower-defense-best', 0)
  const score = computeScore(state)

  // Save the best score when a run ends.
  useEffect(() => {
    if (state.phase === 'lost' && score > best) setBest(score)
  }, [state.phase, score, best, setBest])

  const overlay = useMemo<Overlay>(
    () => ({ cursor: game.cursor, build: game.build, selectedId: game.selected?.id ?? null, canPlace: game.canPlace }),
    [game.cursor, game.build, game.selected, game.canPlace],
  )

  return (
    <div className="layout">
      <header className="header">
        <h1>🏰 Tower Defense</h1>
        <p className="muted">Build towers along the path and stop every wave before it reaches your base.</p>
      </header>

      <main className="game">
        <div className="stage">
          <GameCanvas
            state={state}
            overlay={overlay}
            onCell={game.activateCell}
            onHover={game.setCursor}
            onCancel={game.cancel}
          />
          {state.phase === 'lost' && (
            <div className="overlay" role="alertdialog" aria-labelledby="lost-title">
              <h2 id="lost-title">Your base fell on wave {state.wave}</h2>
              <p>
                Score {score}
                {score >= best && score > 0 ? ' · new best!' : ''}
              </p>
              <button className="btn" onClick={game.restart} autoFocus>
                Play again
              </button>
            </div>
          )}
          {game.paused && state.phase !== 'lost' && <div className="overlay overlay--light">Paused</div>}
          <p className="notice" role="status">
            {game.notice}
          </p>
        </div>

        <aside className="side">
          <Hud state={state} best={Math.max(best, state.phase === 'lost' ? score : 0)} />
          <Controls
            state={state}
            speed={game.speed}
            paused={game.paused}
            onStartWave={game.startWave}
            onSpeed={game.setSpeed}
            onPause={() => game.setPaused((p) => !p)}
            onRestart={game.restart}
          />
          <BuildPanel gold={state.gold} build={game.build} onChoose={game.chooseBuild} />
          <TowerInfo tower={game.selected} gold={state.gold} onUpgrade={game.upgrade} onSell={game.sell} />
          <MessageLog messages={state.log} />
          <p className="help muted">
            Keys: <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd> pick a tower, arrow keys move the cursor, <kbd>Enter</kbd> builds or selects, <kbd>Space</kbd> starts the wave, <kbd>P</kbd> pauses, <kbd>Esc</kbd>{' '}
            or right-click cancels.
          </p>
        </aside>
      </main>
    </div>
  )
}
