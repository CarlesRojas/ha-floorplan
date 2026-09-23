import { colorValue, decorationVariant, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import FloorLamp from '#/scene/decor/FloorLamps.tsx'
import { FLOOR_LAMPS } from '#/scene/decor/floorLampSpecs.ts'
import { BaseMaterial, ShadeMaterial, type LightState } from '#/scene/decor/lightMaterials.tsx'
import Pendant from '#/scene/decor/Pendants.tsx'
import { PENDANTS } from '#/scene/decor/pendantSpecs.ts'
import TableLamp from '#/scene/decor/TableLamps.tsx'
import { TABLE_LAMPS } from '#/scene/decor/tableLampSpecs.ts'
import WallLamp from '#/scene/decor/WallLamps.tsx'
import { WALL_LAMPS } from '#/scene/decor/wallLampSpecs.ts'
import { LAMP_SHADOW_MAP_PX } from '#/constants.ts'
import { CEILING_HEIGHT_M, LAMP_KEY_SHARE, LAMP_OUTPUT, LAMP_THROUGH_SHARE, LIGHT_POINT_INTENSITY } from '#/theme.ts'
import type { DecorationConfig } from '#/types.ts'

import { useEased } from '#/scene/decor/ease.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import { useEffect } from 'react'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

type Props = {
  kind: DecorationKind
  item: DecorationConfig
  state: ItemState | null
}

// Smooth, chunky shapes: squashed spheres, capsules and domes, matte
// surfaces. Segment counts stay low so the silhouettes read as simple.
const SEG = 32

function Glow({
  state,
  at,
  spread = 0,
  output = 1,
}: {
  state: LightState | null
  // Where the bulb is, inside the shade rather than on the frame that holds
  // it: a floor lamp lights from the middle of its shade, not from its mast.
  at: [number, number, number]
  spread?: number
  // What this kind of lamp puts out, against the rest of them.
  output?: number
}) {
  const lit = useEased(state?.on ? (state.level ?? 1) : 0, 9)
  const [r, g, b] = state?.glow ?? [1, 1, 1]
  // Rect area lights need their uniform tables built once, and they only
  // light standard materials, which is what every model here uses.
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])
  if (lit < 0.01) return null
  // Close to linear with the level: a lamp at a third still lights the
  // room around it, and still casts, instead of fading away first.
  const total = LIGHT_POINT_INTENSITY * output * (0.25 + 0.75 * lit) * lit
  // A strip is a line of light, not a point. A rect area light is one
  // continuous source, so the wash along a long strip is even instead of
  // beading wherever a point happens to sit.
  if (spread > 0.4) {
    return (
      <rectAreaLight
        position={[at[0], at[1] - 0.02, at[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={spread}
        height={0.06}
        color={[r, g, b]}
        intensity={total * 4}
      />
    )
  }
  return (
    <>
      {/* The bulb. What the shade stops on its way out lands as a shadow of
          whatever stands around the lamp. */}
      <pointLight
        position={at}
        color={[r, g, b]}
        intensity={total * LAMP_KEY_SHARE}
        distance={7}
        decay={1.15}
        castShadow
        shadow-mapSize={[LAMP_SHADOW_MAP_PX, LAMP_SHADOW_MAP_PX]}
        // Small offsets: a big one pushes the sample past a thin top or
        // panel and lets the light through the middle of it.
        shadow-bias={-0.0012}
        shadow-normalBias={0.008}
        shadow-camera-near={0.05}
        shadow-camera-far={9}
      />
      {/* What comes through the shade itself. Parchment and opal glass are
          not walls: they glow, so this part reaches past the shade and casts
          nothing. */}
      <pointLight
        position={at}
        color={[r, g, b]}
        intensity={total * LAMP_THROUGH_SHARE}
        distance={6}
        decay={1.25}
        userData={{ through: true }}
      />
    </>
  )
}

export default function LightModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id, item.variant)
  const c = (slot: string) => colorValue(kind, item.colors, slot, item.variant)
  const m = (slot: string) => materialValue(kind, slot, item.variant)
  const size = p('size')
  let body: React.ReactNode
  let glowAt: [number, number, number] = [0, 1, 0]
  // How far the light is spread along the item, for a strip.
  let glowSpread = 0
  switch (kind.id) {
    case 'light_ceiling': {
      // A plain round focus in the ceiling, ten centimeters across.
      const r = size / 2
      glowAt = [0, CEILING_HEIGHT_M - r - 0.05, 0]
      body = (
        <group>
          <mesh position={[0, CEILING_HEIGHT_M - 0.006, 0]}>
            <cylinderGeometry args={[r, r, 0.012, SEG * 2]} />
            <BaseMaterial color={c('rim')} material={m('rim')} />
          </mesh>
          <mesh position={[0, CEILING_HEIGHT_M - 0.014, 0]} userData={{ transmits: true }}>
            <cylinderGeometry args={[r * 0.88, r * 0.88, 0.006, SEG * 2]} />
            <ShadeMaterial color={c('focus')} material={m('focus')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_pendant': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'nagoya'
      const spec = PENDANTS[style] ?? PENDANTS.nagoya
      const k = size / spec.diameter
      const top = CEILING_HEIGHT_M - p('cord')
      glowAt = [0, top - spec.glow * k, 0]
      body = <Pendant style={style} k={k} top={top} c={c} m={m} state={state} />
      break
    }
    case 'light_floor': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'tmm'
      const spec = FLOOR_LAMPS[style] ?? FLOOR_LAMPS.tmm
      const kx = size / spec.size
      const kz = p('depth') / spec.depth
      const ky = p('height') / spec.height
      glowAt = [(spec.glow[0] - spec.offset) * kx, spec.glow[1] * ky, spec.glow[2] * kz]
      body = <FloorLamp style={style} kx={kx} ky={ky} kz={kz} c={c} m={m} state={state} />
      break
    }
    case 'light_table': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'cestita'
      const spec = TABLE_LAMPS[style] ?? TABLE_LAMPS.cestita
      const kx = size / spec.size
      const ky = p('height') / spec.height
      glowAt = [0, spec.glow * ky, 0]
      body = <TableLamp style={style} kx={kx} ky={ky} c={c} m={m} state={state} />
      break
    }
    case 'light_wall': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'tmm'
      const spec = WALL_LAMPS[style] ?? WALL_LAMPS.tmm
      const kx = size / spec.size
      const kz = p('depth') / spec.depth
      const ky = p('tall') / spec.height
      // Hung by its middle, out from the wall along z.
      const height = p('height')
      glowAt = [spec.glow[0] * kx, height + spec.glow[1] * ky, spec.glow[2] * kz]
      body = (
        <group position={[0, height, 0]}>
          <WallLamp style={style} kx={kx} ky={ky} kz={kz} drop={height} c={c} m={m} state={state} />
        </group>
      )
      break
    }
    case 'light_strip':
    case 'light_strip_ceiling':
    case 'light_strip_wall': {
      // An aluminium channel with a frosted diffuser in it. Lights place
      // themselves, so the ceiling one goes up to the ceiling and the other
      // two take their own height.
      const length = p('length')
      const height = kind.id === 'light_strip_ceiling' ? CEILING_HEIGHT_M - 0.04 : p('height')
      glowAt = [0, height + 0.05, 0]
      glowSpread = length
      body = (
        <group>
          <mesh position={[0, height + 0.035, 0]}>
            <boxGeometry args={[length, 0.022, 0.03]} />
            <BaseMaterial color={c('channel')} material={m('channel')} />
          </mesh>
          <mesh position={[0, height + 0.018, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ transmits: true }}>
            <capsuleGeometry args={[0.016, Math.max(length - 0.032, 0.05), 8, 20]} />
            <ShadeMaterial color={c('diffuser')} material={m('diffuser')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    default:
      body = null
  }

  return (
    <>
      {body}
      <Glow state={state} at={glowAt} spread={glowSpread} output={LAMP_OUTPUT[kind.id] ?? 1} />
    </>
  )
}
