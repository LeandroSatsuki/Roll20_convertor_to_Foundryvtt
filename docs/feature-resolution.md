# Feature Resolution

Feature resolution decides whether a raw sheet entry is a class feature, subclass feature, race feature, background feature, feat, resource, spellcasting feature, weapon mastery, or unknown.

Resolution order:

1. Exact identifier match.
2. Alias match.
3. Accent-insensitive normalized match.
4. Section context from the sheet.
5. Class and level context.
6. Race context.
7. Subclass context.
8. Fallback to feat or unknown with a warning.

Examples:

| Raw name | Expected resolution |
| --- | --- |
| Conjuração | `spellcasting`, high confidence for Clérigo |
| Ordem Sagrada | `classFeature`, high confidence |
| Ritos Sacros | `classFeature`, high confidence |
| Canalizar Divindade | `resource`, high confidence |
| Clérigo do Caos | `subclassFeature`, high confidence |
| Agilidade dos Pequeninos | `raceFeature`, medium confidence |
| Marca Anômala | `feat` or `unknown`, review required |

Unknown or ambiguous features are still exported as generic feat Items, but their flags include resolver warnings so the review screen can show them.
