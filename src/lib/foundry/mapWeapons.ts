import type { NormalizedAttack } from '../normalize/normalizedCharacterTypes'
import { resolveWeaponOrEquipment } from '../rules/weaponResolver'
import type { FoundryItem } from './foundryTypes'
import { foundryId } from './ids'

export function mapWeaponAttack(attack: NormalizedAttack, identifier: string): FoundryItem {
  const rule = resolveWeaponOrEquipment(attack.name.value)
  return {
    _id: foundryId(),
    name: attack.name.value,
    type: 'weapon',
    img: 'icons/weapons/swords/shortsword-guard.webp',
    system: {
      identifier,
      description: { value: htmlParagraph(attack.raw), chat: '' },
      source: { rules: '2024', book: 'Roll20 PDF', page: '', license: '' },
      equipped: true,
      proficient: 1,
      type: { value: 'simpleM', baseItem: '' },
      damage: {
        base: {
          number: null,
          denomination: null,
          bonus: attack.damageFormula.value ?? '',
          types: attack.damageType.value ? [attack.damageType.value] : [],
          custom: { enabled: Boolean(attack.damageFormula.value), formula: attack.damageFormula.value ?? '' },
        },
      },
      range: { value: null, long: null, units: 'ft' },
      activities: {},
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': {
        source: 'roll20-pdf',
        confidence: attack.name.confidence,
        raw: attack.raw,
        ruleResolution: {
          rawName: attack.raw || attack.name.value,
          resolvedName: rule?.name ?? attack.name.value,
          kind: 'weapon',
          confidence: rule ? 'high' : 'low',
          score: rule ? 100 : 0,
          ruleId: rule?.id,
          sourceUrl: rule?.sourceUrl,
          candidates: rule ? [{ ruleId: rule.id, name: rule.name, kind: 'weapon', score: 100, confidence: 'high' }] : [],
          manuallyResolved: false,
        },
      },
    },
    _stats: itemStats(),
  }
}

function htmlParagraph(raw: string): string {
  return `<p>${escapeHtml(raw)}</p>`
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function itemStats(): Record<string, unknown> {
  return {
    coreVersion: '13.351',
    systemId: 'dnd5e',
    systemVersion: '5.2.4',
    createdTime: Date.now(),
    modifiedTime: Date.now(),
  }
}
