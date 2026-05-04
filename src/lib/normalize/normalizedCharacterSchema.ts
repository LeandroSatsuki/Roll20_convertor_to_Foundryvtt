import { z } from 'zod'

const confidenceSchema = z.enum(['high', 'medium', 'low'])
const abilityKeySchema = z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])
const skillKeySchema = z.enum([
  'acr',
  'ani',
  'arc',
  'ath',
  'dec',
  'his',
  'ins',
  'itm',
  'inv',
  'med',
  'nat',
  'prc',
  'prf',
  'per',
  'rel',
  'slt',
  'ste',
  'sur',
])

const fieldValueSchema = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value,
    raw: z.string().optional(),
    confidence: confidenceSchema,
    warnings: z.array(z.string()).optional(),
  })

export const normalizedCharacterSchema = z.object({
  source: z.object({
    type: z.enum(['roll20-pdf', 'bonfire-xlsx', 'google-sheets-xlsx', 'manual-json', 'r20exporter-campaign-json', 'r20exporter-zip']),
    fileName: z.string(),
    extractedAt: z.string(),
    pages: z.array(z.object({ pageNumber: z.number(), text: z.string() })).optional(),
    rawCampaignJson: z.unknown().optional(),
  }),
  identity: z.object({
    name: fieldValueSchema(z.string()),
    classText: fieldValueSchema(z.string()),
    classes: z.array(z.object({ name: z.string(), level: z.number(), subclass: z.string().optional() })),
    background: fieldValueSchema(z.string()),
    race: fieldValueSchema(z.string()),
    alignment: fieldValueSchema(z.string()),
    xp: fieldValueSchema(z.number().nullable()).optional(),
  }),
  abilities: z.record(
    abilityKeySchema,
    z.object({
      score: fieldValueSchema(z.number()),
      mod: fieldValueSchema(z.number()),
    }),
  ),
  proficiencyBonus: fieldValueSchema(z.number()),
  saves: z.record(
    abilityKeySchema,
    z.object({
      total: fieldValueSchema(z.number()),
      proficient: fieldValueSchema(z.boolean()),
      bonus: fieldValueSchema(z.number()),
    }),
  ),
  skills: z.record(
    skillKeySchema,
    z.object({
      labelPtBr: z.string(),
      ability: abilityKeySchema,
      total: fieldValueSchema(z.number()),
      proficiencyLevel: fieldValueSchema(z.union([z.literal(0), z.literal(0.5), z.literal(1), z.literal(2)])),
      bonus: fieldValueSchema(z.number()),
    }),
  ),
  attributes: z.object({
    ac: fieldValueSchema(z.number().nullable()),
    initiative: fieldValueSchema(z.number().nullable()),
    speed: fieldValueSchema(z.number().nullable()),
    speedUnits: z.union([z.literal('ft'), z.literal('m'), z.null()]),
    passivePerception: fieldValueSchema(z.number().nullable()),
    hp: z.object({
      value: fieldValueSchema(z.number().nullable()),
      max: fieldValueSchema(z.number().nullable()),
      temp: fieldValueSchema(z.number().nullable()),
      tempMax: fieldValueSchema(z.number().nullable()),
    }),
    hitDice: z.object({
      total: fieldValueSchema(z.number().nullable()),
      spent: fieldValueSchema(z.number().nullable()),
      denomination: fieldValueSchema(z.string().nullable()).optional(),
    }),
    senses: z.object({ darkvision: fieldValueSchema(z.number().nullable()) }),
  }),
  currency: z.record(z.enum(['cp', 'sp', 'ep', 'gp', 'pp']), fieldValueSchema(z.number())),
  proficiencies: z.object({
    tools: fieldValueSchema(z.array(z.string())),
    languages: fieldValueSchema(z.array(z.string())),
    weapons: fieldValueSchema(z.array(z.string())),
    armor: fieldValueSchema(z.array(z.string())),
  }),
  attacks: z.array(z.any()),
  equipment: z.array(z.any()).optional(),
  features: z.array(z.any()),
  resources: z.array(z.any()),
  spells: z.object({
    spellcastingClass: fieldValueSchema(z.string().nullable()),
    ability: fieldValueSchema(abilityKeySchema.nullable()),
    saveDc: fieldValueSchema(z.number().nullable()),
    attackBonus: fieldValueSchema(z.number().nullable()),
    cantrips: z.array(z.any()),
    levels: z.record(
      z.string(),
      z.object({
        slotsMax: fieldValueSchema(z.number()),
        slotsUsed: fieldValueSchema(z.number()),
        spells: z.array(z.any()),
      }),
    ),
  }),
  warnings: z.array(
    z.object({
      code: z.string(),
      severity: z.enum(['info', 'warning', 'error']),
      message: z.string(),
      fieldPath: z.string().optional(),
      raw: z.string().optional(),
    }),
  ),
})
