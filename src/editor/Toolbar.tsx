import type { Trace } from '#/editor/trace.ts'
import type { Tool } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_ACCENT_COLOR } from '#/theme.ts'
import {
  type IconDefinition,
  faArrowPointer,
  faDrawPolygon,
  faExpand,
  faImage,
  faCube,
  faLocationArrow,
  faMoon,
  faRuler,
  faSun,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'

type Action = {
  id: string
  icon: IconDefinition
  title: string
  description: string
  shortcut: string
}

const TOOLS: (Action & { id: Tool })[] = [
  {
    id: 'select',
    icon: faArrowPointer,
    title: 'Select',
    description: 'Pick rooms and items, drag them, drag corners and edges.',
    shortcut: 'V',
  },
  {
    id: 'draw',
    icon: faDrawPolygon,
    title: 'Draw room',
    description: 'Click corners, close on the first one.',
    shortcut: 'D',
  },
]

type Props = {
  tool: Tool
  onTool: (tool: Tool) => void
  onFit: () => void
  showLengths: boolean
  onShowLengths: (value: boolean) => void
  showPreview: boolean
  onShowPreview: () => void
  hour: number
  onHour: (hour: number) => void
  sunDirection: number
  onSunDirection: (degrees: number) => void
  // Called when the slider is let go, to save the new direction.
  onSunDirectionDone: () => void
  trace: Trace | null
  onTrace: (trace: Trace | null) => void
  onPickTrace: (file: File) => Promise<void>
  adjustingTrace: boolean
  onAdjustingTrace: (value: boolean) => void
}

export default function Toolbar({
  tool,
  onTool,
  onFit,
  showLengths,
  onShowLengths,
  showPreview,
  onShowPreview,
  hour,
  onHour,
  sunDirection,
  onSunDirection,
  onSunDirectionDone,
  trace,
  onTrace,
  onPickTrace,
  adjustingTrace,
  onAdjustingTrace,
}: Props) {
  const color = EDITOR_ACCENT_COLOR
  return (
    <div className="flex items-center gap-1">
      {TOOLS.map(t => (
        <ToolButton key={t.id} action={t} active={tool === t.id} color={color} onClick={() => onTool(t.id)} />
      ))}
      <span className="mx-1 h-5 w-px bg-(--divider-color)" />
      <ToolButton
        action={{ id: 'fit', icon: faExpand, title: 'Fit view', description: 'Frame all rooms.', shortcut: 'F' }}
        color={color}
        onClick={onFit}
      />
      <ToolButton
        action={{
          id: 'preview',
          icon: faCube,
          title: '3D preview',
          description: 'Floating live preview of the card.',
          shortcut: 'P',
        }}
        active={showPreview}
        color={color}
        toggle
        onClick={onShowPreview}
      />
      {/* The hour of the day the preview is lit at, so a room can be seen
          at noon, at dusk or at night without waiting for it. */}
      <Dial
        icon={hour > 6.5 && hour < 21.5 ? faSun : faMoon}
        label="Time of day"
        shortcut="N"
        note={`${clock(hour)}. The preview only, never the card.`}
        color={color}
        value={hour}
        min={0}
        max={23.5}
        step={0.5}
        onChange={onHour}
      />
      {/* Which way the sun comes from. It is saved with the card, so the
          room outside the editor is lit the same way. */}
      <Dial
        icon={faLocationArrow}
        label={`Sun from the ${compass(sunDirection)}`}
        shortcut="S"
        note={`${sunDirection}°, saved with the card.`}
        color={color}
        value={sunDirection}
        min={0}
        max={345}
        step={15}
        spin={sunDirection + 135}
        onChange={onSunDirection}
        onDone={onSunDirectionDone}
      />
      <ToolButton
        action={{
          id: 'lengths',
          icon: faRuler,
          title: 'Edge lengths',
          description: 'Show the length of each edge of the selected room.',
          shortcut: 'L',
        }}
        active={showLengths}
        color={color}
        toggle
        onClick={() => onShowLengths(!showLengths)}
      />
      <TracePanel
        color={color}
        trace={trace}
        onTrace={onTrace}
        onPick={onPickTrace}
        adjusting={adjustingTrace}
        onAdjusting={onAdjustingTrace}
      />
    </div>
  )
}

const POINTS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west']

// The nearest compass point to a bearing, for naming where the sun is.
function compass(degrees: number) {
  const turns = ((degrees % 360) + 360) % 360
  return POINTS[Math.round(turns / 45) % POINTS.length]
}

// The hour of a day, as a clock.
function clock(hour: number) {
  const h = Math.floor(hour) % 24
  const m = Math.round((hour - Math.floor(hour)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Puts the panel a button opened away on a press anywhere else.
function useAway(open: boolean, close: () => void) {
  const box = useRef<HTMLDivElement>(null)
  const latest = useRef(close)
  useEffect(() => {
    latest.current = close
  })
  useEffect(() => {
    if (!open) return
    // The composed path, since inside the editor's shadow root the target
    // is retargeted to the host by the time the event reaches the document.
    const away = (e: PointerEvent) => {
      if (box.current && !e.composedPath().includes(box.current)) latest.current()
    }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [open])
  return box
}

// The picture of a plan to trace the rooms over: choosing it, how much it
// shows, how wide it is, moving and sizing it on the plan, and taking it
// away again.
function TracePanel({
  color,
  trace,
  onTrace,
  onPick,
  adjusting,
  onAdjusting,
}: {
  color: string
  trace: Trace | null
  onTrace: (trace: Trace | null) => void
  onPick: (file: File) => Promise<void>
  adjusting: boolean
  onAdjusting: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const box = useAway(open, () => setOpen(false))
  const file = useRef<HTMLInputElement>(null)
  const pick = async (chosen: File | undefined) => {
    if (!chosen) return
    try {
      await onPick(chosen)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }
  const button =
    'rounded-lg border border-(--divider-color) px-2.5 py-1.5 text-sm hover:bg-(--secondary-background-color)'
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-label="Trace image"
        onClick={() => setOpen(!open)}
        style={open || trace ? { color } : undefined}
        className="flex size-10 items-center justify-center rounded-xl text-(--primary-text-color) hover:bg-(--secondary-background-color)"
      >
        <FontAwesomeIcon icon={faImage} className="size-4" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 flex w-64 flex-col gap-2 rounded-xl border border-(--divider-color) bg-(--card-background-color) p-3 shadow-lg">
          <p className="text-sm font-semibold">Trace image</p>
          <p className="text-sm text-(--secondary-text-color)">
            A picture of your plan under the drawing, to trace the rooms over. It stays in this browser and is never
            saved with the card.
          </p>
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              void pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {failed && <p className="text-sm text-(--error-color)">That file could not be read as a picture.</p>}
          {trace && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Opacity
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={trace.opacity}
                  style={{ accentColor: color }}
                  onChange={e => onTrace({ ...trace, opacity: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                Width in meters
                <input
                  type="number"
                  min={0.5}
                  step={0.1}
                  value={Math.round(trace.width * 100) / 100}
                  className="w-24 rounded-lg border border-(--divider-color) bg-transparent px-2 py-1 text-right"
                  onChange={e => {
                    const width = Number(e.target.value)
                    if (width >= 0.5) onTrace({ ...trace, width })
                  }}
                />
              </label>
              <button
                type="button"
                className={button}
                style={adjusting ? { borderColor: color, color } : undefined}
                onClick={() => onAdjusting(!adjusting)}
              >
                {adjusting ? 'Done moving' : 'Move and resize'}
              </button>
            </>
          )}
          <div className="flex gap-2">
            <button type="button" className={cn(button, 'flex-1')} onClick={() => file.current?.click()}>
              {trace ? 'Replace' : 'Choose image'}
            </button>
            {trace && (
              <button
                type="button"
                className={cn(button, 'flex-1')}
                onClick={() => {
                  onTrace(null)
                  onAdjusting(false)
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// A button that opens a slider under itself. The sun's bearing turns its
// arrow to point the way the light falls, so it faces away from the sun.
function Dial({
  icon,
  label,
  shortcut,
  note,
  color,
  value,
  min,
  max,
  step,
  spin,
  onChange,
  onDone,
}: {
  icon: IconDefinition
  label: string
  shortcut: string
  note: string
  color: string
  value: number
  min: number
  max: number
  step: number
  spin?: number
  onChange: (value: number) => void
  onDone?: () => void
}) {
  const [open, setOpen] = useState(false)
  const box = useAway(open, () => setOpen(false))
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(!open)}
        style={open ? { color } : undefined}
        className="flex size-10 items-center justify-center rounded-xl text-(--primary-text-color) hover:bg-(--secondary-background-color)"
      >
        <FontAwesomeIcon
          icon={icon}
          className="size-4"
          style={spin === undefined ? undefined : { transform: `rotate(${spin}deg)` }}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl border border-(--divider-color) bg-(--card-background-color) p-3 shadow-lg">
          <p className="flex items-center justify-between text-sm font-semibold">
            {label}
            <kbd className="rounded border border-(--divider-color) px-1 font-mono text-[11px] font-normal">
              {shortcut}
            </kbd>
          </p>
          <p className="mt-0.5 text-sm text-(--secondary-text-color)">{note}</p>
          <input
            type="range"
            className="mt-2 w-full"
            min={min}
            max={max}
            step={step}
            value={value}
            style={{ accentColor: color }}
            onChange={e => onChange(Number(e.target.value))}
            onPointerUp={onDone}
            onKeyUp={onDone}
          />
        </div>
      )}
    </div>
  )
}

// A toggle shows its state through the icon color alone, a tool through a
// filled background.
function ToolButton({
  action,
  active,
  color,
  toggle = false,
  onClick,
}: {
  action: Action
  active?: boolean
  color: string
  toggle?: boolean
  onClick: () => void
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={action.title}
        onClick={onClick}
        style={active ? (toggle ? { color } : { backgroundColor: color }) : undefined}
        className={cn(
          'flex size-10 items-center justify-center rounded-xl text-(--primary-text-color) hover:bg-(--secondary-background-color)',
          active && !toggle && 'text-white',
        )}
      >
        <FontAwesomeIcon icon={action.icon} className="size-4" />
      </button>
      <div className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden w-52 rounded-xl border border-(--divider-color) bg-(--card-background-color) p-3 shadow-lg group-hover:block">
        <p className="flex items-center justify-between text-sm font-semibold">
          {action.title}
          <kbd className="rounded border border-(--divider-color) px-1 font-mono text-[11px] font-normal">
            {action.shortcut}
          </kbd>
        </p>
        <p className="mt-0.5 text-sm text-(--secondary-text-color)">{action.description}</p>
      </div>
    </div>
  )
}
