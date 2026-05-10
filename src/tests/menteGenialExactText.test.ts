import { describe, expect, it } from 'vitest'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

const exactMenteGenialText =
  'Sua mente opera em caminhos não lineares que a magia hostil tem dificuldade de prender. Você tem Vantagem em Testes de Resistência de Inteligência, Sabedoria e Carisma contra magias e efeitos mágicos.'

describe('menteGenialExactText', () => {
  it('uses the exact Bonfire rule text when the full source page exists', () => {
    const entity = getBonfireRuleEntity('folken-mente-genial')

    expect(entity).toBeTruthy()
    expect(entity?.descriptionStatus).toBe('complete')
    expect(entity?.descriptionSource).not.toBe('card-summary')
    expect(entity?.descriptionSource).not.toBe('manual-review')
    expect(entity?.descriptionText).toBe(exactMenteGenialText)
  })
})
