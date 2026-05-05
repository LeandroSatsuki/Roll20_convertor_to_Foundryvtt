import { describe, expect, it } from 'vitest'
import { buildDiagnosticPackage } from '../lib/pipeline/buildDiagnosticPackage'
import { loadPipkinFoundry } from './pipkinFoundryFixture'

describe('pipeline diagnostic package final', () => {
  it('contains aligned normalized, actor, and audit ability snapshots for Pipkin', async () => {
    const { pipelineIds, debug, normalized, actor, audit } = await loadPipkinFoundry()
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
