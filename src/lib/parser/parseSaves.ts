import { field } from '../normalize/confidence'
import type { AbilityKey, AbilityValue, ConversionWarning, SaveValue } from '../normalize/normalizedCharacterTypes'
import { closestBy, compactText, makeWarning, parseSignedNumber } from './parserUtils'

const saveLabels: Record<AbilityKey, string[]> = {
  str: ['SALVAGUARDAS FORÇA', 'FORÇA'],
  dex: ['SALVAGUARDAS DESTREZA', 'DESTREZA'],
  con: ['SALVAGUARDAS CONSTITUIÇÃO', 'CONSTITUIÇÃO'],
  int: ['SALVAGUARDAS INTELIGÊNCIA', 'INTELIGÊNCIA'],
  wis: ['SALVAGUARDAS SABEDORIA', 'SABEDORIA'],
  cha: ['SALVAGUARDAS CARISMA', 'CARISMA'],
}

export function inferSave(total: number, abilityMod: number, proficiencyBonus: number) {
  const candidates = [
    { value: false, expected: abilityMod },
    { value: true, expected: abilityMod + proficiencyBonus },
  ]
  const best = closestBy(candidates, total)
  return { proficient: best.value, bonus: total - best.expected, expected: best.expected }
}

export function parseSaves(
  text: string,
  abilities: Record<AbilityKey, AbilityValue>,
  proficiencyBonus: number,
): { saves: Record<AbilityKey, SaveValue>; warnings: ConversionWarning[] } {
  const compact = compactText(text)
  const warnings: ConversionWarning[] = []
  const saves = {} as Record<AbilityKey, SaveValue>

  for (const key of Object.keys(saveLabels) as AbilityKey[]) {
    let total: number | null = null
    let raw: string | undefined
    const labels = saveLabels[key]
    const afterHeader = compact.split(/SALVAGUARDAS/i).at(-1) ?? compact
    for (const label of labels) {
      const normalizedLabel = compactText(label)
      const match = afterHeader.match(new RegExp(`${normalizedLabel}\\s*([+-]?\\d+)`, 'i'))
      if (match) {
        total = parseSignedNumber(match[1])
        raw = match[0]
        break
      }
    }
    if (total === null) {
      const saveBlock = compact.match(/\d+\s+Sabedoria Passiva.*?SALVAGUARDAS/i)?.[0] ?? ''
      const plainLabel = compactText(labels[labels.length - 1])
      const beforeMatches = saveBlock ? Array.from(saveBlock.matchAll(new RegExp(`([+-]?\\d+)\\s+${plainLabel}`, 'gi'))) : []
      const beforeMatch = beforeMatches.at(-1)
      if (beforeMatch) {
        total = parseSignedNumber(beforeMatch[1])
        raw = beforeMatch[0]
      }
    }

    if (total === null) {
      total = abilities[key].mod.value
      raw = ''
      warnings.push(makeWarning('SAVE_NOT_FOUND', `Salvaguarda ${key} não encontrada.`, `saves.${key}`))
    }

    const inferred = inferSave(total, abilities[key].mod.value, proficiencyBonus)
    if (inferred.bonus !== 0) {
      warnings.push(
        makeWarning(
          'SAVE_TOTAL_MISMATCH',
          `Total da salvaguarda ${key} não bate com atributo + proficiência; bônus residual aplicado.`,
          `saves.${key}.bonus`,
          raw,
        ),
      )
    }

    saves[key] = {
      total: field(total, raw ? 'high' : 'low', raw),
      proficient: field(inferred.proficient, inferred.bonus === 0 ? 'high' : 'medium', raw),
      bonus: field(inferred.bonus, inferred.bonus === 0 ? 'high' : 'medium', raw),
    }
  }

  return { saves, warnings }
}
