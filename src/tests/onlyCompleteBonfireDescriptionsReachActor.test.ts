import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { defaultBonfireEntityRuleStore } from '../lib/rules/store/bonfireRuleStore'

describe('onlyCompleteBonfireDescriptionsReachActor', () => {
  it('uses final Bonfire text only for complete seeds and a placeholder otherwise', () => {
    const completeEntity = defaultBonfireEntityRuleStore.entities.find((entity) => entity.kind === 'raceFeature' && entity.descriptionStatus === 'complete' && entity.descriptionText)
    const incompleteEntity = defaultBonfireEntityRuleStore.entities.find((entity) => entity.kind === 'background' && entity.descriptionStatus !== 'complete')

    expect(completeEntity).toBeTruthy()
    expect(incompleteEntity).toBeTruthy()

    const completeMeta = buildRuleDescriptionMeta({
      itemName: completeEntity!.name,
      itemKind: completeEntity!.kind,
      ruleId: completeEntity!.id,
    })
    const incompleteMeta = buildRuleDescriptionMeta({
      itemName: incompleteEntity!.name,
      itemKind: incompleteEntity!.kind,
      ruleId: incompleteEntity!.id,
    })

    expect(completeMeta.status).toBe('complete')
    expect(completeMeta.html).toContain(completeEntity!.descriptionText ?? '')
    expect(incompleteMeta.status).not.toBe('complete')
    expect(incompleteMeta.html).toContain('Descricao Bonfire nao encontrada, CORRIGIR!')
  })
})
