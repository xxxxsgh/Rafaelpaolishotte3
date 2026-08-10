# INFERNO RIDER

Hack'n'slash **3D** num único `index.html`. Three.js via CDN (importmap),
**zero asset externo**: toda a geometria é construída por código com
primitivas e todo o som é sintetizado com a Web Audio API.

A referência é a linguagem 3D dos clássicos de PS2 — *God of War* (2005) e
*Dante's Inferno*: personagem e cenário em 3D real, e **câmera fixa
cinematográfica** por volumes, nunca presa às costas do jogador.

## Jogar

```bash
python3 -m http.server 8080     # a partir da raiz do repositório
```

Depois abre `http://localhost:8080/inferno-rider/`.

> Abrir por `file://` funciona para jogar, mas quebra o service worker e o
> manifest — serve sempre por HTTP/HTTPS.

Publicado pelo Pages em `…/inferno-rider/`.

`?perf=1` liga o contador de FPS / triângulos / draw calls.

## Controles

| Toque | Teclado | Ação |
|---|---|---|
| Metade esquerda da tela | `WASD` | Analógico virtual — nasce onde o dedo toca, dead zone de 12% |
| Arranco rápido do analógico | `Shift` | Esquiva com i-frames e rastro de fogo |
| **ATACAR** | `J` | Toque = combo de 3 (4 com upgrade); segurar = golpe pesado carregado |
| **PULO** | `K` | Toque = pulo; de novo no ar = pulo duplo; segurar no ar = planar com asas de fogo |
| **CORRENTE** | `L` | Puxa inimigos leves, puxa CINZA até os pesados, e engancha nos pontos do cenário |
| **FÚRIA** | `Espaço` | Olhar de Penitência, quando a barra de IRA enche |
| ❚❚ | `Esc` | Pausa |

Não há controle de câmera. É de propósito.

## O pilar: câmera fixa por volumes

O mundo é dividido em caixas invisíveis; cada uma carrega uma pose de câmera
(posição, alvo, FOV, tipo). Ao entrar num volume a câmera **interpola**
(~0.6 s, `easeInOutCubic`) para a nova pose.

- **Corredor** — baixa, próxima, de viés.
- **Salão** — alta e recuada, enquadrando as colunas.
- **Plataforma** — lateral pura; o eixo Z vira o horizontal da tela. A parede
  do lado da câmera existe só como colisor, sem malha.
- **Arena** — alta; recua e sobe até enquadrar a esfera envolvente de todos os
  inimigos ativos.
- **Boss** — igual à arena, mas orbitando lentamente.
- **Moto** — atrás, seguindo em Z.

Todas as poses passam por uma caixa de contenção, para a câmera nunca acabar
atrás de uma parede.

### Movimento relativo à câmera

O vetor do analógico é convertido para o espaço da câmera atual
(`forward` projetado no plano XZ, `right = forward × up`). **Na troca de
volume, a base anterior fica congelada por 0.4 s enquanto o dedo continuar
pressionado** — sem isso o personagem vira sozinho na transição, o defeito
mais famoso dos jogos da época.

## Estrutura do arquivo

Um `<script type="module">`, dividido em seções marcadas:

```
CONFIG · UTIL · SAVE · AUDIO · INPUT · MATERIAIS · GEOMETRIAS · RIG ·
PARTICLES · CAMERA_VOLUMES · LEVELS · ENTITIES · COMBAT · MOTO · UI ·
LOOP · BOOT
```

- **RIG** — CINZA e os inimigos são hierarquias de `Object3D` com cápsulas,
  caixas, esferas e toroides. As animações são tabelas de ângulos por junta,
  interpoladas com `slerp`, mais uma camada senoidal de locomoção. Nenhum
  GLTF, nenhum `AnimationMixer`.
- **LOOP** — `requestAnimationFrame` com passo fixo de 1/60 e acumulador; o
  render interpola entre o passo anterior e o atual. O hitstop congela a
  simulação e deixa o render (e a câmera) correndo.
- **LEVELS** — cada círculo é uma sequência de salas ao longo de +Z, gerada a
  partir de dados. Blocos, colunas, tochas e ganchos saem em `InstancedMesh`.
- **COMBAT** — acerto por teste de arco (distância **e** `dot(frente, dir) ≥
  cos(ângulo/2)`), nunca por mesh de colisão.

## Os cinco círculos

| # | Círculo | Gimmick | Boss |
|---|---|---|---|
| 1 | LIMBO | névoa densa, plataformas flutuantes, tutorial | — |
| 2 | LUXURIA | rajadas de vento, tempestade de almas | REGINA LUXURIAE |
| 3 | AVARITIA | ouro derretido com dano por contato, plataformas que afundam | — |
| 4 | VIOLENTIA | rio de sangue e a corrida de moto espectral | MINOS SANGUINEUS |
| 5 | PRODITIO | gelo, atrito reduzido | REX PRODITORUM |

Cada boss tem 3 fases (o padrão muda em 66% e 33% de vida) e termina em QTE de
execução.

Entre os círculos: portal e tela de upgrade (dano, vida máxima, alcance da
corrente, duração da Fúria, quarto golpe de combo).

## Os dois finais

Ao abater inimigos grandes e bosses, escolhes **PUNIR** (+almas, +Fúria) ou
**ABSOLVER** (+vida). A conta decide o final:

- **O TRONO DE CINZAS** — puniste mais do que absolveste.
- **A ALMA DEVOLVIDA** — absolveste mais do que puniste.

Os dois ficam registados no save.

## Orçamento de desempenho

Medido no fim de `test4.mjs`, na arena mais cheia, com 10 inimigos e ~525
partículas vivas ao mesmo tempo:

| | |
|---|---|
| Triângulos | ~25 000 |
| Draw calls | ~225 |
| Luzes dinâmicas | 3 (ambiente + direcional + ponto do jogador) |
| Sombras | só a direcional, `PCFSoftShadowMap`, mapa 1024 |
| Geometrias / texturas | 49 / 1 |
| Programas de shader | 11 |

Sem `EffectComposer`, sem SSAO, sem sombra de luz pontual. Vinheta, flash de
dano e o vermelho da Fúria são overlays CSS por cima do canvas.

Partículas, projéteis, orbes de alma, ondas de choque, arcos de golpe e
inimigos vêm todos de pools pré-alocados — nada de `new` dentro do loop.

> O alvo de 60 fps em iPhone/iPad **não foi medido em aparelho real**: o
> ambiente de teste só tem renderização por software (SwiftShader, ~20 fps
> para qualquer conteúdo). O que está verificado são os orçamentos acima.

## Offline / PWA

- O manifest é inline, por `data:` URL, com o ícone desenhado num canvas.
- Na primeira execução com rede, o Three.js é guardado no `CacheStorage`; se
  numa sessão seguinte o CDN não responder, o jogo carrega a cópia local.
- O registo do service worker é tentado a partir de um Blob e falha em silêncio
  nos navegadores que recusam esse esquema — daí o cache próprio acima.

## Save

`localStorage`, chave `inferno-rider.save.v1`: checkpoint (círculo + sala),
almas, upgrades, contagem de punidas/absolvidas, finais vistos, mortes,
abates e melhor combo.

## Testes

Os scripts de fumaça usados no desenvolvimento (Playwright + Chromium) não
estão versionados. O que foi exercitado, com zero erros no console:

boot e menus · as 5 fases · combate com abates, almas, combo e limpeza de
arena · congelamento da direção na troca de volume · escudo frontal do Coloso
(0 de dano pela frente, dano cheio pelas costas) · corrente em inimigo pesado
· QTE de execução e a escolha PUNIR/ABSOLVER · Olhar de Penitência (câmera a
2.2 m do rosto com FOV 38, depois recuando) · ouro derretido · atrito do gelo
· moto espectral · morte, checkpoint e renascimento · compra de upgrade ·
persistência do save entre recargas · os dois finais.
