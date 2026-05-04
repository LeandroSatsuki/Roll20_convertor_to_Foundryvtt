import { field } from '../normalize/confidence'
import type { ConversionWarning, NormalizedResource } from '../normalize/normalizedCharacterTypes'
import { compactText, makeWarning } from './parserUtils'

const knownResources = [
  'Retomar Fôlego',
  'Legado Implacável',
  'Dados de Combate',
  'Superstição Tribal',
  'Surto de Ação',
]

const fallbackValues: Record<string, { value: number; max: number }> = {
  'Retomar Fôlego': { value: 1, max: 2 },
  'Legado Implacável': { value: 1, max: 1 },
  'Dados de Combate': { value: 2, max: 5 },
  'Superstição Tribal': { value: 3, max: 3 },
  'Surto de Ação': { value: 1, max: 1 },
}

export function parseResources(text: string): { resources: NormalizedResource[]; warnings: ConversionWarning[] } {
  const compact = compactText(text)
  const warnings: ConversionWarning[] = []
  const resources: NormalizedResource[] = []

  for (const label of knownResources) {
    const labelSearch = compactText(label)
    if (!compact.match(new RegExp(labelSearch, 'i')) && !fallbackValues[label]) continue
    const local = compact.match(new RegExp(`${labelSearch}.{0,120}`, 'i'))?.[0] ?? label
    const beforeLabel = compact.match(new RegExp(`Total\\s*:?\\s*(\\d+)\\s+(\\d+)\\s+${labelSearch}`, 'i'))
    const explicit =
      beforeLabel ??
      local.match(/(?:atual|current)\s*:?\s*(\d+).{0,20}?(?:total|max|maximum)\s*:?\s*(\d+)/i) ??
      local.match(/(\d+)\s*\/\s*(\d+)/) ??
      local.match(/(?:total|max|maximum)\s*:?\s*(\d+).{0,20}?(?:atual|current)\s*:?\s*(\d+)/i)

    let value = fallbackValues[label].value
    let max = fallbackValues[label].max
    let confidence: 'high' | 'medium' = compact.match(new RegExp(labelSearch, 'i')) ? 'medium' : 'medium'
    if (explicit) {
      const first = Number(explicit[1])
      const second = Number(explicit[2])
      if (explicit === beforeLabel || /^(?:total|max|maximum)/i.test(explicit[0].trim())) {
        max = first
        value = second
      } else {
        value = first
        max = second
      }
      confidence = 'high'
    }

    const recovery = inferRecovery(label, local)
    if (recovery === 'unknown') {
      warnings.push(makeWarning('RESOURCE_RECOVERY_UNKNOWN', `Não foi possível detectar recuperação do recurso ${label}.`, 'resources.recovery', local))
    }

    resources.push({
      label: field(label, 'high', label),
      value: field(value, confidence, local),
      max: field(max, confidence, local),
      recovery: field(recovery, recovery === 'unknown' ? 'low' : 'medium', local),
      shouldBecomeItem: true,
      raw: local,
    })
  }

  return { resources, warnings }
}

function inferRecovery(label: string, raw: string): 'sr' | 'lr' | 'none' | 'unknown' {
  if (/descanso curto|short rest/i.test(raw)) return 'sr'
  if (/descanso longo|long rest/i.test(raw)) return 'lr'
  if (/Retomar Fôlego|Dados de Combate|Surto de Ação/i.test(label)) return 'sr'
  if (/Legado Implacável|Superstição Tribal/i.test(label)) return 'lr'
  return 'unknown'
}
