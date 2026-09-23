// A full window view of one decoration model, for checking a model up close
// while working on it. Served by the dev server, never built into the card:
//
//   http://localhost:5173/src/dev/preview.html?kind=light_pendant&variant=nagoya
//
// kind and variant pick the model, on=1 switches it on in a dark room, and
// any other parameter is passed to the model as its own, so &size=0.3 or
// &cord=0.5 set those. Drag to turn it, scroll to zoom.
import { decorationKind, mountHeight } from '#/decoration/catalog.ts'
import DecorationModel from '#/scene/decor/DecorationModel.tsx'
import { CEILING_HEIGHT_M, LIGHT_GLOW_COLOR } from '#/theme.ts'
import type { DecorationConfig } from '#/types.ts'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import { Color } from 'three'

const query = new URLSearchParams(location.search)
const on = query.get('on') === '1'
const kind = decorationKind(query.get('kind') ?? 'light_pendant')
const params: Record<string, number> = {}
for (const [key, value] of query) {
  if (['kind', 'variant', 'on'].includes(key)) continue
  if (Number.isFinite(Number(value))) params[key] = Number(value)
}
const item: DecorationConfig = {
  id: 'preview',
  kind: kind?.id ?? 'light_pendant',
  variant: query.get('variant') ?? undefined,
  room: 'preview',
  position: [0, 0],
  params,
}
const glow = new Color(LIGHT_GLOW_COLOR)
// Ceiling items hang from a ceiling brought down near the floor, so a long
// cord does not push the model out of frame.
const lift = kind?.mount === 'ceiling' ? -(CEILING_HEIGHT_M - 1.4) : kind ? -mountHeight(kind, params) : 0

const root = document.createElement('div')
root.style.cssText = `width:100vw;height:100vh;background:${on ? '#2a2a2e' : '#d9d6d0'}`
document.body.appendChild(root)
createRoot(root).render(
  kind ? (
    <Canvas shadows dpr={2} camera={{ fov: 30, position: [0, 0.3, 3] }}>
      <ambientLight intensity={on ? 0.15 : 0.7} />
      <directionalLight position={[3, 6, 4]} intensity={on ? 0.1 : 1.2} />
      <Bounds fit clip observe margin={1.15} maxDuration={0}>
        <group position={[0, lift, 0]}>
          <DecorationModel
            item={item}
            all={[item]}
            state={{ on, level: 1, levels: { open: 1 }, glow: [glow.r, glow.g, glow.b] }}
          />
        </group>
      </Bounds>
      <OrbitControls makeDefault />
    </Canvas>
  ) : (
    <p style={{ padding: 16, fontFamily: 'sans-serif' }}>No kind called {query.get('kind')}.</p>
  ),
)
