import { frameRooms, sceneHeight } from '#/scene/framing.ts'
import type { DecorationConfig, RoomConfig } from '#/types.ts'
import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  rooms: RoomConfig[]
  decorations: DecorationConfig[]
}

// Snaps the camera to frame the rooms on mount and whenever the plan or the
// viewport change. No animation. Once the viewer has orbited, panned or
// zoomed, the camera is theirs and is never moved again, so editing the plan
// does not throw the view away.
export default function CameraRig({ rooms, decorations }: Props) {
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const controls = useThree(state => state.controls) as OrbitControlsImpl | null
  const moved = useRef(false)

  // OrbitControls only fires start on real input, never on our own update.
  useEffect(() => {
    if (!controls) return
    const onStart = () => {
      moved.current = true
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
    const { position, target } = frameRooms(rooms, size.width / size.height, sceneHeight(decorations))
    camera.position.copy(position)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    if (controls) {
      controls.target.copy(target)
      controls.update()
    }
  }, [rooms, decorations, size.width, size.height, camera, controls])

  return null
}
