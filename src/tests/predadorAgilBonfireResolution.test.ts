import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { resolveFeature } from '../lib/rules/featureResolver'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

describe('predadorAgilBonfireResolution', () => {
  it('resolves Predador Ágil through the Bonfire Rule Store with complete description', () => {
    const resolution = resolveFeature('Predador Ágil', { race: 'Felinar', section: 'race' })
    expect(resolution.ruleId).toBeTruthy()
    expect(resolution.resolvedName).toBe('Predador Ágil')
    expect(resolution.ruleId).toContain('predador-agil')

    const meta = buildRuleDescriptionMeta({
      itemName: 'Predador Ágil',
      itemKind: 'raceFeature',
      ruleId: resolution.ruleId,
    })
    const entity = getBonfireRuleEntity(resolution.ruleId)

    expect(meta.status).toBe('complete')
    expect(meta.sourceType).toBe('inline-bold-subrule')
    expect(entity?.descriptionText).toBe('Seu deslocamento base aumenta em 1,5 metro [5 pés]. Além disso, você ganha deslocamento de Escalada igual ao seu deslocamento de caminhada.')
    expect(meta.html).not.toContain('Não Encontrado, CORRIGIR!')
  })
})
