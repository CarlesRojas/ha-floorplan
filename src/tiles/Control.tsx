import { cn } from '#/lib/utils.ts'
import { insideTile } from '#/tiles/gestures.ts'
import { Icon } from '#/tiles/Icon.tsx'
import type { CSSProperties } from 'react'

type ControlProps = {
  icon: string
  label: string
  onPress: () => void
  className?: string
  // One of a set where only one is chosen, like the mode of a thermostat.
  role?: 'radio'
  checked?: boolean
  style?: CSSProperties
}

// One round button inside a wide tile. Pressing it never presses the tile.
export function Control({ icon, label, onPress, className, role, checked, style }: ControlProps) {
  return (
    <button
      {...insideTile}
      type="button"
      role={role}
      aria-checked={role === 'radio' ? !!checked : undefined}
      aria-label={label}
      title={label}
      className={cn('fp-control', className)}
      style={style}
      onClick={e => {
        e.stopPropagation()
        onPress()
      }}
    >
      <Icon icon={icon} on />
    </button>
  )
}
