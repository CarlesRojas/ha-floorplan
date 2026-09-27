import { EDITOR_SELECTED_COLOR } from '#/theme.ts'
import { setComposed } from '#/scene/warm.ts'
import { useFrame, useThree } from '@react-three/fiber'
import { N8AOPostPass } from 'n8ao'
import {
  EffectComposer,
  EffectPass,
  KernelSize,
  OutlineEffect,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing'
import { useEffect, useRef } from 'react'
import { Color, HalfFloatType, type Object3D } from 'three'

// The frame is drawn into a buffer and finished from there, in a few steps:
//
// Ambient occlusion darkens where things meet, the foot of a wall, under a
// sofa, the corner of a shelf, which is the shading a small model most
// misses. Without it the flat reads as cut-outs standing on a floor.
//
// Tone mapping then brings the range of light down to what the screen can
// show. Three applied the same filmic curve on its own when it drew to the
// screen; drawing into a buffer turns that off, so it is done here.
//
// A light vignette darkens the corners of the frame a touch, so the eye
// settles on the home rather than the space around it.
//
// Drawing into a buffer loses the antialiasing the screen gave for free, so
// edges are smoothed again at the end.
//
// In the editor, whatever is picked is traced in blue, the 3D version of the
// blue the plan draws it in. The edge is the object's own silhouette, so a
// sofa is outlined as a sofa rather than as the box around it, and where
// something stands in front of it the edge carries on, fainter.

// How far the occlusion reaches, in meters, and how much it darkens. A
// flat is about ten meters across, so the reach is a fraction of one.
const AO_RADIUS_M = 0.35
const AO_FALLOFF = 1
const AO_INTENSITY = 2.5
// Where the vignette begins, from the middle out, and how dark it gets.
const VIGNETTE_OFFSET = 0.35
const VIGNETTE_DARKNESS = 0.7
// The outline's thickness and the edge where something stands in front of
// the picked one.
const OUTLINE_STRENGTH = 4
const OUTLINE_HIDDEN_SHARE = 0.35

// A device with only a touch screen is taken to be a phone or a tablet, and
// gets the occlusion at half resolution and with fewer samples.
function coarseOnly(): boolean {
  if (typeof matchMedia !== 'function') return false
  return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches
}

type Props = {
  // The name of the object to outline, as the scene gives it, `null` for
  // none. The card never passes one, and gets no outline pass at all.
  selected?: string | null
}

type Pipeline = {
  composer: EffectComposer
  outline: OutlineEffect | null
}

export default function Effects({ selected }: Props) {
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const dpr = useThree(state => state.viewport.dpr)

  // The picked object is found by name, and found again whenever the one in
  // hand has left the scene, which happens when a model is rebuilt.
  const found = useRef<Object3D | null>(null)
  // Kept in a ref rather than memoised: the passes are objects that are
  // changed in place every frame, which is what refs are for.
  const pipeline = useRef<Pipeline | null>(null)
  const outlined = selected !== undefined
  useEffect(() => {
    // Half float, so the scene keeps its range until it is tone mapped.
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType })
    composer.addPass(new RenderPass(scene, camera))
    const ao = new N8AOPostPass(scene, camera)
    ao.setQualityMode(coarseOnly() ? 'Low' : 'Medium')
    ao.configuration.halfRes = coarseOnly()
    ao.configuration.aoRadius = AO_RADIUS_M
    ao.configuration.distanceFalloff = AO_FALLOFF
    ao.configuration.intensity = AO_INTENSITY
    composer.addPass(ao)
    let outline: OutlineEffect | null = null
    if (outlined) {
      const blue = new Color(EDITOR_SELECTED_COLOR)
      outline = new OutlineEffect(scene, camera, {
        edgeStrength: OUTLINE_STRENGTH,
        visibleEdgeColor: blue.getHex(),
        hiddenEdgeColor: blue.clone().multiplyScalar(OUTLINE_HIDDEN_SHARE).getHex(),
        blur: true,
        kernelSize: KernelSize.SMALL,
        xRay: true,
        multisampling: 4,
      })
    }
    composer.addPass(
      new EffectPass(
        camera,
        ...(outline ? [outline] : []),
        new SMAAEffect({ preset: SMAAPreset.HIGH }),
        new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
        new VignetteEffect({ offset: VIGNETTE_OFFSET, darkness: VIGNETTE_DARKNESS }),
      ),
    )
    pipeline.current = { composer, outline }
    found.current = null
    // The shaders the scene needs are now the ones for drawing into a
    // buffer, and the ones built ahead of a light change must match.
    setComposed(gl, true)
    return () => {
      setComposed(gl, false)
      pipeline.current = null
      // The composer disposes of its passes, and they of their effects.
      composer.dispose()
    }
  }, [gl, scene, camera, outlined])

  useEffect(() => {
    // The composer sizes its buffers from the canvas, which follows the
    // pixel ratio, and this only tells it the canvas has changed.
    pipeline.current?.composer.setSize(size.width, size.height, false)
  }, [gl, scene, camera, outlined, size.width, size.height, dpr])

  useFrame((_, delta) => {
    const run = pipeline.current
    if (!run) return
    if (run.outline) {
      const held = found.current
      if (!selected) {
        if (held) run.outline.selection.clear()
        found.current = null
      } else if (!held || held.name !== selected || !held.parent) {
        found.current = scene.getObjectByName(selected) ?? null
        run.outline.selection.clear()
        if (found.current) run.outline.selection.add(found.current)
      }
    }
    run.composer.render(delta)
    // A priority above zero takes the drawing over from the default loop,
    // which is what lets the composer be the one to draw the frame.
  }, 1)

  return null
}
