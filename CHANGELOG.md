# Changelog

## v3.0 — Phase 1-4 refactor pass (branch `claude/shooter-ultimate-phase1-5EW9c`)

### Phase 1 — Game feel & juice
- **1.1** Delta-time + fixed-timestep accumulator (60Hz), scheduled-events queue replacing in-loop `setTimeout`. Hitstop / slow-motion engine with smooth release. White flash on boss death.
- **1.2** Trauma-based screen shake (`shake = trauma² × 16px`, ~1.5/s decay) with per-event intensity. Honors `screenShakeEnabled`.
- **1.3** Spawn warning triangles (500ms lead); bomber blast-radius ring; diver trajectory line; boss attack zone telegraphed 800ms before each shot.
- **1.4** Central `hitEnemy()`: 8% crit (2×), 2-frame white flash, 3px knockback, sized damage numbers, near-miss "+50 CLOSE!" detection.
- **1.5** Muzzle flash, 2px recoil, cyan i-frame aura, low-HP red vignette, death sequence (slowmo + fragment burst).
- **1.6** Combo timeout 5→2.5s; exponential multiplier (asymptote 5×); scaling/coloring combo HUD; eased FloatingText; Perfect Wave +500; multi-kill chain (TRIPLE / MEGA / ULTRA / GODLIKE).
- **1.7** ±5% SFX pitch detune; sidechain ducking on explosion/boss_roar. (Audio is already procedural Web Audio — no `<audio>` migration needed.)
- **1.8** `haptic()` helper with `hapticsEnabled` toggle; vibration on damage, heavy kills, boss hits, boss death.

### Phase 2 — Mobile performance
- **2.1** DPR-aware backing store via `Object.defineProperty` trick (CSS-px API preserved). `getContext` options explicit.
- **2.2** Caps on explosions (24) / floating texts (36). Adaptive `PARTICLE_POOL.maxSize` (200 in low mode).
- **2.3** Adaptive quality: <45fps sustains 2s → cut particles; <30fps → disable shake + parallax. `?debug=1` auto-shows perf monitor. `visibilitychange` auto-pause. `saveGameData` defers to `requestIdleCallback`.
- **2.4** Backdrop-filter blur reduced across overlays. `updateScoreDisplay` caches DOM writes (lives bar no longer rebuilds per frame).
- **2.5** Service Worker (cache-first shell, cross-origin bypass).

### Phase 3 — Single-file architecture
- **3.1-3.3** `CONFIG` block centralizing combat/feel/adaptive constants. `GameStates` + `transition()` state machine. `Input` abstraction (additive — existing handlers still drive gameplay).
- **3.5** Save versioning (`SAVE_VERSION = 3`) with `_migrateSave()`. `window.exportSave()` / `window.importSave()` globals.
- **3.6** README + CHANGELOG.
- **3.7** Online robustness: exponential reconnect backoff `[1s, 2s, 4s, 8s]`, ping/pong every 2s, ping HUD overlay. Short 6-char codes (already in place).

### Phase 4 — Polish
- **4.1** `markBossSeen()` — skip boss intro after first kill.
- **4.4** Colorblind + high-contrast toggles (`toggleColorblind()` / `toggleHighContrast()`); independent SFX / Music volume settings; pause redundancy (P + Esc).
- **4.5** Per-run stat panel on game-over (kills by type, accuracy, dmg taken, time, best combo). Confirmation prompt when leaving pause screen mid-run.

### Deferred (with rationale)
- Spatial-grid collision (current entity counts make brute-force cheaper).
- True file-split modularization (conflicts with the briefing's single-file rule; logical centralization done in-place).
- Bullet/floating-text object pools (already capped; particles pooled via existing `PARTICLE_POOL`).
- IndexedDB persistence (current save size is small; localStorage is fine).
- 3-phase boss movesets, full boss intro cinematic, 3 new skins, weekly modifier, tutorial 30s — all per-boss / per-system content work, out of scope for the refactor pass.

## v2.x — pre-refactor baseline (`8633056`)
Initial single-file game imported as-is.
