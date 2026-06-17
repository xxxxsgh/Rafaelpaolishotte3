# Web Stack for a Realistic Top-Down Survival Shooter (2025–2026)

> Research + recommendation report. Compiled **2026-06-17**.
> Every version/date claim was verified against primary sources (npm registry,
> GitHub, official sites). Items that could not be verified are explicitly
> **flagged**. Sources are listed per section and consolidated at the end.

This report covers the full web stack for a realistic top-down survival shooter
with **mobile touch controls** — engines, rendering, physics, tilemaps,
pathfinding, lighting, audio, save/state, build tooling — and ends with a single
recommended stack plus tradeoffs versus the alternatives.

---

## TL;DR — the recommended stack

| Concern | Pick | Why |
|---|---|---|
| **Engine / renderer** | **Phaser 4** (or **LittleJS** for a lean build) | Mature, MIT, built-in Tiled tilemaps + arcade physics + camera culling, new high-perf WebGL "Beam" renderer, biggest community. |
| **Renderer alt (max control)** | PixiJS v8 | Best-in-class batching + opt-in WebGPU; but you assemble tilemap/physics/ECS yourself. |
| **Physics / collision** | **Custom swept-AABB** for movement + **segment raycast** for bullets; **Rapier (`@dimforge/rapier2d` SIMD)** *only if* you need full rigid-body sim | Fast, tunnel-proof, no heavyweight dependency for the common case. |
| **Tilemaps** | **Tiled infinite maps** (Phaser-native) or **LDtk** separate-level files for streaming | Both actively maintained; LDtk's `__neighbours`/TOC metadata is purpose-built for player-centric streaming. |
| **Pathfinding / AI** | **Flow field toward the player** + local separation steering; **recast-navigation-js** crowd if you need true navmesh | Flow fields scale to 200+ enemies converging on one target; classic per-agent A* libs don't. |
| **Lighting / day-night** | Phaser 4 `setLighting` (normal maps + self-shadows); on Pixi, custom additive light buffer + raycast visibility polygons | Phaser 4 has a first-class system now; the Pixi lighting plugin is stuck on v7. |
| **Audio** | **Howler.js** + Spatial plugin, or raw Web Audio `StereoPannerNode` per voice | Howler ships format fallback, audio sprites, mobile unlock; stereo pan is essentially free for 2D positional sound. |
| **Save / state** | **IndexedDB via Dexie.js** (primary) + localStorage for the synchronous emergency save; **bitECS** if entity counts are high | Async, transactional, built-in schema migrations. |
| **Mobile controls** | **nipplejs** twin-stick (left=move, right=aim) + **auto-fire** + soft magnetic auto-aim | nipplejs got a TS-first 1.0 rewrite in 2026 and is active again. |
| **Build / assets** | **Vite** (v8 + Rolldown, or v7 + `rolldown-vite`) + texture atlases + KTX2/Basis + service-worker precache | Fastest HMR, code splitting, asset hashing; compressed textures shrink VRAM + download. |

**One-line answer:** *Phaser 4 + Tiled/LDtk + flow-field AI + custom AABB/raycast
collision + Howler + Dexie + nipplejs, bundled with Vite.* It maximizes
solo/small-team velocity (batteries included) while comfortably handling a large
streamed map with hundreds of entities. Pick **PixiJS v8 + à-la-carte libraries**
instead only if you want maximum rendering control and are willing to build the
game-framework layer yourself.

---

## 1. Game engines / frameworks

State as of **June 2026**, verified against GitHub/npm/official sites.

### Three key status questions answered

- **Is Kaboom dead and Kaplay the maintained fork?** **Yes.** `replit/kaboom`
  was **archived (read-only) on 2024-11-12**; its README points users to the
  community fork **KAPLAY**. KAPLAY is active (stable **3001.0.19**, 2025-06-15;
  the `4000` major is still **alpha** — production means the 3001 branch).
- **Status of Phaser 4 / WebGPU?** **Phaser 4 is released and stable**
  (**v4.1.0, 2026-04-30**) with a brand-new node-based **WebGL renderer
  ("Beam")** — **not WebGPU**. WebGPU is the stated future direction but is **not
  in 4.0/4.1**.
- **Is PixiJS v8 stable and does it support WebGPU?** **Yes to both**
  (**v8.19.0, 2026-06-04**). It supports WebGL **and** WebGPU, but the **default
  is WebGL** — Pixi reverted the default to WebGL in v8.1.0 due to cross-browser
  WebGPU inconsistencies. WebGPU is "feature complete" but opt-in
  (`preference: 'webgpu'`).

### The primary 2D engines

| Engine | Latest (date) | Maintained | Stars | License | Renderer | Large map + hundreds of entities | Curve / docs |
|---|---|---|---|---|---|---|---|
| **Phaser 4** | 4.1.0 (2026-04-30) | Very active | ~39.8k | MIT | New WebGL "Beam" + Canvas; WebGPU later | Excellent — built-in Tiled tilemaps w/ camera culling, arcade physics, Groups (pooling). Best-proven for this genre. | Low (v3→v4 nearly identical); excellent docs/tutorials |
| **PixiJS** | 8.19.0 (2026-06-04) | Very active | ~47.4k | MIT | WebGL (default) + WebGPU | Best-in-class batching; **no** built-in tilemap/physics — pair with other libs | Moderate; very good docs |
| **Excalibur.js** | 0.32.0 (2025-12-23) | Active (pre-1.0) | ~2.3k | BSD-2 | WebGL (Canvas fallback) | Auto-batch by z; TileMap w/ offscreen culling; few public entity benchmarks | Low (TS-first); good docs |
| **melonJS** | 19.7.1 (2026-06-14) | Very active | ~6.3k | MIT | WebGL2 (Canvas fallback); WebGPU planned | Strong — 16-texture batching, GPU TMX tile rendering, deep Tiled integration, recent ~25× tilemap memory cut | Low-moderate; good docs |

### Newer / notable

- **LittleJS** (v1.18.19, 2026-06-08, MIT, ~4.1k★) — **strongest purpose-built
  fit.** WebGL2+Canvas2D hybrid, built-in tilemap + collision + Tiled import +
  arcade physics + particles + A* + gamepad + audio, tiny footprint. Vendor
  claims 100k+ sprites/60fps (*unverified*, but far above "hundreds"). The
  maintainer's showcase literally includes top-down survival/shooter games.
- **Kaboom/KAPLAY** — beginner-friendly; KAPLAY active but 4.x still alpha.
- **Cocos Creator** — Cocos 4 went fully open-source 2026-01-04; strong in
  Asian mini-game markets, thinner Western community. (License shows
  NOASSERTION on GitHub despite "MIT" — *verify the LICENSE file*.)
- **Defold** (v1.12.4, 2026-05-04) — excellent 2D web engine, tiny ~1MB
  exports, but **logic is Lua, not JS/TS** → likely disqualifying here.
- **PlayCanvas / Three.js / regl** — 3D-first renderers; usable for 2D but you
  build tilemap/physics/input yourself. regl is in maintenance mode. Only worth
  it for heavy custom-shader/2.5D ambitions.

**Recommendation:** **Phaser 4** as the safe all-rounder; **LittleJS** if you
want a lean, genre-tailored base; **PixiJS v8** if you want maximum rendering
control and will assemble the rest. *No independent head-to-head max-entity
benchmarks exist — prototype a stress test on your target hardware.*

---

## 2. Rendering & performance

For a big tilemap + hundreds of simultaneous entities, the levers are:

- **Sprite batching (draw-call reduction).** Batching groups sprites that share
  the same texture and render state into one GPU draw call — up to ~16 textures
  per call (hardware-dependent). **Batch breakers**: changing blend mode,
  shader, filter, mask, or render target. Pixi's own example: `Screen/Screen/
  Normal/Normal` = 2 draw calls, but alternating them = 4. **Pack art into
  atlases; group by texture and blend mode; don't interleave.** Note: enabling
  a lighting/normal-map pipeline **breaks batching** — apply it only where
  needed.
- **Culling.** Phaser `TilemapLayer` self-culls to the camera automatically.
  **PixiJS v8 culling is OFF by default** — opt in via `cullable`/
  `cullableChildren`/`cullArea`. Caveat: culling helps only when **GPU-bound**;
  when CPU-bound it can cost more than just rendering off-screen objects.
- **Object pooling.** Pre-allocate and recycle the high-churn things —
  bullets, particles, enemies, damage numbers, explosions — toggling active
  state instead of allocating/freeing, to avoid GC spikes. Phaser **Groups**
  provide this natively (`group.get()` / `killAndHide()`).
- **Spatial partitioning.** For **uniform, evenly-distributed** objects (bullets
  + enemies — your case), a **uniform grid / spatial hash is generally faster
  than a quadtree**. Quadtrees win for clustered/non-uniform data; grids degrade
  on sparse data. Practical split: **hand-rolled uniform grid/spatial hash for
  the moving-entity broadphase**, **rbush (R-tree) for static occluders/world
  objects** queried during culling and lighting. (`quadtree-js` is a fine
  lightweight quadtree if you prefer.)
- **Large/streamed tilemaps.** Highest-perf approach is a **GPU tilemap**:
  render the map as a quad (or per-chunk quad) sampling a tile-atlas texture +
  a tile-index map — a 1024×1024 map can draw in a single quad. For "infinite"
  worlds, **chunk** the map and load/discard chunks around the camera each frame.
- **WebGPU (2025–2026).** Now ships by default in Chrome/Edge, Firefox (Win
  141 / Apple-Silicon macOS 145), and **Safari 26** (macOS Tahoe + iOS 26,
  Sept 2025); Firefox Linux/Android still in progress. **Best posture:
  progressive enhancement — WebGPU primary, WebGL fallback** (PixiJS
  auto-falls back WebGPU→WebGL→Canvas). WebGPU wins most in scenes with many
  batch breaks. *Phaser stable WebGPU not shipped yet (4.x is WebGL "Beam").*
- **Particles.** PixiJS v8 `ParticleContainer` renders ~1M particles at 60fps
  (>3× v7) — ideal for muzzle flash, blood, debris, weather. Tradeoff: per-child
  transform/filtering is limited.

---

## 3. Physics & collision

Verified against npm (2026-06-17). GitHub commit dates were rate-limited in
research; maintenance is inferred from **npm publish recency** (flagged).

| Library | Latest (date) | Status | Verdict for this game |
|---|---|---|---|
| **Matter.js** | 0.20.0 (2024-06-23) | Dormant | Overkill + relatively slow at high body counts; **no robust CCD → bullets tunnel.** Avoid as core. (Search results claiming a "2025" release confused it with the unrelated `@matter` smart-home SDK.) |
| **Planck.js** (`planck`) | 1.5.0 (2026-04-07) | **Active** | Faithful Box2D; supports **bullet bodies (CCD)** + raycast. Best pure-JS Box2D lineage. Slower than WASM at very high counts. |
| **Rapier** (`@dimforge/rapier2d`) | 0.19.3 (SIMD build 0.18.2) | **Very active** | Rust→WASM, fastest at scale; **nonlinear CCD** + ray/shape-cast queries. `-deterministic` build for cross-platform determinism. Best if you want a real engine for many bodies. SIMD build is 2–5× faster than 2024. |
| **box2d-wasm** | 7.0.0 (~2 yrs ago) | Stale | Fast + faithful but unmaintained; prefer Planck or Rapier. |
| **detect-collisions** | "10.10.2025" (Oct 2025) | **Active** | BVH broadphase + SAT narrow-phase + raycast, collision groups, trigger bodies. Great if you want **collision detection without full simulation.** |
| **SAT.js** | 0.9.0 | Old/minimal | Pure narrow-phase SAT; you supply broadphase. |

**Bullets — avoid tunneling.** Don't rely on discrete moving-body collision for
fast bullets. Two robust options:
1. **Hitscan / raycast** — cast a ray (or short segment per frame) along the
   trajectory, take first hit. Cheapest, tunnel-proof, ideal for instant-hit
   weapons. (Rapier raycast, Planck/Box2D raycast, detect-collisions raycast.)
2. **Projectile + continuous detection** — model visible bullets as fast bodies
   with **CCD/bullet flagging**, *or* do a **per-frame swept/segment cast** from
   previous→current position. Flag only projectiles, never all bodies.

**Recommendation:** For a top-down shooter, a **hand-rolled swept-AABB** for
movement (inflate the moving box by its frame delta / Minkowski sum — lightweight
and tunnel-free) plus **per-frame segment raycasting for bullets** is the
performant, dependency-light default. Reach for **Rapier (SIMD)** only if you
want physical projectile response (ricochet, knockback) or rich rigid-body
interactions; **Planck.js** if you prefer pure-JS Box2D semantics;
**detect-collisions** if you want a maintained collision lib without simulation.

---

## 4. Tilemaps & level design

Both major editors are actively maintained.

- **Tiled** — **v1.12.2 (2026-05-27)**, industry standard. Exports TMX **and**
  JSON. Native **infinite maps** store layer data as **chunks** (the streaming
  primitive). **Phaser** has first-class support
  (`load.tilemapTiledJSON` → `make.tilemap`), handles finite **and** infinite
  maps, but **does not load external tilesets** — embed and re-export. For
  PixiJS, **`pixi-tiledmap` v2.0.0 targets Pixi v8** (JSON+TMX, chunked
  infinite-layer traversal, cached tile textures).
- **LDtk** — **v1.5.3 (Jan 2025)**, by the Dead Cells dev. Cleaner
  developer-oriented JSON (convenience fields prefixed `__`), tile stacking,
  fast auto-layer rules. Loading paths: Super Simple Export, QuickType-generated
  types, manual JSON, or Tiled TMX export. **Best fit for streaming:** enable
  **"Separate level files"** (`.ldtkl` per level) and use the **`__neighbours`**
  array (with corner directions since 1.5.3) to **load/unload levels around the
  player**; multi-worlds + a Table-of-Contents export give world coordinates
  without parsing every level. (*Verify the latest LDtk at ldtk.io — 1.5.3 was
  current at research time.* The `ldtk-ts` npm wrapper is ~4 years stale; prefer
  QuickType-generated types or `@theatrejs/loader-ldtk` / `@excaliburjs/
  plugin-ldtk` / `pixi-ldtk-loader`.)

**Streaming a large map:** split the world into a mosaic of chunks/levels and
**load/draw only those around the player**, unloading the rest. **LDtk separate
levels + `__neighbours`** is the least custom code; **Tiled infinite maps +
camera culling** is the alternative. Phaser tilemap layers self-cull each frame.

---

## 5. Pathfinding & AI

Verified against npm. The classic per-agent A* libraries are **largely
unmaintained and don't scale** to many enemies chasing one target:

- **EasyStar.js** 0.4.4 (2020) — unmaintained; async grid A*, fine for
  occasional paths, but issuing hundreds of per-agent searches doesn't scale.
- **PathFinding.js** 0.4.18 (2016) — abandoned; good reference (A*, JPS, etc.)
  but not a maintained dependency.
- **navmesh** 2.3.1 (2021) — stale but small 2D navmesh + funnel.
- **Yuka** 0.7.8 (2022) — stale but feature-complete steering/AI toolkit.
- **recast-navigation-js** 0.43.1 (2024-12) — **actively maintained.** WASM
  Recast/Detour with **DetourCrowd** (crowd sim + local avoidance). Maintainer
  figures: **~2,500 agents comfortable; ~10,000 → ~1 FPS** (*anecdotal*). The
  strongest, most scalable navmesh option; 3D/floor-based but maps cleanly to a
  flat top-down navmesh.

**Best pattern for a survival shooter** (enemies converge on the player):
a **flow field toward the player** — compute one vector field over the grid, then
every agent just reads its cell's direction (no per-agent search). It scales to
hundreds/thousands of agents far better than A*; recompute periodically or when
the player changes cell, and layer **local separation steering** for spacing.
Reserve A*/navmesh-crowd for sparser, smarter individual AI. (Documented case:
A*→flow-field let low-end machines run 200 simultaneous agents.)

---

## 6. Lighting & shadows (2D dynamic + day/night, WebGL)

- **Phaser 4 — strongest turnkey option.** A single `setLighting(true)` works on
  sprites, images, text, **tilemaps**, particles, video, shapes; adds
  **self-shadows** (depth simulated from the texture), **normal maps** (with a
  `NormalTools` filter — no shader code), and `light.z` height control,
  integrated with the unified filter stack. **Perf note: enabling lighting
  breaks sprite batching — enable only on objects that need it.** (*The Phaser 4
  lighting article is dated May 2026; confirm exact stable API names in current
  docs.*)
- **PixiJS — DIY.** The maintained-ish plugin `@pixi/lights` is stuck at
  **v4.1.0 (2023), Pixi v7**, no v8 support — treat as unmaintained for v8.
  Instead implement lighting yourself: render a dark "night" overlay, draw light
  gradients/cones with **additive blend** into a light buffer, then
  multiply/combine over the scene. Most future-proof path on v8.
- **Engine-agnostic raycast shadows.** Cast rays to wall-segment endpoints
  (+ tiny angular offsets), sort by angle, build a visibility fan polygon — the
  same algorithm serves both lighting and field-of-view. References: Red Blob
  Games "2D Visibility" and ncase.me "Sight & Light." Soft shadows = blend
  multiple offset light origins or blur. GPU-friendly hard shadows = draw
  subtractive shadow quads per wall segment (Slembcke). `@box2d/lights` (port of
  Box2DLights) is a good fit if you already use a Box2D-family engine.
- **Day/night cycle** = a full-screen ambient color/intensity overlay (lerp
  ambient color + alpha over time) combined multiplicatively with the dynamic
  light buffer.

---

## 7. Audio

- **Howler.js** — **v2.2.4, 2023-09-19** (npm registry is authoritative; a
  search result claiming "Sept 2024" was wrong). Lightly maintained but not
  abandoned, ~25k★. Handles format fallback, decoded-buffer reuse, **audio
  sprites**, and the mobile **AudioContext unlock** automatically. The **Spatial
  plugin** (`howler.spatial.js`, Web-Audio-only) gives 3D/stereo positioning —
  set listener at the player, sounds at world positions, or just use stereo pan.
- **Raw Web Audio** — `StereoPannerNode` is **equal-power, essentially free**
  and perfect for top-down L/R positioning + distance gain. `PannerNode` with
  `HRTF` is high-quality but **expensive** (convolution) and overkill for 2D.
  Prefer raw Web Audio when you need a custom node graph (mix buses, ducking,
  filters, sample-accurate scheduling, procedural audio).
- **Mobile unlock (still required):** browsers (esp. iOS Safari) start the
  `AudioContext` **suspended**; call `audioContext.resume()` inside a
  user-gesture handler. Howler does this for you (`Howler.autoUnlock`).
- **Audio sprites:** concatenate clips into one file + JSON timing map
  (`audiosprite` CLI, `-f howler`); cuts requests to one and avoids repeated
  decode. Tradeoff: the whole sprite must load before any segment plays.

**Recommendation:** Howler.js + Spatial plugin for fast, robust SFX/music with
positional sound; drop to raw Web Audio only for a custom mixer or special FX.

---

## 8. State, saving & data

- **Entity architecture.** For many entities, **ECS** (data-oriented) beats
  classic OOP graphs on iteration/cache locality. **bitECS** — **v0.4.0
  (2025-12-06)**, actively maintained, ~5kb, functional, wins JS ECS
  benchmarks → pick for performance. **miniplex** — v2.0.0 (2023), DX-focused,
  slower but easier → fine for moderate counts. Don't adopt ECS just for
  ergonomics on a small game.
- **localStorage vs IndexedDB.** localStorage is synchronous, string-only,
  ~5–10 MB, and **blocks the main thread** on large writes — best only for tiny
  saves and the **synchronous emergency save** on `pagehide`/`beforeunload`
  (where async IndexedDB can't reliably finish). **IndexedDB** is async,
  transactional, stores structured data + Blobs directly, quota up to ~50% of
  free disk → the primary store for real saves.
- **Wrappers.** **Dexie.js** — **v4.4.4 (2026-06-16)**, very active; queryable
  tables + **built-in schema versioning/migrations** (`.version(n).upgrade()`)
  → best default. **idb** (jakearchibald) — v8.0.3 (2025-05), tiny promise
  wrapper, full manual control. **localForage** — v1.10.0 (2021), maintenance
  mode, simple KV.
- **Versioning/migration.** Embed a `version` integer in every save; chain
  sequential upgrades (v4→v5→v6) starting from defaults; offer JSON export/import
  with an integrity checksum for backups. *(Your current project already does
  versioned saves with migration — `SAVE_VERSION = 3` in localStorage. Moving the
  main save to Dexie/IndexedDB and keeping a localStorage `pagehide` snapshot is
  the natural upgrade path.)*

---

## 9. Mobile controls

- **nipplejs** — **v1.0.4 (2026-05-26)**; a TS-first 1.0 rewrite in 2026 made it
  **active again** (a search result showing "2015"/a fork was a contaminated
  source — disregarded). **Twin-stick**: two managers — left zone = movement,
  right zone = aim/fire (official `dual-joysticks` example). Multitouch,
  `static`/`semi`/`dynamic` modes, configurable zones/size/threshold.
- **Custom touch** — prefer **Pointer Events** (`pointerdown/move/up`) over
  Touch/Mouse: unified input + per-finger `pointerId`. Track every active
  `pointerId` yourself; use `setPointerCapture()` so a drifting finger keeps
  reporting to its stick; set `touch-action: none` on the canvas/zones to kill
  scroll/zoom.
- **Auto-fire + auto-aim** — near-universal on mobile shooters: auto-fire frees a
  thumb; pair with **soft magnetic auto-aim** (reticle gently attracted to the
  nearest on-screen target) and/or **predictive lead**, rather than hard
  lock-on, for a fair feel.
- **Responsive canvas** — size the backing store to CSS size × `devicePixelRatio`
  (cap ~2×) and scale the context; keep logical game units separate from canvas
  pixels (*your project already does this DPR trick via
  `Object.defineProperty`*). Listen to `resize` + `orientationchange`; re-render
  after resize (changing canvas size clears it). `requestFullscreen()` must come
  from a user gesture.

---

## 10. Asset pipeline & bundling

- **Bundler — Vite is the consensus default.** **Vite 8 (stable 2026-03-12)**
  unifies dev+build on **Rolldown** (Rust, Rollup-compatible) with **Oxc** and
  **Lightning CSS**; Rolldown claims ~10–30× over Rollup with esbuild-class build
  speed. Intermediate path: **`rolldown-vite`** (Vite 7 + Rolldown). Benchmarks
  (2026-06): Vite 8 leads HMR (~65ms) and production builds; Rspack/Rsbuild lead
  cold dev startup; esbuild leads pure library builds. *(Your current project is
  deliberately zero-build — see migration note below.)*
- **Texture atlases.** **TexturePacker** (commercial; polygon trim, CLI, 40+
  presets, multipack) is best-in-class. Free: **`free-tex-packer-core`**
  (**v0.3.5, 2025-08-29** — the desktop app is in 2021 maintenance mode, but the
  core is current; CLI/webpack, Pixi/Phaser/Godot/Cocos presets). Or **PixiJS
  AssetPack** to generate atlases in the build.
- **Compressed GPU textures.** **KTX2 / Basis Universal** transcode at load to
  the device's supported format → smaller VRAM + download (ETC1S = smallest).
  PixiJS v8 supports DDS/KTX/KTX2/Basis but you must **import the loaders before
  `Assets.load`**. Use a **manifest with format fallback**
  (`["bg.ktx2","bg.basis","bg.png"]`). **AssetPack** can auto-generate the
  variants.
- **Load-time strategy.** Dynamic `import()` code-splitting per area; lazy-load
  levels/areas (pairs with chunked-map streaming); hashed assets on a **CDN**
  with long cache headers; a **service worker / PWA** to precache the shell and
  runtime-cache big assets. *(Your project already ships a service worker
  (`sw.js`) caching all chunks — extend it to runtime-cache atlases.)*
- **Audio sprites.** `audiosprite` (`-f howler`) for one-file SFX banks.

---

## 11. The recommended stack — and its tradeoffs

### Primary recommendation (best realism × performance × solo/small-team speed)

```
Engine/renderer ... Phaser 4            (MIT, batteries-included, WebGL "Beam")
Tilemap/levels .... Tiled infinite maps  OR  LDtk separate-levels (streaming)
Collision ......... custom swept-AABB (movement) + segment raycast (bullets)
   (escalate to Rapier @dimforge/rapier2d-simd only if you need physical
    projectile response / rich rigid-body interactions)
AI/pathfinding .... flow field toward player + local separation steering
   (recast-navigation-js crowd for smarter sparse AI)
Lighting/day-night. Phaser 4 setLighting (normal maps + self-shadows) + ambient overlay
Audio ............. Howler.js + Spatial plugin  (or raw Web Audio StereoPanner)
Save/state ........ Dexie.js (IndexedDB) primary + localStorage pagehide snapshot
   ECS: bitECS if entity counts get high
Mobile ............ nipplejs twin-stick + auto-fire + soft magnetic auto-aim
Build/assets ...... Vite (+ Rolldown) + atlases (free-tex-packer/AssetPack)
                    + KTX2/Basis + service-worker precache
```

**Why this balance:** Phaser 4 gives you tilemaps, camera culling, arcade
physics, Groups (pooling), a strong lighting system, and the largest tutorial
ecosystem out of the box — that's the single biggest velocity multiplier for a
solo/small team. The "realistic" feel comes not from a heavyweight physics engine
but from **swept-AABB movement + raycast ballistics** (tunnel-proof, cheap) plus
**flow-field hordes** that scale to hundreds of enemies. Everything else is a
small, well-maintained, single-purpose library.

### Tradeoffs vs the alternatives

- **PixiJS v8 instead of Phaser 4.** Better raw batching and opt-in WebGPU, more
  rendering control, faster particles — but you assemble tilemap (`pixi-tiledmap`),
  physics/collision, ECS, and **lighting** (the Pixi lighting plugin is stuck on
  v7) yourself. Choose Pixi when rendering control matters more than time-to-ship.
- **LittleJS instead of Phaser 4.** Genre-tailored, tiny, built-in
  tilemap/physics/A*/particles — great for a lean, fast build; smaller ecosystem
  and fewer third-party integrations than Phaser.
- **Rapier/Planck instead of custom AABB.** Real rigid-body sim (ricochet,
  stacking, joints) and built-in CCD — but a WASM/JS dependency and more CPU per
  body than AABB+raycast, which a top-down shooter rarely needs.
- **Per-agent A* (EasyStar/PathFinding.js) instead of flow fields.** Optimal
  individual paths and divergent goals — but doesn't scale when 200 enemies chase
  one player, and both libs are unmaintained.
- **melonJS / Excalibur instead of Phaser.** Both are clean and capable
  (melonJS especially strong on tilemaps); smaller communities and fewer
  learning resources than Phaser.

### Note on *this* project

The existing **Rafa Paoli shooter** is a deliberately **zero-build, single-file,
no-dependency** Canvas2D game (15 ordered `<script>` chunks + a service worker,
localStorage saves). Two realistic paths to the "realistic top-down survival
shooter" goal:

1. **Incremental, in-place** — stay zero-build; add the *patterns* above without
   the engine: a fixed-grid spatial hash + object pools (you already have a
   fixed-timestep loop, adaptive quality, and DPR handling), swept-AABB + raycast
   bullets, a flow field for hordes, a custom additive light buffer for
   day/night, nipplejs (or your existing on-screen buttons) for mobile, and move
   saves to IndexedDB/Dexie while keeping the localStorage `pagehide` snapshot.
   Lowest disruption; you keep full control.
2. **Re-platform onto Phaser 4 + Vite** — adopt the full recommended stack for a
   genuinely large streamed open-world map with dynamic lighting and many
   entities. More upfront work and a build step, but far less custom engine code
   long-term.

For a solo/small team chasing the *full* feature list (open world, streaming,
dynamic lighting, bosses, quests, crafting), **path 2 (Phaser 4 + Vite)** is the
better long-term investment; if you want to evolve the current game gradually,
**path 1** lets you adopt the high-value patterns first.

---

## Verification caveats

- Several search results were **wrong and corrected** against the npm registry:
  Howler's last release is **2023-09-19** (not 2024); a "Matter.js 2025 release"
  conflated it with the unrelated `@matter` smart-home SDK; a nipplejs "2015"
  source was a contaminated fork (real: **v1.0.4, 2026**).
- GitHub commit/star APIs were rate-limited during research; some star counts are
  approximate, and per-repo maintenance is inferred from **npm publish recency**.
- Vendor performance claims (LittleJS 100k sprites, recast-navigation agent
  counts, "2–5× faster" Rapier, Rolldown "10–30×") are **vendor/anecdotal** and
  hardware-dependent — **prototype a stress test on your target devices**.
- The Phaser 4 lighting article and LDtk latest version should be re-checked
  against current docs before you code against specific APIs.

---

## Consolidated sources

**Engines:** Phaser <https://github.com/phaserjs/phaser>, <https://phaser.io/phaser4>, <https://phaser.io/news/2024/09/phaser-beam-technical-preview-4> · PixiJS <https://github.com/pixijs/pixijs>, <https://pixijs.com/blog/pixi-v8-launches>, <https://pixijs.com/8.x/guides/components/renderers> · Kaboom/KAPLAY <https://github.com/replit/kaboom>, <https://github.com/kaplayjs/kaplay> · Excalibur <https://github.com/excaliburjs/Excalibur>, <https://excaliburjs.com/docs/performance/> · melonJS <https://github.com/melonjs/melonJS> · LittleJS <https://github.com/KilledByAPixel/LittleJS> · Cocos <https://www.prnewswire.com/news-releases/cocos-4-is-here-fully-open-source-302652264.html> · Defold <https://github.com/defold/defold> · Three.js <https://threejs.org/manual/en/webgpurenderer.html>

**Rendering/perf/lighting:** PixiJS Performance Tips <https://pixijs.com/8.x/guides/concepts/performance-tips> · ParticleContainer <https://pixijs.com/blog/particlecontainer-v8> · Pixi v8 Culling <https://www.richardfu.net/optimizing-rendering-with-pixijs-v8-a-deep-dive-into-the-new-culling-api/> · Object pooling <https://www.webgamedev.com/performance/object-pooling> · Quadtree vs spatial hash <https://zufallsgenerator.github.io/2014/01/26/visually-comparing-algorithms> · rbush benchmarks <https://0fps.net/2015/01/23/collision-detection-part-3-benchmarks/> · GPU tilemap <https://blog.paavo.me/gpu-tilemap-rendering/> · WebGPU status <https://github.com/gpuweb/gpuweb/wiki/Implementation-Status> · Phaser 4 lighting <https://phaser.io/news/2026/05/phaser-4-dynamic-lighting> · Red Blob 2D Visibility <https://www.redblobgames.com/articles/visibility/> · Sight & Light <https://ncase.me/sight-and-light/> · Slembcke hard shadows <https://www.slembcke.net/blog/SuperFastHardShadows/>

**Physics/pathfinding:** Matter.js <https://github.com/liabru/matter-js> · Planck.js <https://github.com/piqnt/planck.js> · Rapier 2025/2026 <https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge/>, CCD <https://rapier.rs/docs/user_guides/rust/advanced_collision_detection/> · detect-collisions <https://github.com/Prozi/detect-collisions> · swept-AABB <https://emanueleferonato.com/2021/10/21/understanding-physics-continuous-collision-detection-using-swept-aabb-method-and-minkowski-sum/> · hitscan vs projectile <https://80.lv/articles/how-does-shooting-work-in-games-hitscan-and-projectile-ballistics> · EasyStar <https://github.com/prettymuchbryce/easystarjs> · PathFinding.js <https://github.com/qiao/PathFinding.js> · recast-navigation-js <https://github.com/isaac-mason/recast-navigation-js> · flow fields <https://www.jdxdev.com/blog/2020/05/03/flowfields/> · Yuka <https://github.com/Mugen87/yuka>

**Tilemaps/build:** Tiled <https://github.com/mapeditor/tiled/releases> · pixi-tiledmap <https://github.com/riebel/pixi-tiledmap> · Managing Big Maps in Phaser <https://phaser.io/news/2018/10/managing-big-maps-in-phaser-3> · LDtk <https://github.com/deepnight/ldtk>, loading <https://ldtk.io/docs/game-dev/loading/>, separate levels <https://ldtk.io/docs/game-dev/json-overview/optional-separate-levels/> · Vite 8 <https://vite.dev/blog/announcing-vite8> · build-tools benchmarks <https://github.com/rstackjs/build-tools-performance> · TexturePacker <https://www.codeandweb.com/tp-online> · free-tex-packer-core <https://www.npmjs.com/package/free-tex-packer-core> · PixiJS compressed textures <https://pixijs.com/8.x/guides/components/assets/compressed-textures> · texture formats <https://www.donmccurdy.com/2024/02/11/web-texture-formats/>

**Audio/state/mobile:** Howler.js <https://howlerjs.com/> · StereoPannerNode <https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode> · Web Audio perf <https://padenot.github.io/web-audio-perf/> · Autoplay/unlock <https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay> · bitECS <https://github.com/NateTheGreatt/bitECS> · miniplex <https://github.com/hmans/miniplex> · save best practices <https://bugnet.io/blog/game-save-best-practices-web> · Dexie.js <https://github.com/dexie/Dexie.js> · idb <https://www.npmjs.com/package/idb> · nipplejs <https://github.com/yoannmoinet/nipplejs>, dual-stick <https://github.com/yoannmoinet/nipplejs/blob/master/example/dual-joysticks.html> · Pointer Events multi-touch <https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Multi-touch_interaction> · fair auto-aim <https://www.gamedeveloper.com/design/how-to-create-a-fair-auto-aiming-system-in-a-robot-shooter-> · responsive canvas <https://web.dev/gopherwoord-studios-resizing-html5-games/>
