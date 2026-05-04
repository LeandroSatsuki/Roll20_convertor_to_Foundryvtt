import { field } from '../normalize/confidence'
import type { AbilityKey, AbilityValue, ConversionWarning } from '../normalize/normalizedCharacterTypes'
import { abilityModifier, compactText, makeWarning, parseSignedNumber } from './parserUtils'

const abilityLabels: Record<AbilityKey, string[]> = {
  str: ['FORÇA', 'FORCA', 'Strength'],
  dex: ['DESTREZA', 'Dexterity'],
  con: ['CONSTITUIÇÃO', 'CONSTITUICAO', 'Constitution'],
  int: ['INTELIGÊNCIA', 'INTELIGENCIA', 'Intelligence'],
  wis: ['SABEDORIA', 'Wisdom'],
  cha: ['CARISMA', 'Charisma'],
}

export function parseAbilities(text: string): { abilities: Record<AbilityKey, AbilityValue>; warnings: ConversionWarning[] } {
  const compact = compactText(text)
  const warnings: ConversionWarning[] = []
  const abilities = {} as Record<AbilityKey, AbilityValue>

  for (const key of Object.keys(abilityLabels) as AbilityKey[]) {
    const labels = abilityLabels[key]
    let score: number | null = null
    let mod: number | null = null
    let raw: string | undefined

    for (const label of labels) {
      const normalizedLabel = compactText(label)
      const match =
        compact.match(new RegExp(`${normalizedLabel}\\s*([+-]?\\d+)\\s*([+-]\\d+)`, 'i')) ??
        compact.match(new RegExp(`${normalizedLabel}\\s*([+-]?\\d+)\\s+(\\d{1,2})`, 'i')) ??
        compact.match(new RegExp(`${normalizedLabel}.{0,20}?([+-]?\\d{1,2}).{0,10}?([+-]?\\d{1,2})`, 'i'))
      if (match) {
        const first = parseSignedNumber(match[1])
        const second = parseSignedNumber(match[2])
        if (first !== null && second !== null) {
          score = first > 5 ? first : second
          mod = first > 5 ? second : first
          raw = match[0]
          break
        }
      }
    }

    if (score === null) {
      warnings.push(makeWarning('ABILITY_NOT_FOUND', `Atributo ${key} não encontrado.`, `abilities.${key}`))
      score = 10
      mod = 0
      raw = ''
    }

    const expectedMod = abilityModifier(score)
    const confidence = mod === expectedMod ? 'high' : 'medium'
    if (mod !== expectedMod) {
      warnings.push(
        makeWarning(
          'ABILITY_MOD_MISMATCH',
          `Modificador de ${key} não bate com o valor do atributo; usando modificador extraído para revisão.`,
          `abilities.${key}.mod`,
          raw,
        ),
      )
    }

    abilities[key] = {
      score: field(score, score === 10 && raw === '' ? 'low' : 'high', raw),
      mod: field(mod ?? expectedMod, confidence, raw),
    }
  }

  return { abilities, warnings }
}
