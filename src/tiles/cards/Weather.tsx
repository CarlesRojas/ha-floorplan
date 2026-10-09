import { entityName, formatState, moreInfo, runAction, type TileEnv } from '#/tiles/actions.ts'
import { useTileGestures } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { defaultIcon } from '#/tiles/icons.ts'
import type { HomeAssistant } from '#/types.ts'
import { useEffect, useState } from 'react'

type Forecast = { datetime: string; condition?: string; temperature?: number; templow?: number; is_daytime?: boolean }
type Kind = 'hourly' | 'daily'

// The forecasts a weather entity offers, as Home Assistant numbers them.
const DAILY = 1
const HOURLY = 2

// How many steps of the forecast fit along the bottom of the tile.
const STEPS = 6

// The sky behind the tile, by the weather and whether the sun is up.
const SKIES: Record<string, string> = {
  day: 'linear-gradient(180deg, #2f7fd6 0%, #5aa3e8 100%)',
  night: 'linear-gradient(180deg, #0b1630 0%, #26355c 100%)',
  cloudy: 'linear-gradient(180deg, #56677d 0%, #8496ab 100%)',
  cloudyNight: 'linear-gradient(180deg, #1d2532 0%, #3a4556 100%)',
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

const degrees = (value: number | undefined) => (typeof value === 'number' ? `${Math.round(value)}°` : '')

type Props = { env: TileEnv; config: TileConfig }

// The weather outside, the whole width and twice as tall as a tile. The
// temperature in large type with what the sky is doing and the day's high
// and low, and the next hours along the bottom, or the next days when the
// entity has no hourly forecast. Its background is the sky. A tap opens
// the entity's dialog.
export default function Weather({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const attributes = entity?.attributes ?? {}
  const features = typeof attributes.supported_features === 'number' ? attributes.supported_features : 0
  const strip: Kind | null = features & HOURLY ? 'hourly' : features & DAILY ? 'daily' : null
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
          <Icon icon={config.icon ?? defaultIcon(config.entity, undefined, condition)} on />
          <div className="fp-weather-condition">{unavailable ? 'Unavailable' : formatState(env.hass, entity)}</div>
          {today && (
            <div className="fp-state">
              H:{degrees(today.temperature)} L:{degrees(today.templow)}
            </div>
          )}
        </div>
      </div>
      {steps && steps.length > 0 && (
        <div className="fp-weather-steps">
          {steps.slice(0, STEPS).map((step, i) => (
            <div key={step.datetime} className="fp-weather-step">
              <div className="fp-weather-when">{label(step, i)}</div>
              <Icon
                icon={defaultIcon(
                  config.entity,
                  undefined,
                  step.condition === 'sunny' && step.is_daytime === false ? 'clear-night' : step.condition,
                )}
                on
              />
              <div className="fp-weather-step-temp">{degrees(step.temperature)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
