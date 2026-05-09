import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'

describe('featureUsesBonfireDescriptionOnly', () => {
  it('uses Bonfire description metadata without replacing it with Foundry library text', () => {
    const menteGenial = buildRuleDescriptionMeta({ itemName: 'Mente Genial', itemKind: 'raceFeature', ruleId: 'folken-mente-genial' })
    const ancestralidade = buildRuleDescriptionMeta({ itemName: 'Ancestralidade Feérica', itemKind: 'raceFeature', ruleId: 'elfo-da-lua-ancestralidade-feerica' })

    expect(menteGenial.status).not.toBe('complete')
    expect(menteGenial.html).toContain('Mente Genial')
    expect(menteGenial.html).toContain('Preview local')
    expect(menteGenial.html).not.toContain('Wild Companion')
    expect(ancestralidade.html).not.toContain('Fey Ancestry')
  })
})
