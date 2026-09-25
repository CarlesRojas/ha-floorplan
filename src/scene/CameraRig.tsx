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

  // A drag let go outside the window never hears its button come up, which
  // the right and middle buttons miss in some browsers, and the pan or zoom
  // it started would carry on with no button held. A move with no button
  // down ends it, as the release would have.
  useEffect(() => {
    if (!controls) return
    const element = controls.domElement as HTMLElement | null
    if (!element) return
    // The controls' own release handler and the pointers they hold down.
    const inner = controls as unknown as { _onPointerUp: (event: PointerEvent) => void; _pointers: number[] }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.buttons === 0 && inner._pointers.includes(event.pointerId))
        inner._onPointerUp(event)
    }
    // The controls follow a drag on the whole document, and once the pointer
    // comes back it may be over anything, so the check listens there too and
    // runs ahead of them.
    const page = element.ownerDocument
    page.addEventListener('pointermove', onMove, { capture: true })
    return () => page.removeEventListener('pointermove', onMove, { capture: true })
  }, [controls])

  useLayoutEffect(() => {
    if (moved.current) return
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
