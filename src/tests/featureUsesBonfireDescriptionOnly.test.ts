import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { defaultBonfireEntityRuleStore } from '../lib/rules/store/bonfireRuleStore'

describe('featureUsesBonfireDescriptionOnly', () => {
  it('uses Bonfire description metadata without replacing it with Foundry library text', () => {
    const menteGenial = buildRuleDescriptionMeta({ itemName: 'Mente Genial', itemKind: 'raceFeature', ruleId: 'folken-mente-genial' })
    const incompleteEntity = defaultBonfireEntityRuleStore.entities.find((entity) => entity.kind === 'background' && entity.descriptionStatus !== 'complete')
    const incompleteMeta = buildRuleDescriptionMeta({
      itemName: incompleteEntity!.name,
      itemKind: incompleteEntity!.kind,
      ruleId: incompleteEntity!.id,
    })

    expect(menteGenial.status).toBe('complete')
    expect(menteGenial.html).toContain('Mente Genial')
    expect(menteGenial.html).toContain('Sua mente opera em caminhos não lineares')
    expect(menteGenial.html).not.toContain('Wild Companion')
    expect(incompleteEntity).toBeTruthy()
    expect(incompleteMeta.html).toContain('Descricao Bonfire nao encontrada, CORRIGIR!')
  })
})
