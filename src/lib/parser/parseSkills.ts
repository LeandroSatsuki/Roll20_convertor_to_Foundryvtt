import { field } from '../normalize/confidence'
import type { AbilityKey, AbilityValue, ConversionWarning, SkillKey, SkillValue } from '../normalize/normalizedCharacterTypes'
import { closestBy, compactText, makeWarning, parseSignedNumber } from './parserUtils'

export const skillDefinitions: Record<SkillKey, { labelPtBr: string; aliases: string[]; ability: AbilityKey }> = {
  acr: { labelPtBr: 'Acrobacia', aliases: ['Acrobacia'], ability: 'dex' },
  ani: { labelPtBr: 'Adestrar Animais', aliases: ['Adestrar Animais', 'Lidar com Animais'], ability: 'wis' },
  arc: { labelPtBr: 'Arcanismo', aliases: ['Arcanismo'], ability: 'int' },
  ath: { labelPtBr: 'Atletismo', aliases: ['Atletismo'], ability: 'str' },
  dec: { labelPtBr: 'Enganação', aliases: ['Enganação', 'Enganacao'], ability: 'cha' },
  his: { labelPtBr: 'História', aliases: ['História', 'Historia'], ability: 'int' },
  ins: { labelPtBr: 'Intuição', aliases: ['Intuição', 'Intuicao'], ability: 'wis' },
  itm: { labelPtBr: 'Intimidação', aliases: ['Intimidação', 'Intimidacao'], ability: 'cha' },
  inv: { labelPtBr: 'Investigação', aliases: ['Investigação', 'Investigacao'], ability: 'int' },
  med: { labelPtBr: 'Medicina', aliases: ['Medicina'], ability: 'wis' },
  nat: { labelPtBr: 'Natureza', aliases: ['Natureza'], ability: 'int' },
  prc: { labelPtBr: 'Percepção', aliases: ['Percepção', 'Percepcao'], ability: 'wis' },
  prf: { labelPtBr: 'Atuação', aliases: ['Atuação', 'Atuacao', 'Performance'], ability: 'cha' },
  per: { labelPtBr: 'Persuasão', aliases: ['Persuasão', 'Persuasao'], ability: 'cha' },
  rel: { labelPtBr: 'Religião', aliases: ['Religião', 'Religiao'], ability: 'int' },
  slt: { labelPtBr: 'Prestidigitação', aliases: ['Prestidigitação', 'Prestidigitacao'], ability: 'dex' },
  ste: { labelPtBr: 'Furtividade', aliases: ['Furtividade'], ability: 'dex' },
  sur: { labelPtBr: 'Sobrevivência', aliases: ['Sobrevivência', 'Sobrevivencia'], ability: 'wis' },
}

export function inferSkill(total: number, abilityMod: number, proficiencyBonus: number) {
  const half = Math.floor(proficiencyBonus / 2)
  const candidates: Array<{ value: 0 | 0.5 | 1 | 2; expected: number }> = [
    { value: 0, expected: abilityMod },
    { value: 0.5, expected: abilityMod + half },
    { value: 1, expected: abilityMod + proficiencyBonus },
    { value: 2, expected: abilityMod + 2 * proficiencyBonus },
  ]
  const best = closestBy(candidates, total)
  return { proficiencyLevel: best.value, bonus: total - best.expected, expected: best.expected }
}

export function parseSkills(
  text: string,
  abilities: Record<AbilityKey, AbilityValue>,
  proficiencyBonus: number,
): { skills: Record<SkillKey, SkillValue>; warnings: ConversionWarning[] } {
  const compact = compactText(text)
  const warnings: ConversionWarning[] = []
  const skills = {} as Record<SkillKey, SkillValue>

  for (const key of Object.keys(skillDefinitions) as SkillKey[]) {
    const definition = skillDefinitions[key]
    let total: number | null = null
    let raw: string | undefined

    for (const alias of definition.aliases) {
      const normalizedAlias = compactText(alias)
      const match =
        compact.match(new RegExp(`${normalizedAlias}\\s*([+-]?\\d+)`, 'i')) ??
        compact.match(new RegExp(`([+-]?\\d+)\\s+${normalizedAlias}`, 'i'))
      if (match) {
        total = parseSignedNumber(match[1])
        raw = match[0]
        break
      }
    }

    if (total === null) {
      total = abilities[definition.ability].mod.value
      raw = ''
      warnings.push(makeWarning('SKILL_NOT_FOUND', `Perícia ${definition.labelPtBr} não encontrada.`, `skills.${key}`))
    }

    const inferred = inferSkill(total, abilities[definition.ability].mod.value, proficiencyBonus)
    if (inferred.bonus !== 0) {
      warnings.push(
        makeWarning(
          'SKILL_TOTAL_MISMATCH',
          `Total da perícia ${definition.labelPtBr} não bate com atributo + proficiência; bônus residual aplicado.`,
          `skills.${key}.bonus`,
          raw,
        ),
      )
    }

    skills[key] = {
      labelPtBr: definition.labelPtBr,
      ability: definition.ability,
      total: field(total, raw ? 'high' : 'low', raw),
      proficiencyLevel: field(inferred.proficiencyLevel, inferred.bonus === 0 ? 'high' : 'medium', raw),
      bonus: field(inferred.bonus, inferred.bonus === 0 ? 'high' : 'medium', raw),
    }
  }

  return { skills, warnings }
}
