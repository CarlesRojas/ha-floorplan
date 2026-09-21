import type { ThreeEvent } from '@react-three/fiber'
import { useRef } from 'react'

// How a click and a press are told apart in 3D. A click acts on the device.
// A right click, or a long press on a touch screen, asks Home Assistant for
// its dialog instead, where brightness, color and the rest live. Double
// click is not used for it: it would toggle the device twice on the way.
const LONG_PRESS_MS = 500
// A press that wanders this far is the viewer orbiting, not a long press.
const SLOP_PX = 8

export function usePressActions(onClick?: () => void, onOpen?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const from = useRef<[number, number] | null>(null)
  const opened = useRef(false)

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    from.current = null
  }

  if (!onClick && !onOpen) return {}

  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      // The long press already opened the dialog, so this release is spent.
      if (opened.current) {
        opened.current = false
        return
      }
      onClick?.()
    },
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      e.nativeEvent.preventDefault()
      onOpen?.()
    },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      cancel()
      opened.current = false
      if (!onOpen) return
      from.current = [e.nativeEvent.clientX, e.nativeEvent.clientY]
      timer.current = setTimeout(() => {
        opened.current = true
        onOpen()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      const start = from.current
      if (!start) return
      const dx = e.nativeEvent.clientX - start[0]
      const dy = e.nativeEvent.clientY - start[1]
      if (Math.hypot(dx, dy) > SLOP_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerOver: () => (document.body.style.cursor = 'pointer'),
    onPointerOut: () => {
      cancel()
      document.body.style.cursor = ''
    },
  }
}
