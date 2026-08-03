# Rafa Paoli's Shooter — REMAKE

Reconstrução do jogo a partir do zero. Mesma alma (shmup vertical neon,
8 pilotos, chefes gigantes, progressão), engine e código novos.

**Rodar:**

```bash
python3 -m http.server 8080   # na raiz do repositório
# abre http://localhost:8080/remake/
```

> Precisa de HTTP — o remake usa ES modules, que não carregam por `file://`.
> Zero dependências de JS. A única requisição externa é a fonte Orbitron do
> Google Fonts, e o jogo funciona normalmente sem ela.

## O que mudou em relação ao original

| | Original (V2/V3) | Remake |
|---|---|---|
| Arquitetura | ~15.600 linhas num arquivo, estado global `State` | 13 módulos ES, ~3.400 linhas, sem globais |
| Movimento | só horizontal (exceto Open World) | 2D completo em toda a arena |
| Resolução | canvas do tamanho da janela — arena muda de tamanho por dispositivo | campo virtual fixo de 600×900 escalado, mesmo jogo em todo lugar |
| Loop | `Date.now()` espalhado pelo código | timestep fixo de 60 Hz + `dt`, render desacoplado |
| Colisão | AABB com `width`/`height` | círculos (mais justo num shmup) |
| Progressão in-run | só no modo Survivor | XP e cartas de aprimoramento em **todos** os modos |
| Ondas | inimigos aleatórios pingando | formações desenhadas (linha, V, fluxo, flanco, aglomerado) |
| Chefes | 12, muitos com o mesmo padrão | 10, cada um com movimento, rotação de ataques, fase de fúria e arte próprios |
| Áudio | efeitos sintetizados | efeitos sintetizados + trilha procedural que reage ao combate |
| Feedback | screen shake linear | trauma quadrático, hitstop, slow-motion, flash, vinheta de dano |
| Toque | botões na tela | arrasta em qualquer lugar para pilotar |
| Modos | 8 (vários incompletos) | 4, todos terminando de verdade |

O código de expansão do original — mundo aberto, facções, quests, PeerJS,
crafting, prestígio — ficou de fora de propósito. Boa parte estava
declarada mas nunca chamada, e ela não é necessária para o núcleo do jogo
funcionar bem. O jogo antigo continua no `index.html` da raiz, intocado.

## Estrutura

```
remake/
├── index.html            shell, CSS e markup dos menus/HUD
└── src/
    ├── main.js           canvas, loop de timestep fixo, cola input↔jogo↔UI
    ├── core/
    │   ├── math.js       RNG semeável (mulberry32), geometria, easing
    │   ├── input.js      teclado + gamepad + toque → um objeto de intenção
    │   ├── audio.js      WebAudio: todos os efeitos e a trilha são sintetizados
    │   ├── fx.js         partículas, texto flutuante, trauma/hitstop/flash
    │   └── storage.js    perfil em localStorage, versionado e reconciliado
    ├── data/
    │   ├── pilots.js     8 pilotos: stats, arma, habilidade, desenho · skins
    │   ├── bestiary.js   8 arquétipos de inimigo: IA e silhueta
    │   ├── bosses.js     10 chefes: movimento, rotação de ataques, arte
    │   └── progression.js dificuldades, 18 cartas, power-ups, conquistas
    ├── game/
    │   ├── entities.js   Player, Enemy, Boss, Laser
    │   └── game.js       simulação: ondas, colisões, recompensas, render
    └── ui/
        └── ui.js         todo o DOM: telas, HUD, cartas, resultado
```

Regra que o código segue: `game/` e `data/` nunca tocam no `document`.
A simulação avisa a UI por `hooks`, e a UI nunca escreve na simulação —
só chama métodos públicos (`chooseUpgrade`, `stop`, …).

## Modos

- **Campanha** — 10 fases temáticas, 2 a 5 ondas por fase, um chefe no fim
  de cada. Derrote RAFA PAOLI para ver o final.
- **Infinito** — ondas crescendo sem parar, com um chefe a cada 5.
- **Boss Rush** — os 10 chefes em sequência, com um ponto de vida de volta
  entre eles.
- **Desafio Diário** — 5 fases com seed do dia (igual para todo mundo) e um
  modificador sorteado: casco de vidro, enxame, hipervelocidade, atirador…

## Controles

| | Teclado P1 | Teclado P2 (co-op) | Gamepad | Toque |
|---|---|---|---|---|
| Mover | `WASD` / setas | `TFGH` | stick / d-pad | arrastar em qualquer lugar |
| Atirar | `Espaço` / `J` | `.` / `Num0` | A / RT | automático |
| Habilidade | `Shift` / `E` / `K` | `/` | B / X / RB | botão redondo |
| Pausar | `P` / `Esc` | — | Start | botão `❚❚` |

## Progressão

Créditos (`◈`) ganhos na run vão para o perfil e compram pilotos e pinturas
no Hangar. Dentro da run, cada nível dá três cartas de aprimoramento
sorteadas entre 18 — a build muda a cada partida. Cada carta tem teto, então
não dá para empilhar só dano.

Conquistas dão créditos e são verificadas a cada 3 segundos durante o jogo
e no fim de cada run.

## Save

`localStorage`, chave `rafaPaoli.remake.v1`. O save é reconciliado contra os
padrões na leitura, então adicionar campos novos numa versão futura não
quebra saves antigos. "Apagar progresso" está nos Ajustes.

## Notas de implementação

- **Timestep fixo (60 Hz) com acumulador.** O render roda na taxa do
  monitor; a simulação sempre em passos de 1/60 s. Um monitor de 144 Hz e um
  de 30 Hz jogam exatamente o mesmo jogo. O acumulador tem trava de 6 passos
  para não entrar em espiral de morte depois de uma aba em segundo plano.
- **Hitstop e slow-motion** multiplicam o `dt` alimentado no acumulador, não
  o `dt` interno — assim as animações de FX continuam suaves durante a pausa
  de impacto.
- **Trauma shake.** `shake = trauma² × 18px`, com decaimento constante.
  Quadrático porque impactos pequenos somando não devem virar terremoto.
- **HUD em unidades de campo.** O `#hud` é escrito em 600×900 e recebe um
  `transform: scale()` igual ao do canvas, então a proporção do HUD é a
  mesma no celular e no monitor. Os menus ficam *fora* do frame, em
  `position: fixed`, para usar a tela toda no celular.
- **Um só pickup de XP.** Moedas entram direto no contador ao matar; o que
  cai no chão são fragmentos de XP com ímã. Menos entidades, mesma dopamina.
- **RNG semeável.** `makeRng(seed)` (mulberry32) roda a geração de ondas e o
  sorteio de cartas, então o Desafio Diário é idêntico para todo mundo.

### Service worker

O `sw.js` da raiz tem escopo `/` e usa *stale-while-revalidate*, então uma
visita anterior ao jogo antigo pode servir uma versão em cache do remake por
um load. Um `Ctrl+Shift+R` resolve.

## Testes

`test.js` (no diretório de scratch, não commitado) roda um smoke test em
Chromium headless que percorre todas as telas, dispara todos os padrões dos
10 chefes com e sem fúria, invoca todos os inimigos, aplica todos os
power-ups e todas as cartas, testa level-up/pausa/morte/resultado, os 4
modos, co-op e os 8 pilotos atirando e usando habilidade — falhando se
qualquer erro de página aparecer.
