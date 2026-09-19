import { CAMERA_DIRECTION, CAMERA_FIT_MARGIN, CAMERA_FOV_DEG } from '#/constants.ts'
import type { RoomConfig } from '#/types.ts'
import { MathUtils, Vector3 } from 'three'

export type Framing = {
  position: Vector3
  target: Vector3
}

// Places the camera along a fixed direction so the flat's bounding box fits
// the viewport. Plan y maps to -z in the scene.
export function frameRooms(rooms: RoomConfig[], aspect: number): Framing {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const room of rooms) {
    for (const [x, y] of room.points) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (!Number.isFinite(minX)) {
    minX = minY = -1
    maxX = maxY = 1
  }

  const target = new Vector3((minX + maxX) / 2, 0, -(minY + maxY) / 2)
  const radius = Math.hypot(maxX - minX, maxY - minY) / 2

  const vFov = MathUtils.degToRad(CAMERA_FOV_DEG)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  const distance = (radius * CAMERA_FIT_MARGIN) / Math.sin(Math.min(vFov, hFov) / 2)

  const direction = new Vector3(...CAMERA_DIRECTION).normalize()
  const position = target.clone().addScaledVector(direction, distance)
  return { position, target }
}
