import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import type { Object3D } from 'three'

// A picture on its way out of a projector that is on: where it leaves
// from and which way, as the object's place and its z axis, how far it
// reaches, and how bright it is from 0 to 1. A projection screen looks
// through these for one aimed at it.
export type Throw = { object: Object3D | null; length: number; strength: number }

export const throws = new Set<Throw>()
const listeners = new Set<() => void>()
const tell = () => listeners.forEach(listener => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const any = () => throws.size > 0

// Puts a projector's picture in `throws` while it is on, leaving from
// `from` along its z axis.
export function useThrow(from: RefObject<Object3D | null>, length: number, strength: number) {
  const ref = useRef<Throw>({ object: null, length: 0, strength: 0 })
  useLayoutEffect(() => {
    const at = ref.current
    at.object = from.current
    at.length = length
    at.strength = strength
  })
  const on = strength > 0.01
  useEffect(() => {
    if (!on) return
    const at = ref.current
    throws.add(at)
    tell()
    return () => {
      throws.delete(at)
      tell()
    }
  }, [on])
}

// Whether any projector is throwing its picture.
export function useThrown() {
  return useSyncExternalStore(subscribe, any)
}
