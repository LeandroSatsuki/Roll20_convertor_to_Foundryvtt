import { describe, expect, it } from 'vitest'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

const exactMenteGenialText =
  'Sua mente opera em caminhos não lineares que a magia hostil tem dificuldade de prender. Você tem Vantagem em Testes de Resistência de Inteligência, Sabedoria e Carisma contra magias e efeitos mágicos.'

describe('bonfireDescriptionFidelity', () => {
  it('does not promote Mente Genial summary text to a complete Bonfire rule description', () => {
    const entity = getBonfireRuleEntity('folken-mente-genial')

    expect(entity).toBeTruthy()
    expect(entity?.descriptionText ?? '').not.toBe('Os Folken Limalumes demonstram raciocínio vivo, imaginação rápida e capacidade de conectar ideias improváveis.')

    if (entity?.descriptionStatus === 'complete') {
      expect(entity.descriptionSource).not.toBe('card-summary')
      expect(entity.descriptionText).toContain(exactMenteGenialText)
      expect(entity.descriptionText).not.toContain('Os Folken Limalumes demonstram raciocínio vivo')
    } else {
      expect(['summary-only', 'needs-review']).toContain(entity?.descriptionStatus)
      expect(entity?.shortDescription ?? '').toContain('Os Folken Limalumes demonstram raciocínio vivo')
      expect(entity?.needsReviewReasons).toContain('missing-full-rule-page')
    }
  })
})
