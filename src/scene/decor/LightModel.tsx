import { colorValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { CEILING_HEIGHT_M, LIGHT_POINT_INTENSITY } from '#/theme.ts'
import type { DecorationConfig } from '#/types.ts'
import { DoubleSide, MathUtils } from 'three'

export type LightState = {
  on: boolean
  // 0 to 1
  level: number
  // 0 to 1 each, the glow tint
  glow: [number, number, number]
}

type Props = {
  kind: DecorationKind
  item: DecorationConfig
  state: LightState | null
  onClick?: () => void
}

const SEGMENTS = 10

// Materials of the light family. The shade glows when on: an emissive tint
// scaled by level, plus a point light so the room picks it up.
function ShadeMaterial({ color, state }: { color: string; state: LightState | null }) {
  const on = state?.on ?? false
  const glow = state?.glow ?? [1, 1, 1]
  const intensity = on ? 0.5 + (state?.level ?? 1) * 1.5 : 0
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.9}
      flatShading
      side={DoubleSide}
      emissive={on ? [glow[0], glow[1], glow[2]] : [0, 0, 0]}
      emissiveIntensity={intensity}
    />
  )
}

function Glow({ state, y }: { state: LightState | null; y: number }) {
  if (!state?.on) return null
  const [r, g, b] = state.glow
  return (
    <pointLight
      position={[0, y, 0]}
      color={[r, g, b]}
      intensity={LIGHT_POINT_INTENSITY * (0.3 + state.level * 0.7)}
      distance={7}
      decay={1.6}
    />
  )
}

export default function LightModel({ kind, item, state, onClick }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot)
  const size = p('size')
  const rotation = MathUtils.degToRad(item.rotation ?? 0)
  const handlers = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      onClick?.()
    },
  }
  const cursor = onClick
    ? {
        onPointerOver: () => (document.body.style.cursor = 'pointer'),
        onPointerOut: () => (document.body.style.cursor = ''),
      }
    : {}

  let body: React.ReactNode
  let glowY = 1
  switch (kind.id) {
    case 'light_ceiling': {
      glowY = CEILING_HEIGHT_M - 0.15
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - 0.05, 0]} castShadow>
            <cylinderGeometry args={[size / 2, size / 2 - 0.03, 0.1, SEGMENTS]} />
            <ShadeMaterial color={c('shade')} state={state} />
          </mesh>
          <mesh position={[0, CEILING_HEIGHT_M - 0.005, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.01, SEGMENTS]} />
            <meshStandardMaterial color={c('base')} roughness={0.9} flatShading />
          </mesh>
        </>
      )
      break
    }
    case 'light_pendant': {
      const cord = p('cord')
      const shadeH = size * 0.55
      const top = CEILING_HEIGHT_M - cord
      glowY = top - shadeH * 0.6
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - cord / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, cord, 6]} />
            <meshStandardMaterial color={c('cord')} roughness={1} />
          </mesh>
          <mesh position={[0, top - shadeH / 2, 0]} castShadow>
            <cylinderGeometry args={[size * 0.12, size / 2, shadeH, SEGMENTS, 1, true]} />
            <ShadeMaterial color={c('shade')} state={state} />
          </mesh>
          <mesh position={[0, top - shadeH * 0.65, 0]}>
            <sphereGeometry args={[size * 0.12, 8, 6]} />
            <ShadeMaterial color="#fff6d5" state={state} />
          </mesh>
        </>
      )
      break
    }
    case 'light_floor':
    case 'light_table': {
      const lift = kind.id === 'light_table' ? p('lift') : 0
      const height = p('height')
      const shadeH = size * 0.6
      glowY = lift + height - shadeH * 0.4
      body = (
        <group position={[0, lift, 0]}>
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[size * 0.35, size * 0.4, 0.04, SEGMENTS]} />
            <meshStandardMaterial color={c('base')} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, height / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, height, 6]} />
            <meshStandardMaterial color={c('base')} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, height - shadeH * 0.3, 0]} castShadow>
            <cylinderGeometry args={[size * 0.35, size / 2, shadeH, SEGMENTS, 1, true]} />
            <ShadeMaterial color={c('shade')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_wall': {
      const height = p('height')
      glowY = height + 0.1
      body = (
        <group position={[0, height, 0]}>
          <mesh position={[0, 0, -size * 0.05]}>
            <boxGeometry args={[size * 0.5, size * 0.3, size * 0.1]} />
            <meshStandardMaterial color={c('base')} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 0, size * 0.2]} rotation={[Math.PI, 0, 0]} castShadow>
            <cylinderGeometry args={[size / 2, size * 0.2, size * 0.5, SEGMENTS, 1, true]} />
            <ShadeMaterial color={c('shade')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_strip': {
      const length = p('length')
      const height = p('height')
      glowY = height + 0.05
      body = (
        <mesh position={[0, height + 0.01, 0]}>
          <boxGeometry args={[length, 0.035, 0.035]} />
          <ShadeMaterial color={c('base')} state={state} />
        </mesh>
      )
      break
    }
    case 'light_spot': {
      glowY = CEILING_HEIGHT_M - 0.2
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - 0.05, 0]}>
            <cylinderGeometry args={[size / 2, size / 2, 0.1, SEGMENTS]} />
            <meshStandardMaterial color={c('base')} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, CEILING_HEIGHT_M - 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[size * 0.35, SEGMENTS]} />
            <ShadeMaterial color="#fff6d5" state={state} />
          </mesh>
        </>
      )
      break
    }
    default:
      body = null
  }

  return (
    <group position={[item.position[0], 0, -item.position[1]]} rotation={[0, rotation, 0]} {...handlers} {...cursor}>
      {body}
      <Glow state={state} y={glowY} />
    </group>
  )
}
