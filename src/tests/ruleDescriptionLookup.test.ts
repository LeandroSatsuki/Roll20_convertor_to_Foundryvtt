import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'

describe('ruleDescriptionLookup', () => {
  it('returns a full description for core Bonfire rules', () => {
    const clerigo = buildRuleDescriptionMeta({ itemName: 'Clérigo', itemKind: 'class', ruleId: 'clerigo' })
    const canalizar = buildRuleDescriptionMeta({ itemName: 'Canalizar Divindade', itemKind: 'resource', ruleId: 'clerigo-canalizar-divindade' })
    const folken = buildRuleDescriptionMeta({ itemName: 'Folken Limalumes', itemKind: 'race', ruleId: 'folken-limalumes' })

    expect(clerigo.status).toBe('complete')
    expect(clerigo.html).toContain('Clérigo')
    expect(canalizar.status).toBe('complete')
    expect(canalizar.html).toContain('Canalizar Divindade')
    expect(folken.status).toBe('complete')
    expect(folken.html).toContain('Folken Limalumes')
  })

  it('falls back safely when a rule is missing', () => {
    const fallback = buildRuleDescriptionMeta({
      itemName: 'Regra Desconhecida',
      itemKind: 'feat',
      ruleId: 'regra-inexistente',
      sourceUrl: 'https://example.com/bonfire',
    })

    expect(fallback.status).toBe('fallback')
    expect(fallback.warningCodes).toContain('RULE_DESCRIPTION_FALLBACK_USED')
    expect(fallback.html).toContain('Consulte a fonte Bonfire Tales')
  })
})
