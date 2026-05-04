# Rule Resolution Scoring

O resolvedor pontua candidatos de regra antes de decidir:

- `+100` match exato por identifier.
- `+90` match exato por nome normalizado.
- `+80` match por alias.
- `+50` quando a secao da ficha combina com o kind.
- `+40` quando a classe combina.
- `+40` quando a subclasse combina.
- `+40` quando a raca combina.
- `+30` quando o nivel do personagem permite a feature.
- `+20` quando o candidato vem de seed local.
- `-50` quando pertence a outra classe.
- `-50` quando pertence a outra raca.
- `-30` quando o tipo conflita com a secao.
- `-20` para nome parecido, mas nao exato.

Confidence:

- `high`: score `>= 100` e sem conflito.
- `medium`: score `>= 70`.
- `low`: score `>= 40`.
- `unknown`: score menor que `40`.

Empates proximos geram `RULE_RESOLUTION_AMBIGUOUS` e devem ir para revisao manual.

