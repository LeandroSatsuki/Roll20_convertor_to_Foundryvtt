import type { ConversionMessageAudience, ConversionWarning, NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { aliasesForFoundryLibraryName, normalizeFoundryLibraryName } from '../foundry-library/foundryLibraryAliases'
import type { FoundryActor, FoundryItem } from './foundryTypes'

type DescriptionMeta = {
  status: 'complete' | 'fallback' | 'missing'
  sourceName?: string | null
  sourceUrl?: string | null
}

export function prepareFinalBonfireActor(actor: FoundryActor, character: NormalizedCharacter): FoundryActor {
  if (character.source.type === 'bonfire-xlsx') {
    sanitizeLegacySourceLabels(actor)
  }

  const converterFlags = ensureConverterFlags(actor)
  converterFlags.parser = 'bonfire-v2.1'
  converterFlags.actorExport = 'foundry-actor'
  converterFlags.normalizedExport = 'normalized-character'
  converterFlags.auditAudience = 'technical-report'
  converterFlags.conversionMessages = character.warnings.map((warning) => ({
    code: warning.code,
    severity: warning.severity,
    message: warning.message,
    fieldPath: warning.fieldPath ?? null,
    audience: classifyConversionMessageAudience(warning),
  }))

  for (const item of actor.items) {
    annotateHydrationDisplayMetadata(item)
    annotatePlayerVisibleResolution(item)
  }

  const biography = buildPlayerBiography(actor.items)
  const details = (actor.system.details as Record<string, unknown> | undefined) ?? {}
  const biographyBlock = details.biography && typeof details.biography === 'object' && !Array.isArray(details.biography) ? { ...(details.biography as Record<string, unknown>) } : {}
  details.biography = { ...biographyBlock, value: biography, public: biographyBlock.public ?? '' }
  actor.system.details = details

  return actor
}

export function classifyConversionMessageAudience(warning: ConversionWarning): ConversionMessageAudience {
  if (
    [
      'NAMED_RANGE_NOT_FOUND',
      'SPELL_RANGE_EMPTY',
      'FOUNDRY_LIBRARY_PRESERVED_PLUTONIUM_FLAGS',
      'FOUNDRY_LIBRARY_PRESERVED_MIDI_PROPERTIES',
      'FOUNDRY_LIBRARY_PRESERVED_EFFECTS',
      'FOUNDRY_LIBRARY_PRESERVED_ACTIVITIES',
      'FOUNDRY_LIBRARY_CLONED_WITH_CLEANED_ORIGIN',
      'INITIATIVE_DEFAULTED_TO_DEX',
      'RULE_DESCRIPTION_FALLBACK_USED',
    ].includes(warning.code)
  ) {
    return 'debug'
  }

  if (warning.severity === 'error') return 'audit'
  if (warning.code.startsWith('FOUNDRY_LIBRARY_')) return 'audit'
  if (warning.code.startsWith('SPELL_')) return 'audit'
  return 'gmReview'
}

function sanitizeLegacySourceLabels(actor: FoundryActor) {
  const converterFlags = ensureConverterFlags(actor)
  if (typeof converterFlags.source !== 'string' || !converterFlags.source.trim()) converterFlags.source = 'bonfire-xlsx'

  for (const item of actor.items) {
    const itemFlags = ensureItemConverterFlags(item)
    if (itemFlags.source === 'roll20-pdf' || itemFlags.source === 'sheet') {
      itemFlags.source = 'bonfire-xlsx'
    }
    sanitizeDescriptionValue(item)
  }
}

function sanitizeDescriptionValue(item: FoundryItem) {
  const system = item.system ?? {}
  const description = system.description
  if (!description || typeof description !== 'object' || Array.isArray(description)) return
  const record = description as Record<string, unknown>
  if (typeof record.value !== 'string') return
  record.value = record.value
    .replace(/Roll20 PDF Conversion Notes/gi, 'Notas de Importacao Bonfire')
    .replace(/Classe extraida da ficha Roll20 PDF\./gi, 'Classe extraida da ficha Bonfire XLSX.')
    .replace(/Antecedente extraido do PDF\./gi, 'Antecedente extraido da ficha Bonfire XLSX.')
    .replace(/Raca extraida do PDF; revisar tipo species\/race\./gi, 'Raca extraida da ficha Bonfire XLSX; revisar tipo species/race.')
    .replace(/Roll20 PDF/gi, 'Bonfire XLSX')
}

function annotateHydrationDisplayMetadata(item: FoundryItem) {
  const itemFlags = ensureItemConverterFlags(item)
  const hydration = itemFlags.hydration
  if (!hydration || typeof hydration !== 'object' || Array.isArray(hydration)) return

  const hydrationRecord = hydration as Record<string, unknown>
  const requestedDisplayName = stringOrNull(hydrationRecord.requestedDisplayName) ?? stringOrNull(hydrationRecord.requestedName) ?? item.name
  const canonicalName =
    stringOrNull(hydrationRecord.canonicalName)
    ?? (truthy(hydrationRecord.hydrated) ? stringOrNull(hydrationRecord.sourceItemName) ?? item.name : stringOrNull(hydrationRecord.requestedName) ?? item.name)
  const libraryLookupName =
    stringOrNull(hydrationRecord.libraryLookupName)
    ?? inferLibraryLookupName(requestedDisplayName, canonicalName)
    ?? requestedDisplayName

  hydrationRecord.requestedDisplayName = requestedDisplayName
  hydrationRecord.libraryLookupName = libraryLookupName
  hydrationRecord.canonicalName = canonicalName
  hydrationRecord.displayLanguage = stringOrNull(hydrationRecord.displayLanguage) ?? detectDisplayLanguage(requestedDisplayName, canonicalName)
}

function annotatePlayerVisibleResolution(item: FoundryItem) {
  const itemFlags = ensureItemConverterFlags(item)
  const hydration = itemFlags.hydration
  const hydrationRecord = hydration && typeof hydration === 'object' && !Array.isArray(hydration) ? (hydration as Record<string, unknown>) : null
  const descriptionMeta = getDescriptionMeta(item)
  const featureSource = itemFlags.featureSource && typeof itemFlags.featureSource === 'object' && !Array.isArray(itemFlags.featureSource) ? (itemFlags.featureSource as Record<string, unknown>) : null

  const isCustomFallback = hydrationRecord?.fallbackCategory === 'customFallback'
  const hasBonfireCoverage = hasBonfireCoverageForFallback(item, descriptionMeta)
  const unresolvedPlayerVisible = Boolean(
    featureSource?.unresolved === true
      || featureSource?.fromSheetRange === true && !hasBonfireCoverage && hydrationRecord?.hydrated !== true
      || false,
  ) || Boolean(
    (hydrationRecord && hydrationRecord.hydrated === false && !isCustomFallback && !hasBonfireCoverage)
      || (!hydrationRecord && descriptionMeta?.status === 'missing' && !hasBonfireCoverage && itemFlags.source !== 'bonfire-rule-store'),
  )
  itemFlags.unresolvedPlayerVisible = unresolvedPlayerVisible

  if (unresolvedPlayerVisible) {
    const note = buildUnresolvedNote(item, hydrationRecord)
    itemFlags.playerVisibleNote = note
    if (hydrationRecord) hydrationRecord.playerVisibleNote = note
  } else if (hydrationRecord && isCustomFallback && !hasBonfireCoverage) {
    hydrationRecord.gmReviewNote = `${displayNameForItem(item, hydrationRecord)} - regra custom, revisar descricao se necessario.`
  }
}

function buildPlayerBiography(items: FoundryItem[]): string {
  const unresolvedEntries = items
    .map((item) => ({ item, flags: getItemFlags(item) }))
    .filter(({ flags }) => truthy(flags.unresolvedPlayerVisible))
    .map(({ item, flags }) => ({
      item,
      html: `<li>${escapeHtml(String(flags.playerVisibleNote ?? flags.hydration?.playerVisibleNote ?? `${item.name} - revisar manualmente.`))}</li>`,
      isFeature: Boolean(flags.featureSource?.fromSheetRange),
      category: categoryForBonfirePending(flags),
    }))

  const unresolvedItems = unresolvedEntries.filter((entry) => !entry.isFeature).map((entry) => entry.html)
  const unresolvedFeatures = unresolvedEntries.filter((entry) => entry.isFeature)

  const customReviewItems = items
    .map((item) => ({ item, flags: getItemFlags(item), descriptionMeta: getDescriptionMeta(item) }))
    .filter(({ flags, descriptionMeta }) => flags.hydration?.fallbackCategory === 'customFallback' && !hasBonfireCoverageForFallback(undefined, descriptionMeta))
    .map(({ item, flags }) => `<li>${escapeHtml(String(flags.hydration?.gmReviewNote ?? `${item.name} - regra custom, revisar descricao se necessario.`))}</li>`)

  if (!unresolvedItems.length && !unresolvedFeatures.length && !customReviewItems.length) {
    return '<section class="bonfire-import-notes"><p>Importacao concluida sem pendencias jogaveis.</p></section>'
  }

  const sections: string[] = ['<section class="bonfire-import-notes">', '<h2>Notas de Importacao Bonfire</h2>']
  if (unresolvedItems.length) {
    sections.push('<h3>Itens para revisar/adicionar manualmente</h3>')
    sections.push(`<ul>${unresolvedItems.join('')}</ul>`)
  }
  if (unresolvedFeatures.length) {
    sections.push('<h3>Características para corrigir</h3>')
    const groups = [
      ['race', 'Raça'],
      ['class', 'Classe'],
      ['feat', 'Talentos'],
      ['background', 'Antecedente'],
      ['other', 'Outros'],
    ] as const
    for (const [category, label] of groups) {
      const entries = unresolvedFeatures.filter((entry) => entry.category === category).map((entry) => entry.html)
      if (!entries.length) continue
      sections.push(`<h4>${label}</h4>`)
      sections.push(`<ul>${entries.join('')}</ul>`)
    }
  }
  if (customReviewItems.length) {
    sections.push('<h3>Regras custom Bonfire</h3>')
    sections.push(`<ul>${customReviewItems.join('')}</ul>`)
  }
  sections.push('</section>')
  return sections.join('')
}

function buildUnresolvedNote(item: FoundryItem, hydration: Record<string, unknown> | null): string {
  const flags = getItemFlags(item)
  const bonfire = flags.bonfireResolution && typeof flags.bonfireResolution === 'object' && !Array.isArray(flags.bonfireResolution) ? (flags.bonfireResolution as Record<string, unknown>) : null
  if (bonfire?.status === 'not-found') {
    const originalName = stringOrNull(bonfire.originalName) ?? item.name.replace(/\s+\(N(?:a|ã)o Encontrado, CORRIGIR!\)$/i, '')
    const status = stringOrNull(bonfire.playerVisibleStatus) ?? 'Não Encontrado, CORRIGIR!'
    return `${originalName} (${status})`
  }
  const displayName = displayNameForItem(item, hydration ?? {})
  const category = stringOrNull(hydration?.fallbackCategory)
  if (category === 'unsafeMatchRejected') {
    return `${displayName} - ha candidatos na biblioteca Foundry, mas o match nao foi seguro o bastante para aplicar automaticamente.`
  }
  if (category === 'libraryMiss') {
    return `${displayName} - nao encontrado na biblioteca Foundry nem no Rule Store Bonfire.`
  }
  return `${displayName} - nao encontrado automaticamente; revisar/adicionar manualmente se precisar de mecanica completa.`
}

function categoryForBonfirePending(flags: Record<string, any>): 'race' | 'class' | 'feat' | 'background' | 'other' {
  const bonfire = flags.bonfireResolution && typeof flags.bonfireResolution === 'object' && !Array.isArray(flags.bonfireResolution) ? (flags.bonfireResolution as Record<string, unknown>) : null
  const category = stringOrNull(bonfire?.category)
  if (category === 'race' || category === 'class' || category === 'feat' || category === 'background') return category
  const source = flags.featureSource && typeof flags.featureSource === 'object' && !Array.isArray(flags.featureSource) ? (flags.featureSource as Record<string, unknown>) : null
  const kind = stringOrNull(source?.inferredKind) ?? stringOrNull(source?.sourceType)
  if (!kind) return 'other'
  if (/race/i.test(kind)) return 'race'
  if (/class|subclass/i.test(kind)) return 'class'
  if (/background/i.test(kind)) return 'background'
  if (/feat|talento/i.test(kind)) return 'feat'
  return 'other'
}

function hasBonfireCoverageForFallback(item: FoundryItem | undefined, descriptionMeta: DescriptionMeta | null): boolean {
  if (descriptionMeta && (descriptionMeta.status === 'complete' || descriptionMeta.status === 'fallback')) {
    if (descriptionMeta.sourceName && descriptionMeta.sourceName !== 'Conversor local') return true
    if (descriptionMeta.sourceUrl) return true
  }
  if (!item) return false
  const flags = getItemFlags(item)
  const ruleResolution = flags.ruleResolution
  if (ruleResolution && typeof ruleResolution === 'object' && !Array.isArray(ruleResolution) && stringOrNull((ruleResolution as Record<string, unknown>).ruleId)) return true
  return flags.source === 'bonfire-rule-store'
}

function getDescriptionMeta(item: FoundryItem): DescriptionMeta | null {
  const flags = getItemFlags(item)
  const meta = flags.descriptionMeta
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const record = meta as Record<string, unknown>
  return {
    status: record.status === 'complete' || record.status === 'fallback' ? record.status : 'missing',
    sourceName: stringOrNull(record.sourceName),
    sourceUrl: stringOrNull(record.sourceUrl),
  }
}

function inferLibraryLookupName(requestedDisplayName: string, canonicalName: string): string | null {
  const requestedNormalized = normalizeFoundryLibraryName(requestedDisplayName)
  const canonicalNormalized = normalizeFoundryLibraryName(canonicalName)
  if (requestedNormalized === canonicalNormalized) return canonicalName
  const aliases = aliasesForFoundryLibraryName(canonicalName)
  if (aliases.includes(requestedNormalized)) return canonicalName
  return canonicalName
}

function detectDisplayLanguage(requestedDisplayName: string, canonicalName: string): 'pt-BR' | 'en' | 'mixed' {
  const requestedNormalized = normalizeFoundryLibraryName(requestedDisplayName)
  const canonicalNormalized = normalizeFoundryLibraryName(canonicalName)
  if (requestedNormalized !== canonicalNormalized) return 'mixed'
  if (/[áàâãéêíóôõúç]/i.test(requestedDisplayName) || /\b(orientacao|palavra|raio|curar|detectar|bem|mal|invisibilidade|lunar|crescer|plantas|revivificar|pele|arvore|emocoes|calmas|cimitarra)\b/i.test(normalizeForLanguage(requestedDisplayName))) {
    return 'pt-BR'
  }
  return 'en'
}

function normalizeForLanguage(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function displayNameForItem(item: FoundryItem, hydration: Record<string, unknown>): string {
  return stringOrNull(hydration.requestedDisplayName) ?? stringOrNull(hydration.requestedName) ?? item.name
}

function getItemFlags(item: FoundryItem): Record<string, any> {
  return ensureItemConverterFlags(item)
}

function ensureConverterFlags(actor: FoundryActor): Record<string, any> {
  const flags = (actor.flags ?? {}) as Record<string, unknown>
  const converterFlags = flags['roll20-to-foundry']
  if (converterFlags && typeof converterFlags === 'object' && !Array.isArray(converterFlags)) return converterFlags as Record<string, any>
  const created: Record<string, any> = {}
  flags['roll20-to-foundry'] = created
  actor.flags = flags
  return created
}

function ensureItemConverterFlags(item: FoundryItem): Record<string, any> {
  const flags = (item.flags ?? {}) as Record<string, unknown>
  const converterFlags = flags['roll20-to-foundry']
  if (converterFlags && typeof converterFlags === 'object' && !Array.isArray(converterFlags)) return converterFlags as Record<string, any>
  const created: Record<string, any> = {}
  flags['roll20-to-foundry'] = created
  item.flags = flags
  return created
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function truthy(value: unknown): boolean {
  return value === true || value === 'true' || value === 1
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
