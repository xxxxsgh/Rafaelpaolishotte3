# Rafa Paoli's Shooter **3D**

Remake tridimensional do shooter 2D em Canvas (`../index.html`), feito em
**Three.js**. Mesmo jogo, mesmos números — outra dimensão.

O jogo vira um *rail shooter* espacial: a nave se move nos eixos **X/Y**
dentro de um corredor e os inimigos vêm do fundo (**–Z**) em direção à
câmera, que segue a nave por trás.

## Rodar

```bash
# a partir da raiz do repositório
python3 -m http.server 8080
# abre http://localhost:8080/3d/
```

> Abrir por `file://` funciona (não há ES modules nem fetch), mas HTTP é o
> recomendado. Três.js está versionado em `vendor/three.min.js` (r160), então
> **não há dependência de CDN nem de rede** — só as fontes do Google, que
> degradam para a fonte do sistema se estiverem bloqueadas.

## Controles

| Ação | Teclado | Touch | Gamepad |
|---|---|---|---|
| Mover | `← → ↑ ↓` ou `WASD` | D-pad | stick esquerdo |
| Atirar | `Espaço` | botão 🔫 | botão 0 / RT |
| Habilidade | `Q` | botão ✦ | botão 1 / RB |
| Habilidades de modo | `1` `2` `3` | barra lateral | — |
| Pausa | `P` / `Esc` | botão ❚❚ | — |

Dois jogadores locais (co-op): **P1** nas setas + `Espaço` / `Q`,
**P2** em `WASD` + `F` / `G`.

## Modos

- **Campanha** — 12 fases, 1 boss por fase. O boss aparece quando o score
  atinge `fase × 100` (regra do original). Terminar a fase sem tomar dano dá
  **+100 moedas**.
- **Infinite** — waves infinitas, boss a cada 5 waves, com Nuke / Cura /
  Escudo em cooldown (30s / 45s / 60s).
- **Survivor** — sobreviva o máximo possível; inimigos derrubam orbes de XP e
  cada nível oferece 3 upgrades de run.
- **Boss Rush** — os 12 bosses em sequência, sem inimigos comuns.

## Conteúdo portado do 2D

| | |
|---|---|
| Personagens | 8, com `speed` / `shootCooldown` / `dmgMult` / preço idênticos |
| Bosses | 12, com vida, padrão de tiro, movimento e recompensa idênticos |
| Inimigos | 8 tipos (basic, ufo, tank, fast, spinner, diver, bomber, unique) |
| Power-ups | 5, com as mesmas probabilidades de drop (38/37/15/5/5%) |
| Skill Tree | 4 ramos × 10 skills, persistente, comprada com moedas |
| Skins | 12, incluindo a Rainbow animada |
| Conquistas | 22, com as mesmas metas e recompensas |
| Upgrades de run | 15 (Survivor / level-up) |
| Áudio | mesmos sons sintetizados via Web Audio |

Score, moedas por inimigo, multiplicador de combo (até +90%), janelas de
invencibilidade e durações de power-up seguem os valores do original.

## Adaptações para o 3D

Coisas que não existiam no 2D e que o 3D exigiu:

- **Movimento vertical.** No original a nave só andava no eixo X; aqui ela
  também sobe e desce.
- **Assistência de mira.** Mirar em dois eixos com tiro fixo é mais difícil
  que no 2D, então os projéteis fazem uma correção leve em direção ao alvo
  mais próximo à frente, e a nave tem uma **mira** de dois anéis à frente.
- **Padrões de tiro dos bosses** foram remapeados: os anéis/leques que o 2D
  desenhava no plano da tela agora se abrem no plano **X/Y** e avançam em Z —
  é o que faz "circle", "spiral" e "genesis" continuarem legíveis.
- **Convergência dos inimigos.** Eles nascem numa faixa em volta do jogador e
  derivam suavemente na direção dele, para a ação não sair do enquadramento.
- **Turbo do Felipe** agora funciona de verdade (+50% de velocidade e cadência
  enquanto ativo). No 2D a habilidade só marcava o timer, sem efeito.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | HTML + CSS + `<script>` na ordem de carga |
| `vendor/three.min.js` | Three.js r160 (build UMD, versionado) |
| `js/data.js` | Constantes: personagens, bosses, inimigos, skills, skins, conquistas |
| `js/core.js` | Estado, save (localStorage), áudio, utilitários, input |
| `js/render.js` | Cena, câmera, corredor, nebulosa, modelos 3D, partículas |
| `js/entities.js` | Player, Drone, Enemy, Boss, PowerUp, XPOrb |
| `js/ui.js` | Menus, HUD, skill tree, loja, conquistas, stats |
| `js/game.js` | Loop, spawn, colisões, dano, ciclo de vida dos modos |
| `js/boot.js` | Inicialização |

Simulação em **passo fixo de 60 Hz** com acumulador — o render é
desacoplado, então 30 Hz, 60 Hz ou 144 Hz rodam na mesma velocidade. O
relógio (`Clock`) só avança com o jogo rodando, então pausar congela
cooldowns e eventos agendados.

## Saves

`localStorage`, chaves `rp3d_save` (moedas, skills, skins, personagens,
conquistas, stats) e `rp3d_highscores`. Independentes do save do jogo 2D —
os dois podem coexistir. "Apagar Progresso" fica em Configurações.
