import { CAMERA_FLIGHT_S } from '#/constants.ts'
import { frameRooms, sceneHeight } from '#/scene/framing.ts'
import { multiTouchSince } from '#/scene/touches.ts'
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
  // Whether the wheel zooms. In the card it scrolls the page instead.
  wheelZoom?: boolean
  // The view to open with. Without one the camera frames the plan.
  view?: CameraView
  handle?: RefObject<CameraHandle | null>
  // Told when the camera leaves the view it opened with, and when it is
  // back there.
  onAway?: (away: boolean) => void
}

// How far the pointer has to come, in pixels, before a press is a drag.
const DRAG_SLOP_PX = 6
// How far two fingers have to spread or slide before they are read as a
// pinch or a drag.
const PAIR_SLOP_PX = 12
// How fast a finger turns the camera, against a mouse at 1.
const TOUCH_ROTATE_SPEED = 0.5
// How far the mouse drags with the wheel pressed to halve or double the
// camera's distance. The controls would step the zoom by a fixed part on
// every move event, whatever the distance dragged, which is quick or wild
// depending on the mouse, so the drag is measured here instead.
const MOUSE_ZOOM_HALVE_PX = 400

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
export default function CameraRig({ rooms, decorations, view, handle, onAway, wheelZoom = false }: Props) {
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const controls = useThree(state => state.controls) as OrbitControlsImpl | null
  // Where the scene hears its pointer events: the element around the
  // canvas that three fiber listens on.
  const canvas = useThree(state => (state.events.connected as HTMLElement | undefined) ?? state.gl.domElement)
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

  // A click is not a drag. The controls take any press as the start of a
  // turn, so a click on a lamp nudged the camera a hair, and that counted
  // as leaving the opening view. The controls listen on an element around
  // the one the scene hears on, so a press reaches them only by bubbling,
  // and here it is stopped before it does, once the scene has had it. It is
  // held until the pointer has come a few pixels from where it went down,
  // and handed to the controls from there, as a press at that spot, so the
  // turn starts under the pointer with no jump. A press let go before that
  // never reaches them.
  //
  // Two fingers are held together until they have shown what they are
  // doing. Fingers moving apart or together are a pinch, and only zoom.
  // Fingers moving the same way are a drag, and only pan. The controls would
  // do both at once from any two fingers, and a pan always carried a bit of
  // zoom with it. If the first finger was already turning the camera, it is
  // taken back from the controls first, so the pair starts clean. The two
  // are then handed over as presses where they are now, so nothing jumps.
  //
  // A finger covers more of a small screen than a mouse does of a big one,
  // so a finger turns the camera at half the pace.
  useEffect(() => {
    if (!controls) return
    const element = controls.domElement as HTMLElement | null
    if (!element || element === canvas) return
    const page = element.ownerDocument
    const mouseRotateSpeed = controls.rotateSpeed
    const zoomable = controls.enableZoom
    const pannable = controls.enablePan
    // Every pointer that went down on the canvas and is still down: the
    // press as it came, where it started and where it is now.
    type Press = { event: PointerEvent; id: number; sx: number; sy: number; x: number; y: number }
    const presses = new Map<number, Press>()
    // The pointers the controls have been handed and not yet given back.
    const given = new Set<number>()
    // The middle button drags zooming here, by the pixel, and their last y.
    const zooms = new Map<number, number>()
    // Two fingers held until their gesture is read: where they started.
    let pair: { a: Press; b: Press; distance: number; cx: number; cy: number } | null = null
    // Whether the controls are held to one of zoom or pan for a gesture.
    let exclusive = false
    // When the pointers last started from none down, for the clicks after.
    let pressAt = 0

    const touches = () => [...presses.values()].filter(p => p.event.pointerType === 'touch')
    const hand = (press: Press) => {
      given.add(press.id)
      controls.rotateSpeed = press.event.pointerType === 'touch' ? TOUCH_ROTATE_SPEED : mouseRotateSpeed
      const { event } = press
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          button: event.button,
          buttons: event.buttons,
          clientX: press.x,
          clientY: press.y,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        }),
      )
    }
    // Tells the controls a pointer they were handed came up, the way the
    // browser would. They listen for it on the document once a pointer is
    // down.
    const takeBack = (press: Press) => {
      given.delete(press.id)
      page.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: press.id,
          pointerType: press.event.pointerType,
          clientX: press.x,
          clientY: press.y,
          bubbles: true,
        }),
      )
    }
    const free = () => {
      if (!exclusive) return
      exclusive = false
      controls.enableZoom = zoomable
      controls.enablePan = pannable
    }
    const forget = (id: number) => {
      zooms.delete(id)
      const press = presses.get(id)
      presses.delete(id)
      given.delete(id)
      if (press && pair && (pair.a === press || pair.b === press)) {
        // The pair broke before it was read. The finger left is a press of
        // its own from where it is now.
        const other = pair.a === press ? pair.b : pair.a
        other.sx = other.x
        other.sy = other.y
        pair = null
      }
      if (touches().length < 2) free()
    }
    const drop = () => {
      presses.clear()
      given.clear()
      pair = null
      free()
    }
    const onDown = (event: PointerEvent) => {
      if (!event.isTrusted) return
      event.stopPropagation()
      if (presses.size === 0) pressAt = performance.now()
      const press: Press = {
        event,
        id: event.pointerId,
        sx: event.clientX,
        sy: event.clientY,
        x: event.clientX,
        y: event.clientY,
      }
      const before = event.pointerType === 'touch' ? touches() : []
      presses.set(press.id, press)
      if (before.length !== 1) return
      // A second finger. Whatever the first was doing, the two are read
      // together from here.
      const first = before[0]
      if (given.has(first.id)) takeBack(first)
      pair = {
        a: first,
        b: press,
        distance: Math.hypot(press.x - first.x, press.y - first.y),
        cx: (first.x + press.x) / 2,
        cy: (first.y + press.y) / 2,
      }
    }
    const onMove = (event: PointerEvent) => {
      if (!event.isTrusted) return
      const press = presses.get(event.pointerId)
      if (!press) return
      press.x = event.clientX
      press.y = event.clientY
      if (pair) {
        if (press !== pair.a && press !== pair.b) return
        const { a, b } = pair
        const spread = Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - pair.distance)
        const slide = Math.hypot((a.x + b.x) / 2 - pair.cx, (a.y + b.y) / 2 - pair.cy)
        if (Math.max(spread, slide) < PAIR_SLOP_PX) return
        pair = null
        exclusive = true
        controls.enableZoom = spread >= slide
        controls.enablePan = spread < slide
        hand(a)
        hand(b)
        return
      }
      if (given.has(press.id)) return
      // A move with nothing held is a release that was never heard.
      if (event.pointerType !== 'touch' && event.buttons === 0) return forget(press.id)
      const last = zooms.get(press.id)
      if (last !== undefined) {
        const dy = event.clientY - last
        zooms.set(press.id, event.clientY)
        const scale = Math.pow(0.5, Math.abs(dy) / MOUSE_ZOOM_HALVE_PX)
        if (dy > 0) controls.dollyOut(scale)
        else if (dy < 0) controls.dollyIn(scale)
        return
      }
      if (Math.hypot(press.x - press.sx, press.y - press.sy) < DRAG_SLOP_PX) return
      // Dragging with the wheel pressed zooms, and the controls step that by
      // a fixed part on every move event, so it is done here by the pixel.
      if (press.event.pointerType === 'mouse' && press.event.button === 1) {
        zooms.set(press.id, event.clientY)
        // The camera is the viewer's from here, as any orbit makes it.
        controls.dispatchEvent({ type: 'start' })
        return
      }
      hand(press)
    }
    const onUp = (event: PointerEvent) => {
      if (event.isTrusted) forget(event.pointerId)
    }
    // A pinch ends with one finger lifting last, and some browsers make a
    // click of that. Nothing was clicked: not a piece, not a room's floor,
    // and not the air around the home, which would take the camera back.
    const onClick = (event: MouseEvent) => {
      if (multiTouchSince(pressAt)) event.stopPropagation()
    }
    canvas.addEventListener('pointerdown', onDown)
    element.addEventListener('click', onClick, { capture: true })
    page.addEventListener('pointermove', onMove, { capture: true })
    page.addEventListener('pointerup', onUp, { capture: true })
    page.addEventListener('pointercancel', onUp, { capture: true })
    page.defaultView?.addEventListener('blur', drop)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      element.removeEventListener('click', onClick, { capture: true })
      page.removeEventListener('pointermove', onMove, { capture: true })
      page.removeEventListener('pointerup', onUp, { capture: true })
      page.removeEventListener('pointercancel', onUp, { capture: true })
      page.defaultView?.removeEventListener('blur', drop)
      drop()
    }
  }, [controls, canvas])

  // The wheel scrolls the page, as it does everywhere else on a dashboard.
  // The controls would zoom on it, which caught anyone scrolling past the
  // card, so the event is stopped before it reaches them and left to the
  // browser. Zoom by mouse is the middle button dragged.
  useEffect(() => {
    if (!controls || wheelZoom) return
    const element = controls.domElement as HTMLElement | null
    if (!element) return
    const onWheel = (event: WheelEvent) => event.stopImmediatePropagation()
    element.addEventListener('wheel', onWheel, { capture: true, passive: true })
    return () => element.removeEventListener('wheel', onWheel, { capture: true })
  }, [controls, wheelZoom])

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
    // Only the presses that reach the controls count, so this listens where
    // they do, and not ahead of them.
    element.addEventListener('pointerdown', onDown)
    page.addEventListener('pointerup', onUp, { capture: true })
    page.addEventListener('pointermove', onMove, { capture: true })
    page.addEventListener('pointerleave', onLeave, { capture: true })
    page.addEventListener('pointercancel', onLeave, { capture: true })
    view?.addEventListener('blur', onBlur)
    return () => {
      element.removeEventListener('pointerdown', onDown)
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
