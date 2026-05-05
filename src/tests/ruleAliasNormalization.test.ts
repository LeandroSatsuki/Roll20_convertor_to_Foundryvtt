import { describe, expect, it } from 'vitest'
import { buildSpellDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { resolveSpellOverride } from '../lib/rules/spellResolver'
import { resolveWeaponOrEquipment } from '../lib/rules/weaponResolver'
import { normalizeRuleLookupKey } from '../lib/rules/store/bonfireAliases'

describe('rule alias normalization', () => {
  it('normalizes lookup keys with parenthetical notes, typos, accents and spacing', () => {
    expect(normalizeRuleLookupKey('Mind Sliver (Taumaturgo)')).toBe('mind-sliver')
    expect(normalizeRuleLookupKey('Protetion   from Evil and Good')).toBe('protection-from-evil-and-good')
    expect(normalizeRuleLookupKey('Algury')).toBe('augury')
    expect(normalizeRuleLookupKey('Agua Benta')).toBe('agua-benta')
    expect(normalizeRuleLookupKey('Água   Benta')).toBe('agua-benta')
  })

  it('resolves spell descriptions through aliases without changing the displayed item name', () => {
    const mindSliver = buildSpellDescriptionMeta({
      itemName: 'Mind Sliver (Taumaturgo)',
      overrideRule: resolveSpellOverride('Mind Sliver (Taumaturgo)'),
    })
    const protection = buildSpellDescriptionMeta({
      itemName: 'Protetion from Evil and Good',
      overrideRule: resolveSpellOverride('Protetion from Evil and Good'),
    })
    const augury = buildSpellDescriptionMeta({
      itemName: 'Algury',
      overrideRule: resolveSpellOverride('Algury'),
    })

    expect(mindSliver.status).toBe('complete')
    expect(mindSliver.html).toContain('Mind Sliver (Taumaturgo)')
    expect(mindSliver.html).toContain('Ataque ps')

    expect(protection.status).toBe('complete')
    expect(protection.html).toContain('Protetion from Evil and Good')
    expect(protection.html).toContain('Prote')

    expect(augury.status).toBe('complete')
    expect(augury.html).toContain('Algury')
    expect(augury.html).toContain('press')
  })

  it('resolves Água Benta and Agua Benta to the same equipment rule', () => {
    const accented = resolveWeaponOrEquipment('Água Benta')
    const plain = resolveWeaponOrEquipment('Agua Benta')

    expect(accented?.id).toBe('agua-benta')
    expect(plain?.id).toBe('agua-benta')
    expect(accented?.sourceUrl).toBeTruthy()
    expect(plain?.sourceUrl).toBeTruthy()
  })
})
