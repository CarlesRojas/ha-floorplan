import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'

// Eases a value toward its target instead of letting it jump. Home Assistant
// reports a cover's position every second or so while it travels, and a
// switch flips in one step, so without this a door opens in stutters and a
// window snaps. The approach is exponential and scaled by the frame time, so
// it looks the same whatever the frame rate, and it only asks for a new
// render while it is actually moving.
export function useEased(target: number, rate = 3) {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  useFrame((_, delta) => {
    if (from.current === target) return
    const next =
      Math.abs(target - from.current) < 0.001
        ? target
        : from.current + (target - from.current) * (1 - Math.exp(-rate * Math.min(delta, 0.1)))
    from.current = next
    setShown(next)
  })
  return shown
}
