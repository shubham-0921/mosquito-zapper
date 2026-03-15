# Product Requirements Document
## Mosquito Zapper — 3D Browser Game

---

**Version:** 1.0  
**Status:** Draft  
**Author:** Shubham  
**Last Updated:** March 2026  

---

## 1. Overview

### 1.1 Product Summary

Mosquito Zapper is a browser-based 3D first-person game built on Babylon.js. The player walks through a realistic Indian apartment at night, hunts mosquitoes flying around the room, and eliminates them using an electric racket. The core loop is built around the deeply satisfying ZZZAP sound and visual feedback of zapping a mosquito — a universally relatable experience for anyone who has spent a sleepless Indian summer night doing the same.

### 1.2 Problem Statement

Casual browser games lack culturally resonant, locally relatable experiences for Indian audiences. Most games feel generic. There is an untapped opportunity for a polished, shareable micro-game that captures a hyper-specific everyday Indian moment — the 2 AM mosquito hunt — and turns it into a satisfying game loop.

### 1.3 Target Audience

| Segment | Description |
|---|---|
| Primary | Indian urban millennials and Gen Z, 18–30 |
| Secondary | Global casual gamers who enjoy quirky, culturally specific games |
| Platform | Desktop browser (Chrome, Firefox, Safari); mobile stretch goal |

### 1.4 Success Metrics

- Session length > 3 minutes (indicates core loop is fun)
- D1 retention > 25%
- Social share rate > 10% of sessions
- Load time < 5 seconds on a standard broadband connection

---

## 2. Goals & Non-Goals

### Goals

- Build a fully playable, shareable 3D browser game with no install required
- Deliver a satisfying, tactile zapping experience through sound and visual feedback
- Create a game loop with enough depth (score, combos, difficulty scaling) to drive replayability
- Make it instantly shareable via a single URL

### Non-Goals

- Not a mobile-native app (no App Store / Play Store release in v1)
- Not a multiplayer game in v1
- Not a story-driven or open-world game — this is an arcade-style loop
- Not monetised in v1

---

## 3. Game Design

### 3.1 Core Concept

First-person 3D game. The player stands in a dark apartment room. Mosquitoes spawn and fly erratically around the room. The player holds an electric racket (visible in the bottom-right of the screen, like a weapon in an FPS). Swinging the racket over a mosquito kills it — triggering an electric arc animation and the ZZZAP sound. The goal is to kill as many mosquitoes as possible before the timer runs out.

### 3.2 The Core Loop

```
Mosquito spawns → Player tracks it → Player swings racket → Hit detection 
→ ZZZAP sound + electric arc → Mosquito dies → Score + combo update → Next spawn
```

### 3.3 Game Modes

| Mode | Description |
|---|---|
| **Blitz (v1)** | 60-second timed round, kill as many as possible |
| **Survival (v2)** | Unlimited time, game ends when 5 mosquitoes escape |
| **Lights Off (v2)** | Dark room with a flashlight — harder visibility |

### 3.4 Difficulty Progression (Blitz Mode)

| Time Elapsed | Active Mosquitoes | Speed Multiplier | Notes |
|---|---|---|---|
| 0–15s | 2 | 1.0x | Tutorial feel, slow |
| 15–30s | 4 | 1.2x | Ramping up |
| 30–45s | 6 | 1.5x | Frantic |
| 45–60s | 8 | 2.0x | Full chaos |

### 3.5 Scoring System

| Action | Points |
|---|---|
| Kill a mosquito | +10 |
| Combo x2 (2 kills within 2s) | +25 bonus |
| Combo x3 | +50 bonus |
| Combo x5 (ZAPPER MASTER) | +100 bonus + special effect |
| Miss swing | No penalty |
| Mosquito escapes (Survival mode) | -1 life |

---

## 4. Technical Architecture

### 4.1 Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| 3D Engine | **Babylon.js** | Full game engine in browser, built-in physics, FPS camera, collision detection |
| Rendering | WebGL (via Babylon) | Hardware accelerated, runs on all modern browsers |
| Physics | Babylon.js Havok plugin | Realistic mosquito movement and collision |
| Sound | Web Audio API | Procedural electric zap sound, no audio file dependency |
| UI Overlay | HTML/CSS over canvas | Score, timer, combo HUD |
| Hosting | GitHub Pages / Netlify | Single HTML + JS bundle, zero backend |
| Build | Vite + TypeScript | Fast bundling, type safety |

### 4.2 Scene Architecture

```
Scene
├── Environment
│   ├── Room mesh (walls, floor, ceiling)
│   ├── Furniture (bed, fan, table — static meshes)
│   ├── Lighting (single dim bulb — warm, flickery)
│   └── Skybox (night sky through window)
├── Player
│   ├── FPS Camera (WASD + mouse look)
│   ├── Racket mesh (attached to camera, bottom-right)
│   └── Swing animation (triggered on click/tap)
├── Mosquito System
│   ├── Mosquito pool (object pooling for performance)
│   ├── Flight AI (Bezier curve pathing + random drift)
│   ├── Spawn manager (difficulty-scaled spawning)
│   └── Hit detection (mesh intersection on swing)
├── VFX
│   ├── Electric arc particle system (on kill)
│   ├── Mosquito death animation (disintegration)
│   └── Combo flash effect (screen-space)
└── Audio
    ├── Zap sound (Web Audio API synthesized)
    ├── Mosquito buzz (looping, proximity-based volume)
    └── Combo jingle
```

### 4.3 Mosquito Flight AI

Mosquitoes use a waypoint-based Bezier curve system with jitter:

- Each mosquito has a randomly generated path of 4–6 waypoints within the room bounds
- On reaching a waypoint, a new one is generated
- A random jitter vector (±0.1 units) is added each frame to simulate erratic buzzing
- Speed scales with difficulty tier (see section 3.4)
- Mosquitoes avoid clipping into furniture via simple bounding box checks

### 4.4 Hit Detection

- Swing is triggered on left-click (desktop) or tap (mobile)
- A raycast + sphere sweep is performed from the racket mesh position in the swing direction
- Any mosquito mesh intersecting the sweep within 0.8 units is registered as a hit
- 200ms cooldown between swings (prevents spam clicking)

### 4.5 Audio Design — The ZZZAP Sound

The zap sound is synthesised entirely via Web Audio API (no file required):

```
OscillatorNode (sawtooth, 180Hz)
  → GainNode (sharp attack 5ms, decay 80ms)
  → BiquadFilterNode (highpass 1200Hz)
  → DistortionNode (waveshaper curve)
  → AudioContext.destination
```

Mosquito buzz uses a looping oscillator at 600Hz with slight frequency modulation to simulate wing beat.

---

## 5. Game Screens & UX Flow

### 5.1 Screen Flow

```
Title Screen → [Press to Start] → Game (60s) → Results Screen → [Play Again / Share]
                                        ↑                              |
                                        └──────────────────────────────┘
```

### 5.2 Title Screen

- Dark background, single ceiling light illuminating a room
- Game title: **"Mosquito Zapper"** in bold, slightly retro font
- Tagline: *"It's 2 AM. They're back."*
- Single CTA button: **"Start Hunt"**
- High score displayed if returning player

### 5.3 HUD (In-Game)

```
┌─────────────────────────────────────────────────────┐
│  ⚡ SCORE: 0          🦟 KILLS: 0       ⏱ 0:60      │
│                                                      │
│              [COMBO x3 — ZAPPER!]                   │
│                                          [RACKET]   │
└─────────────────────────────────────────────────────┘
```

- Score top-left, kill count top-center, timer top-right
- Combo notification appears center-screen and fades out in 1.5s
- Racket visible bottom-right (FPS weapon style)

### 5.4 Results Screen

- Total kills and score
- Best combo achieved
- Comparison to personal best
- Share score button (generates a pre-filled tweet / WhatsApp message)
- Play Again CTA

---

## 6. Art Direction

### 6.1 Visual Style

Realistic-but-stylised Indian apartment room. Not cartoon, not photorealistic — somewhere in between. Think slightly desaturated warm tones, old-school ceiling fan, a single incandescent bulb. The kind of room that feels immediately familiar to anyone who grew up in India.

### 6.2 Key Assets

| Asset | Description | Format |
|---|---|---|
| Room | Walls, floor, ceiling with peeling paint texture | `.glb` |
| Furniture | Bed, table, ceiling fan (rotating), window | `.glb` |
| Mosquito | Low-poly, ~500 triangles, with wing animation | `.glb` |
| Electric Racket | Realistic racket with glowing mesh when charged | `.glb` |
| Electric Arc | Particle system — white-blue sparks | Babylon particles |
| Ambient Light | Warm incandescent, flickering subtly | Babylon light |

Assets sourced from Sketchfab (CC license) or modelled in Blender.

### 6.3 Colour Palette

| Element | Colour |
|---|---|
| Room ambience | Warm amber `#FF9A3C` |
| Electric arc | Cool blue-white `#B3E5FC` |
| UI / HUD | Off-white `#F5F0E8` |
| Danger / alert | Deep red `#C62828` |
| Combo flash | Gold `#FFD600` |

---

## 7. Build Milestones

### Phase 1 — Playable Prototype (Week 1–2)

- [ ] Babylon.js project scaffolded with Vite
- [ ] Basic room mesh loaded and lit
- [ ] FPS camera with WASD movement
- [ ] 2–3 mosquitoes flying with basic AI
- [ ] Racket visible, swing on click
- [ ] Hit detection working
- [ ] Zap sound via Web Audio API
- [ ] Score counter on screen

### Phase 2 — Core Loop Complete (Week 3–4)

- [ ] Full difficulty scaling over 60 seconds
- [ ] Combo system and HUD
- [ ] Mosquito death particle effect
- [ ] Mosquito buzz audio with proximity fade
- [ ] Title screen and results screen
- [ ] Object pooling for mosquitoes (performance)

### Phase 3 — Polish & Launch (Week 5–6)

- [ ] Full room with furniture and ambient details
- [ ] Lighting polish (flickering fan light, window moonlight)
- [ ] Mobile touch controls
- [ ] Share score flow (WhatsApp / Twitter)
- [ ] Performance pass (60fps target on mid-range laptop)
- [ ] Deploy to custom domain

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 3D assets take too long to source/model | Medium | High | Start with primitive shapes (box mosquito, cylinder racket) to unblock dev; replace with polished assets later |
| Performance issues on mid-range devices | Medium | High | Object pooling, LOD for mosquitoes, cap at 20 active entities |
| Hit detection feels unfair / frustrating | High | High | Generous hitbox (slightly larger than visual mesh), 200ms grace window on swing |
| Mobile controls feel awkward | Medium | Medium | Treat mobile as v2 stretch goal; focus on desktop-first |
| Babylon.js learning curve slows dev | Low | Medium | Use Claude Code for scaffolding; Babylon.js has excellent docs |

---

## 9. Out of Scope (v1)

- Multiplayer / leaderboard backend
- Multiple room environments
- Power-ups (spray, coil, etc.)
- Story or narrative mode
- Mobile app (iOS / Android)
- In-app purchases or ads

---

## 10. Open Questions

1. **Asset pipeline** — Source from Sketchfab or build in Blender? Time vs quality tradeoff.
2. **Sound design** — Is procedural Web Audio API enough or do we want recorded sounds?
3. **Hosting** — GitHub Pages (free, simple) vs custom domain from day one?
4. **Analytics** — Add Plausible / PostHog from day one to track session length?
5. **Sharing** — WhatsApp share (India-first) vs Twitter/X?

---

*PRD v1.0 — Mosquito Zapper | 3D Browser Game*
