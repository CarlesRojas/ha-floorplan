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
    // The controls' own release handler and the pointers they hold down.
    const inner = controls as unknown as { _onPointerUp: (event: PointerEvent) => void; _pointers: number[] }
    const held = (event: PointerEvent) => event.pointerType === 'mouse' && inner._pointers.includes(event.pointerId)
    const page = element.ownerDocument
    const view = page.defaultView
    const outside = (event: PointerEvent) =>
      !!view &&
      (event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= view.innerWidth ||
        event.clientY >= view.innerHeight)
    const onMove = (event: PointerEvent) => {
      if (!held(event)) return
      // The left button is bit one; anything else held is a pan or zoom.
      if (event.buttons === 0 || ((event.buttons & ~1) !== 0 && outside(event))) inner._onPointerUp(event)
    }
    const onLeave = (event: PointerEvent) => {
      if (held(event) && (event.buttons & ~1) !== 0) inner._onPointerUp(event)
    }
    const onBlur = () => {
      for (const id of [...inner._pointers]) inner._onPointerUp({ pointerId: id } as PointerEvent)
    }
    // The controls follow a drag on the whole document, and once the pointer
    // comes back it may be over anything, so the checks listen there too and
    // run ahead of them.
    page.addEventListener('pointermove', onMove, { capture: true })
    page.addEventListener('pointerleave', onLeave, { capture: true })
    page.addEventListener('pointercancel', onLeave, { capture: true })
    view?.addEventListener('blur', onBlur)
    return () => {
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
