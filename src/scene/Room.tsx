import { SLAB_BEVEL_SEGMENTS, SLAB_CURVE_SEGMENTS } from '#/constants.ts'
import SurfaceMaterial from '#/scene/SurfaceMaterial.tsx'
import type { SurfaceKind } from '#/materials/textures.ts'
import { FLOOR_MATERIALS, ROOM_COLORS, ROOM_SLAB_EDGE_RADIUS_M, ROOM_SLAB_THICKNESS_M } from '#/theme.ts'
import { ensureCounterClockwise, inset, roundedShape } from '#/geometry/polygon.ts'
import type { RoomConfig } from '#/types.ts'
import { useMemo } from 'react'
import { ExtrudeGeometry } from 'three'

type Props = {
  room: RoomConfig
  index: number
  radius: number
  gap: number
}

export default function Room({ room, index, radius, gap }: Props) {
  // The bevel grows outward from the outline, so inset by it as well to keep
  // the visible edge where the gap says it should be.
  const points = useMemo(
    () => inset(ensureCounterClockwise(room.points), gap / 2 + ROOM_SLAB_EDGE_RADIUS_M),
    [room.points, gap],
  )

  const geometry = useMemo(() => {
    const cornerRadius = room.radius ?? radius
    // A concave corner wraps around a neighbour's convex corner. For the two
    // arcs to be concentric its radius grows by the gap, plus the edge
    // rounding on both slabs since the bevel widens each of them.
    const concaveRadius = cornerRadius + gap + 2 * ROOM_SLAB_EDGE_RADIUS_M
    const shape = roundedShape(points, cornerRadius, concaveRadius)
    const geo = new ExtrudeGeometry(shape, {
      depth: ROOM_SLAB_THICKNESS_M,
      bevelEnabled: true,
      bevelThickness: ROOM_SLAB_EDGE_RADIUS_M,
      bevelSize: ROOM_SLAB_EDGE_RADIUS_M,
      bevelSegments: SLAB_BEVEL_SEGMENTS,
      curveSegments: SLAB_CURVE_SEGMENTS,
    })
    // Shape is drawn on the XY plane. Lay it flat so Y is up and plan y maps
    // to -z, then drop it so the walking surface is exactly y = 0 and
    // everything placed in the room sits on top of it.
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, -(ROOM_SLAB_THICKNESS_M + ROOM_SLAB_EDGE_RADIUS_M), 0)
    return geo
  }, [points, room.radius, radius, gap])

  const floor = room.floor ? FLOOR_MATERIALS[room.floor.material] : undefined
  const color = room.floor?.color ?? floor?.color ?? room.color ?? ROOM_COLORS[index % ROOM_COLORS.length]

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {floor ? (
        // Extrude UVs are plan meters, so the texture tiles once per meter.
        <SurfaceMaterial kind={room.floor!.material as SurfaceKind} color={color} />
      ) : (
        <meshStandardMaterial color={color} roughness={0.85} />
      )}
    </mesh>
  )
}
