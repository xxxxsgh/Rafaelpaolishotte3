# RAFA PAOLI: STAR WING

Remake do *Rafa Paoli's Shooter* inspirado em **Star Fox**: em vez do shooter 2D
vertical do jogo original, é um **shooter 3D on-rails** (com modo de alcance total)
renderizado por um motor poligonal próprio em `<canvas>` 2D.

Arquivo único: `starwing/index.html`. Sem build, sem dependências, sem WebGL.
Roda offline — a fonte do Google é carregada de forma não-bloqueante.

## Rodar

```bash
# na raiz do repositório
python3 -m http.server 8080
# abre http://localhost:8080/starwing/
```

Também funciona abrindo o arquivo direto (`file://`), já que não há service
worker nem rede envolvida.

## Controles

| Tecla | Ação |
|---|---|
| `← ↑ ↓ →` / `WASD` | Manobrar a Arwing |
| `ESPAÇO` / `Z` | Laser — **segure** para o tiro carregado com trava de mira |
| `X` / `B` | Bomba Nova (dano em área) |
| `SHIFT` / `CTRL` | Turbo / Freio |
| `←←` ou `→→` (toque duplo), `Q` / `E` | **Barrel roll** — reflete tiros inimigos |
| `↓↓` (toque duplo) | Meia-volta (modo alcance total) |
| `P` / `ESC` | Pausar · `M` mudo · `V` troca a câmera |

Gamepad e controles de toque (analógico + botões) também são suportados.

## O que veio do Star Fox

- **Voo on-rails** com corredor, formação de esquadrão e chefe no fim da fase.
- **Modo alcance total** (all-range): arena aberta, radar e meia-volta.
- **Barrel roll** que rebate projéteis, turbo e freio.
- **Anéis**: prateados recuperam escudo; a cada 7 dourados o escudo máximo sobe.
- **Esquadrão com rádio**: aliados pedem socorro quando alguém gruda na cauda
  deles. Se você não limpar, o piloto é abatido e fica fora do resto da missão.
- **Medalhas** por missão (abates + esquadrão intacto) e tela de resultados.

## O que veio do jogo original

O elenco e os chefes. Marcelo lidera o esquadrão; Felipe, Takeshi e Deepseek são
os aliados; o Comandante Robos coordena; a Equipe Ômega (Ômega, Phantom, Titan) é
o esquadrão rival; e **Rafa Paoli** é o chefe final. Os cenários usam os temas de
fase do original (Nebula Gate, Toxic Swamp, Crimson Void, Solar Furnace, Glacial
Abyss, Machine Domain, Event Horizon) e os chefes são The Guardian, The Vortex,
Double Cannon, Armored Tank, Giant Glacier, Cyber Colossus e Rafa Paoli.

## Missões

| # | Cenário | Modo | Chefe |
|---|---|---|---|
| 01 | Nebula Gate | on-rails | The Guardian |
| 02 | Toxic Swamp | on-rails | The Vortex |
| 03 | Crimson Void | alcance total | Double Cannon |
| 04 | Solar Furnace | on-rails | Armored Tank |
| 05 | Glacial Abyss | on-rails | Giant Glacier |
| 06 | Machine Domain | on-rails | Cyber Colossus |
| 07 | Event Horizon | alcance total | Rafa Paoli |

O progresso (missões liberadas, recordes e medalhas) fica em `localStorage`.

## Como o motor funciona

Não há WebGL nem bibliotecas — tudo é `canvas` 2D:

- **Projeção**: pontos do mundo passam por translação da câmera e rotações
  yaw/pitch/roll, e então por uma divisão em perspectiva (`FOVPX / z`).
- **Modelos**: malhas de polígonos montadas por primitivas (`boxMesh`,
  `prismMesh`, `coneMesh`, `cylMesh`, `sphereMesh`, `ringMesh`, `slab`) e
  espelhadas em X para as naves.
- **Rasterização**: cada modelo ordena suas faces por profundidade (algoritmo do
  pintor), aplica *flat shading* de duas faces e mistura com a névoa do cenário.
  Os objetos também são ordenados entre si antes de desenhar.
- **Colisão**: esferas, com teste contínuo segmento × esfera nos projéteis (a
  900 u/s um laser atravessaria o inimigo entre dois quadros).
- **Áudio**: sintetizado na hora com a Web Audio API, incluindo a trilha
  procedural que muda de escala por missão.

Para depurar, `window.STARWING` expõe `start(i)`, `skipToBoss()`, `killBoss()`,
`boss` e `counts`.
