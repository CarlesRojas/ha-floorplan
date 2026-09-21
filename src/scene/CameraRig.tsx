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
