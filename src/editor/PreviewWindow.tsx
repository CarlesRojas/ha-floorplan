import { EDITOR_PREVIEW_DEFAULT_WIDTH_PX, EDITOR_PREVIEW_MIN_WIDTH_PX } from '#/constants.ts'
import { aspectRatioNumber } from '#/lib/aspect.ts'
import Scene from '#/scene/Scene.tsx'
import { CARD_CORNER_RADIUS_PX } from '#/theme.ts'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { faUpDownLeftRight, faUpRightAndDownLeftFromCenter, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState } from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  onClose: () => void
}

// Floating live preview of the card, with the card's aspect ratio. Three
// round handles sit half outside its corners: drag at the top left, close
// at the top right, resize at the bottom right.
export default function PreviewWindow({ hass, config, onClose }: Props) {
  const aspect = aspectRatioNumber(config.aspect_ratio)
  const [width, setWidth] = useState(EDITOR_PREVIEW_DEFAULT_WIDTH_PX)
  const [position, setPosition] = useState(() => ({
    x: Math.max(16, window.innerWidth - EDITOR_PREVIEW_DEFAULT_WIDTH_PX - 380),
    y: Math.max(16, window.innerHeight - EDITOR_PREVIEW_DEFAULT_WIDTH_PX / aspect - 40),
  }))
  const drag = useRef<{
    kind: 'move' | 'resize'
    startX: number
    startY: number
    x: number
    y: number
    width: number
  } | null>(null)

  const start = (kind: 'move' | 'resize') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { kind, startX: e.clientX, startY: e.clientY, x: position.x, y: position.y, width }
  }

  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.kind === 'move') setPosition({ x: d.x + dx, y: d.y + dy })
    else setWidth(Math.max(EDITOR_PREVIEW_MIN_WIDTH_PX, Math.max(d.width + dx, (d.width / aspect + dy) * aspect)))
  }

  const end = (e: React.PointerEvent) => {
    drag.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Handles are 36 px and overflow the corner by a quarter of that.
  const handle =
    'absolute z-10 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-(--primary-color) bg-(--card-background-color) text-(--primary-text-color) shadow-md select-none'

  return (
    <div
      className="fixed z-40"
      style={{ left: position.x, top: position.y, width, height: width / aspect }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div
        className="h-full w-full overflow-hidden bg-(--card-background-color) shadow-2xl"
        style={{ borderRadius: CARD_CORNER_RADIUS_PX }}
      >
        <Scene hass={hass} config={config} />
      </div>
      <div
        className={`${handle} -top-[9px] -left-[9px] cursor-move touch-none`}
        onPointerDown={start('move')}
        onPointerMove={move}
        onPointerUp={end}
        aria-label="Move preview"
      >
        <FontAwesomeIcon icon={faUpDownLeftRight} className="size-4" />
      </div>
      <button
        type="button"
        className={`${handle} -top-[9px] -right-[9px]`}
        onClick={onClose}
        aria-label="Close preview"
      >
        <FontAwesomeIcon icon={faXmark} className="size-4" />
      </button>
      <div
        className={`${handle} -right-[9px] -bottom-[9px] cursor-nwse-resize touch-none`}
        onPointerDown={start('resize')}
        onPointerMove={move}
        onPointerUp={end}
        aria-label="Resize preview"
      >
        <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} className="size-4 rotate-90" />
      </div>
    </div>
  )
}
