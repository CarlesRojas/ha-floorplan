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
  const m = (slot: string) => materialValue(kind, slot)
  const size = p('size')
  let body: React.ReactNode
  let glowY = 1
  // How far the light is spread along the item, for a strip.
  let glowSpread = 0
  switch (kind.id) {
    case 'light_ceiling': {
      // A flush opal disc in a slim rim, the plain ceiling light.
      const r = size / 2
      glowY = CEILING_HEIGHT_M - r * 0.5 - 0.1
      body = (
        <group>
          <mesh position={[0, CEILING_HEIGHT_M - 0.02, 0]}>
            <cylinderGeometry args={[r, r * 0.98, 0.04, SEG * 2]} />
            <BaseMaterial color={c('shade')} material={m('shade')} />
          </mesh>
          {/* The diffuser, a shallow dome hanging below the rim. */}
          <mesh position={[0, CEILING_HEIGHT_M - 0.04, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[r * 0.98, SEG * 2, SEG, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_pendant': {
      // A cone shade on a cord, with a canopy at the ceiling and the bulb
      // showing under the rim.
      const cord = p('cord')
      const r = size / 2
      const top = CEILING_HEIGHT_M - cord
      const shadeH = r * 0.95
      glowY = top - r * 0.6
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - 0.02, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.035, SEG]} />
            <BaseMaterial color={c('cord')} material={m('cord')} />
          </mesh>
          <mesh position={[0, CEILING_HEIGHT_M - cord / 2, 0]}>
            <capsuleGeometry args={[0.008, cord, 4, 8]} />
            <BaseMaterial color={c('cord')} material={m('cord')} />
          </mesh>
          {/* The shade, open at the bottom, with a rolled rim. */}
          <mesh position={[0, top - shadeH / 2, 0]} castShadow>
            <coneGeometry args={[r, shadeH, SEG * 2, 1, true]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
          <mesh position={[0, top - shadeH, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.98, 0.008, 6, SEG * 2]} />
            <BaseMaterial color={c('shade')} material={m('shade')} />
          </mesh>
          <mesh position={[0, top - shadeH * 0.78, 0]}>
            <sphereGeometry args={[r * 0.26, SEG, SEG]} />
            <ShadeMaterial color="#fff3d6" state={state} />
          </mesh>
        </>
      )
      break
    }
    case 'light_floor': {
      // A drum shade on a slim stem, standing on a weighted disc.
      const height = p('height')
      const r = size / 2
      const shadeH = r * 1.15
      glowY = height - shadeH * 0.4
      body = (
        <>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[size * 0.42, size * 0.46, 0.024, SEG * 2]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.03, size * 0.16, 0.04, SEG]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          {/* The stem stops inside the shade, so nothing pokes out the top. */}
          <mesh position={[0, (height - shadeH * 0.5) / 2, 0]}>
            <cylinderGeometry args={[0.014, 0.018, height - shadeH * 0.5, 12]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          {/* The shade, very slightly tapered, open top and bottom. */}
          <mesh position={[0, height - shadeH * 0.4, 0]} castShadow>
            <cylinderGeometry args={[r * 0.88, r, shadeH, SEG * 2, 1, true]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
          <mesh position={[0, height - shadeH * 0.9, 0]}>
            <sphereGeometry args={[r * 0.3, SEG, SEG]} />
            <ShadeMaterial color="#fff3d6" state={state} />
          </mesh>
        </>
      )
      break
    }
    case 'light_table': {
      // A mushroom lamp: a domed cap over a short waisted stem on a disc.
      const height = p('height')
      const r = size / 2
      glowY = height * 0.8
      body = (
        <group>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[r * 0.5, r * 0.55, 0.024, SEG * 2]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <mesh position={[0, height * 0.42, 0]}>
            <cylinderGeometry args={[r * 0.24, r * 0.4, height * 0.8, SEG]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <Dome radius={r} position={[0, height * 0.82, 0]}>
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </Dome>
          {/* A ring under the cap, so the shade reads as a shell. */}
          <mesh position={[0, height * 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.98, 0.008, 6, SEG * 2]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_wall': {
      // A half dome sconce on a round backplate.
      const height = p('height')
      const r = size / 2
      glowY = height + r * 0.3
      body = (
        <group position={[0, height, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.008]}>
            <cylinderGeometry args={[r * 0.55, r * 0.55, 0.016, SEG]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <mesh position={[0, 0, 0.012]} castShadow>
            <sphereGeometry args={[r, SEG, SEG, 0, Math.PI]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
          {/* The open face of the shell, closed by a soft disc. */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
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
      // An aluminium channel with a frosted diffuser in it. Lights place
      // themselves, so the ceiling one goes up to the ceiling and the other
      // two take their own height.
      const length = p('length')
      const height = kind.id === 'light_strip_ceiling' ? CEILING_HEIGHT_M - 0.04 : p('height')
      glowY = height + 0.05
      glowSpread = length
      body = (
        <group>
          <mesh position={[0, height + 0.035, 0]}>
            <boxGeometry args={[length, 0.022, 0.03]} />
            <BaseMaterial color={c('base')} material="metal" />
          </mesh>
          <mesh position={[0, height + 0.018, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.016, Math.max(length - 0.032, 0.05), 4, 10]} />
            <ShadeMaterial color={c('base')} material={m('base')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_spot': {
      // A recessed downlight: a trim ring in the ceiling with the lens set
      // back inside it.
      const r = size / 2
      glowY = CEILING_HEIGHT_M - r * 2
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - r * 0.3, 0]}>
            <cylinderGeometry args={[r, r * 0.86, r * 0.6, SEG * 2]} />
            <BaseMaterial color={c('base')} material={m('base')} />
          </mesh>
          <mesh position={[0, CEILING_HEIGHT_M - r * 0.62, 0]}>
            <cylinderGeometry args={[r * 0.78, r * 0.78, r * 0.2, SEG * 2]} />
            <ShadeMaterial color="#fff3d6" state={state} />
          </mesh>
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
