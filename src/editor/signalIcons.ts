import type { Signal } from '#/signals.ts'
import {
  faGauge,
  faList,
  faPalette,
  faPowerOff,
  faSliders,
  faSun,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'

// The controls a device exposes, and what an item can express, written the
// same way in both panels so a device and an item can be compared at a
// glance.
export const SIGNAL_ICONS: Record<Signal, IconDefinition> = {
  toggle: faPowerOff,
  level: faSliders,
  color: faPalette,
  warmth: faSun,
  value: faGauge,
  enum: faList,
}

export const SIGNAL_LABELS: Record<Signal, string> = {
  toggle: 'On and off',
  level: 'Level, a percentage',
  color: 'Color',
  warmth: 'Warmth, in kelvin',
  value: 'A reading',
  enum: 'Modes',
}
