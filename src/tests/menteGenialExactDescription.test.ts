import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

const exactMenteGenialText =
  'Sua mente opera em caminhos não lineares que a magia hostil tem dificuldade de prender. Você tem Vantagem em Testes de Resistência de Inteligência, Sabedoria e Carisma contra magias e efeitos mágicos.'

describe('menteGenialExactDescription', () => {
  it('preserves the exact full Bonfire text for Mente Genial', () => {
    const entity = getBonfireRuleEntity('folken-mente-genial')
    const meta = buildRuleDescriptionMeta({ itemName: 'Mente Genial', itemKind: 'raceFeature', ruleId: 'folken-mente-genial' })

    expect(entity?.descriptionStatus).toBe('complete')
    expect(entity?.descriptionText).toBe(exactMenteGenialText)
    expect(meta.status).toBe('complete')
    expect(meta.sourceType).not.toBe('card-summary')
  })
})
