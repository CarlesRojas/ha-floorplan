import type { Mode } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS } from '#/theme.ts'
import { type IconDefinition, faCouch, faLightbulb, faObjectGroup } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { motion } from 'motion/react'

const MODES: { id: Mode; label: string; icon: IconDefinition }[] = [
  { id: 'rooms', label: 'Rooms', icon: faObjectGroup },
  { id: 'devices', label: 'Devices', icon: faLightbulb },
  { id: 'decoration', label: 'Decoration', icon: faCouch },
]

type Props = {
  mode: Mode
  onMode: (mode: Mode) => void
  // Too narrow for the names, so the icons stand on their own.
  compact?: boolean
}

// Segmented control. The colored background slides to the active mode and
// takes that mode's color.
export default function ModeSwitch({ mode, onMode, compact = false }: Props) {
  return (
    // As wide as its names and no wider, and never wider than what holds it.
    <div className="flex w-fit max-w-full items-center gap-1 rounded-xl bg-(--secondary-background-color) p-1">
      {MODES.map(m => {
        const active = mode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onMode(m.id)}
            title={m.label}
            aria-label={m.label}
            className={cn(
              'relative flex h-8 min-w-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-(--primary-text-color)',
              compact ? 'px-2.5' : 'px-3',
              active && 'text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId="editor-mode-background"
                className="absolute inset-0 rounded-lg"
                initial={false}
                animate={{ backgroundColor: EDITOR_MODE_COLORS[m.id] }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <FontAwesomeIcon icon={m.icon} className="relative size-3.5 shrink-0" />
            {!compact && <span className="relative truncate">{m.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
