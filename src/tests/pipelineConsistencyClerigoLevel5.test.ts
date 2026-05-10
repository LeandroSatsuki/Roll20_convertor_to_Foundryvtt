import { describe, expect, it } from 'vitest'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('pipeline consistency clerigo-level5', () => {
  it('keeps debug, normalized, actor and audit aligned on the same parser run', async () => {
    const { debug, normalized, actor, audit } = await loadClerigoLevel5Foundry()
    const actorFlags = ((actor.flags['roll20-to-foundry'] as Record<string, unknown>) ?? {}) as Record<string, unknown>
    const abilities = actor.system.abilities as Record<string, { value: number }>

    expect(debug?.parserBuildId).toBeTruthy()
    expect(normalized.pipeline?.parserBuildId).toBe(debug?.parserBuildId)
    expect(String(actorFlags.parserBuildId)).toBe(debug?.parserBuildId)
    expect(audit.auditDebug.parserBuildId).toBe(debug?.parserBuildId)

    expect(normalized.abilities.str.score.value).toBe(8)
    expect(normalized.abilities.dex.score.value).toBe(14)
    expect(normalized.abilities.con.score.value).toBe(12)
    expect(normalized.abilities.int.score.value).toBe(10)
    expect(normalized.abilities.wis.score.value).toBe(18)
    expect(normalized.abilities.cha.score.value).toBe(14)

    expect(abilities.str.value).toBe(8)
    expect(abilities.dex.value).toBe(14)
    expect(abilities.con.value).toBe(12)
    expect(abilities.int.value).toBe(10)
    expect(abilities.wis.value).toBe(18)
    expect(abilities.cha.value).toBe(14)

    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
  })
})
