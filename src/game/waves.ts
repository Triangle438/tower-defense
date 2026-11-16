import type { EnemyKind } from './types'

/** The enemies of a wave in spawn order. No randomness: wave N is always the same. */
export function waveQueue(wave: number): EnemyKind[] {
  const queue: EnemyKind[] = []
  const add = (kind: EnemyKind, count: number) => {
    for (let i = 0; i < count; i++) queue.push(kind)
  }

  add('grunt', 6 + 2 * wave)
  if (wave >= 3) add('runner', wave - 1)
  if (wave >= 5) add('tank', Math.floor((wave - 2) / 3))
  if (wave % 10 === 0) add('boss', wave / 10)
  return queue
}

/** Enemy health grows 12% every wave, compounding, so the game always ends up too hard. */
export const hpMultiplier = (wave: number) => 1.12 ** (wave - 1)

export const waveBonus = (wave: number) => 25 + 3 * wave
