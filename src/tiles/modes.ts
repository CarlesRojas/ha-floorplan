// The modes a thermostat can run in, in the order its buttons go, each with
// its icon and its color, which its button takes while chosen and the
// thermostat's tiles take while it runs in it. One it names that
// is not here goes at the end.
export const HVAC_MODES: Record<string, { icon: string; color?: string }> = {
  auto: { icon: 'ph:sparkle', color: 'var(--_mode-auto)' },
  heat_cool: { icon: 'ph:thermometer', color: 'var(--_mode-heat-cool)' },
  heat: { icon: 'ph:fire', color: 'var(--_mode-heat)' },
  cool: { icon: 'ph:snowflake', color: 'var(--_mode-cool)' },
  dry: { icon: 'ph:drop', color: 'var(--_mode-dry)' },
  fan_only: { icon: 'ph:fan', color: 'var(--_mode-fan)' },
  off: { icon: 'ph:power-bold' },
}
export const HVAC_ORDER = Object.keys(HVAC_MODES)

// The mode whose color each thing a thermostat does takes.
const ACTION_MODES: Record<string, string> = {
  heating: 'heat',
  preheating: 'heat',
  defrosting: 'heat',
  cooling: 'cool',
  drying: 'dry',
  fan: 'fan_only',
}

// The plain text color, for an icon with no color of its own.
export const NO_COLOR = 'currentColor'

// The modes that pick on their own whether to heat or cool.
const EITHER = ['auto', 'heat_cool']

// The color of a thermostat's tiles: the mode it runs in, or in a mode
// that heats or cools as it needs to, what it is doing right now, like
// orange while it heats. While that one waits its tiles take no color.
export const climateColor = (state: string, action: unknown) => {
  if (!EITHER.includes(state)) return HVAC_MODES[state]?.color
  const doing = typeof action === 'string' ? ACTION_MODES[action] : undefined
  return doing ? HVAC_MODES[doing]?.color : NO_COLOR
}
