import type { NormalizedAttack } from '../normalize/normalizedCharacterTypes'
import type { FoundryItem } from './foundryTypes'
import { buildWeaponItem } from './items'

export function mapWeaponAttack(attack: NormalizedAttack, identifier: string): FoundryItem {
  return buildWeaponItem(attack, identifier)
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
