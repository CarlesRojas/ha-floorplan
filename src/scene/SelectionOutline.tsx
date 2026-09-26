import { EDITOR_SELECTED_COLOR } from '#/theme.ts'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { HalfFloatType, Vector2, WebGLRenderTarget, type Object3D } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

// A blue glow around whatever is picked in the editor, the 3D version of the
// blue the plan draws it in. It traces the object's own silhouette on screen,
// so a sofa is outlined as a sofa rather than as the box around it, and where
// something stands in front of it the edge carries on, fainter, so a lamp
// behind a sofa still reads as picked.
//
// It needs the scene drawn into a buffer first and the outline laid over it,
// which costs a pass. So it is only mounted while something is picked; with
// nothing picked the scene is drawn straight to the screen as always, and the
// card itself never pays for it.

// How the edge is drawn. Thickness is in pixels, glow is how far it spreads.
const STRENGTH = 4
const GLOW = 0.6
const THICKNESS = 1.6
// The edge where something else stands in front of the picked one.
const HIDDEN_SHARE = 0.35

type Props = {
  // The name of the object to outline, as the scene gives it.
  target: string
}

export default function SelectionOutline({ target }: Props) {
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)

  // The picked object is found by name, and found again whenever the one in
  // hand has left the scene, which happens when a model is rebuilt.
  const found = useRef<Object3D | null>(null)
  // Kept in a ref rather than memoised: the passes are three objects that
  // are changed in place every frame, which is what refs are for.
  const pipeline = useRef<{ composer: EffectComposer; outline: OutlinePass } | null>(null)
  useEffect(() => {
    // Half float, so the scene keeps its range until the output pass tone
    // maps it the way the screen would have. Multisampled, since drawing
    // into a buffer loses the antialiasing the screen gave for free.
    const buffer = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 })
    const composer = new EffectComposer(gl, buffer)
    const outline = new OutlinePass(new Vector2(1, 1), scene, camera)
    outline.visibleEdgeColor.set(EDITOR_SELECTED_COLOR)
    outline.hiddenEdgeColor.set(EDITOR_SELECTED_COLOR).multiplyScalar(HIDDEN_SHARE)
    outline.edgeStrength = STRENGTH
    outline.edgeGlow = GLOW
    outline.edgeThickness = THICKNESS
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(outline)
    // Tone mapping and the screen's colour space, which drawing straight to
    // the screen applied on its own. Without it the room comes out flat.
    const output = new OutputPass()
    composer.addPass(output)
    pipeline.current = { composer, outline }
    found.current = null
    return () => {
      pipeline.current = null
      // The composer only lets go of its own buffers. The outline pass
      // holds several of its own, and its materials, which would otherwise
      // stay on the graphics card each time something else is picked.
      outline.dispose()
      output.dispose()
      composer.dispose()
    }
  }, [gl, scene, camera])

  useEffect(() => {
    pipeline.current?.composer.setPixelRatio(gl.getPixelRatio())
    pipeline.current?.composer.setSize(size.width, size.height)
  }, [gl, scene, camera, size.width, size.height])

  useFrame(() => {
    const run = pipeline.current
    if (!run) return
    const held = found.current
    if (!held || held.name !== target || !held.parent) {
      found.current = scene.getObjectByName(target) ?? null
      run.outline.selectedObjects = found.current ? [found.current] : []
    }
    run.composer.render()
    // A priority above zero takes the drawing over from the default loop,
    // which is what lets the composer be the one to draw the frame.
  }, 1)

  return null
}
