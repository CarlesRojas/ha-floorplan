import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

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

// A cover reports its position several times on the way: 20, 40, 60. Aiming
// at the last one means arriving at it and waiting for the next, which is
// the stepping this avoids. While the reports keep coming in one direction
// the value heads for the end of the travel instead, at the pace those
// reports imply, and it is never allowed to run far ahead of the last one.

// How far ahead of the last reported position the visual may run.
const LEAD = 0.25
// A cover is taken as still moving for this much longer than the gap between
// its last two reports.
const LINGER = 1.6

export function useTravel(target: number, moving = 0, fallback = 0.9) {
  const [shown, setShown] = useState(target)
  const value = useRef(target)
  const report = useRef({ target, at: 0, dir: 0, speed: fallback, until: 0 })

  useEffect(() => {
    const now = performance.now() / 1000
    const last = report.current
    const gap = target - last.target
    if (gap === 0) return
    const since = last.at ? now - last.at : 0
    // A step is one of the positions a cover reports on the way, and how far
    // it moved between one report and the next is how fast it travels. A
    // jump is a cover with no position at all, which only says open or shut.
    const stepped = Math.abs(gap) <= 0.5
    const measured = stepped && since > 0.05 && since < 5 ? Math.abs(gap) / since : 0
    // Before a second report there is nothing to measure, so the first step
    // is paced as if the next one were about a second away. Guessing too
    // fast is what made the first leg arrive early and then wait.
    const speed = Math.min(Math.max(measured || (stepped ? Math.abs(gap) / 0.9 : fallback), 0.05), 2)
    report.current = {
      target,
      at: now,
      dir: Math.sign(gap),
      speed,
      until: now + Math.max(since * LINGER, 1.2),
    }
  }, [target, fallback])

  useFrame((_, delta) => {
    const now = performance.now() / 1000
    const last = report.current
    const dir = moving !== 0 ? Math.sign(moving) : now < last.until ? last.dir : 0
    // While it travels, the visual carries the last report forward at the
    // pace those reports imply, so it is already where the next one lands
    // and never arrives early and waits. It is never carried further than
    // one report ahead, so a cover that stops does not run on.
    const lead = dir === 0 ? 0 : Math.min(last.speed * (now - last.at), LEAD)
    const aim = Math.min(Math.max(target + dir * lead, 0), 1)
    if (value.current === aim) return
    // Twice the travelling speed, so it tracks that moving aim closely
    // rather than trailing it.
    const speed = dir === 0 ? fallback : Math.max(last.speed * 2, 0.2)
    const step = speed * Math.min(delta, 0.1)
    const rest = aim - value.current
    value.current = Math.abs(rest) <= step ? aim : value.current + Math.sign(rest) * step
    setShown(value.current)
  })

  return shown
}
