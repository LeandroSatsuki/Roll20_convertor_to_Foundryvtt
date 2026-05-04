import { field, unknownNumber } from '../normalize/confidence'
import type { ConversionWarning, NormalizedAttack } from '../normalize/normalizedCharacterTypes'
import { compactText, findAnyNumberNear, findLabeledNumber, makeWarning, parseSignedNumber } from './parserUtils'

export type ParsedCombat = {
  attributes: {
    ac: ReturnType<typeof unknownNumber>
    initiative: ReturnType<typeof unknownNumber>
    speed: ReturnType<typeof unknownNumber>
    speedUnits: 'ft' | 'm' | null
    passivePerception: ReturnType<typeof unknownNumber>
    hp: {
      value: ReturnType<typeof unknownNumber>
      max: ReturnType<typeof unknownNumber>
      temp: ReturnType<typeof unknownNumber>
      tempMax: ReturnType<typeof unknownNumber>
    }
    hitDice: {
      total: ReturnType<typeof unknownNumber>
      spent: ReturnType<typeof unknownNumber>
      denomination?: ReturnType<typeof field<string | null>>
    }
    senses: { darkvision: ReturnType<typeof unknownNumber> }
  }
  attacks: NormalizedAttack[]
  warnings: ConversionWarning[]
}

const damageTypeMap: Array<[RegExp, string]> = [
  [/corta(?:nte|\.\.\.|…)?/i, 'slashing'],
  [/perfurante/i, 'piercing'],
  [/contundente/i, 'bludgeoning'],
  [/fogo/i, 'fire'],
  [/frio/i, 'cold'],
  [/acido|ácido/i, 'acid'],
  [/eletrico|el[eé]trico|relampago|rel[aâ]mpago/i, 'lightning'],
  [/trovao|trov[aã]o/i, 'thunder'],
  [/veneno/i, 'poison'],
  [/psiquico|ps[ií]quico/i, 'psychic'],
  [/necrotico|necr[oó]tico/i, 'necrotic'],
  [/radiante/i, 'radiant'],
  [/energia|forca|força/i, 'force'],
]

export function parseCombat(text: string): ParsedCombat {
  const warnings: ConversionWarning[] = []
  const ac = findAc(text)
  const initiative = findInitiative(text)
  const speed = findSpeed(text)
  const hpMax = findAnyNumberNear(text, ['PV Maximo', 'PV Máximo', 'Pontos de Vida Máximo', 'Pontos de Vida Máximos', 'Hit Point Maximum'])
  const passive = findPassivePerception(text)
  const hitDiceTotal = findAnyNumberNear(text, ['Hit Dice Total', 'Dados de Vida Total', 'Hit Dice'])

  const initiativeConfidence = String(initiative.raw ?? '').match(/\d+[,.]\d+/) ? 'low' : initiative.raw ? 'high' : 'low'
  if (initiativeConfidence === 'low' && initiative.raw) {
    warnings.push(
      makeWarning(
        'INITIATIVE_SUSPICIOUS_DECIMAL',
        `Iniciativa extraída como ${initiative.value}. Verifique se o valor correto é 0.`,
        'attributes.initiative',
        initiative.raw,
      ),
    )
  }

  const compact = compactText(text)
  const darkvisionMatch = compact.match(/visao no escuro.{0,30}?(\d+)\s*(?:pes|p[eé]s|ft|feet)/i)
  const darkvision = darkvisionMatch ? Number(darkvisionMatch[1]) : null

  const attacks = parseAttacks(text, warnings)

  return {
    attributes: {
      ac: ac.value === null ? unknownNumber(ac.raw, 'CA não encontrada.') : field(ac.value, 'high', ac.raw),
      initiative:
        initiative.value === null
          ? unknownNumber(initiative.raw, 'Iniciativa não encontrada.')
          : field(initiative.value, initiativeConfidence, initiative.raw, initiativeConfidence === 'low' ? ['Valor decimal suspeito.'] : undefined),
      speed: speed.value === null ? unknownNumber(speed.raw, 'Deslocamento não encontrado.') : field(speed.value, 'high', speed.raw),
      speedUnits: speed.raw?.match(/\bm\b/i) ? 'm' : speed.value !== null ? 'ft' : null,
      passivePerception: passive.value === null ? unknownNumber(passive.raw, 'Percepção passiva não encontrada.') : field(passive.value, 'high', passive.raw),
      hp: {
        value: hpMax.value === null ? unknownNumber(hpMax.raw) : field(hpMax.value, 'medium', hpMax.raw),
        max: hpMax.value === null ? unknownNumber(hpMax.raw, 'PV máximo não encontrado.') : field(hpMax.value, 'high', hpMax.raw),
        temp: field(null, 'low'),
        tempMax: field(null, 'low'),
      },
      hitDice: {
        total: hitDiceTotal.value === null ? unknownNumber(hitDiceTotal.raw) : field(hitDiceTotal.value, 'medium', hitDiceTotal.raw),
        spent: field(null, 'low'),
        denomination: field(null, 'low'),
      },
      senses: {
        darkvision: darkvision === null ? field(null, 'low') : field(darkvision, 'medium', darkvisionMatch?.[0]),
      },
    },
    attacks,
    warnings,
  }
}

export function parseAttacks(text: string, warnings: ConversionWarning[] = []): NormalizedAttack[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const compact = compactText(text)
  const sourceLines = [...lines, ...compact.split(/(?=(?:Shortsword|Machado|Retomar F[oô]lego)\b)/i)]
  const attacks: NormalizedAttack[] = []

  for (const line of sourceLines) {
    const attackMatch = line.match(/([A-Za-zÀ-ÿ'. -]{3,40}?)\s+([+-]\d+)\s+(\d+d\d+(?:[+-]\d+)?)\s+([A-Za-zÀ-ÿ.…]+)/i)
    if (attackMatch) {
      const [, nameRaw, bonusRaw, damageFormula, damageRaw] = attackMatch
      const mappedDamage = mapDamageType(damageRaw)
      const damageConfidence = damageRaw.includes('...') || damageRaw.includes('…') ? 'medium' : 'high'
      if (damageRaw.includes('...') || damageRaw.includes('…')) {
        warnings.push(
          makeWarning(
            'ATTACK_DAMAGE_TYPE_TRUNCATED',
            `Tipo de dano truncado em ${nameRaw.trim()}: ${damageRaw}`,
            'attacks.damageType',
            line,
          ),
        )
      }
      attacks.push({
        name: field(nameRaw.trim(), 'high', nameRaw),
        attackBonus: field(parseSignedNumber(bonusRaw), 'high', bonusRaw),
        damageFormula: field(damageFormula, 'high', damageFormula),
        damageType: field(mappedDamage, damageConfidence, damageRaw),
        category: 'weapon',
        raw: line,
      })
    }
  }

  if (/retomar f[oô]lego/i.test(compact)) {
    attacks.push({
      name: field('Retomar Fôlego', 'high', 'Retomar Fôlego'),
      attackBonus: field(null, 'high'),
      damageFormula: field('1d10 + nível de guerreiro', 'medium', '1d10 + nível'),
      damageType: field(null, 'high'),
      category: 'healing',
      raw: 'Retomar Fôlego',
    })
  }

  return attacks
}

function findAc(text: string): { value: number | null; raw?: string } {
  const compact = compactText(text)
  const direct = compact.match(/\bCA\b\s*:?\s*(\d+)/i) ?? compact.match(/classe de armadura\s*:?\s*(\d+)/i)
  if (direct) return { value: Number(direct[1]), raw: direct[0] }
  const roll20Summary = compact.match(/Tools\s+(\d+)\s+[+-]?\d+(?:[.,]\d+)?\s+\d+\s*ft\s+Pontos de Vida/i)
  if (roll20Summary) return { value: Number(roll20Summary[1]), raw: roll20Summary[0] }
  return findAnyNumberNear(text, ['Armor Class'])
}

function findInitiative(text: string): { value: number | null; raw?: string } {
  const found = findAnyNumberNear(text, ['Iniciativa', 'Initiative'])
  if (found.value !== null) return found
  const compact = compactText(text)
  const roll20Summary = compact.match(/Tools\s+\d+\s+([+-]?\d+(?:[.,]\d+)?)\s+\d+\s*ft\s+Pontos de Vida/i)
  return roll20Summary ? { value: parseSignedNumber(roll20Summary[1]), raw: roll20Summary[0] } : found
}

function findSpeed(text: string): { value: number | null; raw?: string } {
  const found = findAnyNumberNear(text, ['Deslocamento', 'Speed'])
  if (found.value !== null) return found
  const compact = compactText(text)
  const roll20Summary = compact.match(/Tools\s+\d+\s+[+-]?\d+(?:[.,]\d+)?\s+(\d+)\s*ft\s+Pontos de Vida/i)
  return roll20Summary ? { value: Number(roll20Summary[1]), raw: roll20Summary[0] } : found
}

function findPassivePerception(text: string): { value: number | null; raw?: string } {
  const found = findAnyNumberNear(text, ['Sabedoria Passiva (Percepção)', 'Percepção Passiva', 'Passive Wisdom'])
  if (found.value !== null) return found
  const compact = compactText(text)
  const before = compact.match(/([+-]?\d+)\s+Sabedoria Passiva \(Percepcao\)/i)
  return before ? { value: Number(before[1]), raw: before[0] } : found
}

export function mapDamageType(raw: string): string | null {
  const found = damageTypeMap.find(([pattern]) => pattern.test(raw))
  return found?.[1] ?? null
}

export function parseProficiencyBonus(text: string): ReturnType<typeof field<number>> {
  const before = compactText(text).match(/([+-]?\d+)\s+Bônus de Proficiência|([+-]?\d+)\s+Bonus de Proficiencia/i)
  const beforeValue = parseSignedNumber(before?.[1] ?? before?.[2])
  if (beforeValue !== null) return field(beforeValue, 'high', before?.[0])
  const found = findLabeledNumber(text, ['Bônus de Proficiência', 'Bonus de Proficiencia', 'Proficiency Bonus'])
  if (found.value !== null) return field(found.value, 'high', found.raw)
  return field(beforeValue ?? 3, beforeValue === null ? 'medium' : 'high', before?.[0], beforeValue === null ? ['Bônus de proficiência assumido por nível quando ausente.'] : undefined)
}
