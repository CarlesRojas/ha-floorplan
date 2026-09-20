import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector2, type Object3D } from 'three'

// What a click on an object does. Models carry it in their userData so a
// pick that lands near them, rather than on them, can still act.
export type Pick = { click: () => void; open: () => void }

// A ray hits exactly one point, and the things in the plan are small seen
// from across a room. When a press lands on nothing, the same press is tried
// again in rings around it, growing outward, and the first thing found takes
// it. This is the radius a ray cannot have, done with several rays.
const RINGS_PX = [10, 20, 32, 46, 62, 80]
// Enough directions that a small thing is not slipped between two rays:
// at the widest ring these are about 30 px apart.
const SAMPLES = 16
// A press that moves more than this is the camera being dragged.
const SLOP_PX = 8
const LONG_PRESS_MS = 500

function pickOf(object: Object3D | null): Pick | null {
  for (let node = object; node; node = node.parent) {
    const pick = node.userData?.pick as Pick | undefined
    if (pick) return pick
  }
  return null
}

export default function PickFallback() {
  const gl = useThree(state => state.gl)
  const camera = useThree(state => state.camera)
  const scene = useThree(state => state.scene)
  const raycaster = useThree(state => state.raycaster)

  useEffect(() => {
    const el = gl.domElement

    const at = (x: number, y: number): Pick | null => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      const ndc = new Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
      if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return null
      raycaster.setFromCamera(ndc, camera)
      // Nearest first, so something behind the floor is not picked over it.
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        const pick = pickOf(hit.object)
        if (pick) return pick
      }
      return null
    }

    // The press itself first, then wider and wider rings around it.
    const near = (x: number, y: number): { pick: Pick; direct: boolean } | null => {
      const direct = at(x, y)
      if (direct) return { pick: direct, direct: true }
      for (const radius of RINGS_PX) {
        for (let i = 0; i < SAMPLES; i++) {
          const angle = ((i + 0.5) / SAMPLES) * Math.PI * 2
          const pick = at(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
          if (pick) return { pick, direct: false }
        }
      }
      return null
    }

    let from: { x: number; y: number; at: number } | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let opened = false
    const stop = () => {
      if (timer !== null) clearTimeout(timer)
      timer = null
    }

    const onDown = (e: PointerEvent) => {
      from = { x: e.clientX, y: e.clientY, at: performance.now() }
      opened = false
      stop()
      timer = setTimeout(() => {
        const found = near(e.clientX, e.clientY)
        // A direct hit is the object's own business, it has handlers of its
        // own. This only speaks for presses that landed on nothing.
        if (found && !found.direct) {
          opened = true
          found.pick.open()
        }
      }, LONG_PRESS_MS)
    }

    const onMove = (e: PointerEvent) => {
      if (!from) return
      if (Math.hypot(e.clientX - from.x, e.clientY - from.y) > SLOP_PX) {
        stop()
        from = null
      }
    }

    const onUp = (e: PointerEvent) => {
      stop()
      const start = from
      from = null
      if (!start || opened) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP_PX) return
      if (performance.now() - start.at > LONG_PRESS_MS) return
      const found = near(e.clientX, e.clientY)
      if (found && !found.direct) found.pick.click()
    }

    const onContext = (e: MouseEvent) => {
      const found = near(e.clientX, e.clientY)
      if (found && !found.direct) {
        e.preventDefault()
        found.pick.open()
      }
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('contextmenu', onContext)
    return () => {
      stop()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('contextmenu', onContext)
    }
  }, [gl, camera, scene, raycaster])

  return null
}
