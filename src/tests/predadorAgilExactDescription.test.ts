import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

const exactPredadorAgilText =
  'Seu deslocamento base aumenta em 1,5 metro [5 pés]. Além disso, você ganha deslocamento de Escalada igual ao seu deslocamento de caminhada.'

describe('predadorAgilExactDescription', () => {
  it('uses the exact sub-rule text for Predador Ágil instead of leaving the rule unresolved', () => {
    const entity = getBonfireRuleEntity('race-feature-felinar-predador-agil')
    const meta = buildRuleDescriptionMeta({ itemName: 'Predador Ágil', itemKind: 'raceFeature', ruleId: 'race-feature-felinar-predador-agil' })

    expect(entity).toBeTruthy()
    expect(entity?.descriptionStatus).toBe('complete')
    expect(entity?.descriptionSource).toBe('inline-bold-subrule')
    expect(entity?.descriptionText).toBe(exactPredadorAgilText)
    expect(meta.status).toBe('complete')
    expect(meta.html).toContain(exactPredadorAgilText)
    expect(meta.html).not.toContain('Descricao Bonfire nao encontrada, CORRIGIR!')
  })
})
