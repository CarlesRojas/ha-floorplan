import type { CardConfig, HomeAssistant } from '#/types.ts'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

export default function Card({ hass, config }: Props) {
  const entityCount = hass ? Object.keys(hass.states).length : 0

  return (
    <ha-card>
      <div style={{ padding: 16, fontFamily: 'var(--primary-font-family, sans-serif)' }}>
        <h2 style={{ margin: 0 }}>Floorplan 3D</h2>
        <p>Placeholder card. Model: {config.model ?? 'none'}</p>
        <p>{entityCount} entities visible</p>
      </div>
    </ha-card>
  )
}
