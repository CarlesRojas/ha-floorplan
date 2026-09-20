import { CAMERA_DIRECTION, CAMERA_FIT_MARGIN, CAMERA_FOV_DEG } from '#/constants.ts'
import { decorationKind, paramValue } from '#/decoration/catalog.ts'
import { standHeight } from '#/decoration/surfaces.ts'
import { CEILING_HEIGHT_M, ROOM_SLAB_THICKNESS_M } from '#/theme.ts'
import type { DecorationConfig, RoomConfig } from '#/types.ts'
import { MathUtils, Vector3 } from 'three'

export type Framing = {
  position: Vector3
  target: Vector3
}

// Places the camera along a fixed direction so the flat's bounding box fits
// the viewport. Plan y maps to -z in the scene.
// Tallest point the scene reaches, so the camera frames fixtures too.
export function sceneHeight(decorations: DecorationConfig[] = []) {
  let top = 0.6
  for (const item of decorations) {
    const kind = decorationKind(item.kind)
    if (!kind) continue
    if (kind.mount === 'ceiling') return CEILING_HEIGHT_M
    const height = paramValue(kind, item.params, 'height')
    top = Math.max(top, standHeight(item, decorations) + height + 0.4)
  }
  return top
}

export function frameRooms(rooms: RoomConfig[], aspect: number, height = 0.6): Framing {
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

  const target = new Vector3((minX + maxX) / 2, height * 0.35, -(minY + maxY) / 2)
  const direction = new Vector3(...CAMERA_DIRECTION).normalize()

  // Camera basis for a camera at `target + direction * d` looking at target.
  const forward = direction.clone().negate()
  const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize()
  const up = new Vector3().crossVectors(right, forward).normalize()

  const vFov = MathUtils.degToRad(CAMERA_FOV_DEG)
  const tanV = Math.tan(vFov / 2)
  const tanH = tanV * aspect

  // For each box corner, the distance the camera needs so that the corner
  // still fits horizontally and vertically. The farthest wins.
  let distance = 0
  const corner = new Vector3()
  for (const x of [minX, maxX]) {
    for (const y of [minY, maxY]) {
      for (const z of [-ROOM_SLAB_THICKNESS_M, height]) {
        corner.set(x, z, -y).sub(target)
        const depth = corner.dot(forward)
        const dx = Math.abs(corner.dot(right))
        const dy = Math.abs(corner.dot(up))
        distance = Math.max(distance, dx / tanH - depth, dy / tanV - depth)
      }
    }
  }

  const position = target.clone().addScaledVector(direction, distance * CAMERA_FIT_MARGIN)
  return { position, target }
}
