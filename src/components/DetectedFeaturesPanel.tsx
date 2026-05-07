import { useMemo, useState } from 'react'
import type { FoundryActor, FoundryItem } from '../lib/foundry/foundryTypes'
import type { NormalizedCharacter, NormalizedFeature } from '../lib/normalize/normalizedCharacterTypes'

type FilterKey = 'hydrated' | 'bonfireFallback' | 'pending' | 'suggested'

const filterLabels: Record<FilterKey, string> = {
  hydrated: 'Hidratadas',
  bonfireFallback: 'Bonfire fallback',
  pending: 'Pendentes',
  suggested: 'Sugeridas por progressão',
}

export function DetectedFeaturesPanel({ character, actor }: { character: NormalizedCharacter | null; actor: FoundryActor | null }) {
  if (!character) return <p className="empty">Importe uma ficha para ver as características detectadas.</p>

  const rows = character.features.map((feature) => buildFeatureRow(feature, actor))
  const suggestions = getProgressionSuggestions(actor)
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    hydrated: false,
    bonfireFallback: false,
    pending: false,
    suggested: false,
  })
  const visibleRows = useMemo(() => rows.filter((row) => matchesFeatureFilters(row, filters)), [rows, filters])
  const visibleSuggestions = useMemo(() => suggestions.filter((suggestion) => (!filters.suggested ? true : suggestion.action === 'suggest')), [suggestions, filters.suggested])

  return (
    <section className="automation-panel">
      <div className="panel-actions">
        <div>
          <h2>Características detectadas</h2>
          <p className="empty">Features lidas diretamente da planilha, com status de hidratação e fallback Bonfire.</p>
        </div>
      </div>

      <div className="audit-summary">
        <span>Detectadas: {rows.length}</span>
        <span>Hidratadas: {rows.filter((row) => row.hydrated).length}</span>
        <span>Bonfire fallback: {rows.filter((row) => row.fallbackBonfire).length}</span>
        <span>Pendentes: {rows.filter((row) => row.pending).length}</span>
        <span>Sugestões de progressão: {suggestions.filter((row) => row.action === 'suggest').length}</span>
      </div>
      <div className="audit-summary">
        {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
          <label key={key} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={filters[key]} onChange={() => setFilters((current) => ({ ...current, [key]: !current[key] }))} />
            <span>{filterLabels[key]}</span>
          </label>
        ))}
      </div>

      <div className="resolution-table">
        <div className="resolution-header">
          <span>Nome</span>
          <span>Célula</span>
          <span>Range</span>
          <span>Tipo inferido</span>
          <span>Biblioteca</span>
          <span>Bonfire</span>
          <span>Status</span>
          <span>Candidato escolhido</span>
          <span>Confiança</span>
        </div>
        {visibleRows.map((row) => (
          <div className="resolution-row" key={`${row.name}-${row.sourceCell ?? 'none'}-${row.sourceRange ?? 'none'}`}>
            <span>{row.name}</span>
            <code>{row.sourceCell ?? '-'}</code>
            <code>{row.sourceRange ?? '-'}</code>
            <span>{row.inferredKind ?? '-'}</span>
            <span>{row.hydrated ? 'sim' : 'não'}</span>
            <span>{row.fallbackBonfire ? 'sim' : 'não'}</span>
            <span>{row.pending ? 'pendente' : row.hydrated ? 'hidratada' : row.fallbackBonfire ? 'Bonfire fallback' : 'resolvida'}</span>
            <span>{row.finalItemName ?? '-'}</span>
            <span>{row.confidence ?? '-'}</span>
          </div>
        ))}
      </div>

      {visibleSuggestions.length ? (
        <>
          <h3>Sugestões de progressão</h3>
          <div className="resolution-table">
            <div className="resolution-header">
              <span>Feature esperada</span>
              <span>Nível</span>
              <span>Na planilha</span>
              <span>No Actor</span>
              <span>Ação</span>
            </div>
            {visibleSuggestions.map((suggestion, index) => (
              <div className="resolution-row" key={`${suggestion.expectedFeature}-${suggestion.level}-${index}`}>
                <span>{suggestion.expectedFeature}</span>
                <span>{suggestion.level}</span>
                <span>{suggestion.foundInSheet ? 'sim' : 'não'}</span>
                <span>{suggestion.foundInLibrary ? 'sim' : 'não'}</span>
                <span>{suggestion.action}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

function buildFeatureRow(feature: NormalizedFeature, actor: FoundryActor | null) {
  const matchedItem = (actor?.items ?? []).find((item) => matchesFeatureItem(item, feature))
  const converterFlags = getConverterFlags(matchedItem)
  const hydration = converterFlags?.hydration
  const featureSource = converterFlags?.featureSource
  const hydrated = hydration?.hydrated === true
  const fallbackBonfire = featureSource?.fallbackBonfire === true || hydration?.fallbackCategory === 'bonfireFallback'
  const pending = featureSource?.unresolved === true || hydration?.fallbackCategory === 'libraryMiss' || hydration?.fallbackCategory === 'noCandidate' || hydration?.fallbackCategory === 'unsafeMatchRejected'

  return {
    name: feature.name.value,
    sourceCell: feature.sourceCell,
    sourceRange: feature.sourceRange,
    inferredKind: feature.inferredKind,
    hydrated,
    fallbackBonfire,
    pending,
    finalItemName: matchedItem?.name,
    confidence: String(hydration?.matchConfidence ?? feature.name.confidence),
  }
}

function matchesFeatureItem(item: FoundryItem, feature: NormalizedFeature) {
  const converterFlags = getConverterFlags(item)
  const featureSource = converterFlags?.featureSource
  if (featureSource?.fromSheetRange) {
    if (feature.sourceCell && featureSource.sourceCell === feature.sourceCell) return true
    if (feature.sourceRange && featureSource.sourceRange === feature.sourceRange && item.name === feature.name.value) return true
  }
  return item.type === 'feat' && item.name === feature.name.value
}

function getConverterFlags(item: FoundryItem | null | undefined): Record<string, any> | null {
  const flags = item?.flags?.['roll20-to-foundry']
  return flags && typeof flags === 'object' && !Array.isArray(flags) ? (flags as Record<string, any>) : null
}

function getProgressionSuggestions(actor: FoundryActor | null): Array<{ expectedFeature: string; level: number; foundInSheet: boolean; foundInLibrary: boolean; action: string }> {
  const flags = actor?.flags?.['roll20-to-foundry']
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) return []
  const suggestions = (flags as Record<string, unknown>).classProgressionSuggestions
  return Array.isArray(suggestions) ? (suggestions as Array<{ expectedFeature: string; level: number; foundInSheet: boolean; foundInLibrary: boolean; action: string }>) : []
}

function matchesFeatureFilters(
  row: { hydrated: boolean; fallbackBonfire: boolean; pending: boolean },
  filters: Record<FilterKey, boolean>,
): boolean {
  if (filters.hydrated && !row.hydrated) return false
  if (filters.bonfireFallback && !row.fallbackBonfire) return false
  if (filters.pending && !row.pending) return false
  return true
}
