import type { Mode, Tool } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS } from '#/theme.ts'
import { type IconDefinition, faArrowPointer, faDrawPolygon, faExpand } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

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
}

type Props = {
  mode: Mode
  tool: Tool
  onTool: (tool: Tool) => void
  onFit: () => void
}

export default function Toolbar({ mode, tool, onTool, onFit }: Props) {
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
    </div>
  )
}

function ToolButton({
  action,
  active,
  color,
  onClick,
}: {
  action: Action
  active?: boolean
  color: string
  onClick: () => void
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={action.title}
        onClick={onClick}
        style={active ? { backgroundColor: color } : undefined}
        className={cn(
          'flex size-10 items-center justify-center rounded-xl text-(--primary-text-color) hover:bg-(--secondary-background-color)',
          active && 'text-white',
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
