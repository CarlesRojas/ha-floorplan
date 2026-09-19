import type { Tool } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import {
  type IconDefinition,
  faArrowPointer,
  faDrawPolygon,
  faExpand,
  faMinimize,
  faMaximize,
  faUpDownLeftRight,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

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
    description: 'Pick rooms, drag corners and rooms.',
    shortcut: 'V',
  },
  {
    id: 'draw',
    icon: faDrawPolygon,
    title: 'Draw room',
    description: 'Click corners, close on the first one.',
    shortcut: 'D',
  },
  { id: 'plan', icon: faUpDownLeftRight, title: 'Move plan', description: 'Drag the floor plan image.', shortcut: 'P' },
]

type Props = {
  tool: Tool
  fullscreen: boolean
  onTool: (tool: Tool) => void
  onFit: () => void
  onFullscreen: (value: boolean) => void
}

export default function Toolbar({ tool, fullscreen, onTool, onFit, onFullscreen }: Props) {
  return (
    <div className="flex items-center gap-1">
      {TOOLS.map(t => (
        <ToolButton key={t.id} action={t} active={tool === t.id} onClick={() => onTool(t.id)} />
      ))}
      <span className="mx-1 h-5 w-px bg-(--divider-color)" />
      <ToolButton
        action={{ id: 'fit', icon: faExpand, title: 'Fit view', description: 'Frame all rooms.', shortcut: 'F' }}
        onClick={onFit}
      />
      <ToolButton
        action={{
          id: 'fullscreen',
          icon: fullscreen ? faMinimize : faMaximize,
          title: fullscreen ? 'Exit fullscreen' : 'Fullscreen',
          description: fullscreen ? 'Back to the dialog and its preview.' : 'Use the whole window.',
          shortcut: 'Shift+F',
        }}
        onClick={() => onFullscreen(!fullscreen)}
      />
    </div>
  )
}

function ToolButton({ action, active, onClick }: { action: Action; active?: boolean; onClick: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={action.title}
        onClick={onClick}
        className={cn(
          'flex size-9 items-center justify-center rounded-lg text-(--primary-text-color) hover:bg-(--secondary-background-color)',
          active && 'bg-(--primary-color) text-white hover:bg-(--primary-color)',
        )}
      >
        <FontAwesomeIcon icon={action.icon} className="size-4" />
      </button>
      <div className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden w-48 rounded-lg border border-(--divider-color) bg-(--card-background-color) p-2 shadow-lg group-hover:block">
        <p className="flex items-center justify-between text-xs font-semibold">
          {action.title}
          <kbd className="rounded border border-(--divider-color) px-1 font-mono text-[10px] font-normal">
            {action.shortcut}
          </kbd>
        </p>
        <p className="mt-0.5 text-[11px] text-(--secondary-text-color)">{action.description}</p>
      </div>
    </div>
  )
}
