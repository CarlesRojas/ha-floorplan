import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, type MeshBasicMaterial } from 'three'

// The tints a picture cuts between, whites from cool to warm and a few
// scenes with a color of their own.
const BEAM_WHITES = ['#c9d6f2', '#eef3ff', '#fff4e6', '#ffffff', '#9fc0ff', '#ffc98a', '#b8f0c8', '#e6b8ff']

// The picture playing in a beam: its brightness and tint cut from scene to
// scene and it shimmers a little in between. `base` is the beam's full
// opacity, which the scene now on screen scales. Returns the ref for the
// beam's material.
export function useBeamScene(base: number) {
  const material = useRef<MeshBasicMaterial>(null)
  const scene = useRef({ level: 1, target: 1, color: new Color('#eef3ff'), next: 0 })
  useFrame(({ clock }, delta) => {
    const mat = material.current
    if (!mat) return
    const now = clock.elapsedTime
    const at = scene.current
    if (now >= at.next) {
      at.target = 0.55 + Math.random() * 0.45
      at.color.set(BEAM_WHITES[Math.floor(Math.random() * BEAM_WHITES.length)])
      at.next = now + 0.25 + Math.random() * 0.9
    }
    // A cut lands fast, and the picture shimmers a little while it plays.
    at.level += (at.target - at.level) * Math.min(1, delta * 14)
    const shimmer = 1 + Math.sin(now * 23) * 0.03 + Math.sin(now * 37.3) * 0.02
    mat.opacity = base * at.level * shimmer
    mat.color.lerp(at.color, Math.min(1, delta * 14))
  })
  return material
}
