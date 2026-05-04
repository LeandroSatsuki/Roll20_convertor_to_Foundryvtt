import type { FieldValue } from './normalizedCharacterTypes'

export type Confidence = 'high' | 'medium' | 'low'

export function field<T>(
  value: T,
  confidence: Confidence = 'high',
  raw?: string,
  warnings?: string[],
): FieldValue<T> {
  return { value, confidence, raw, warnings }
}

export function unknownNumber(raw?: string, warning?: string): FieldValue<number | null> {
  return field(null, 'low', raw, warning ? [warning] : undefined)
}
