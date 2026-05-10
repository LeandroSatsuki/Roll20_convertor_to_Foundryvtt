import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractInlineSubRules } from './bonfire/extractInlineSubRules.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(repoRoot, 'data')
const classIndexPath = path.join(dataDir, 'bonfire', 'class-index.json')
const generatedDir = path.join(dataDir, 'bonfire', 'generated')
const reviewDir = path.join(dataDir, 'bonfire', 'review')

const classDefaults = {
  artificer: { hitDie: 'd8', savingThrows: ['con', 'int'], spellcasting: { type: 'half', ability: 'int' } },
  barbaro: { hitDie: 'd12', savingThrows: ['str', 'con'], spellcasting: { type: 'none' } },
  bardo: { hitDie: 'd8', savingThrows: ['dex', 'cha'], spellcasting: { type: 'full', ability: 'cha' } },
  cacador: { hitDie: 'd10', savingThrows: ['str', 'dex'], spellcasting: { type: 'half', ability: 'wis' } },
  clerigo: { hitDie: 'd8', savingThrows: ['wis', 'cha'], spellcasting: { type: 'full', ability: 'wis' } },
  druida: { hitDie: 'd8', savingThrows: ['int', 'wis'], spellcasting: { type: 'full', ability: 'wis' } },
  feiticeiro: { hitDie: 'd6', savingThrows: ['con', 'cha'], spellcasting: { type: 'full', ability: 'cha' } },
  guerreiro: { hitDie: 'd10', savingThrows: ['str', 'con'], spellcasting: { type: 'none' } },
  ladino: { hitDie: 'd8', savingThrows: ['dex', 'int'], spellcasting: { type: 'none' } },
  mago: { hitDie: 'd6', savingThrows: ['int', 'wis'], spellcasting: { type: 'full', ability: 'int' } },
  mistico: { hitDie: 'd8', savingThrows: ['wis', 'cha'], spellcasting: { type: 'custom', ability: 'cha' } },
  monge: { hitDie: 'd8', savingThrows: ['str', 'dex'], spellcasting: { type: 'none' } },
  paladino: { hitDie: 'd10', savingThrows: ['wis', 'cha'], spellcasting: { type: 'half', ability: 'cha' } },
}

const categorySources = [
  { type: 'classes', generatedKind: 'class', paths: ['bonfire/raw/classes', 'HTML BONFIRE/classes'] },
  { type: 'races', generatedKind: 'race', paths: ['bonfire/raw/races', 'HTML BONFIRE/racas'] },
  { type: 'backgrounds', generatedKind: 'background', paths: ['bonfire/raw/backgrounds', 'HTML BONFIRE/antecedentes'] },
  { type: 'feats', generatedKind: 'feat', paths: ['bonfire/raw/feats', 'HTML BONFIRE/talentos'] },
  { type: 'subclasses', generatedKind: 'subclass', paths: ['bonfire/raw/subclasses'] },
  { type: 'spell-overrides', generatedKind: 'spellOverride', paths: ['bonfire/raw/spell-overrides', 'HTML BONFIRE/ajustes'] },
  { type: 'essences', generatedKind: 'essence', paths: ['HTML BONFIRE/essencia'] },
]

const headingNoise = new Set([
  'mapas',
  'linhas do tempo',
  'caracteristicas de classe',
  'características de classe',
  'caracteristicas principais',
  'características principais',
  'proficiencias',
  'proficiências',
  'equipamento inicial',
  'equipamentos',
  'multiclasse',
  'proficiencias de multiclasse',
  'proficiências de multiclasse',
  'habilidades de classe',
  'interpretando um elfo',
  'sociedade e cultura',
  'caracteristicas fisicas',
  'características físicas',
  'tracos da raca base',
  'traços da raça base',
  'divergencia ancestral',
  'divergência ancestral',
  'evolucao racial',
  'evolução racial',
  'talentos',
  'talentos de origem',
  'marcas misticas em cineria',
  'marcas místicas em cineria',
  'como as marcas funcionam no servidor',
  'sumario',
  'sumário',
  'navegacao',
  'navegação',
  'indice',
  'índice',
  'conteudo',
  'conteúdo',
  'artigos relacionados',
  'proximo',
  'próximo',
  'anterior',
  'categoria',
  'categorias',
  'tags',
  'compartilhar',
  'world anvil',
  'bonfire tales',
  'jogadores',
  'pagina inicial',
  'página inicial',
  'comentarios',
  'comentários',
  'table of contents',
  'related articles',
  'back to top',
  'navigation',
  'search',
  'find your way',
  'find your way!',
  'get the news',
  'legal',
  'partnered',
  'entry for worldember 2025',
  'linha do tempo de cineria',
].map((value) => slug(value)))

const classIndex = readJson(classIndexPath)
const canonicalByKey = new Map()
for (const entry of classIndex) {
  for (const value of [entry.id, entry.name, ...(entry.aliases ?? [])]) canonicalByKey.set(slug(value), entry)
}

ensureDir(generatedDir)
ensureDir(reviewDir)
ensureDir(path.join(dataDir, 'bonfire', 'raw'))

const htmlFiles = collectHtmlFiles(dataDir)
const sourceIndex = buildSourceIndex(htmlFiles)
const categoryFiles = discoverCategoryFiles()
const parseErrors = []
const missingSourcePages = []
const subrulesReview = []
const previousValidationReport = existsSync(path.join(reviewDir, 'validation-report.json')) ? readJson(path.join(reviewDir, 'validation-report.json')) : null
const previousDescriptionCoverageReport = existsSync(path.join(reviewDir, 'description-coverage-report.json')) ? readJson(path.join(reviewDir, 'description-coverage-report.json')) : null

const classes = []
const classFeatures = []
const races = []
const raceFeatures = []
const backgrounds = []
const backgroundFeatures = []
const feats = []
const subclasses = []
const subclassFeatures = []
const spellOverrides = []
const essenceFeatures = []

for (const file of categoryFiles.classes) {
  try {
    const parsed = parseClassFile(file)
    classes.push(parsed.classSeed)
    classFeatures.push(...parsed.features.filter((feature) => !feature.subclassName))
    subclassFeatures.push(...parsed.features.filter((feature) => feature.subclassName))
    subclasses.push(...parsed.subclasses)
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.races) {
  try {
    const parsed = parseRaceFile(file)
    races.push(parsed.raceSeed)
    raceFeatures.push(...parsed.features)
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.backgrounds) {
  try {
    const parsed = parseBackgroundFile(file)
    backgrounds.push(...parsed.backgrounds)
    backgroundFeatures.push(...parsed.features)
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.feats) {
  try {
    feats.push(...parseFeatFile(file))
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles['spell-overrides']) {
  try {
    spellOverrides.push(...parseSpellOverrideFile(file))
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.essences) {
  try {
    essenceFeatures.push(...parseEssenceFile(file))
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

const deduped = {
  classes: dedupeById(classes),
  classFeatures: dedupeById(classFeatures),
  races: dedupeById(races),
  raceFeatures: dedupeById([...raceFeatures, ...essenceFeatures]),
  backgrounds: dedupeById(backgrounds),
  backgroundFeatures: dedupeById(backgroundFeatures),
  feats: dedupeById(feats),
  subclasses: dedupeById(subclasses),
  subclassFeatures: dedupeById(subclassFeatures),
  spellOverrides: dedupeById(spellOverrides),
}

const coverage = buildCoverageReport(deduped)
const needsReview = collectNeedsReview(deduped, coverage, parseErrors)
const missingRules = collectMissingRules(coverage)
const missingClassFixtures = collectMissingClassFixtures()
const descriptionCoverageReport = collectDescriptionCoverageReport(deduped, sourceIndex, {
  previousValidationReport,
  previousDescriptionCoverageReport,
})
const remainingDescriptionWarnings = collectRemainingDescriptionWarnings(deduped, descriptionCoverageReport)

writeJson(path.join(generatedDir, 'classes.seed.json'), deduped.classes)
writeJson(path.join(generatedDir, 'class-features.seed.json'), deduped.classFeatures)
writeJson(path.join(generatedDir, 'races.seed.json'), deduped.races)
writeJson(path.join(generatedDir, 'race-features.seed.json'), deduped.raceFeatures)
writeJson(path.join(generatedDir, 'backgrounds.seed.json'), deduped.backgrounds)
writeJson(path.join(generatedDir, 'background-features.seed.json'), deduped.backgroundFeatures)
writeJson(path.join(generatedDir, 'feats.seed.json'), deduped.feats)
writeJson(path.join(generatedDir, 'subclasses.seed.json'), deduped.subclasses)
writeJson(path.join(generatedDir, 'subclass-features.seed.json'), deduped.subclassFeatures)
writeJson(path.join(generatedDir, 'spell-overrides.seed.json'), deduped.spellOverrides)

writeJson(path.join(reviewDir, 'coverage-report.json'), coverage)
writeJson(path.join(reviewDir, 'needs-review.json'), needsReview)
writeJson(path.join(reviewDir, 'missing-rules.json'), missingRules)
writeJson(path.join(reviewDir, 'description-coverage-report.json'), descriptionCoverageReport)
writeJson(path.join(reviewDir, 'remaining-description-warnings.json'), remainingDescriptionWarnings)
writeJson(path.join(reviewDir, 'missing-source-pages.json'), {
  generatedAt: new Date().toISOString(),
  items: dedupeMissingSourcePages(missingSourcePages),
})
writeJson(path.join(reviewDir, 'subrules-review.json'), {
  generatedAt: new Date().toISOString(),
  items: dedupeSubrulesReview(subrulesReview),
})
writeJson(path.join(reviewDir, 'source-index.json'), { generatedAt: new Date().toISOString(), entries: sourceIndex })
writeJson(path.join(reviewDir, 'missing-from-current-sheet.json'), {
  generatedAt: new Date().toISOString(),
  note: 'Runtime sheet-specific missing rules are appended by the UI/export flow. Seed generation does not patch by character.',
  missingRules: [],
})
writeJson(path.join(reviewDir, 'missing-class-fixtures.json'), missingClassFixtures)
writeJson(path.join(reviewDir, 'generation-summary.json'), {
  generatedAt: new Date().toISOString(),
  sourceRoots: categorySources.flatMap((source) => source.paths.map((relative) => path.join('data', relative))).filter((relative) => existsSync(path.join(repoRoot, relative))),
  htmlFilesFound: htmlFiles.length,
  htmlFilesProcessed: Object.values(categoryFiles).reduce((total, files) => total + files.length, 0),
  parseErrorCount: parseErrors.length,
  parseErrors,
  seedCounts: seedCounts(deduped),
  classCoverage: {
    total: classIndex.length,
    covered: coverage.classes.filter((entry) => entry.status === 'covered').length,
    needsReview: coverage.classes.filter((entry) => entry.status === 'needs-review').length,
    missing: coverage.classes.filter((entry) => entry.status === 'missing').length,
  },
  reviewCounts: {
    needsReview: needsReview.items.length,
    missingRules: missingRules.missingRules.length,
    missingSourcePages: dedupeMissingSourcePages(missingSourcePages).length,
    missingClassFixtures: missingClassFixtures.missingFixtures.length,
    subRules: summarizeSubrulesReview(subrulesReview).bonfireSubRulesExtractedCount,
    previewRejectedOpportunities: descriptionCoverageReport.summary.after.previewRejectedWarningCount,
  },
  subRuleCounts: summarizeSubrulesReview(subrulesReview),
  descriptionCoverage: descriptionCoverageReport.summary,
  remainingDescriptionWarnings: remainingDescriptionWarnings.summary,
})

console.log(JSON.stringify({
  htmlFilesFound: htmlFiles.length,
  htmlFilesProcessed: Object.values(categoryFiles).reduce((total, files) => total + files.length, 0),
  seedCounts: seedCounts(deduped),
  classCoverage: {
    total: classIndex.length,
    covered: coverage.classes.filter((entry) => entry.status === 'covered').length,
  },
  needsReview: needsReview.items.length,
  missingRules: missingRules.missingRules.length,
  missingSourcePages: dedupeMissingSourcePages(missingSourcePages).length,
  subRules: summarizeSubrulesReview(subrulesReview).bonfireSubRulesExtractedCount,
  descriptionCoverage: descriptionCoverageReport.summary,
  remainingDescriptionWarnings: remainingDescriptionWarnings.summary,
  parseErrors: parseErrors.length,
}, null, 2))

function parseClassFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const title = cleanTitle(extractTitle(html) || titleFromFile(file))
  const canonical = canonicalClass(title) ?? canonicalClass(titleFromFile(file))
  const className = canonical?.name ?? title
  const classId = canonical?.id ?? slug(className)
  const text = htmlToText(article)
  const defaults = classDefaults[classId] ?? {}
  const hitDie = extractHitDie(text) ?? defaults.hitDie ?? null
  const savingThrows = extractSavingThrows(article) ?? defaults.savingThrows ?? []
  const spellcasting = extractSpellcasting(article, classId) ?? defaults.spellcasting ?? { type: 'needs-review' }
  const headings = extractHeadings(article)
  const firstMeaningful = meaningfulParagraph(article)
  const classSeed = entity({
    id: classId,
    name: className,
    aliases: canonical?.aliases ?? [],
    kind: 'class',
    sourceUrl: extractSourceUrl(html),
    descriptionHtml: extractDescriptionHtml(article, 2400),
    description: firstMeaningful,
    descriptionSource: 'article-body',
    sourceFile: file,
    tags: ['class', classId],
    foundry: { preferredType: 'class' },
    extra: {
      hitDie: hitDie ?? undefined,
      hitDieStatus: hitDie ? 'complete' : 'needs-review',
      savingThrows,
      savingThrowsStatus: savingThrows.length ? 'complete' : 'needs-review',
      spellcasting,
      progression: buildClassProgression(headings),
    },
  })

  const parsedFeatures = []
  const parsedSubclasses = []
  let currentLevel = null
  let currentSubclass = null
  for (const heading of headings) {
    const headingText = cleanFeatureName(heading.text)
    if (isNoiseHeading(headingText)) continue
    const levelMatch = headingText.match(/^(?:n[ií]vel|level)\s+(\d+)\s*[:\-–—]\s*(.+)$/i)
    const level = levelMatch ? Number(levelMatch[1]) : currentLevel
    const name = levelMatch ? cleanFeatureName(levelMatch[2]) : headingText
    if (levelMatch) currentLevel = level
    if (!name || isNoiseHeading(name) || /^n[ií]vel\s+\d+$/i.test(name)) continue

    if (heading.level <= 2 && looksLikeSubclassName(name)) {
      currentSubclass = name
      const subclassDescriptionHtml = sectionHtml(article, heading, headings)
      const subclassSeed = entity({
        id: `${classId}-${slug(name)}`,
        name,
        aliases: [],
        kind: 'subclass',
        sourceUrl: extractSourceUrl(html),
        descriptionHtml: subclassDescriptionHtml,
        description: htmlToRuleText(subclassDescriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['subclass', classId],
        extra: { className },
        foundry: { preferredType: 'subclass' },
      })
      parsedSubclasses.push(subclassSeed)
      parsedFeatures.push(
        ...captureInlineSubRules({
          htmlNode: subclassDescriptionHtml,
          parentRule: {
            id: subclassSeed.id,
            name,
            className,
            subclassName: name,
            parentDisplayName: name,
          },
          parentKind: 'subclass',
          sourceUrl: extractSourceUrl(html),
          sourceFile: file,
          extraTags: ['subrule'],
        }),
      )
      continue
    }

    if (!level && heading.level > 4) continue
    if (heading.level > 4 && !/surto|manifestacao|manifestação|segredo|op[cç][aã]o|ordem|forma|dom[ií]nio|circulo|círculo/i.test(name)) continue

    const descriptionHtml = sectionHtml(article, heading, headings)
    const featureName = currentSubclass && heading.level >= 3 && level ? name : name
    const featureKind = currentSubclass && heading.level >= 3 ? 'subclassFeature' : featureKindFromName(featureName)
    const featureSeed = entity({
      id: `${classId}-${slug(featureName)}${level ? `-l${level}` : ''}${currentSubclass ? `-${slug(currentSubclass)}` : ''}`,
      name: featureName,
      aliases: level ? [`Nível ${level}: ${featureName}`, `Nivel ${level}: ${featureName}`] : [],
      kind: featureKind,
      sourceUrl: extractSourceUrl(html),
      descriptionHtml,
      description: htmlToRuleText(descriptionHtml),
      descriptionSource: 'section-body',
      sourceFile: file,
      tags: ['feature', classId, currentSubclass ? 'subclassFeature' : 'classFeature'],
      foundry: { preferredType: 'feat' },
      extra: {
        className,
        subclassName: currentSubclass ?? undefined,
        level: level ?? undefined,
      },
    })
    parsedFeatures.push(featureSeed)
    parsedFeatures.push(
      ...captureInlineSubRules({
        htmlNode: descriptionHtml,
        parentRule: {
          id: featureSeed.id,
          name: featureName,
          className,
          subclassName: currentSubclass ?? undefined,
          parentDisplayName: featureName,
        },
        parentKind: featureKind,
        sourceUrl: extractSourceUrl(html),
        sourceFile: file,
        extraTags: ['subrule'],
      }),
    )
  }

  return { classSeed, features: parsedFeatures, subclasses: parsedSubclasses }
}

function parseRaceFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const title = cleanTitle(extractTitle(html) || titleFromFile(file))
  const raceName = normalizeRaceTitle(title)
  const sourceUrl = extractSourceUrl(html)
  const headings = extractHeadings(article)
  const raceSeed = entity({
    id: slug(raceName),
    name: raceName,
    aliases: raceName === title ? [] : [title],
    kind: 'race',
    sourceUrl,
    descriptionHtml: extractDescriptionHtml(article, 1800),
    description: meaningfulParagraph(article),
    descriptionSource: 'article-body',
    sourceFile: file,
    tags: ['race'],
    foundry: { preferredType: 'feat' },
    extra: {
      speed: extractSpeed(htmlToText(article)) ?? null,
      speedStatus: extractSpeed(htmlToText(article)) ? 'complete' : 'needs-review',
    },
  })
  const features = []
  for (const heading of headings.filter((entry) => [3, 4, 5].includes(entry.level))) {
    const name = cleanFeatureName(heading.text)
    if (!name || isNoiseHeading(name) || looksLikeOnlyLevel(name)) continue
    const descriptionHtml = sectionHtml(article, heading, headings)
    const featureSeed = entity({
      id: `${slug(raceName)}-${slug(name)}`,
      name,
      aliases: [],
      kind: 'raceFeature',
      sourceUrl,
      descriptionHtml,
      description: htmlToRuleText(descriptionHtml),
      descriptionSource: 'section-body',
      sourceFile: file,
      tags: ['raceFeature', slug(raceName)],
      foundry: { preferredType: 'feat' },
      extra: { raceName },
    })
    features.push(featureSeed)
    features.push(
      ...captureInlineSubRules({
        htmlNode: descriptionHtml,
        parentRule: {
          id: featureSeed.id,
          name,
          raceName,
          parentDisplayName: name,
        },
        parentKind: 'raceFeature',
        sourceUrl,
        sourceFile: file,
        extraTags: ['subrule'],
      }),
    )
  }
  features.push(
    ...captureInlineSubRules({
      htmlNode: article,
      parentRule: {
        id: raceSeed.id,
        name: raceName,
        raceName,
        parentDisplayName: raceName,
      },
      parentKind: 'race',
      sourceUrl,
      sourceFile: file,
      extraTags: ['subrule'],
    }),
  )
  return { raceSeed, features }
}

function parseBackgroundFile(file) {
  const html = readFileSync(file, 'utf8')
  const sourceUrl = extractSourceUrl(html)
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  const backgrounds = []
  const features = []
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1])
    if (cells.length < 2) continue
    const name = cleanFeatureName(htmlToText(cells[0]))
    if (!name || isNoiseHeading(name) || name.toLowerCase() === 'nome') continue
    const featureName = cleanFeatureName(htmlToText(cells[1])) || `Habilidade de ${name}`
    const descriptionHtml = cells[2] ?? cells[1]
    backgrounds.push(
      entity({
        id: slug(name),
        name,
        aliases: [],
        kind: 'background',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'table-rule-body',
        sourceFile: file,
        tags: ['background'],
        foundry: { preferredType: 'background' },
      }),
    )
    features.push(
      entity({
        id: `${slug(name)}-${slug(featureName)}`,
        name: featureName,
        aliases: [],
        kind: 'backgroundFeature',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'table-rule-body',
        sourceFile: file,
        tags: ['backgroundFeature', slug(name)],
        foundry: { preferredType: 'feat' },
        extra: { backgroundName: name },
      }),
    )
    features.push(
      ...captureInlineSubRules({
        htmlNode: descriptionHtml,
        parentRule: {
          id: slug(name),
          name: featureName,
          backgroundName: name,
          parentDisplayName: `${name}: ${featureName}`,
        },
        parentKind: 'backgroundFeature',
        sourceUrl,
        sourceFile: file,
        extraTags: ['subrule'],
      }),
    )
  }
  return { backgrounds, features }
}

function parseFeatFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const sourceUrl = extractSourceUrl(html)
  return extractHeadings(article)
    .filter((heading) => [3, 4, 5].includes(heading.level))
    .map((heading) => ({ heading, name: cleanFeatureName(heading.text) }))
    .filter(({ name }) => name && !isNoiseHeading(name) && !looksLikeOnlyLevel(name) && !/^(combate|conjura[cç][aã]o|explora[cç][aã]o|marcas|sobreviv[eê]ncia)$/i.test(name))
    .flatMap(({ heading, name }) => {
      const descriptionHtml = sectionHtml(article, heading, extractHeadings(article))
      const featSeed = entity({
        id: slug(name),
        name,
        aliases: [],
        kind: 'feat',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['feat'],
        foundry: { preferredType: 'feat' },
        extra: {
          prerequisite: extractPrerequisite(descriptionHtml),
          prerequisiteStatus: extractPrerequisite(descriptionHtml) ? 'complete' : 'needs-review',
        },
      })
      return [
        featSeed,
        ...captureInlineSubRules({
          htmlNode: descriptionHtml,
          parentRule: {
            id: featSeed.id,
            name,
            parentDisplayName: name,
          },
          parentKind: 'feat',
          sourceUrl,
          sourceFile: file,
          extraTags: ['subrule'],
        }),
      ]
    })
}

function parseSpellOverrideFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const sourceUrl = extractSourceUrl(html)
  return extractHeadings(article)
    .filter((heading) => [3, 4, 5].includes(heading.level))
    .map((heading) => ({ heading, name: cleanFeatureName(heading.text) }))
    .filter(({ name }) => name && !isNoiseHeading(name) && !looksLikeOnlyLevel(name))
    .slice(0, 250)
    .map(({ heading, name }) => {
      const descriptionHtml = sectionHtml(article, heading, extractHeadings(article))
      return entity({
        id: `spell-override-${slug(name)}`,
        name,
        aliases: [],
        kind: 'spellOverride',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['spellOverride'],
        foundry: { preferredType: 'spell' },
        extra: { status: 'needs-review' },
      })
    })
}

function parseEssenceFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const title = cleanTitle(extractTitle(html) || titleFromFile(file))
  const sourceUrl = extractSourceUrl(html)
  const features = extractHeadings(article)
    .filter((heading) => [3, 4, 5].includes(heading.level))
    .map((heading) => ({ heading, name: cleanFeatureName(heading.text) }))
    .filter(({ name }) => name && !isNoiseHeading(name) && !looksLikeOnlyLevel(name))
    .flatMap(({ heading, name }) => {
      const descriptionHtml = sectionHtml(article, heading, extractHeadings(article))
      const featureSeed = entity({
        id: `${slug(title)}-${slug(name)}`,
        name,
        aliases: [],
        kind: 'raceFeature',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['essence', slug(title)],
        foundry: { preferredType: 'feat' },
        extra: { raceName: title },
      })
      return [
        featureSeed,
        ...captureInlineSubRules({
          htmlNode: descriptionHtml,
          parentRule: {
            id: featureSeed.id,
            name,
            raceName: title,
            parentDisplayName: name,
          },
          parentKind: 'raceFeature',
          sourceUrl,
          sourceFile: file,
          extraTags: ['essence', 'subrule'],
        }),
      ]
    })
  features.push(
    ...captureInlineSubRules({
      htmlNode: article,
      parentRule: {
        id: slug(title),
        name: title,
        raceName: title,
        parentDisplayName: title,
      },
      parentKind: 'race',
      sourceUrl,
      sourceFile: file,
      extraTags: ['essence', 'subrule'],
    }),
  )
  return features
}

function entity({ id, name, aliases, kind, sourceUrl, descriptionHtml, description, shortDescription: previewText, descriptionSource = 'unknown', sourceFile, tags, foundry, extra = {} }) {
  const descriptionMeta = buildSeedDescription({
    name,
    kind,
    descriptionHtml,
    descriptionText: description || htmlToRuleText(descriptionHtml),
    shortDescription: previewText,
    descriptionSource,
    sourceUrl,
    sourceFile,
  })
  return {
    id: slug(id || name),
    identifier: slug(id || name),
    name,
    aliases: Array.from(new Set((aliases ?? []).filter(Boolean))),
    kind,
    source: 'bonfire',
    sourceUrl: sourceUrl ?? null,
    descriptionHtml: descriptionMeta.descriptionHtml ?? undefined,
    descriptionText: descriptionMeta.descriptionText ?? undefined,
    description: descriptionMeta.descriptionText ?? undefined,
    shortDescription: descriptionMeta.shortDescription ?? undefined,
    descriptionStatus: descriptionMeta.descriptionStatus,
    descriptionSource: descriptionMeta.descriptionSource,
    needsReviewReasons: descriptionMeta.needsReviewReasons,
    tags: Array.from(new Set((tags ?? []).filter(Boolean))),
    foundry,
    sourceFileName: sourceFile ? path.relative(repoRoot, sourceFile) : undefined,
    ...extra,
  }
}

function captureInlineSubRules({ htmlNode, parentRule, parentKind, sourceUrl, sourceFile, extraTags = [] }) {
  const { subRules, review } = extractInlineSubRules({
    htmlNode,
    parentRule,
    parentKind,
    sourceUrl,
  })

  subrulesReview.push(
    ...review.map((entry) => ({
      ...entry,
      sourceFileName: sourceFile ? path.relative(repoRoot, sourceFile) : undefined,
    })),
  )

  return subRules.map((subRule) =>
    entity({
      id: subRule.id,
      name: subRule.name,
      aliases: subRule.aliases,
      kind: subRule.kind,
      sourceUrl: subRule.sourceUrl,
      descriptionHtml: subRule.descriptionHtml,
      description: subRule.descriptionText,
      descriptionSource: subRule.descriptionSource,
      sourceFile,
      tags: [...(subRule.tags ?? []), ...extraTags],
      foundry: { preferredType: 'feat' },
      extra: {
        parentRuleId: subRule.parentRuleId,
        parentName: subRule.parentName,
        parentDisplayName: subRule.parentDisplayName,
        raceName: subRule.raceName,
        className: subRule.className,
        subclassName: subRule.subclassName,
        backgroundName: subRule.backgroundName,
      },
    }),
  )
}

function discoverCategoryFiles() {
  const result = {}
  for (const source of categorySources) {
    result[source.type] = []
    for (const relative of source.paths) {
      const absolute = path.join(dataDir, relative.replace(/^bonfire[\\/]/, 'bonfire/'))
      if (!existsSync(absolute)) continue
      result[source.type].push(...walkHtml(absolute))
    }
  }
  return result
}

function collectHtmlFiles(root) {
  return walkHtml(root)
}

function walkHtml(root) {
  if (!existsSync(root)) return []
  const files = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.endsWith('_files')) continue
      files.push(...walkHtml(absolute))
    } else if (/\.(html?|HTML?)$/.test(entry.name)) {
      files.push(absolute)
    }
  }
  return files
}

function extractHeadings(html) {
  const headings = []
  const regex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  let match
  while ((match = regex.exec(html))) {
    headings.push({
      level: Number(match[1]),
      text: htmlToText(match[2]),
      start: match.index,
      end: regex.lastIndex,
    })
  }
  return headings
}

function sectionHtml(html, heading, headings) {
  if (!heading) return ''
  const next = headings.find((candidate) => candidate.start > heading.start && candidate.level <= heading.level)
  return html.slice(heading.end, next?.start ?? Math.min(html.length, heading.end + 6000))
}

function buildClassProgression(headings) {
  const levels = {}
  for (let level = 1; level <= 20; level++) levels[String(level)] = []
  for (const heading of headings) {
    const match = cleanFeatureName(heading.text).match(/^(?:n[ií]vel|level)\s+(\d+)\s*[:\-–—]\s*(.+)$/i)
    if (!match) continue
    const level = match[1]
    levels[level] ??= []
    levels[level].push(cleanFeatureName(match[2]))
  }
  return {
    status: Object.values(levels).some((entries) => entries.length) ? 'extracted-partial' : 'needs-review',
    levels,
  }
}

function buildCoverageReport(seeds) {
  const classSeedsByKey = new Map()
  for (const classSeed of seeds.classes) {
    for (const value of [classSeed.id, classSeed.name, ...(classSeed.aliases ?? [])]) classSeedsByKey.set(slug(value), classSeed)
  }
  const classes = classIndex.map((entry) => {
    const classSeed = [entry.id, entry.name, ...(entry.aliases ?? [])].map(slug).map((key) => classSeedsByKey.get(key)).find(Boolean)
    const features = seeds.classFeatures.filter((feature) => slug(feature.className) === entry.id)
    const missing = []
    if (!classSeed) missing.push('class rule')
    if (classSeed && !classSeed.hitDie) missing.push('hitDie')
    if (classSeed && !classSeed.spellcasting?.type) missing.push('spellcasting.type')
    if (classSeed && classSeed.spellcasting?.type && !['none', 'needs-review'].includes(classSeed.spellcasting.type) && !classSeed.spellcasting.ability) missing.push('spellcasting.ability')
    if (classSeed && !classSeed.savingThrows?.length) missing.push('savingThrows')
    if (classSeed && classSeed.progression?.status === 'needs-review') missing.push('progression')
    if (!features.length) missing.push('class features')
    if (classSeed && !classSeed.sourceUrl) missing.push('sourceUrl')
    if (classSeed && !classSeed.descriptionStatus) missing.push('descriptionStatus')
    return {
      classId: entry.id,
      className: entry.name,
      expectedCoverage: entry.expectedCoverage,
      status: !classSeed ? 'missing' : missing.length ? 'needs-review' : 'covered',
      missing,
      featureCount: features.length,
      sourceFileName: classSeed?.sourceFileName,
      sourceUrl: classSeed?.sourceUrl ?? null,
      descriptionStatus: classSeed?.descriptionStatus ?? 'missing',
    }
  })
  return {
    generatedAt: new Date().toISOString(),
    policy: 'coverage-by-class-not-character',
    classes,
    summary: {
      totalClasses: classes.length,
      coveredClasses: classes.filter((entry) => entry.status === 'covered').length,
      needsReviewClasses: classes.filter((entry) => entry.status === 'needs-review').length,
      missingClasses: classes.filter((entry) => entry.status === 'missing').length,
    },
  }
}

function collectNeedsReview(seeds, coverage, parseErrors) {
  const allSeeds = Object.entries(seeds).flatMap(([type, entries]) => entries.map((entry) => ({ type, entry })))
  const items = allSeeds
    .filter(({ entry }) => entry.descriptionStatus !== 'complete')
    .map(({ type, entry }) => ({
      type,
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      descriptionStatus: entry.descriptionStatus,
      reason: Array.isArray(entry.needsReviewReasons) && entry.needsReviewReasons.length ? entry.needsReviewReasons.join(', ') : 'description-needs-review',
      sourceUrl: entry.sourceUrl,
      descriptionSource: entry.descriptionSource ?? 'unknown',
    }))
  for (const classCoverage of coverage.classes.filter((entry) => entry.status !== 'covered')) {
    items.push({
      type: 'classCoverage',
      id: classCoverage.classId,
      name: classCoverage.className,
      kind: 'class',
      descriptionStatus: classCoverage.descriptionStatus,
      reason: `missing: ${classCoverage.missing.join(', ')}`,
      sourceUrl: classCoverage.sourceUrl,
    })
  }
  return { generatedAt: new Date().toISOString(), items, parseErrors }
}

function collectDescriptionCoverageReport(seeds, index, previous = {}) {
  const allSeeds = Object.entries(seeds)
    .flatMap(([group, entries]) => entries.map((entry) => ({ group, entry })))
    .filter(({ entry }) => entry?.source === 'bonfire')

  const items = allSeeds
    .filter(({ entry }) => entry.descriptionStatus !== 'complete')
    .map(({ group, entry }) => {
      const candidates = findCandidateSourceEntries(entry, index)
      return {
        name: entry.name,
        kind: entry.kind,
        parentName: entry.parentName ?? entry.className ?? entry.subclassName ?? entry.raceName ?? entry.backgroundName ?? null,
        sourceUrl: entry.sourceUrl ?? null,
        sourceFile: entry.sourceFileName ?? null,
        currentDescriptionSource: entry.descriptionSource ?? 'unknown',
        currentStatus: entry.descriptionStatus ?? 'missing',
        candidateHtmlFiles: candidates.slice(0, 5).map((candidate) => candidate.relativePath),
        candidateSections: Array.from(
          new Set(
            candidates
              .flatMap((candidate) => candidate.sectionMatches)
              .filter(Boolean),
          ),
        ).slice(0, 8),
        reason: inferCoverageReason(entry),
        nextAction: candidates.length ? 'inspect-candidate-html-sections' : 'find-full-html-source',
        group,
      }
    })

  const grouped = new Map()
  for (const item of items) {
    const key = `${item.kind}::${item.parentName ?? ''}::${item.sourceUrl ?? ''}::${item.sourceFile ?? ''}::${item.currentDescriptionSource}::${item.reason}`
    const existing = grouped.get(key) ?? {
      kind: item.kind,
      parentName: item.parentName,
      sourceUrl: item.sourceUrl,
      sourceFile: item.sourceFile,
      currentDescriptionSource: item.currentDescriptionSource,
      reason: item.reason,
      count: 0,
      examples: [],
    }
    existing.count += 1
    if (existing.examples.length < 3) existing.examples.push(item.name)
    grouped.set(key, existing)
  }

  const beforeSummary = previous.previousDescriptionCoverageReport?.summary?.after
    ?? buildDescriptionCoverageSummaryFromValidation(previous.previousValidationReport)
  const afterSummary = buildDescriptionCoverageSummary(allSeeds.map(({ entry }) => entry))

  return {
    generatedAt: new Date().toISOString(),
    before: beforeSummary,
    after: afterSummary,
    items: items.sort((left, right) => left.name.localeCompare(right.name)),
    topPendingGroups: Array.from(grouped.values()).sort((left, right) => right.count - left.count).slice(0, 20),
    summary: {
      before: beforeSummary,
      after: afterSummary,
    },
  }
}

function collectRemainingDescriptionWarnings(seeds, descriptionCoverageReport) {
  const coverageItems = Array.isArray(descriptionCoverageReport?.items) ? descriptionCoverageReport.items : []
  const exactTextRequiredEntries = Object.entries(seeds)
    .flatMap(([group, entries]) => entries
      .filter((entry) => entry?.source === 'bonfire' && entry.descriptionStatus === 'complete' && shouldWarnExactTextRequired(entry))
      .map((entry) => ({
        name: entry.name,
        kind: entry.kind,
        parentName: entry.parentName ?? entry.className ?? entry.subclassName ?? entry.raceName ?? entry.backgroundName ?? null,
        sourceUrl: entry.sourceUrl ?? null,
        sourceFile: entry.sourceFileName ?? null,
        currentDescriptionSource: entry.descriptionSource ?? 'unknown',
        currentStatus: entry.descriptionStatus ?? 'complete',
        candidateHtmlFiles: entry.sourceFileName ? [entry.sourceFileName] : [],
        candidateSections: [],
        reason: 'exact-text-required',
        nextAction: 'review-manually',
        group,
        warningCode: 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED',
      })))

  const entries = [
    ...coverageItems.map((entry) => classifyRemainingDescriptionWarning(entry)),
    ...exactTextRequiredEntries.map((entry) => classifyRemainingDescriptionWarning(entry)),
  ]
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name))

  const summary = {
    totalWarnings: entries.length,
    structuralSiteNoiseCount: entries.filter((entry) => entry.classification === 'structural-site-noise').length,
    missingFullRuleSourceCount: entries.filter((entry) => entry.classification === 'missing-full-rule-source').length,
    ambiguousSectionCount: entries.filter((entry) => entry.classification === 'ambiguous-section').length,
    exactTextRequiredCount: entries.filter((entry) => entry.classification === 'exact-text-required').length,
    validPlaceholderCount: entries.filter((entry) => entry.classification === 'valid-placeholder').length,
  }

  return {
    generatedAt: new Date().toISOString(),
    summary,
    entries,
  }
}

function classifyRemainingDescriptionWarning(entry) {
  if (!entry?.name) return null
  const name = String(entry.name)
  const candidateHtmlFiles = Array.isArray(entry.candidateHtmlFiles) ? entry.candidateHtmlFiles : []
  const candidateSections = Array.isArray(entry.candidateSections) ? entry.candidateSections : []
  const warningCode = entry.warningCode
    ?? (entry.reason === 'exact-text-required' ? 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED' : 'BONFIRE_DESCRIPTION_SUMMARY_ONLY')

  let classification = 'valid-placeholder'
  let nextAction = 'keep-placeholder'
  let reason = entry.reason ?? 'needs-review'

  if (isStructuralSiteNoise(name) || looksLikeProgressionArtifactName(name)) {
    classification = 'structural-site-noise'
    nextAction = 'ignore-noise'
    reason = looksLikeProgressionArtifactName(name) ? 'progression-or-table-artifact' : 'site-navigation-or-generic-heading'
  } else if (warningCode === 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED') {
    classification = 'exact-text-required'
    nextAction = 'review-manually'
  } else if (candidateHtmlFiles.length > 1 || candidateSections.length > 1) {
    classification = 'ambiguous-section'
    nextAction = 'review-manually'
    reason = 'multiple-candidate-sections'
  } else if (String(entry.currentStatus) === 'missing' || String(entry.reason).includes('missing-full')) {
    classification = 'missing-full-rule-source'
    nextAction = 'provide-html'
    reason = entry.reason ?? 'missing-full-rule-source'
  }

  return {
    name,
    kind: entry.kind ?? 'unknown',
    parentName: entry.parentName ?? null,
    sourceUrl: entry.sourceUrl ?? null,
    sourceFile: entry.sourceFile ?? null,
    warningCode,
    classification,
    reason,
    nextAction,
  }
}

function buildDescriptionCoverageSummary(entries) {
  const bonfireEntries = entries.filter((entry) => entry?.source === 'bonfire')
  return {
    totalBonfireRules: bonfireEntries.length,
    completeCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'complete').length,
    summaryOnlyCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'summary-only').length,
    needsReviewCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'needs-review').length,
    missingCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'missing').length,
    previewRejectedWarningCount: bonfireEntries.filter((entry) => shouldWarnPreviewRejected(entry)).length,
  }
}

function buildDescriptionCoverageSummaryFromValidation(report) {
  if (!report?.warnings) return null
  const previewRejectedWarningCount = report.warnings.filter((warning) => String(warning).startsWith('BONFIRE_DESCRIPTION_PREVIEW_REJECTED:')).length
  const exactTextRequiredCount = report.warnings.filter((warning) => String(warning).startsWith('BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED:')).length
  return {
    totalBonfireRules: null,
    completeCount: null,
    summaryOnlyCount: null,
    needsReviewCount: null,
    missingCount: null,
    previewRejectedWarningCount,
    exactTextRequiredCount,
  }
}

function inferCoverageReason(entry) {
  if (entry.descriptionSource === 'card-summary' || entry.descriptionSource === 'category-preview' || entry.descriptionSource === 'local-preview') return 'preview-rejected'
  if (entry.descriptionSource === 'manual-review') return 'manual-review-not-accepted'
  if (Array.isArray(entry.needsReviewReasons) && entry.needsReviewReasons.includes('missing-full-rule-page')) return 'missing-full-page'
  if (Array.isArray(entry.needsReviewReasons) && entry.needsReviewReasons.includes('missing-full-rule-description')) return 'missing-full-description'
  return 'needs-review'
}

function collectMissingRules(coverage) {
  return {
    generatedAt: new Date().toISOString(),
    missingRules: coverage.classes
      .filter((entry) => entry.status !== 'covered')
      .map((entry) => ({
        className: entry.className,
        missing: entry.missing,
        reason: entry.status === 'missing' ? 'not-found-in-bonfire-html' : 'incomplete-generated-rule',
      })),
  }
}

function collectMissingClassFixtures() {
  const fixtureDir = path.join(repoRoot, 'tests', 'fixtures', 'characters', 'classes')
  const files = existsSync(fixtureDir) ? readdirSync(fixtureDir) : []
  return {
    generatedAt: new Date().toISOString(),
    expectedDirectory: 'tests/fixtures/characters/classes',
    missingFixtures: classIndex
      .map((entry) => `${entry.id}-level3.bonfire.xlsx`)
      .filter((fileName) => !files.includes(fileName))
      .map((fileName) => ({ fileName, reason: 'fixture-not-yet-added' })),
  }
}

function seedCounts(seeds) {
  return Object.fromEntries(Object.entries(seeds).map(([key, value]) => [key, value.length]))
}

function dedupeById(entries) {
  const seen = new Map()
  for (const entry of entries.filter((candidate) => shouldKeepBonfireSeed(candidate))) {
    const existing = seen.get(entry.id)
    if (!existing || descriptionRank(entry.descriptionStatus) > descriptionRank(existing.descriptionStatus)) seen.set(entry.id, entry)
  }
  return Array.from(seen.values()).sort((a, b) => a.id.localeCompare(b.id))
}

function dedupeMissingSourcePages(entries) {
  const seen = new Map()
  for (const entry of entries) {
    const key = `${slug(entry.name)}::${entry.kind || 'unknown'}::${entry.expectedSourceUrl || ''}::${entry.reason}`
    if (!seen.has(key)) seen.set(key, entry)
  }
  return Array.from(seen.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function dedupeSubrulesReview(entries) {
  const seen = new Map()
  for (const entry of entries) {
    const key = `${slug(entry.name)}::${slug(entry.parentName ?? '')}::${entry.kind}::${entry.reason ?? ''}`
    if (!seen.has(key)) seen.set(key, entry)
  }
  return Array.from(seen.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function summarizeSubrulesReview(entries) {
  const deduped = dedupeSubrulesReview(entries)
  return {
    bonfireSubRulesExtractedCount: deduped.filter((entry) => entry.reason === null).length,
    bonfireInlineBoldSubRulesCount: deduped.filter((entry) => entry.reason === null).length,
    bonfireSubRulesWithParentCount: deduped.filter((entry) => entry.reason === null && entry.parentName).length,
    bonfireSubRulesMissingDescriptionCount: deduped.filter((entry) => entry.reason === 'inline-bold-title-without-description').length,
  }
}

function descriptionRank(status) {
  return status === 'complete' ? 5 : status === 'needs-review' ? 3 : status === 'summary-only' ? 2 : 1
}

function cleanHtml(html) {
  const bodyStart = html.search(/<body\b/i)
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
}

function sanitizeDescriptionHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\s(?:class|style|id|data-[a-z-]+|href)="[^"]*"/gi, '')
    .trim()
}

function extractDescriptionHtml(html, maxLength) {
  const h1 = extractHeadings(html).find((heading) => heading.level === 1)
  const start = h1?.end ?? 0
  return sanitizeDescriptionHtml(html.slice(start, start + maxLength))
}

function htmlToText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlToRuleText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6]|ul|ol|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanText(value) {
  return decodeEntities(String(value ?? '')).replace(/\s+/g, ' ').trim()
}

function cleanFeatureName(value) {
  return cleanText(value)
    .replace(/^\s*(?:•|-)\s*/, '')
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.:]\s*$/, '')
    .trim()
}

function cleanTitle(value) {
  return cleanText(value)
    .replace(/\s+in\s+Bonfire Tales RPG.*$/i, '')
    .replace(/\s+Species$/i, '')
    .trim()
}

function normalizeRaceTitle(title) {
  return cleanTitle(title)
    .replace(/\s*-\s*Bonfire Tales RPG$/i, '')
    .replace(/\s+Species$/i, '')
    .trim()
}

function titleFromFile(file) {
  return path.basename(file).replace(/\.(html?|HTML?)$/, '').replace(/\s+_\s+World Anvil$/i, '')
}

function extractTitle(html) {
  return attr(html, /<meta\s+(?:property|name)="(?:og:title|twitter:title)"\s+content="([^"]+)"/i)
    ?? attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    ?? htmlToText(attr(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? '')
}

function extractSourceUrl(html) {
  return attr(html, /saved from url=\(\d+\)([^ ]+)\s*-->/i)
    ?? attr(html, /<meta\s+(?:property|name)="(?:og:url|twitter:url)"\s+content="([^"]+)"/i)
}

function attr(html, regex) {
  const match = html.match(regex)
  return match ? decodeEntities(match[1]).trim() : null
}

function meaningfulParagraph(html) {
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => htmlToText(match[1])).filter((text) => text.length > 80)
  return paragraphs[0] ?? ''
}

function extractHitDie(text) {
  const match = text.match(/\b1d(6|8|10|12)\b/i)
  return match ? `d${match[1]}` : null
}

function extractSavingThrows(html) {
  const match = html.match(/Testes de Resist[eê]ncia:<\/b>\s*([^<]+)/i)
  if (!match) return null
  const saves = match[1].split(/,| e /i).map((entry) => abilityKey(entry)).filter(Boolean)
  return saves.length ? Array.from(new Set(saves)) : null
}

function extractSpellcasting(html, classId) {
  const text = htmlToText(html)
  const defaults = classDefaults[classId]?.spellcasting
  if (defaults?.type === 'none') return defaults
  const ability = /habilidade de conjura[cç][aã]o (?:e|é)\s+Carisma/i.test(text)
    ? 'cha'
    : /habilidade de conjura[cç][aã]o (?:e|é)\s+Intelig[eê]ncia/i.test(text)
      ? 'int'
      : /habilidade de conjura[cç][aã]o (?:e|é)\s+Sabedoria/i.test(text)
        ? 'wis'
        : defaults?.ability
  if (!ability && !/conjura|magia|feiti[cç]aria|misticismo/i.test(text)) return { type: 'none' }
  return { type: defaults?.type ?? 'needs-review', ability: ability ?? undefined }
}

function extractSpeed(text) {
  const match = text.match(/deslocamento(?: de caminhada)?(?: aumenta| igual)?[^0-9]{0,40}(\d+)\s*(?:metros|m|p[eé]s|feet)/i)
  if (!match) return null
  return Number(match[1])
}

function extractPrerequisite(html) {
  const match = htmlToText(html).match(/Pr[eé]-requisito:\s*([^\.]+)/i)
  return match ? cleanText(match[1]) : null
}

function abilityKey(value) {
  const key = slug(value)
  if (key.includes('forca') || key === 'str') return 'str'
  if (key.includes('destreza') || key === 'dex') return 'dex'
  if (key.includes('constituicao') || key === 'con') return 'con'
  if (key.includes('inteligencia') || key === 'int') return 'int'
  if (key.includes('sabedoria') || key === 'wis') return 'wis'
  if (key.includes('carisma') || key === 'cha') return 'cha'
  return null
}

function canonicalClass(value) {
  return canonicalByKey.get(slug(value))
}

function featureKindFromName(name) {
  if (/conjura[cç][aã]o|feiti[cç]aria/i.test(name)) return 'spellcasting'
  if (/canalizar|surto|pontos de misticismo|recupera[cç][aã]o/i.test(name)) return 'resource'
  return 'classFeature'
}

function looksLikeSubclassName(name) {
  return /^(c[ií]rculo|dom[ií]nio|arqu[eé]tipo|juramento|tradi[cç][aã]o|caminho|col[eé]gio|especializa[cç][aã]o|manifest[aã]o)/i.test(name)
}

function looksLikeOnlyLevel(name) {
  return /^(?:n[ií]vel|level)\s+\d+$/i.test(name)
}

function isNoiseHeading(name) {
  const key = slug(name)
  return headingNoise.has(key) || isStructuralSiteNoise(name) || looksLikeProgressionArtifactName(name) || key.length < 3 || /^str|dex|con|int|wis|cha$/.test(key)
}

function shouldKeepBonfireSeed(entry) {
  if (!entry?.name) return false
  if (isStructuralSiteNoise(entry.name) || looksLikeProgressionArtifactName(entry.name)) return false
  return true
}

function isStructuralSiteNoise(name) {
  const key = slug(name)
  if (!key) return true
  if (headingNoise.has(key)) return true
  if (/^(world-anvil|bonfire-tales|related-articles|table-of-contents|back-to-top|navigation|search)$/.test(key)) return true
  if (/^(find-your-way|get-the-news|legal|partnered|entry-for-worldember-2025|linha-do-tempo-de-cineria)$/.test(key)) return true
  return false
}

function looksLikeProgressionArtifactName(name) {
  const text = cleanText(name)
  if (!text) return true
  if (/^\d+\s*[º°o]?\s*(?:n[ií]vel|ciclo)$/i.test(text)) return true
  if (/^(?:n[ií]vel|level)\s+\d+\s*$/i.test(text)) return true
  if (/^\d+\s*[-+]\s*\d+$/.test(text)) return true
  if (/^\d+\s*[-+]\s*\d+\s*[-+]\s*\d+$/.test(text)) return true
  if (/^\d+(?:\s+[+0-9-]+)+$/.test(text)) return true
  if (/^\d+\s*$/.test(text)) return true
  return false
}

function shortDescription(description) {
  const text = cleanText(description)
  const sentence = text.match(/^.{40,240}?[.!?](?:\s|$)/)?.[0] ?? text.slice(0, 240)
  return sentence.trim() || ''
}

function buildSeedDescription({ name, kind, descriptionHtml, descriptionText, shortDescription: previewText, descriptionSource, sourceUrl, sourceFile }) {
  const fullTextCandidate = cleanText(descriptionText || '')
  const previewCandidate = cleanText(previewText || '')
  const sanitizedHtml = descriptionHtml ? sanitizeDescriptionHtml(descriptionHtml) : null
  const inferredPreviewSource = inferPreviewSource(descriptionSource, sanitizedHtml, sourceFile)
  const fullSource = tryResolveDetailedSource({ name, kind, sourceUrl, sourceFile, descriptionSource: inferredPreviewSource })
  const resolvedHtml = fullSource?.descriptionHtml ?? sanitizedHtml
  const resolvedText = cleanText(fullSource?.descriptionText ?? fullTextCandidate)
  const resolvedSource = fullSource?.descriptionSource ?? inferredPreviewSource

  if (!resolvedText) {
    return {
      descriptionHtml: null,
      descriptionText: null,
      shortDescription: previewCandidate || null,
      descriptionStatus: previewCandidate ? (resolvedSource === 'card-summary' || resolvedSource === 'category-preview' || resolvedSource === 'local-preview' ? 'summary-only' : 'needs-review') : 'missing',
      descriptionSource: resolvedSource,
      needsReviewReasons: previewCandidate ? ['missing-full-rule-description', 'missing-full-rule-page'] : ['missing-full-rule-description', 'missing-full-rule-page'],
    }
  }

  if (!isAllowedCompleteDescriptionSource(resolvedSource) || (resolvedSource !== 'inline-bold-subrule' && looksLikeCardSummary(resolvedText, resolvedHtml))) {
    return {
      descriptionHtml: null,
      descriptionText: null,
      shortDescription: previewCandidate || summarizeFromExactText(resolvedText),
      descriptionStatus:
        resolvedSource === 'card-summary' || resolvedSource === 'category-preview' || resolvedSource === 'local-preview'
          ? 'summary-only'
          : 'needs-review',
      descriptionSource: resolvedSource === 'unknown' ? 'category-preview' : resolvedSource,
      needsReviewReasons: Array.from(
        new Set([
          ...(fullSource ? [] : ['missing-full-rule-page']),
          'missing-full-rule-description',
          ...(resolvedSource === 'card-summary' || resolvedSource === 'category-preview' ? ['summary-card-used-no-full-description'] : []),
          ...(resolvedSource === 'manual-review' ? ['manual-description-not-source-verified'] : []),
        ]),
      ),
    }
  }

  if (containsUiJunk(resolvedText)) {
    return {
      descriptionHtml: null,
      descriptionText: null,
      shortDescription: previewCandidate || null,
      descriptionStatus: 'needs-review',
      descriptionSource: resolvedSource,
      needsReviewReasons: ['summary-card-used-no-full-description', 'missing-full-rule-description'],
    }
  }

  if (isLikelyCompleteRuleText(resolvedText, resolvedHtml, resolvedSource)) {
    return {
      descriptionHtml: resolvedHtml,
      descriptionText: resolvedText,
      shortDescription: previewCandidate && previewCandidate !== resolvedText ? previewCandidate : null,
      descriptionStatus: 'complete',
      descriptionSource: resolvedSource,
      needsReviewReasons: [],
    }
  }

  return {
    descriptionHtml: null,
    descriptionText: null,
    shortDescription: previewCandidate || summarizeFromExactText(resolvedText),
    descriptionStatus: 'needs-review',
    descriptionSource: resolvedSource,
    needsReviewReasons: fullSource ? ['summary-card-used-no-full-description', 'missing-full-rule-description'] : ['missing-full-rule-description', 'missing-full-rule-page'],
  }
}

function summarizeFromExactText(text) {
  return shortDescription(text) || null
}

function isLikelyCompleteRuleText(text, html, source) {
  if (!text) return false
  if (looksLikeProgressionMatrix(text, html)) return false
  if (source === 'inline-bold-subrule') return text.length >= 24
  if (source === 'table-rule-body' || source === 'table-row') return text.length >= 60 || hasMechanicalSignals(text)
  if (hasMechanicalSignals(text)) return true
  if (text.length >= 180) return true
  if (html && /<ul|<ol|<table|<b>\s*efeito|<strong>\s*efeito/i.test(html)) return true
  return false
}

function looksLikeProgressionMatrix(text, html) {
  const compact = cleanText(text)
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

function isAllowedCompleteDescriptionSource(source) {
  return source === 'article-body' || source === 'section-body' || source === 'inline-bold-subrule' || source === 'table-rule-body'
}

function hasMechanicalSignals(text) {
  return /\b(vantagem|desvantagem|teste(?:s)? de resist[eê]ncia|a[cç][aã]o|a[cç][aã]o b[oô]nus|rea[cç][aã]o|descanso longo|descanso curto|pv tempor[aá]rios|profici[eê]ncia|cd\b|efeito:|pr[eé]-requisito:|conjurar|dano|alcance|metro|p[eé]s)\b/i.test(text)
}

function looksLikeCardSummary(text, html) {
  if (!text) return true
  if (containsUiJunk(text)) return true
  if (text.length < 110 && !hasMechanicalSignals(text)) return true
  if (html && /role="listbox"|toggle menu|create your account|gift a membership|worldanvil podcast/i.test(html)) return true
  return false
}

function containsUiJunk(text) {
  return /\b(create your account|login|pricing|privacy|terms of service|worldanvil podcast|discord|youtube|twitch|facebook|reddit|do you need help|gift a membership|community|i am a gamemaster)\b/i.test(text)
}

function inferPreviewSource(descriptionSource, html, sourceFile) {
  if (descriptionSource && descriptionSource !== 'unknown') return descriptionSource
  const relative = String(sourceFile ? path.relative(repoRoot, sourceFile) : '').toLowerCase()
  if (html && /<article[^>]+card|class="[^"]*(card|preview|teaser|summary)/i.test(html)) return 'card-summary'
  if (relative.includes('classes') || relative.includes('racas') || relative.includes('races') || relative.includes('antecedentes') || relative.includes('backgrounds') || relative.includes('talentos') || relative.includes('feats') || relative.includes('subclasses')) {
    return 'category-preview'
  }
  return descriptionSource ?? 'unknown'
}

function tryResolveDetailedSource({ name, kind, sourceUrl, sourceFile, descriptionSource }) {
  if (descriptionSource !== 'card-summary' && descriptionSource !== 'category-preview' && descriptionSource !== 'manual-review' && descriptionSource !== 'unknown') return null
  const currentFile = sourceFile ? path.resolve(sourceFile) : null
  if (currentFile && existsSync(currentFile)) {
    const currentMatch = extractDetailedRuleFromFile(currentFile, name)
    if (currentMatch) return currentMatch
  }
  const candidates = findCandidateSourceEntries({ name, kind, sourceUrl, sourceFile }, sourceIndex)
  if (!candidates.length) {
    missingSourcePages.push({
      name,
      kind,
      categorySourceUrl: sourceUrl ?? null,
      expectedSourceUrl: null,
      sourceFile: sourceFile ? path.relative(repoRoot, sourceFile) : null,
      reason: 'full-rule-html-not-found',
    })
    return null
  }
  for (const candidate of candidates) {
    const detailed = extractDetailedRuleFromFile(candidate.file, name)
    if (detailed) return detailed
  }
  missingSourcePages.push({
    name,
    kind,
    categorySourceUrl: sourceUrl ?? null,
    expectedSourceUrl: candidates[0]?.sourceUrl || null,
    sourceFile: sourceFile ? path.relative(repoRoot, sourceFile) : null,
    categoryPreview: null,
    reason: 'full-rule-html-not-found',
  })
  return null
}

function shouldWarnPreviewRejected(seed) {
  if (!seed || seed.descriptionStatus !== 'complete') return false
  if (!seed.descriptionText || !seed.shortDescription) return false
  if (seed.descriptionText !== seed.shortDescription) return false
  return !isAllowedCompleteDescriptionSource(seed.descriptionSource) || ['card-summary', 'category-preview', 'manual-review', 'local-preview', 'unknown'].includes(seed.descriptionSource ?? 'unknown')
}

function shouldWarnExactTextRequired(seed) {
  return Boolean(seed?.source === 'bonfire'
    && seed.descriptionStatus === 'complete'
    && !isStructuralSiteNoise(seed.name)
    && !looksLikeProgressionArtifactName(seed.name)
    && !isLikelyCompleteRuleText(seed.descriptionText ?? '', seed.descriptionHtml ?? '', seed.descriptionSource))
}

function findCandidateSourceEntries(entry, index) {
  const nameKey = slug(entry.name)
  const parentKey = slug(entry.parentName ?? entry.className ?? entry.subclassName ?? entry.raceName ?? entry.backgroundName ?? '')
  const sourceUrlKey = slug(entry.sourceUrl ?? '')
  const sourceFileKey = slug(path.basename(entry.sourceFile ?? entry.sourceFileName ?? '', path.extname(entry.sourceFile ?? entry.sourceFileName ?? '')))
  const kindKey = slug(entry.kind)
  return index
    .map((candidate) => {
      let score = 0
      const sectionMatches = []
      if (candidate.normalizedTitle === nameKey) {
        score += 120
        sectionMatches.push(candidate.title)
      }
      if (candidate.normalizedH1 === nameKey) {
        score += 110
        sectionMatches.push(candidate.h1)
      }
      if (candidate.normalizedHeadings.includes(nameKey)) {
        score += 90
        sectionMatches.push(...candidate.headings.filter((heading) => slug(heading) === nameKey))
      }
      if (candidate.normalizedStrongTitles.includes(nameKey)) {
        score += 95
        sectionMatches.push(...candidate.strongTitles.filter((heading) => slug(heading) === nameKey))
      }
      if (sourceUrlKey && candidate.normalizedSourceUrl === sourceUrlKey) score += 80
      if (sourceUrlKey && candidate.normalizedSourceUrl.includes(sourceUrlKey)) score += 30
      if (sourceFileKey && candidate.normalizedFileSlug === sourceFileKey) score += 60
      if (parentKey && (candidate.normalizedTitle === parentKey || candidate.normalizedH1 === parentKey)) score += 50
      if (parentKey && candidate.normalizedHeadings.includes(parentKey)) score += 20
      if (parentKey && candidate.normalizedStrongTitles.includes(parentKey)) score += 20
      if (kindKey.includes('race') && candidate.relativePath.toLowerCase().includes('raca')) score += 10
      if (kindKey.includes('class') && candidate.relativePath.toLowerCase().includes('class')) score += 10
      if (kindKey.includes('background') && candidate.relativePath.toLowerCase().includes('anteced')) score += 10
      if (kindKey === 'feat' && candidate.relativePath.toLowerCase().includes('talent')) score += 10
      return {
        ...candidate,
        score,
        sectionMatches: Array.from(new Set(sectionMatches.filter(Boolean))),
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.relativePath.localeCompare(right.relativePath))
}

function extractStrongTitles(article, sourceUrl) {
  return extractInlineSubRules({
    htmlNode: article,
    parentRule: {},
    parentKind: 'customBonfireFeature',
    sourceUrl,
  }).subRules.map((entry) => entry.name)
}

function findBestNamedSection(article, name) {
  const normalized = slug(name)
  const headings = extractHeadings(article)
  const heading = headings.find((entry) => slug(cleanFeatureName(entry.text)) === normalized)
  if (heading) {
    return {
      html: sanitizeDescriptionHtml(sectionHtml(article, heading, headings)),
      source: 'section-body',
    }
  }

  const tableCellMatch = [...String(article ?? '').matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map((match) => match[1])
    .find((cellHtml) => slug(cleanFeatureName(htmlToText(cellHtml).split(':')[0])) === normalized)
  if (tableCellMatch) {
    return {
      html: sanitizeDescriptionHtml(tableCellMatch),
      source: 'table-rule-body',
    }
  }

  return null
}

function extractDetailedRuleFromFile(file, name) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const inlineMatch = extractInlineSubRules({
    htmlNode: article,
    parentRule: {},
    parentKind: 'customBonfireFeature',
    sourceUrl: extractSourceUrl(html),
  }).subRules.find((entry) => slug(entry.name) === slug(name))
  if (inlineMatch?.descriptionText) {
    return {
      descriptionHtml: inlineMatch.descriptionHtml,
      descriptionText: cleanText(inlineMatch.descriptionText),
      descriptionSource: 'inline-bold-subrule',
    }
  }
  const sectionMatch = extractNamedRuleSectionFromArticle(article, name) ?? findBestNamedSection(article, name)
  if (sectionMatch) {
    const descriptionText = cleanText(htmlToRuleText(sectionMatch.html))
    if (descriptionText && !looksLikeCardSummary(descriptionText, sectionMatch.html) && isLikelyCompleteRuleText(descriptionText, sectionMatch.html, sectionMatch.source)) {
      return {
        descriptionHtml: sectionMatch.html,
        descriptionText,
        descriptionSource: sectionMatch.source,
      }
    }
  }

  const descriptionHtml = extractDescriptionHtml(article, 2600)
  const descriptionText = cleanText(htmlToRuleText(descriptionHtml))
  if (!descriptionText || looksLikeCardSummary(descriptionText, descriptionHtml) || !isLikelyCompleteRuleText(descriptionText, descriptionHtml, 'article-body')) return null
  return {
    descriptionHtml,
    descriptionText,
    descriptionSource: 'article-body',
  }
}

function extractNamedRuleSectionFromArticle(article, name) {
  const headings = extractHeadings(article)
  const target = slug(name)
  const heading = headings.find((entry) => slug(cleanFeatureName(entry.text)) === target)
  if (!heading) return null
  const descriptionHtml = sanitizeDescriptionHtml(sectionHtml(article, heading, headings))
  const descriptionText = cleanText(htmlToRuleText(descriptionHtml))
  if (!descriptionText || looksLikeCardSummary(descriptionText, descriptionHtml) || !isLikelyCompleteRuleText(descriptionText, descriptionHtml, 'section-body')) return null
  return {
    descriptionHtml,
    descriptionText,
    descriptionSource: 'section-body',
  }
}

function buildSourceIndex(files) {
  return files.map((file) => {
    const html = readFileSync(file, 'utf8')
    const article = cleanHtml(html)
    const h1 = htmlToText(attr(article, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? '')
    const title = cleanTitle(extractTitle(html) || titleFromFile(file))
    const sourceUrl = extractSourceUrl(html) ?? ''
    const headings = extractHeadings(article).map((heading) => cleanFeatureName(heading.text)).filter(Boolean)
    const strongTitles = extractStrongTitles(article, sourceUrl).map((titleEntry) => cleanFeatureName(titleEntry)).filter(Boolean)
    return {
      file,
      relativePath: path.relative(repoRoot, file),
      fileSlug: path.basename(file, path.extname(file)),
      title,
      h1,
      headings,
      strongTitles,
      sourceUrl,
      normalizedFileSlug: slug(path.basename(file, path.extname(file))),
      normalizedTitle: slug(title),
      normalizedH1: slug(h1),
      normalizedSourceUrl: slug(sourceUrl),
      normalizedHeadings: headings.map((heading) => slug(heading)),
      normalizedStrongTitles: strongTitles.map((heading) => slug(heading)),
    }
  })
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  ensureDir(path.dirname(file))
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function errorEntry(file, error) {
  return {
    file: path.relative(repoRoot, file),
    message: error instanceof Error ? error.message : String(error),
  }
}
