# Rafa Paoli's Shooter 3D — Neon Void

Remake **tridimensional** do `Rafa Paoli's Shooter — Ultimate` (o shooter 2D em
canvas que vive na raiz deste repositório). Mesmo DNA — personagens, fases,
chefes, power-ups, moedas e progressão — só que agora rodando numa cena 3D com
Three.js, bloom, partículas e câmera em terceira pessoa.

Tudo é gerado por código: **não há um único arquivo de modelo, textura, sprite
ou áudio**. Naves, inimigos, chefes, explosões e a trilha são construídos em
tempo de execução.

## Rodar

```bash
# a partir da raiz do repositório
python3 -m http.server 8080
# depois abra http://localhost:8080/3d/
```

> `file://` não funciona: o jogo usa módulos ES (`import`), que exigem HTTP.
> O Three.js está vendorizado em `vendor/`, então **não precisa de internet**
> (só a fonte do Google Fonts é externa e tem fallback).

## Controles

| Ação | Teclado | Mouse / Toque |
|---|---|---|
| Mover | `WASD` / setas | segure e arraste |
| Atirar | `ESPAÇO` | botão esquerdo |
| Habilidade | `SHIFT` | botão direito |
| Pausar | `P` / `ESC` | — |

## O que tem

- **8 naves jogáveis** com casco 3D e habilidade próprios: Marcelo (drones
  aliados), Robos (canhões extras), Felipe (turbo), Takeshi (leque de
  shurikens), DeepSeek (raio perfurante contínuo), Omega (chuva de mísseis
  teleguiados), Phantom (blink + invencibilidade) e Titan (escudo + onda de
  choque).
- **12 skins** compradas com moedas, incluindo a Rainbow animada.
- **8 tipos de inimigo** com comportamentos distintos: avanço reto, zigue-zague,
  investida, órbita, mergulho perseguidor, tiro radial, rajadas e bombardeiro.
- **12 chefes**, cada um com silhueta, movimentação (horizontal, senoidal,
  teleporte, gravidade, adaptativo…), padrão de tiro (leque, espiral, círculo,
  grade de lasers, buraco negro…) e **modo fúria** abaixo de 30% de vida.
- **3 modos**: Campanha (12 fases + 12 chefes), Infinito (ondas sem fim, chefe a
  cada 5) e Survivor (sobrevivência com chefe a cada 90s e troca de setor).
- **4 dificuldades** que escalam vida, cadência de tiro e recompensa.
- **Progressão de run**: orbes de XP, 15 aprimoramentos sorteados em cartas a
  cada nível, combo com bônus de moedas e 5 power-ups (reparo, arma, escudo,
  dano dobrado e nuke).
- **Meta-progressão** salva em `localStorage`: moedas, naves, skins, 12
  conquistas com recompensa e recordes por modo.
- **12 cenários temáticos** que trocam fog, grid, estrelas e iluminação a cada
  fase.
- Áudio 100% sintetizado (Web Audio API) — efeitos e uma trilha arpejada
  procedural.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | Esqueleto do HUD/menus + `importmap` do Three.js. |
| `css/style.css` | Interface neon (HUD, menus, cartas, barra de chefe). |
| `js/config.js` | Todo o balanceamento: personagens, inimigos, chefes, temas, upgrades. |
| `js/models.js` | Geração procedural de todas as malhas 3D. |
| `js/world.js` | Cena, câmera, luzes, estrelas, grid, nebulosas e bloom. |
| `js/fx.js` | Partículas, explosões, ondas de choque, texto flutuante, screen shake. |
| `js/player.js` | Nave do jogador: movimento, tiro por personagem, habilidades, drones. |
| `js/enemies.js` | Comportamentos e padrões de tiro dos inimigos. |
| `js/bosses.js` | Movimentação, ataques e fúria dos 12 chefes. |
| `js/bullets.js` | Pools de projéteis (jogador e inimigos). |
| `js/pickups.js` | Power-ups, orbes de XP e moedas com ímã. |
| `js/ui.js` | Menus, HUD, cartas de level-up, telas de fim de jogo. |
| `js/game.js` | Máquina de estados, ondas, colisões e progressão. |
| `js/main.js` | Bootstrap. |
| `vendor/` | Three.js r161 + passes de pós-processamento (offline). |

## Detalhes técnicos

- Colisão de tiro é **por segmento** (cápsula varrida no frame), então nada
  atravessa inimigo mesmo a 130 unidades/segundo.
- Projéteis, partículas, anéis e textos são **pools**: o gameplay não aloca.
- Partículas usam um único `THREE.Points` com shader próprio (~2600 partículas
  em uma draw call).
- `Ajustes` permite desligar o bloom e baixar a qualidade (pixel ratio) para
  máquinas fracas.

## Fora do escopo deste remake

Sistemas do jogo 2D que **não** foram portados: multiplayer via PeerJS, open
world, crafting/equipamentos, árvore de skills permanente, missões diárias e
leaderboard online. O foco foi o núcleo de ação e a progressão de run.
