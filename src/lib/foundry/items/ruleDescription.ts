import type { BonfireSpellOverrideRule } from '../../rules/bonfireTypes'
import { getBonfireRuleEntity } from '../../rules/store/bonfireRuleStore'
import { escapeHtml } from '../mapWeapons'

export type ItemDescriptionStatus = 'complete' | 'fallback' | 'missing'
export type BonfireItemDescriptionStatus = ItemDescriptionStatus | 'summary-only' | 'needs-review'

export type ItemDescriptionMeta = {
  html: string
  status: BonfireItemDescriptionStatus
  sourceUrl?: string
  sourceName?: string
  sourceType?: 'article-body' | 'section-body' | 'table-row' | 'card-summary' | 'manual-review' | 'unknown'
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

  if (!entity && sourceUrl) {
    return {
      html: renderRuleReviewHtml({
        title: options.itemName,
        statusLabel: 'Descricao Bonfire ainda nao cadastrada nesta base local.',
        preview: undefined,
        kind: options.itemKind,
        sourceName,
        sourceUrl,
        sourceType: 'unknown',
      }),
      status: 'fallback',
      sourceUrl,
      sourceName,
      sourceType: 'unknown',
      warningCodes: ['RULE_DESCRIPTION_FALLBACK_USED', 'BONFIRE_DESCRIPTION_NEEDS_SOURCE_PAGE'],
      warningMessages: ['Descricao detalhada ausente no seed local; item exportado com link para consulta.'],
      needsReviewReasons: ['missing-full-rule-page'],
    }
  }

  if (descriptionStatus === 'complete' && (descriptionHtml || primaryDescription)) {
    return {
      html: renderRuleDescriptionHtml({
        title: entity?.name ?? options.itemName,
        body: primaryDescription ?? '',
        bodyHtml: descriptionHtml,
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

  if (descriptionStatus === 'summary-only' && shortDescription) {
    return {
      html: renderRuleReviewHtml({
        title: entity?.name ?? options.itemName,
        statusLabel: 'Resumo encontrado; descricao completa precisa de revisao.',
        preview: shortDescription,
        kind: entity?.kind ?? options.itemKind,
        sourceName,
        sourceUrl,
        sourceType: descriptionSource,
      }),
      status: 'summary-only',
      sourceUrl,
      sourceName,
      sourceType: descriptionSource,
      warningCodes: ['BONFIRE_DESCRIPTION_SUMMARY_ONLY', 'BONFIRE_DESCRIPTION_SOURCE_CARD_SUMMARY', 'BONFIRE_DESCRIPTION_FULL_TEXT_MISSING', 'BONFIRE_DESCRIPTION_NEEDS_SOURCE_PAGE'],
      warningMessages: ['Resumo Bonfire encontrado sem o texto completo da regra; item exportado com pendência de revisão.'],
      needsReviewReasons: Array.from(new Set([...needsReviewReasons, 'summary-card-used-no-full-description', 'missing-full-rule-page'])),
    }
  }

  if ((descriptionStatus === 'needs-review' || descriptionStatus === 'fallback') && (shortDescription || sourceUrl)) {
    return {
      html: renderRuleReviewHtml({
        title: entity?.name ?? options.itemName,
        statusLabel: 'Descricao Bonfire completa ainda nao foi verificada nesta base local.',
        preview: shortDescription,
        kind: entity?.kind ?? options.itemKind,
        sourceName,
        sourceUrl,
        sourceType: descriptionSource,
      }),
      status: descriptionStatus,
      sourceUrl,
      sourceName,
      sourceType: descriptionSource,
      warningCodes: [
        descriptionStatus === 'fallback' ? 'BONFIRE_FEATURE_DESCRIPTION_FALLBACK' : 'BONFIRE_FEATURE_NEEDS_REVIEW',
        'BONFIRE_DESCRIPTION_FULL_TEXT_MISSING',
        ...(descriptionSource === 'card-summary' ? ['BONFIRE_DESCRIPTION_SOURCE_CARD_SUMMARY'] : []),
        ...(needsReviewReasons.includes('missing-full-rule-page') ? ['BONFIRE_DESCRIPTION_NEEDS_SOURCE_PAGE'] : []),
      ],
      warningMessages: ['Descricao Bonfire completa ausente ou nao verificada; item exportado com pendência de revisão.'],
      needsReviewReasons,
    }
  }

  const fallbackText = sanitizeRuleText(options.fallbackText) ?? 'Descricao generica preservada para revisao manual.'
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
    warningMessages: ['Descricao ausente no Rule Store; mantendo fallback seguro.'],
    needsReviewReasons: ['missing-full-rule-page'],
  }
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

function renderRuleReviewHtml({
  title,
  statusLabel,
  preview,
  kind,
  sourceName,
  sourceUrl,
  sourceType,
}: {
  title: string
  statusLabel: string
  preview?: string
  kind: string
  sourceName: string
  sourceUrl?: string
  sourceType?: string
}): string {
  return [
    '<section class="bonfire-rule bonfire-rule-review">',
    `<h2>${escapeHtml(title)}</h2>`,
    `<p><strong>Status:</strong> ${escapeHtml(statusLabel)}</p>`,
    preview ? `<p><strong>Preview local:</strong> ${escapeHtml(preview)}</p>` : '',
    '<p><strong>Observacao:</strong> O texto completo da regra Bonfire nao foi confirmado nesta base local.</p>',
    '<hr>',
    `<p><strong>Tipo:</strong> ${escapeHtml(kind)}</p>`,
    `<p><strong>Fonte:</strong> ${escapeHtml(sourceName)}</p>`,
    sourceType ? `<p><strong>Origem da descricao:</strong> ${escapeHtml(sourceType)}</p>` : '',
    sourceUrl ? `<p><strong>URL:</strong> <a href="${escapeAttribute(sourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(sourceUrl)}</a></p>` : '',
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
