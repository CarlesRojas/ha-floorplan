import { frameRooms, sceneHeight } from '#/scene/framing.ts'
import type { DecorationConfig, RoomConfig } from '#/types.ts'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  rooms: RoomConfig[]
  decorations: DecorationConfig[]
}

// Snaps the camera to frame the rooms on mount and whenever the rooms or the
// viewport change. No animation.
export default function CameraRig({ rooms, decorations }: Props) {
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const controls = useThree(state => state.controls) as OrbitControlsImpl | null

  useLayoutEffect(() => {
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
