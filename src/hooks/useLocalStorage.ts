import { useEffect, useState } from 'react'

// State that mirrors localStorage. Falls back to the initial value when storage
// is empty, blocked or holds invalid JSON.
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable: the app keeps working in memory
    }
  }, [key, value])

  return [value, setValue] as const
}
