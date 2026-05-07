import { useMemo, useState } from 'react'
import type { FoundryActor } from '../lib/foundry/foundryTypes'
import type { FoundryHydrationDetail, FoundryHydrationReport } from '../lib/foundry-library/foundryReferenceLibraryTypes'

type HydrationFilterKey =
  | 'hydrated'
  | 'fallback'
  | 'customFallback'
  | 'libraryMiss'
  | 'unsafeRejected'
  | 'noCandidate'
  | 'hasActivities'
  | 'hasEffects'
  | 'hasMidi'
  | 'hasPlutonium'

const filterLabels: Record<HydrationFilterKey, string> = {
  hydrated: 'Hydrated',
  fallback: 'Fallback',
  customFallback: 'Custom fallback',
  libraryMiss: 'Library miss',
  unsafeRejected: 'Unsafe rejected',
  noCandidate: 'No candidate',
  hasActivities: 'Has activities',
  hasEffects: 'Has effects',
  hasMidi: 'Has midi',
  hasPlutonium: 'Has plutonium',
}

export function HydrationReviewPanel({ actor }: { actor: FoundryActor | null }) {
  const report = getHydrationReport(actor)
  const [filters, setFilters] = useState<Record<HydrationFilterKey, boolean>>({
    hydrated: false,
    fallback: false,
    customFallback: false,
    libraryMiss: false,
    unsafeRejected: false,
    noCandidate: false,
    hasActivities: false,
    hasEffects: false,
    hasMidi: false,
    hasPlutonium: false,
  })
  const entries = report?.hydrationDetails?.length ? report.hydrationDetails : report?.entries ?? []
  const filteredEntries = useMemo(() => entries.filter((entry) => matchesFilters(entry, filters)), [entries, filters])

  if (!report) return <p className="empty">Carregue uma Biblioteca Foundry e reconverta para ver a hidratação.</p>

  return (
    <section className="automation-panel">
      <div className="panel-actions">
        <h2>Hidratação</h2>
        <button type="button" onClick={() => downloadJson('hydration-report.json', report)}>
          Exportar relatório de hidratação
        </button>
      </div>
      <div className="audit-summary">
        <span>Hidratados: {report.hydratedItemsCount}</span>
        <span>Fallback: {report.hydrationFallbackCount}</span>
        <span>Spells: {report.hydratedSpellsCount}</span>
        <span>Features: {report.hydratedClassFeaturesCount}</span>
        <span>Equip.: {report.hydratedEquipmentCount}</span>
        <span>Items c/ activities: {report.hydratedItemsWithActivitiesCount}</span>
        <span>Items c/ effects: {report.hydratedItemsWithEffectsCount}</span>
        <span>Items c/ midi: {report.hydratedItemsWithMidiCount}</span>
        <span>Items c/ plutonium: {report.hydratedItemsWithPlutoniumCount}</span>
        <span>Custom fallback: {report.hydrationCustomFallbackCount}</span>
        <span>Library miss: {report.hydrationLibraryMissCount}</span>
        <span>Unsafe rejected: {report.hydrationUnsafeMatchRejectedCount}</span>
        <span>No candidate: {report.hydrationNoCandidateCount}</span>
        <span>Refs limpas: {report.sanitizedActorReferenceCount}</span>
      </div>
      <div className="audit-summary">
        {(Object.keys(filterLabels) as HydrationFilterKey[]).map((key) => (
          <label key={key} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={filters[key]} onChange={() => setFilters((current) => ({ ...current, [key]: !current[key] }))} />
            <span>{filterLabels[key]}</span>
          </label>
        ))}
        <span>Visíveis: {filteredEntries.length}</span>
      </div>
      <div className="resolution-table">
        <div className="resolution-header">
          <span>Solicitado</span>
          <span>Tipo</span>
          <span>Final</span>
          <span>Actor fonte</span>
          <span>Arquivo</span>
          <span>Score</span>
          <span>Conf.</span>
          <span>Status</span>
          <span>Preservado</span>
          <span>Avisos</span>
        </div>
        {filteredEntries.map((entry, index) => (
          <div className="resolution-row" key={`${entry.requestedName}-${entry.finalItemType}-${index}`}>
            <span>{entry.requestedName}</span>
            <span>{entry.requestedType}</span>
            <span>{entry.hydrated ? entry.matchedName ?? entry.finalItemName : `${entry.finalItemName} (${entry.fallbackCategory ?? 'fallback'})`}</span>
            <span>{entry.sourceActorName ?? ''}</span>
            <span>{entry.sourceFileName ?? ''}</span>
            <span>{entry.matchScore ?? 0}</span>
            <span>{entry.matchConfidence ?? 'not-found'}</span>
            <span>{entry.hydrated ? 'hydrated' : entry.fallbackCategory ?? 'fallback'}</span>
            <span>
              {[
                entry.preservedActivities ? 'activities' : '',
                entry.preservedEffects ? 'effects' : '',
                entry.preservedMidiProperties ? 'midi' : '',
                entry.preservedPlutoniumFlags ? 'plutonium' : '',
              ]
                .filter(Boolean)
                .join(', ') || '-'}
            </span>
            <span>{entry.warnings.join(', ') || '-'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function matchesFilters(entry: FoundryHydrationDetail, filters: Record<HydrationFilterKey, boolean>): boolean {
  if (filters.hydrated && !entry.hydrated) return false
  if (filters.fallback && !entry.fallbackUsed) return false
  if (filters.customFallback && entry.fallbackCategory !== 'customFallback') return false
  if (filters.libraryMiss && entry.fallbackCategory !== 'libraryMiss') return false
  if (filters.unsafeRejected && entry.fallbackCategory !== 'unsafeMatchRejected') return false
  if (filters.noCandidate && entry.fallbackCategory !== 'noCandidate') return false
  if (filters.hasActivities && !entry.preservedActivities) return false
  if (filters.hasEffects && !entry.preservedEffects) return false
  if (filters.hasMidi && !entry.preservedMidiProperties) return false
  if (filters.hasPlutonium && !entry.preservedPlutoniumFlags) return false
  return true
}

function getHydrationReport(actor: FoundryActor | null): FoundryHydrationReport | null {
  const flags = actor?.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry']
  if (!converterFlags || typeof converterFlags !== 'object' || Array.isArray(converterFlags)) return null
  const report = (converterFlags as Record<string, unknown>).hydrationReport
  return report && typeof report === 'object' && !Array.isArray(report) ? (report as FoundryHydrationReport) : null
}

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
