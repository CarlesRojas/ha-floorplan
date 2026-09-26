import { CAMERA_FLIGHT_S } from '#/constants.ts'
import { frameRooms, sceneHeight } from '#/scene/framing.ts'
import type { CameraView, DecorationConfig, RoomConfig } from '#/types.ts'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type RefObject } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'

// What the outside can ask of the camera: where it is now, as a view that
// can be saved, to travel to a saved view, and to go back to the view it
// opened with.
export type CameraHandle = {
  view: () => CameraView
  flyTo: (view: CameraView) => void
  reset: () => void
}

type Props = {
  rooms: RoomConfig[]
  decorations: DecorationConfig[]
  // The view to open with. Without one the camera frames the plan.
  view?: CameraView
  handle?: RefObject<CameraHandle | null>
  // Told when the camera leaves the view it opened with, and when it is
  // back there.
  onAway?: (away: boolean) => void
}

// Scratch for the flight, so no frame allocates.
const A = new Vector3()
const B = new Vector3()
const C = new Vector3()
const D = new Vector3()

const round = (v: number) => Math.round(v * 100) / 100
const triple = (v: Vector3): [number, number, number] => [round(v.x), round(v.y), round(v.z)]

// Puts the camera at its view on mount and whenever the plan or the viewport
// change. No animation. Once the viewer has orbited, panned or zoomed, the
// camera is theirs and is never moved again, so editing the plan does not
// throw the view away. A flight to a saved view is the one exception, and
// the camera is the viewer's again the moment it lands.
export default function CameraRig({ rooms, decorations, view, handle, onAway }: Props) {
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const controls = useThree(state => state.controls) as OrbitControlsImpl | null
  const moved = useRef(false)
  // The flight under way, from where the camera was to where it is going,
  // and how far along it is, 0 to 1. A flight home lands the camera back
  // on the view it opened with.
  const flight = useRef<{ from: CameraView; to: CameraView; t: number; home: boolean } | null>(null)
  // Whether the camera has left the view it opened with. Only a change is
  // reported, and to whatever was passed last.
  const away = useRef(false)
  const latestAway = useRef(onAway)
  useLayoutEffect(() => {
    latestAway.current = onAway
  })
  const setAway = (value: boolean) => {
    if (away.current === value) return
    away.current = value
    latestAway.current?.(value)
  }

  const place = useCallback(
    (position: Vector3, target: Vector3) => {
      camera.position.copy(position)
      camera.lookAt(target)
      camera.updateProjectionMatrix()
      if (controls) {
        controls.target.copy(target)
        controls.update()
      }
    },
    [camera, controls],
  )

  // The target is what the controls orbit around. Without controls the
  // camera looks a fixed way, and a point ahead of it stands in.
  const current = (): CameraView => {
    const target = controls ? controls.target : camera.getWorldDirection(new Vector3()).add(camera.position)
    return { position: triple(camera.position), target: triple(target) }
  }

  // The view the camera opened with: the saved one, or the plan framed.
  const home = (): CameraView => {
    if (view) return view
    const { position, target } = frameRooms(rooms, size.width / size.height, sceneHeight(decorations))
    return { position: triple(position), target: triple(target) }
  }

  useImperativeHandle(handle, () => ({
    view: current,
    flyTo: to => {
      moved.current = true
      setAway(true)
      // Any input during a flight, an orbit or a wheel, takes it over.
      flight.current = { from: current(), to, t: 0, home: false }
    },
    reset: () => {
      flight.current = { from: current(), to: home(), t: 0, home: true }
    },
  }))

  useFrame((_, delta) => {
    const f = flight.current
    if (!f) return
    f.t = Math.min(1, f.t + delta / CAMERA_FLIGHT_S)
    // Eases out of the start and into the landing.
    const k = f.t * f.t * (3 - 2 * f.t)
    const position = A.set(...f.from.position).lerp(B.set(...f.to.position), k)
    const target = C.set(...f.from.target).lerp(D.set(...f.to.target), k)
    place(position, target)
    if (f.t < 1) return
    flight.current = null
    // Landed home, the camera frames the plan again as if never touched.
    if (f.home) {
      moved.current = false
      setAway(false)
    }
  })

  // OrbitControls only fires start on real input, never on our own update.
  useEffect(() => {
    if (!controls) return
    const onStart = () => {
      moved.current = true
      flight.current = null
      setAway(true)
    }
    controls.addEventListener('start', onStart)
    return () => controls.removeEventListener('start', onStart)
  }, [controls])

  // A right or middle drag let go outside the window never hears its button
  // come up in some browsers, and the pan or zoom it started would carry on
  // with no button held. So such a drag ends the moment the pointer leaves
  // the window, or the window loses focus, or a move comes in with no
  // button down, each as the release would have. A left drag is left
  // alone, so a turn can run out past the edge and come back.
  useEffect(() => {
    if (!controls) return
    const element = controls.domElement as HTMLElement | null
    if (!element) return
    const page = element.ownerDocument
    const view = page.defaultView
    // The mouse buttons the controls were told went down and have not yet
    // been told came up. The controls keep their own list, but out of reach,
    // so this one is kept alongside from the same events.
    const held = new Map<number, { x: number; y: number }>()
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') held.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const onUp = (event: PointerEvent) => held.delete(event.pointerId)
    // Tells the controls the button came up, the way the browser would have.
    // They listen for it on the document once a button is down.
    const release = (pointerId: number, at: { x: number; y: number }) => {
      held.delete(pointerId)
      page.dispatchEvent(
        new PointerEvent('pointerup', { pointerId, pointerType: 'mouse', clientX: at.x, clientY: at.y, bubbles: true }),
      )
    }
    const outside = (event: PointerEvent) =>
      !!view &&
      (event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= view.innerWidth ||
        event.clientY >= view.innerHeight)
    const at = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY })
    const onMove = (event: PointerEvent) => {
      if (!held.has(event.pointerId)) return
      // The left button is bit one; anything else held is a pan or zoom.
      if (event.buttons === 0 || ((event.buttons & ~1) !== 0 && outside(event))) release(event.pointerId, at(event))
      else held.set(event.pointerId, at(event))
    }
    const onLeave = (event: PointerEvent) => {
      if (held.has(event.pointerId) && (event.buttons & ~1) !== 0) release(event.pointerId, at(event))
    }
    const onBlur = () => {
      for (const [id, last] of [...held]) release(id, last)
    }
    // The controls follow a drag on the whole document, and once the pointer
    // comes back it may be over anything, so the checks listen there too and
    // run ahead of them.
    element.addEventListener('pointerdown', onDown, { capture: true })
    page.addEventListener('pointerup', onUp, { capture: true })
    page.addEventListener('pointermove', onMove, { capture: true })
    page.addEventListener('pointerleave', onLeave, { capture: true })
    page.addEventListener('pointercancel', onLeave, { capture: true })
    view?.addEventListener('blur', onBlur)
    return () => {
      element.removeEventListener('pointerdown', onDown, { capture: true })
      page.removeEventListener('pointerup', onUp, { capture: true })
      page.removeEventListener('pointermove', onMove, { capture: true })
      page.removeEventListener('pointerleave', onLeave, { capture: true })
      page.removeEventListener('pointercancel', onLeave, { capture: true })
      view?.removeEventListener('blur', onBlur)
    }
  }, [controls])

  useLayoutEffect(() => {
    if (moved.current) return
    // A canvas that has not been laid out yet has no shape to frame for.
    if (size.width <= 0 || size.height <= 0) return
    if (view) {
      place(new Vector3(...view.position), new Vector3(...view.target))
      return
    }
    const { position, target } = frameRooms(rooms, size.width / size.height, sceneHeight(decorations))
    place(position, target)
  }, [rooms, decorations, view, size.width, size.height, place])

  return null
}
