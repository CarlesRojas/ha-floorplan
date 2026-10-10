import { entityName, formatState, moreInfo, runAction, type TileEnv } from '#/tiles/actions.ts'
import { useTileGestures } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { defaultIcon } from '#/tiles/icons.ts'
import type { HomeAssistant } from '#/types.ts'
import { useEffect, useState } from 'react'

type Forecast = {
  datetime: string
  condition?: string
  temperature?: number
  templow?: number
  is_daytime?: boolean
}
export type Kind = 'hourly' | 'daily'

// The forecasts a weather entity offers, as Home Assistant numbers them.
const DAILY = 1
const HOURLY = 2

// How many steps of the forecast fit along the bottom of the tile.
const STEPS = 6

// The sky behind the tile, by the weather and whether the sun is up.
const SKIES: Record<string, string> = {
  day: 'linear-gradient(180deg, #2c5a9c 0%, #4f7dbd 100%)',
  night: 'linear-gradient(180deg, #13244a 0%, #2a4677 100%)',
  cloudy: 'linear-gradient(180deg, #2c5a9c 0%, #4f7dbd 100%)',
  cloudyNight: 'linear-gradient(180deg, #1c2a45 0%, #344a6e 100%)',
  rain: 'linear-gradient(180deg, #3c4a5c 0%, #66768a 100%)',
  storm: 'linear-gradient(180deg, #232836 0%, #474e63 100%)',
}

function sky(condition: string | undefined, night: boolean) {
  switch (condition) {
    case 'cloudy':
    case 'fog':
      return night ? SKIES.cloudyNight : SKIES.cloudy
    case 'rainy':
    case 'pouring':
    case 'snowy':
    case 'snowy-rainy':
    case 'hail':
      return night ? SKIES.storm : SKIES.rain
    case 'lightning':
    case 'lightning-rainy':
      return SKIES.storm
    case 'clear-night':
      return SKIES.night
    default:
      return night ? SKIES.night : SKIES.day
  }
}

// The forecast of one kind, kept up to date for as long as the tile shows.
function useForecast(hass: HomeAssistant, entityId: string | undefined, kind: Kind | null) {
  const [forecast, setForecast] = useState<Forecast[] | null>(null)
  const connection = hass.connection
  useEffect(() => {
    if (!entityId || !kind || !connection) return
    let unsubscribe: (() => void) | undefined
    let live = true
    connection
      .subscribeMessage<{ forecast?: Forecast[] }>(event => live && setForecast(event.forecast ?? null), {
        type: 'weather/subscribe_forecast',
        entity_id: entityId,
        forecast_type: kind,
      })
      .then(stop => (live ? (unsubscribe = stop) : stop()))
      .catch(() => {})
    return () => {
      live = false
      unsubscribe?.()
    }
  }, [connection, entityId, kind])
  return forecast
}

// Whole degrees with a degree sign and no unit, like 21°.
const degrees = (value: number | undefined) => (typeof value === 'number' ? `${Math.round(value)}°` : '')

// White icons, but for the sun, which is yellow.
const iconColor = (condition: string | undefined) => (condition === 'sunny' ? '#ffd60a' : undefined)

export type WeatherConfig = TileConfig & {
  // Which forecast runs along the bottom. The hours when the entity has
  // them, and the days when it does not.
  forecast_type?: Kind
}

type Props = { env: TileEnv; config: WeatherConfig }

// The weather outside, the whole width and three rows tall. The temperature
// in large type, what the sky is doing and the day's high and low on the
// right, and the next hours along the bottom, or the next days when the
// entity has no hourly forecast. Its background is the sky. A tap opens the
// entity's dialog.
export default function Weather({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const attributes = entity?.attributes ?? {}
  const features = typeof attributes.supported_features === 'number' ? attributes.supported_features : 0
  const offered: Kind[] = [
    ...(features & HOURLY ? ['hourly' as const] : []),
    ...(features & DAILY ? ['daily' as const] : []),
  ]
  const strip: Kind | null =
    config.forecast_type && offered.includes(config.forecast_type) ? config.forecast_type : (offered[0] ?? null)
  const steps = useForecast(env.hass, config.entity, strip)
  const days = useForecast(env.hass, config.entity, features & DAILY ? 'daily' : null)
  const open = () => moreInfo(env.host, config.entity)
  const { pressed, handlers } = useTileGestures({
    haptics: config.haptic !== false,
    onTap: () => runAction(env, config.tap_action, open),
    onHold: () => runAction(env, config.hold_action, open),
  })

  const night = env.hass.states['sun.sun']?.state === 'below_horizon'
  const condition = entity?.state
  // Sunny at night is a clear night, with the moon for its icon.
  const looks = night && condition === 'sunny' ? 'clear-night' : condition
  const today = days?.[0]
  const language = env.hass.locale?.language ?? env.hass.language
  const label = (step: Forecast, i: number) => {
    if (i === 0) return strip === 'hourly' ? 'Now' : 'Today'
    const date = new Date(step.datetime)
    return strip === 'hourly'
      ? date.toLocaleTimeString(language, { hour: 'numeric' })
      : date.toLocaleDateString(language, { weekday: 'short' })
  }
  const unavailable = !entity || entity.state === 'unavailable' || entity.state === 'unknown'

  return (
    <div
      {...handlers}
      role="button"
      tabIndex={0}
      aria-label={entityName(config, entity)}
      data-pressed={pressed || undefined}
      data-unavailable={unavailable || undefined}
      className="fp-tile fp-weather"
      style={{ background: sky(condition, night) }}
    >
      <div className="fp-weather-now">
        <div className="fp-text">
          <div className="fp-name">{entityName(config, entity)}</div>
          <div className="fp-weather-temp">{degrees(attributes.temperature as number | undefined)}</div>
        </div>
        <div className="fp-weather-sky">
          <div>
            <div className="fp-weather-condition">{unavailable ? 'Unavailable' : formatState(env.hass, entity)}</div>
            {today && (
              <div className="fp-weather-condition fp-weather-range">
                H:{degrees(today.temperature)} L:{degrees(today.templow)}
              </div>
            )}
          </div>
          <span className="fp-weather-icon" style={{ color: iconColor(looks) }}>
            <Icon icon={config.icon ?? defaultIcon(config.entity, undefined, looks)} on />
          </span>
        </div>
      </div>
      {steps && steps.length > 0 && (
        <div className="fp-weather-steps">
          {steps.slice(0, STEPS).map((step, i) => {
            const condition = step.condition === 'sunny' && step.is_daytime === false ? 'clear-night' : step.condition
            return (
              <div key={step.datetime} className="fp-weather-step">
                <div className="fp-weather-when">{label(step, i)}</div>
                <span className="fp-weather-icon" style={{ color: iconColor(condition) }}>
                  <Icon icon={defaultIcon(config.entity, undefined, condition)} on />
                </span>
                <div className="fp-weather-step-temp">{degrees(step.temperature)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
