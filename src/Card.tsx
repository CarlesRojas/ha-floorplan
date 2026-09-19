import { cn } from '#/lib/utils.ts'
import type { CardConfig, HomeAssistant } from '#/types.ts'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

export default function Card({ hass, config }: Props) {
  const entityCount = hass ? Object.keys(hass.states).length : 0
  const dark = hass?.themes.darkMode ?? false

  return (
    <ha-card>
      <div className={cn('font-montserrat flex flex-col gap-2 p-4', dark && 'dark')}>
        <h2 className="text-lg font-bold">Floorplan 3D</h2>
        <p className="text-sm opacity-70">Placeholder card. Model: {config.model ?? 'none'}</p>
        <p className="text-sm opacity-70">{entityCount} entities visible</p>
      </div>
    </ha-card>
  )
}
