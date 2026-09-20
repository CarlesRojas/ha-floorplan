import { colorValue, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import type { SurfaceKind } from '#/materials/textures.ts'
import SurfaceMaterial from '#/scene/SurfaceMaterial.tsx'
import { CEILING_HEIGHT_M, LIGHT_POINT_INTENSITY } from '#/theme.ts'
import type { DecorationConfig } from '#/types.ts'

import { useEased } from '#/scene/decor/ease.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import { useEffect, useMemo } from 'react'
import { Color } from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

export type LightState = ItemState

type Props = {
  kind: DecorationKind
  item: DecorationConfig
  state: ItemState | null
}

// Smooth, chunky shapes: squashed spheres, capsules and domes, matte
// surfaces. Segment counts stay low so the silhouettes read as simple.
const SEG = 16

// Materials of the light family. The shade glows when on: an emissive tint
// scaled by level, plus a point light so the room picks it up.
function ShadeMaterial({
  color,
  material = 'matte',
  state,
}: {
  color: string
  material?: string
  state: LightState | null
}) {
  const glow = state?.glow ?? [1, 1, 1]
  // Eased, so a lamp fades up and down and follows a dimmer smoothly
  // instead of stepping with each update.
  const lit = useEased(state?.on ? (state.level ?? 1) : 0, 9)
  // A colored light on a chalky shade was barely a tint, since the shade's
  // own color carried the surface. The shade takes the light's color as it
  // comes up, so a green lamp reads green from across the room.
  const [gr, gg, gb] = glow
  const tint = useMemo(() => new Color(color).lerp(new Color(gr, gg, gb), 0.85 * lit).getStyle(), [color, gr, gg, gb, lit])
  return (
    <SurfaceMaterial
      kind={material as SurfaceKind}
      color={tint}
      doubleSide
      emissive={[glow[0], glow[1], glow[2]]}
      // Kept under one: past that the tone mapping rolls a bright color off
      // toward white, which is what made a colored lamp read as pale.
      emissiveIntensity={lit * (0.25 + lit * 0.7)}
    />
  )
}

function BaseMaterial({ color, material = 'matte' }: { color: string; material?: string }) {
  return <SurfaceMaterial kind={material as SurfaceKind} color={color} />
}

function Glow({ state, y, spread = 0 }: { state: LightState | null; y: number; spread?: number }) {
  const lit = useEased(state?.on ? (state.level ?? 1) : 0, 9)
  const [r, g, b] = state?.glow ?? [1, 1, 1]
  // Rect area lights need their uniform tables built once, and they only
  // light standard materials, which is what every model here uses.
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])
  if (lit < 0.01) return null
  const total = LIGHT_POINT_INTENSITY * lit * (0.3 + lit * 0.7)
  // A strip is a line of light, not a point. A rect area light is one
  // continuous source, so the wash along a long strip is even instead of
  // beading wherever a point happens to sit.
  if (spread > 0.4) {
    return (
      <rectAreaLight
        position={[0, y - 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={spread}
        height={0.06}
        color={[r, g, b]}
        intensity={total * 4}
      />
    )
  }
  return <pointLight position={[0, y, 0]} color={[r, g, b]} intensity={total} distance={7} decay={1.6} />
}

// A sphere squashed vertically: the basic soft volume of the family.
function Blob({
  radius,
  squash,
  position,
  children,
}: {
  radius: number
  squash: number
  position: [number, number, number]
  children: React.ReactNode
}) {
  return (
    <mesh position={position} scale={[1, squash, 1]} castShadow>
      <sphereGeometry args={[radius, SEG, SEG]} />
      {children}
    </mesh>
  )
}

// The upper part of a sphere, open underneath: a dome shade.
function Dome({
  radius,
  position,
  children,
}: {
  radius: number
  position: [number, number, number]
  children: React.ReactNode
}) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[radius, SEG, SEG, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      {children}
    </mesh>
  )
}

export default function LightModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot)
  const m = (slot: string) => materialValue(kind, item.materials, slot)
  const size = p('size')
  let body: React.ReactNode
  let glowY = 1
  // How far the light is spread along the item, for a strip.
  let glowSpread = 0
  switch (kind.id) {
    case 'light_ceiling': {
      // A soft puck under the ceiling.
      const r = size / 2
      glowY = CEILING_HEIGHT_M - r * 0.5 - 0.1
      body = (
        <Blob radius={r} squash={0.38} position={[0, CEILING_HEIGHT_M - r * 0.2, 0]}>
          <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
        </Blob>
      )
      break
    }
    case 'light_pendant': {
      // A dome on a cord with a glowing bulb inside.
      const cord = p('cord')
      const r = size / 2
      const top = CEILING_HEIGHT_M - cord
      glowY = top - r * 0.6
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - cord / 2, 0]}>
            <capsuleGeometry args={[0.012, cord, 4, 8]} />
            <BaseMaterial color={c('cord')} material={m('cord')} />
          </mesh>
          <Dome radius={r} position={[0, top - r * 0.35, 0]}>
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </Dome>
          <Blob radius={r * 0.32} squash={1} position={[0, top - r * 0.45, 0]}>
            <ShadeMaterial color="#fff3d6" state={state} />
          </Blob>
        </>
      )
      break
    }
    case 'light_floor': {
      // An orb on a rounded stem with a pebble base.
      const height = p('height')
      const r = size / 2
      glowY = height
      body = (
        <>
          <Blob radius={size * 0.45} squash={0.25} position={[0, size * 0.1, 0]}>
            <BaseMaterial color={c('base')} material={m('base')} />
          </Blob>
          <mesh position={[0, height / 2, 0]}>
            <capsuleGeometry args={[0.035, height - r, 4, 10]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <Blob radius={r} squash={0.85} position={[0, height, 0]}>
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </Blob>
        </>
      )
      break
    }
    case 'light_table': {
      // A mushroom lamp: chunky stem, dome cap.
      const height = p('height')
      const r = size / 2
      glowY = height
      body = (
        <group>
          <mesh position={[0, height * 0.5, 0]}>
            <capsuleGeometry args={[r * 0.35, height * 0.8, 4, SEG]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <Dome radius={r} position={[0, height * 0.85, 0]}>
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </Dome>
        </group>
      )
      break
    }
    case 'light_wall': {
      // A soft half dome pressed against the wall.
      const height = p('height')
      const r = size / 2
      glowY = height + r * 0.3
      body = (
        <group position={[0, height, 0]}>
          <mesh rotation={[0, 0, 0]} castShadow>
            <sphereGeometry args={[r, SEG, SEG, 0, Math.PI]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.005]}>
            <circleGeometry args={[r, SEG]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_strip':
    case 'light_strip_ceiling':
    case 'light_strip_wall': {
      // A rounded glowing bar. Lights place themselves, so the ceiling one
      // goes up to the ceiling and the other two take their own height.
      const length = p('length')
      const height = kind.id === 'light_strip_ceiling' ? CEILING_HEIGHT_M - 0.04 : p('height')
      glowY = height + 0.05
      glowSpread = length
      body = (
        <mesh position={[0, height + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.02, Math.max(length - 0.04, 0.05), 4, 10]} />
          <ShadeMaterial color={c('base')} material={m('base')} state={state} />
        </mesh>
      )
      break
    }
    case 'light_spot': {
      // A small pill hanging just under the ceiling, glowing at the bottom.
      const r = size / 2
      glowY = CEILING_HEIGHT_M - r * 3
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - r * 1.4, 0]}>
            <capsuleGeometry args={[r, r * 1.2, 4, SEG]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <Blob radius={r * 0.7} squash={0.5} position={[0, CEILING_HEIGHT_M - r * 2.4, 0]}>
            <ShadeMaterial color="#fff3d6" state={state} />
          </Blob>
        </>
      )
      break
    }
    default:
      body = null
  }

  return (
    <>
      {body}
      <Glow state={state} y={glowY} spread={glowSpread} />
    </>
  )
}
