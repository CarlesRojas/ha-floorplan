import type { Mode, Tool } from '#/editor/types.ts'
import type { SkyMode } from '#/scene/Sky.tsx'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS } from '#/theme.ts'
import {
  type IconDefinition,
  faArrowPointer,
  faDrawPolygon,
  faExpand,
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

const TOOLS: Record<Mode, (Action & { id: Tool })[]> = {
  rooms: [
    {
      id: 'select',
      icon: faArrowPointer,
      title: 'Select',
      description: 'Pick rooms, drag corners, edges and rooms.',
      shortcut: 'V',
    },
    {
      id: 'draw',
      icon: faDrawPolygon,
      title: 'Draw room',
      description: 'Click corners, close on the first one.',
      shortcut: 'D',
    },
  ],
  devices: [
    {
      id: 'select',
      icon: faArrowPointer,
      title: 'Select',
      description: 'Pick a room, then drag its devices.',
      shortcut: 'V',
    },
  ],
  decoration: [
    {
      id: 'select',
      icon: faArrowPointer,
      title: 'Select',
      description: 'Pick a room, then place and drag items.',
      shortcut: 'V',
    },
  ],
}

type Props = {
  mode: Mode
  tool: Tool
  onTool: (tool: Tool) => void
  onFit: () => void
  showLengths: boolean
  onShowLengths: (value: boolean) => void
  showPreview: boolean
  onShowPreview: () => void
  sky: SkyMode
  onSky: () => void
  sunDirection: number
  onSunDirection: (degrees: number) => void
  // Called when the slider is let go, to save the new direction.
  onSunDirectionDone: () => void
}

export default function Toolbar({
  mode,
  tool,
  onTool,
  onFit,
  showLengths,
  onShowLengths,
  showPreview,
  onShowPreview,
  sky,
  onSky,
  sunDirection,
  onSunDirection,
  onSunDirectionDone,
}: Props) {
  const color = EDITOR_MODE_COLORS[mode]
  return (
    <div className="flex items-center gap-1">
      {TOOLS[mode].map(t => (
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
      {/* Day and night, for looking at the room in both without waiting for
          the sun to come round. */}
      <ToolButton
        action={{
          id: 'sky',
          icon: sky === 'night' ? faMoon : faSun,
          title: sky === 'night' ? 'Night' : 'Day',
          description: 'Light the preview as day or as night.',
          shortcut: 'N',
        }}
        active={sky === 'night'}
        color={color}
        toggle
        onClick={onSky}
      />
      {/* Which way the sun comes from. It is saved with the card, so the
          room outside the editor is lit the same way. */}
      <SunDial degrees={sunDirection} color={color} onChange={onSunDirection} onDone={onSunDirectionDone} />
      {mode === 'rooms' && (
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
      )}
    </div>
  )
}

const POINTS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west']

// The sun's bearing, behind a button that opens a slider for it. The arrow
// points the way the light falls, so it faces away from the sun.
function SunDial({
  degrees,
  color,
  onChange,
  onDone,
}: {
  degrees: number
  color: string
  onChange: (degrees: number) => void
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  // A press anywhere else puts it away.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [open])
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-label={`Sun from the ${compass(degrees)}`}
        onClick={() => setOpen(!open)}
        style={open ? { color } : undefined}
        className="flex size-10 items-center justify-center rounded-xl text-(--primary-text-color) hover:bg-(--secondary-background-color)"
      >
        <FontAwesomeIcon
          icon={faLocationArrow}
          className="size-4"
          style={{ transform: `rotate(${degrees + 135}deg)` }}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl border border-(--divider-color) bg-(--card-background-color) p-3 shadow-lg">
          <p className="flex items-center justify-between text-sm font-semibold">
            Sun direction
            <kbd className="rounded border border-(--divider-color) px-1 font-mono text-[11px] font-normal">S</kbd>
          </p>
          <p className="mt-0.5 text-sm text-(--secondary-text-color)">
            From the {compass(degrees)}, {degrees}°. Saved with the card.
          </p>
          <input
            type="range"
            className="mt-2 w-full"
            min={0}
            max={345}
            step={15}
            value={degrees}
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

// The nearest compass point to a bearing, for naming where the sun is.
function compass(degrees: number) {
  const turns = ((degrees % 360) + 360) % 360
  return POINTS[Math.round(turns / 45) % POINTS.length]
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
