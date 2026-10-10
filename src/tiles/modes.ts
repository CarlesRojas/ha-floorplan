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
