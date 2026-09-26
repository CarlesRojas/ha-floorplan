import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { PICK_RADIUS_PX, PICK_ROOM_AT } from '#/theme.ts'
import { Vector2, type Object3D } from 'three'

// What a click on an object does. Models carry it in their userData so a
// pick that lands near them, rather than on them, can still act.
export type Pick = { click: () => void; open: () => void }

// A ray hits exactly one point, and the things in the plan are small seen
// from across a room. When a press lands on nothing, the same press is tried
// again in rings around it, growing outward to PICK_RADIUS_PX, and the first
// thing found takes it. This is the radius a ray cannot have, done with
// several rays.
const RINGS = [0.25, 0.45, 0.65, 0.85, 1]
// Enough directions that a small thing is not slipped between two rays.
const SAMPLES = 16
// A press that moves more than this is the camera being dragged.
const SLOP_PX = 8
const LONG_PRESS_MS = 500
// The point in the ring search, counted in rays, at which the floor under
// the press gets its turn. Rounded so 0 and 1 mean exactly first and last.
const ROOM_AT = Math.round(Math.min(1, Math.max(0, PICK_ROOM_AT)) * RINGS.length * SAMPLES)
const ROOM_NAME = 'room:'

// What a press found: a piece, hit outright or nearby, or the floor of a room.
type Found = { kind: 'pick'; pick: Pick; direct: boolean } | { kind: 'room'; id: string }

function pickOf(object: Object3D | null): Pick | null {
  for (let node = object; node; node = node.parent) {
    const pick = node.userData?.pick as Pick | undefined
    if (pick) return pick
  }
  return null
}

type Props = {
  onHandled?: () => void
  // A click that reached the floor of a room, once the pieces around the
  // press have had their turn. Without this the floor takes no clicks.
  onRoom?: (id: string) => void
}

export default function PickFallback({ onHandled, onRoom }: Props = {}) {
  const gl = useThree(state => state.gl)
  const camera = useThree(state => state.camera)
  const scene = useThree(state => state.scene)
  const raycaster = useThree(state => state.raycaster)
  // Passed fresh on every render, so the listeners read the latest one
  // rather than being attached again, which would lose a press under way.
  const latestRoom = useRef(onRoom)
  useLayoutEffect(() => {
    latestRoom.current = onRoom
  })

  useEffect(() => {
    const el = gl.domElement

    const ray = (x: number, y: number) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return false
      const ndc = new Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
      if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return false
      raycaster.setFromCamera(ndc, camera)
      return true
    }

    const at = (x: number, y: number): Pick | null => {
      if (!ray(x, y)) return null
      // Nearest first, so something behind the floor is not picked over it.
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        const pick = pickOf(hit.object)
        if (pick) return pick
      }
      return null
    }

    // The room whose floor is the first thing under the press, if any.
    const roomAt = (x: number, y: number): string | null => {
      if (!ray(x, y)) return null
      const hit = raycaster.intersectObjects(scene.children, true)[0]
      if (!hit || !hit.object.name.startsWith(ROOM_NAME)) return null
      return hit.object.name.slice(ROOM_NAME.length)
    }

    // The press itself first, then wider and wider rings around it. The
    // floor under the press gets its turn part way through, where
    // PICK_ROOM_AT says, so pieces near the press come before the room they
    // stand in. A long press or a right click has nothing to do with the
    // floor, so those skip it.
    const near = (x: number, y: number, withRoom: boolean): Found | null => {
      const direct = at(x, y)
      if (direct) return { kind: 'pick', pick: direct, direct: true }
      const room = withRoom && latestRoom.current ? roomAt(x, y) : null
      let tried = 0
      for (const step of RINGS) {
        const radius = step * PICK_RADIUS_PX
        for (let i = 0; i < SAMPLES; i++) {
          if (room && tried === ROOM_AT) return { kind: 'room', id: room }
          const angle = ((i + 0.5) / SAMPLES) * Math.PI * 2
          const pick = at(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
          if (pick) return { kind: 'pick', pick, direct: false }
          tried++
        }
      }
      return room ? { kind: 'room', id: room } : null
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
        const found = near(e.clientX, e.clientY, false)
        // A direct hit is the object's own business, it has handlers of its
        // own. This only speaks for presses that landed on nothing.
        if (found?.kind === 'pick' && !found.direct) {
          opened = true
          onHandled?.()
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
      const found = near(e.clientX, e.clientY, true)
      if (found?.kind === 'room') {
        onHandled?.()
        latestRoom.current?.(found.id)
      } else if (found && !found.direct) {
        onHandled?.()
        found.pick.click()
      }
    }

    const onContext = (e: MouseEvent) => {
      const found = near(e.clientX, e.clientY, false)
      if (found?.kind === 'pick' && !found.direct) {
        e.preventDefault()
        onHandled?.()
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
  }, [gl, camera, scene, raycaster, onHandled])

  return null
}
