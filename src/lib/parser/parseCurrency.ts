import { field } from '../normalize/confidence'
import type { FieldValue } from '../normalize/normalizedCharacterTypes'
import { compactText, parseSignedNumber } from './parserUtils'

export function parseCurrency(text: string): Record<'cp' | 'sp' | 'ep' | 'gp' | 'pp', FieldValue<number>> {
  const compact = compactText(text)
  const result = {
    cp: field(0, 'medium'),
    sp: field(0, 'medium'),
    ep: field(0, 'medium'),
    gp: field(0, 'medium'),
    pp: field(0, 'medium'),
  }

  for (const coin of ['cp', 'sp', 'ep', 'gp', 'pp'] as const) {
    const match = compact.match(new RegExp(`(\\d+)\\s*${coin}\\b|${coin}\\s*:?\\s*(\\d+)`, 'i'))
    const value = parseSignedNumber(match?.[1] ?? match?.[2])
    if (value !== null) result[coin] = field(value, 'high', match?.[0])
  }

  return result
}
