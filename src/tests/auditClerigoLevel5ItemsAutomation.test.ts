import { describe, expect, it } from 'vitest'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('clerigo-level5 item automation audit', () => {
  it('keeps the actor importable and preserves stabilized abilities', async () => {
    const { actor, audit } = await loadClerigoLevel5Foundry()
    const conjuracao = actor.items.find((item) => item.name === 'Conjuração')
    const abilities = actor.system.abilities as Record<string, { value: number }>

    expect(abilities.str.value).toBe(8)
    expect(abilities.dex.value).toBe(14)
    expect(abilities.con.value).toBe(12)
    expect(abilities.int.value).toBe(10)
    expect(abilities.wis.value).toBe(18)
    expect(abilities.cha.value).toBe(14)
    expect((conjuracao?.system.spellcasting as any)?.ability).toBe('wis')
    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
    expect(audit.summary.automatedFullCount).toBeGreaterThanOrEqual(5)
    expect(audit.summary.activitiesCount).toBeGreaterThanOrEqual(3)
    expect(audit.summary.invalidActivitiesCount).toBe(0)
  })
})
