import { describe, expect, it } from 'vitest'
import { buildDiagnosticPackage } from '../lib/pipeline/buildDiagnosticPackage'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('pipeline diagnostic package final', () => {
  it('contains aligned normalized, actor, and audit ability snapshots for clerigo-level5', async () => {
    const { pipelineIds, debug, normalized, actor, audit } = await loadClerigoLevel5Foundry()
    const diagnostic = buildDiagnosticPackage({ pipelineIds, debug, normalized, actor, audit })

    expect(diagnostic.normalized.abilities.str.score.value).toBe(8)
    expect((diagnostic.actor.system.abilities as Record<string, { value: number }>).str.value).toBe(8)
    expect(diagnostic.audit.auditDebug.abilitiesBeforeActorBuild.str).toBe(8)
    expect(diagnostic.audit.importReadiness.canExport).toBe(true)
    expect(diagnostic.audit.summary.errorCount).toBe(0)
    expect(diagnostic.audit.summary.automatedFullCount).toBeGreaterThan(0)
    expect(diagnostic.audit.summary.activitiesCount).toBeGreaterThan(0)
  })
})
