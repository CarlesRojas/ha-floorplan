import { useEffect, useRef, useState } from 'react'

// How fast a litter box turns while it cleans, in turns a second.
export const LITTER_TURN = 0.12

// How long each piece runs for one press of a button behind it, in seconds:
// what it does while on, once. A litter box goes one turn over and back, a
// feeder drops one portion, a doorbell lights the ring round its button, a
// door stays open while it buzzes, a coffee machine makes one cup.
const PRESS_SECONDS: Record<string, number> = {
  litter_box: 1 / LITTER_TURN,
  pet_feeder: 3,
  doorbell: 4,
  door: 5,
  coffee_machine: 20,
}

// Whether the piece is running a press right now. The count it is first
// drawn with has already played, so nothing starts on load. A press that
// lands while one is running is part of it, which also folds a click and
// Home Assistant's word on the same press into one run.
export function usePressed(kind: string, presses: number | undefined) {
  const [running, setRunning] = useState(false)
  const seen = useRef(presses)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (presses === seen.current) return
    seen.current = presses
    const seconds = PRESS_SECONDS[kind]
    if (presses === undefined || !seconds || timer.current !== undefined) return
    setRunning(true)
    timer.current = setTimeout(() => {
      timer.current = undefined
      setRunning(false)
    }, seconds * 1000)
  }, [kind, presses])
  useEffect(() => () => clearTimeout(timer.current), [])
  return running
}
