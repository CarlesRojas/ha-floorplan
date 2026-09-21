import { DEFAULT_ASPECT_RATIO } from '#/constants.ts'

// Parses "16:9" or "4/3" into a width over height number.
export function aspectRatioNumber(value: string | undefined) {
  const match = (value ?? DEFAULT_ASPECT_RATIO).match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/)
  if (!match) return 4 / 3
  return Number(match[1]) / Number(match[2])
}

// CSS aspect-ratio value for the same input.
export function aspectRatioCss(value: string | undefined) {
  const match = value?.match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/)
  if (!match) return DEFAULT_ASPECT_RATIO
  return `${match[1]} / ${match[2]}`
}
