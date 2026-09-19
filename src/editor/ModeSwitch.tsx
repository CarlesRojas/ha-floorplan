import type { Mode } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS } from '#/theme.ts'
import { type IconDefinition, faLightbulb, faObjectGroup } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { motion } from 'motion/react'

const MODES: { id: Mode; label: string; icon: IconDefinition }[] = [
  { id: 'rooms', label: 'Rooms', icon: faObjectGroup },
  { id: 'devices', label: 'Devices', icon: faLightbulb },
]

type Props = {
  mode: Mode
  onMode: (mode: Mode) => void
}

// Segmented control. The colored background slides to the active mode and
// takes that mode's color.
export default function ModeSwitch({ mode, onMode }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-(--secondary-background-color) p-1">
      {MODES.map(m => {
        const active = mode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onMode(m.id)}
            className={cn(
              'relative flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-(--primary-text-color)',
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
            <FontAwesomeIcon icon={m.icon} className="relative size-3.5" />
            <span className="relative">{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}
