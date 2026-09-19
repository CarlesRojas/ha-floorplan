import { decorationKind } from '#/decoration/catalog.ts'
import LightModel from '#/scene/decor/LightModel.tsx'
import { CEILING_HEIGHT_M, LIGHT_GLOW_COLOR } from '#/theme.ts'
import type { DecorationConfig } from '#/types.ts'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Color } from 'three'

type Props = {
  item: DecorationConfig
  className?: string
}

// Small turntable view of one decoration item, shown lit, on a floor disc.
export default function ModelPreview({ item, className }: Props) {
  const kind = decorationKind(item.kind)
  if (!kind) return null
  const glow = new Color(LIGHT_GLOW_COLOR)
  const centered: DecorationConfig = { ...item, position: [0, 0], rotation: 0 }
  const tall = kind.mount === 'ceiling'
  const target: [number, number, number] = [0, tall ? CEILING_HEIGHT_M * 0.55 : 0.7, 0]
  const distance = tall ? 4.5 : 2.6
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 35, position: [distance, distance * 0.8, distance] }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <circleGeometry args={[1.2, 24]} />
          <meshStandardMaterial color="#6b7c8c" roughness={0.9} />
        </mesh>
        {kind.family === 'light' && (
          <LightModel kind={kind} item={centered} state={{ on: true, level: 0.8, glow: [glow.r, glow.g, glow.b] }} />
        )}
        <OrbitControls
          makeDefault
          target={target}
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.5}
        />
      </Canvas>
    </div>
  )
}
