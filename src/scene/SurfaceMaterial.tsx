import { surface, type SurfaceKind } from '#/materials/textures.ts'
import { useMemo } from 'react'
import { DoubleSide, Vector2 } from 'three'

type Props = {
  kind: SurfaceKind
  color: string
  // Tiles per meter. Defaults to the surface's own scale.
  repeat?: number
  // Size in meters of the object this material wraps. Geometry with
  // normalized UVs, a sphere or a cylinder, needs it to tile at the same
  // physical scale as extruded geometry, whose UVs are already in meters.
  span?: number
  emissive?: [number, number, number]
  emissiveIntensity?: number
  doubleSide?: boolean
}

// Standard material with the procedural color and normal maps of a surface
// kind, tinted by a color.
export default function SurfaceMaterial({
  kind,
  color,
  repeat,
  span,
  emissive,
  emissiveIntensity = 0,
  doubleSide = false,
}: Props) {
  const s = surface(kind)
  const maps = useMemo(() => {
    const map = s.map.clone()
    const normalMap = s.normalMap.clone()
    const perMeter = repeat ?? s.repeat
    const r = span ? perMeter * span : perMeter
    map.repeat.set(r, r)
    normalMap.repeat.set(r, r)
    map.needsUpdate = true
    normalMap.needsUpdate = true
    return { map, normalMap }
  }, [s, repeat, span])
  return (
    <meshStandardMaterial
      color={color}
      map={maps.map}
      normalMap={maps.normalMap}
      normalScale={new Vector2(s.normalScale, s.normalScale)}
      roughness={s.roughness}
      side={doubleSide ? DoubleSide : undefined}
      emissive={emissive ?? [0, 0, 0]}
      emissiveIntensity={emissiveIntensity}
    />
  )
}
