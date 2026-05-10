import type { BonfireSpellOverrideRule } from '../../rules/bonfireTypes'
import { isAllowedCompleteDescriptionSource } from '../../rules/descriptionSourcePolicy'
import { getBonfireRuleEntity } from '../../rules/store/bonfireRuleStore'
import { escapeHtml } from '../mapWeapons'

export type ItemDescriptionStatus = 'complete' | 'fallback' | 'missing'
export type BonfireItemDescriptionStatus = ItemDescriptionStatus | 'summary-only' | 'needs-review'

export type ItemDescriptionMeta = {
  html: string
  status: BonfireItemDescriptionStatus
  sourceUrl?: string
  sourceName?: string
  sourceType?:
    | 'article-body'
    | 'section-body'
    | 'table-rule-body'
    | 'table-row'
    | 'inline-bold-subrule'
    | 'card-summary'
    | 'category-preview'
    | 'manual-review'
    | 'unknown'
    | 'fallback'
    | 'generated'
    | 'local-preview'
  warningCodes: string[]
  warningMessages: string[]
  needsReviewReasons?: string[]
  overrideApplied?: boolean
}

type RuleDescriptionOptions = {
  itemName: string
  itemKind: string
  ruleId?: string
  fallbackText?: string
  sourceUrl?: string
  sourceName?: string
}

type SpellDescriptionOptions = {
  itemName: string
  fallbackText?: string
  overrideRule?: BonfireSpellOverrideRule
}

export function buildRuleDescriptionMeta(options: RuleDescriptionOptions): ItemDescriptionMeta {
  const entity = getBonfireRuleEntity(options.ruleId)
  const sourceUrl = entity?.sourceUrl ?? options.sourceUrl
  const sourceName = entity?.sourceName ?? options.sourceName ?? 'Bonfire Tales'
  const primaryDescription = sanitizeRuleText(entity?.descriptionText ?? entity?.description)
  const shortDescription = sanitizeRuleText(entity?.shortDescription)
  const descriptionStatus = entity?.descriptionStatus ?? (primaryDescription ? 'complete' : shortDescription ? 'needs-review' : 'missing')
  const descriptionSource = entity?.descriptionSource ?? 'unknown'
  const needsReviewReasons = entity?.needsReviewReasons ?? []
  const descriptionHtml = sanitizeRuleHtml(entity?.descriptionHtml)
  const exactDescriptionAllowed = descriptionStatus === 'complete'
    && isAllowedCompleteDescriptionSource(descriptionSource)
    && !looksLikeNonExactRuleBody(primaryDescription, descriptionHtml)

  if (!entity && sourceUrl) {
    return {
      html: renderMissingBonfireDescriptionHtml({
        title: options.itemName,
        sourceUrl,
        sourceType: 'unknown',
      }),
      status: 'missing',
      sourceUrl,
      sourceName,
      sourceType: 'unknown',
      warningCodes: ['BONFIRE_DESCRIPTION_MISSING_FULL_TEXT', 'BONFIRE_DESCRIPTION_NEEDS_SOURCE_PAGE'],
      warningMessages: ['Texto completo da regra Bonfire nao foi encontrado na base local.'],
      needsReviewReasons: ['missing-full-rule-description', 'missing-full-rule-page'],
    }
  }

  if (exactDescriptionAllowed && (descriptionHtml || primaryDescription)) {
    const shouldRenderExactTextBody = isBonfireExactDescriptionKind(options.itemKind)
    return {
      html: renderRuleDescriptionHtml({
        title: entity?.name ?? options.itemName,
        body: primaryDescription ?? '',
        bodyHtml: shouldRenderExactTextBody ? undefined : descriptionHtml,
        kind: entity?.kind ?? options.itemKind,
        sourceName,
        sourceUrl,
      }),
      status: 'complete',
      sourceUrl,
      sourceName,
      sourceType: descriptionSource,
      warningCodes: [],
      warningMessages: [],
      needsReviewReasons: [],
    }
  }

  if (isBonfireExactDescriptionKind(options.itemKind) && entity) {
    const warningCodes = Array.from(
      new Set([
        ...(descriptionStatus === 'summary-only' ? ['BONFIRE_DESCRIPTION_SUMMARY_ONLY'] : []),
        ...(descriptionSource === 'card-summary' || descriptionSource === 'category-preview' ? ['BONFIRE_DESCRIPTION_PREVIEW_REJECTED'] : []),
        ...(descriptionSource === 'manual-review' ? ['BONFIRE_DESCRIPTION_MANUAL_REVIEW_NOT_COMPLETE'] : []),
        ...(!isAllowedCompleteDescriptionSource(descriptionSource) ? ['BONFIRE_DESCRIPTION_SOURCE_NOT_ALLOWED_FOR_COMPLETE'] : []),
        ...(descriptionStatus === 'complete' && looksLikeNonExactRuleBody(primaryDescription, descriptionHtml) ? ['BONFIRE_DESCRIPTION_NOT_EXACT'] : []),
        'BONFIRE_DESCRIPTION_MISSING_FULL_TEXT',
      ]),
    )
    return {
      html: renderMissingBonfireDescriptionHtml({
        title: entity?.name ?? options.itemName,
        sourceUrl,
        sourceType: descriptionSource,
      }),
      status: descriptionStatus === 'summary-only' ? 'summary-only' : 'needs-review',
      sourceUrl,
      sourceName,
      sourceType: descriptionSource,
      warningCodes,
      warningMessages: ['Descricao Bonfire nao encontrada em forma completa; item exportado com pendencia explicita de revisao.'],
      needsReviewReasons,
    }
  }

  const fallbackText = sanitizeRuleText(options.fallbackText) ?? 'Descricao Bonfire nao encontrada, CORRIGIR!'
  return {
    html: renderRuleDescriptionHtml({
      title: options.itemName,
      body: fallbackText,
      kind: options.itemKind,
      sourceName: options.sourceName ?? 'Conversor local',
      sourceUrl: undefined,
    }),
    status: 'missing',
    sourceUrl: undefined,
    sourceName: options.sourceName ?? 'Conversor local',
    sourceType: 'unknown',
    warningCodes: ['RULE_DESCRIPTION_MISSING'],
      warningMessages: ['Descricao ausente no Rule Store; exportando placeholder explicito de revisao.'],
      needsReviewReasons: ['missing-full-rule-description', 'missing-full-rule-page'],
    }
}

function looksLikeNonExactRuleBody(text: string | undefined, html: string | undefined): boolean {
  const compact = sanitizeRuleText(text)
  if (!compact) return false
  if (
    /\bN[ií]vel\b/i.test(compact)
    && /\bB[oô]nus de Profici[eê]ncia\b/i.test(compact)
    && /\bCaracter[ií]sticas\b/i.test(compact)
  ) {
    return true
  }
  if (html && /<table/i.test(html) && /<th>\s*N[íi]vel\s*<\/th>/i.test(html) && /<th>\s*B[oô]nus de Profici/i.test(html)) {
    return true
  }
  return /\b1°\b.*\b2°\b.*\b3°\b/i.test(compact) && /\btruques\b/i.test(compact)
}

function isBonfireExactDescriptionKind(kind: string): boolean {
  return [
    'class',
    'subclass',
    'race',
    'background',
    'feat',
    'originFeat',
    'racialFeat',
    'classFeature',
    'subclassFeature',
    'raceFeature',
    'backgroundFeature',
    'resource',
    'spellcasting',
    'customBonfireFeature',
    'otherFeature',
  ].includes(kind)
}

export function buildSpellDescriptionMeta(options: SpellDescriptionOptions): ItemDescriptionMeta {
  const rule = options.overrideRule
  const baseDescription = sanitizeRuleText(rule?.baseDescription)
  const overrideDescription = sanitizeRuleText(rule?.description)
  const sourceUrl = rule?.sourceUrl
  const sourceName = 'Bonfire Tales'
  const overrideApplied = Boolean(rule && rule.status !== 'allowed' && overrideDescription)
  const warningCodes: string[] = []
  const warningMessages: string[] = []

  if (overrideApplied) {
    warningCodes.push('SPELL_OVERRIDE_DESCRIPTION_APPLIED')
    warningMessages.push(`Ajuste Bonfire aplicado para ${options.itemName}.`)
  }

  if (baseDescription) {
    return {
      html: renderRuleDescriptionHtml({
        title: options.itemName,
        body: baseDescription,
        kind: 'spell',
        sourceName,
        sourceUrl,
        overrideHtml:
          overrideApplied && overrideDescription
            ? `<section class="bonfire-override"><h3>Ajuste Bonfire</h3>${paragraphs(overrideDescription)}${rule?.foundryNotes ? paragraphs(rule.foundryNotes) : ''}</section>`
            : undefined,
      }),
      status: 'complete',
      sourceUrl,
      sourceName,
      sourceType: rule?.descriptionSource ?? 'unknown',
      warningCodes,
      warningMessages,
      needsReviewReasons: rule?.needsReviewReasons ?? [],
      overrideApplied,
    }
  }

  if (overrideDescription || sourceUrl) {
    const body = overrideDescription ?? 'Descricao detalhada nao cadastrada no seed local. Consulte a fonte Bonfire Tales.'
    warningCodes.push('RULE_DESCRIPTION_FALLBACK_USED')
    warningMessages.push('Magia exportada com descricao fallback baseada no seed local.')
    return {
      html: renderRuleDescriptionHtml({
        title: options.itemName,
        body,
        kind: 'spell',
        sourceName,
        sourceUrl,
        overrideHtml:
          overrideApplied && rule?.foundryNotes
            ? `<section class="bonfire-override"><h3>Ajuste Bonfire</h3>${paragraphs(rule.foundryNotes)}</section>`
            : undefined,
      }),
      status: 'fallback',
      sourceUrl,
      sourceName,
      sourceType: rule?.descriptionSource ?? 'unknown',
      warningCodes,
      warningMessages,
      needsReviewReasons: rule?.needsReviewReasons ?? [],
      overrideApplied,
    }
  }

  return {
    html: renderRuleDescriptionHtml({
      title: options.itemName,
      body: sanitizeRuleText(options.fallbackText) ?? 'Magia extraida da aba Magias. Revise a descricao manualmente.',
      kind: 'spell',
      sourceName: 'Conversor local',
      sourceUrl: undefined,
    }),
    status: 'missing',
    sourceUrl: undefined,
    sourceName: 'Conversor local',
    sourceType: 'unknown',
    warningCodes: ['RULE_DESCRIPTION_MISSING'],
    warningMessages: ['Magia sem descricao no seed local.'],
    needsReviewReasons: ['missing-full-rule-page'],
    overrideApplied: false,
  }
}

function renderRuleDescriptionHtml({
  title,
  body,
  bodyHtml,
  kind,
  sourceName,
  sourceUrl,
  overrideHtml,
}: {
  title: string
  body: string
  bodyHtml?: string
  kind: string
  sourceName: string
  sourceUrl?: string
  overrideHtml?: string
}): string {
  return [
    '<section class="bonfire-rule">',
    `<h2>${escapeHtml(title)}</h2>`,
    bodyHtml ? `<div class="bonfire-rule-body">${bodyHtml}</div>` : paragraphs(body),
    overrideHtml ?? '',
    '<hr>',
    `<p><strong>Tipo:</strong> ${escapeHtml(kind)}</p>`,
    `<p><strong>Fonte:</strong> ${escapeHtml(sourceName)}</p>`,
    sourceUrl ? `<p><strong>URL:</strong> <a href="${escapeAttribute(sourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(sourceUrl)}</a></p>` : '',
    '</section>',
  ].join('')
}

function renderMissingBonfireDescriptionHtml({
  title,
  sourceUrl,
  sourceType,
}: {
  title: string
  sourceUrl?: string
  sourceType?: string
}): string {
  return [
    '<section class="bonfire-missing-description">',
    `<h2>${escapeHtml(title)}</h2>`,
    '<p><strong>Status:</strong> Descricao Bonfire nao encontrada, CORRIGIR!</p>',
    '<p>Esta regra foi detectada na ficha, mas o texto completo da Bonfire nao foi encontrado na base local.</p>',
    sourceUrl ? `<p><strong>Fonte esperada:</strong> <a href="${escapeAttribute(sourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(sourceUrl)}</a></p>` : '',
    sourceType ? `<p><strong>Origem da descricao atual:</strong> ${escapeHtml(sourceType)}</p>` : '',
    '</section>',
  ].join('')
}

function paragraphs(value: string): string {
  return value
    .split(/\n{2,}|\r\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function sanitizeRuleText(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return trimmed ? trimmed : undefined
}

function sanitizeRuleHtml(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
