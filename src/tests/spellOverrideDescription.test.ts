import { describe, expect, it } from 'vitest'
import { buildSpellItem } from '../lib/foundry/items'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'

describe('spellOverrideDescription', () => {
  it('applies the Bonfire override block for Silvery Barbs without blocking export', () => {
    const spell = buildSpellItem({
      name: { value: 'Silvery Barbs', confidence: 'high' },
      level: 1,
      raw: 'Silvery Barbs',
      prepared: true,
    })
    const description = String(((spell.system as any).description as any)?.value ?? '')
    const actor = {
      name: 'Teste',
      type: 'character',
      img: 'icons/svg/mystery-man.svg',
      system: {},
      prototypeToken: {},
      items: [spell],
      effects: [],
      flags: {},
      _stats: { systemId: 'dnd5e', systemVersion: '5.2.4' },
    } as any
    const audit = buildExportAuditReport(actor, null)

    expect(description).toContain('Ajuste Bonfire')
    expect(description).toContain('Silvery Barbs')
    expect(audit.validations.some((entry) => entry.code === 'SPELL_OVERRIDE_DESCRIPTION_APPLIED' && entry.itemName === 'Silvery Barbs')).toBe(true)
    expect(audit.validations.some((entry) => entry.code === 'FOUNDRY_ACTOR_SYSTEM_MISSING')).toBe(false)
  })
})
