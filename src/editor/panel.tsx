import { SIGNAL_HINTS, SIGNAL_ICONS, SIGNAL_LABELS } from '#/editor/signalIcons.ts'
import { cn } from '#/lib/utils.ts'
import type { Signal } from '#/signals.ts'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, type ReactNode } from 'react'

// Pieces both sidebars share.

// Stays at the top of the sidebar while the rest of it scrolls.
export function Sticky({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(// Under the mode switch, which is the sticky block above it.
      'sticky top-13 z-10 -mx-1 flex flex-col gap-2 bg-(--card-background-color) px-1 pb-2', className)}>
      {children}
    </div>
  )
}

// Title of whatever is selected, with the way back to the list.
export function SelectedHeader({
  title,
  tag,
  accent,
  onBack,
}: {
  title: string
  tag?: ReactNode
  accent: string
  onBack: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
      {tag}
      <button
        type="button"
        aria-label="Back to the list"
        onClick={onBack}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-(--secondary-background-color)"
        style={{ color: accent }}
      >
        <FontAwesomeIcon icon={faXmark} className="size-4" />
      </button>
    </div>
  )
}

// The controls a device has, or the ones an item can express.
export function Signals({ signals, accent, size = 'md' }: { signals: Signal[]; accent?: string; size?: 'sm' | 'md' }) {
  if (signals.length === 0) return null
  if (size === 'sm') {
    return (
      <span className="flex shrink-0 items-center gap-1">
        {signals.map(s => (
          <FontAwesomeIcon
            key={s}
            icon={SIGNAL_ICONS[s]}
            title={SIGNAL_HINTS[s]}
            className="size-3 text-(--secondary-text-color)"
          />
        ))}
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {signals.map(s => (
        <span
          key={s}
          title={SIGNAL_HINTS[s]}
          className="flex items-center gap-1.5 rounded-full border border-current px-2 py-0.5 text-xs font-semibold"
          style={{ color: accent }}
        >
          <FontAwesomeIcon icon={SIGNAL_ICONS[s]} className="size-3" />
          {SIGNAL_LABELS[s]}
        </span>
      ))}
    </div>
  )
}

// Drag to make the 3D preview above it taller or shorter.
export function PreviewHandle({ onDrag }: { onDrag: (deltaY: number) => void }) {
  const start = useRef(0)
  return (
    <div
      className="group -mt-1 flex h-3 cursor-row-resize touch-none items-center justify-center"
      onPointerDown={e => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = e.clientY
      }}
      onPointerMove={e => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        onDrag(e.clientY - start.current)
        start.current = e.clientY
      }}
      onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)}
    >
      <span className="h-1 w-10 rounded-full bg-(--divider-color) group-hover:bg-(--primary-color)" />
    </div>
  )
}
