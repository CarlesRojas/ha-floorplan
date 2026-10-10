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

// The color of a thermostat's tiles: the mode it runs in, or in auto what
// it is doing right now, like orange while it heats, and grey while it
// waits.
export const climateColor = (state: string, action: unknown) => {
  const mode = state === 'auto' && typeof action === 'string' ? (ACTION_MODES[action] ?? state) : state
  return HVAC_MODES[mode]?.color
}
