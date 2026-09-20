import { decorationKind, mountHeight } from '#/decoration/catalog.ts'
import DecorationModel from '#/scene/decor/DecorationModel.tsx'
import { CEILING_HEIGHT_M, LIGHT_GLOW_COLOR } from '#/theme.ts'
import type { DecorationConfig } from '#/types.ts'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Color } from 'three'

type Props = {
  item: DecorationConfig
  className?: string
}

// Small turntable view of one decoration item, shown lit. The camera fits
// the model and keeps it centered as its size changes.
export default function ModelPreview({ item, className }: Props) {
  const kind = decorationKind(item.kind)
  if (!kind) return null
  const glow = new Color(LIGHT_GLOW_COLOR)
  const centered: DecorationConfig = { ...item, position: [0, 0], rotation: 0 }
  // Centered on where the item actually sits, so a door standing on the
  // floor is in frame and a wall light hangs at its own height. Ceiling
  // items hang from a virtual ceiling 1.4 m up, so the cord does not
  // dominate the frame.
  const lift =
    kind.mount === 'ceiling' ? -(CEILING_HEIGHT_M - 1.4) : -mountHeight(kind, item.params)
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, position: [3, 2.4, 3] }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} />
        <Bounds fit clip observe margin={1.3} maxDuration={0}>
          <group position={[0, lift, 0]}>
            <DecorationModel item={centered} all={[centered]} state={{ on: true, level: 0.8, glow: [glow.r, glow.g, glow.b] }} />
          </group>
        </Bounds>
        <OrbitControls makeDefault enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  )
}
