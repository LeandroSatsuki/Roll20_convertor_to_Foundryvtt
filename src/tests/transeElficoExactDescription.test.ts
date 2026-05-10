import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

const exactTranseElficoText =
  'Elfos não precisam dormir. Em vez disso, meditam profundamente, permanecendo semiconscientes, durante 4 horas por dia. Após descansar dessa forma, você ganha os mesmos benefícios que um humano ganharia após 8 horas de sono.'

describe('transeElficoExactDescription', () => {
  it('uses the exact Bonfire text for Transe Élfico instead of the old preview', () => {
    const entity = getBonfireRuleEntity('elfo-da-lua-transe-elfico')
    const meta = buildRuleDescriptionMeta({ itemName: 'Transe Élfico', itemKind: 'raceFeature', ruleId: 'elfo-da-lua-transe-elfico' })

    expect(entity).toBeTruthy()
    expect(entity?.descriptionStatus).toBe('complete')
    expect(entity?.descriptionText).toBe(exactTranseElficoText)
    expect(entity?.descriptionText).not.toContain('descansam em transe meditativo')
    expect(meta.status).toBe('complete')
    expect(meta.html).toContain(exactTranseElficoText)
    expect(meta.html).not.toContain('descansam em transe meditativo')
  })
})
