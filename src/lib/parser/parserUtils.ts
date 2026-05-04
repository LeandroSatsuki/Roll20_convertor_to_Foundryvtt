import type { ConversionWarning } from '../normalize/normalizedCharacterTypes'

export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\r\n?/g, '\n')
}

export function compactText(text: string): string {
  return normalizeForSearch(text).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseSignedNumber(raw: string | undefined): number | null {
  if (!raw) return null
  const match = raw.match(/[+-]?\d+(?:[.,]\d+)?/)
  if (!match) return null
  return Number(match[0].replace(',', '.'))
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function makeWarning(
  code: string,
  message: string,
  fieldPath?: string,
  raw?: string,
  severity: ConversionWarning['severity'] = 'warning',
): ConversionWarning {
  return { code, severity, message, fieldPath, raw }
}

export function closestBy<T>(entries: Array<{ value: T; expected: number }>, target: number): { value: T; expected: number } {
  return entries.reduce((best, next) => (Math.abs(next.expected - target) < Math.abs(best.expected - target) ? next : best))
}

export function findLabeledNumber(text: string, labels: string[]): { value: number | null; raw?: string } {
  const normalized = compactText(text)
  for (const label of labels) {
    const normalizedLabel = compactText(label)
    const match = normalized.match(new RegExp(`${escapeRegExp(normalizedLabel)}\\s*:?\\s*([+-]?\\d+(?:[.,]\\d+)?)`, 'i'))
    if (match) return { value: parseSignedNumber(match[1]), raw: match[0] }
  }
  return { value: null }
}

export function findAnyNumberNear(text: string, labels: string[]): { value: number | null; raw?: string } {
  const normalized = compactText(text)
  for (const label of labels) {
    const normalizedLabel = compactText(label)
    const match = normalized.match(new RegExp(`${escapeRegExp(normalizedLabel)}.{0,40}?([+-]?\\d+(?:[.,]\\d+)?)`, 'i'))
    if (match) return { value: parseSignedNumber(match[1]), raw: match[0] }
  }
  return { value: null }
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}
