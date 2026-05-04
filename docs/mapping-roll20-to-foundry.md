# Roll20 PDF To Foundry Mapping

| Roll20 PDF field | NormalizedCharacter | Foundry dnd5e target |
| --- | --- | --- |
| Nome | `identity.name` | `name`, `prototypeToken.name` |
| Classe e nível | `identity.classes` | class Item |
| Raça | `identity.race` | feat/species fallback Item and `system.details.race` |
| Antecedente | `identity.background` | background Item and `system.details.background` |
| Alinhamento | `identity.alignment` | `system.details.alignment` |
| Atributos | `abilities.*.score` | `system.abilities.*.value` |
| Salvaguardas | `saves.*` | `system.abilities.*.proficient`, save bonuses |
| Perícias | `skills.*` | `system.skills.*.value`, check bonuses |
| CA | `attributes.ac` | `system.attributes.ac.calc = "flat"`, `flat` |
| PV | `attributes.hp` | `system.attributes.hp` |
| Deslocamento | `attributes.speed` | `system.attributes.movement.walk` |
| Sentidos | `attributes.senses` | `system.attributes.senses` |
| Moedas | `currency` | `system.currency` |
| Ataques com dano | `attacks` | weapon Items |
| Recursos limitados | `resources` | feat Items with `system.uses` |
| Características textuais | `features` | feat Items and biography notes |
| Magias | `spells` | spell Items and `system.spells` when present |

Perícias inferem proficiência comparando total extraído contra modificador de atributo e bônus de proficiência. Diferenças viram bônus residual e warning.
