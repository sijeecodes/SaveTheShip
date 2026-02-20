# Frontend Architecture – File-by-File Breakdown

This document explains what every JS file in the `frontend/src/` folder does and how they connect to each other.

---

## High-Level Overview

```
                        index.html
                            │
                        src/main.js
                            │
                    src/core/gameLogic.js   ← Central orchestrator
                            │
     ┌──────────┬───────────┼──────────────┬──────────────┐
     │          │           │              │              │
  events/    core/       scene/        player/       networking/
 eventManager  gameLoop   scene3d.js   character.js   messageHandler.js
               renderer   environment  characterCollision  gameStateManager.js
                                       characterAnimation.js
                                       playerSpotlight.js
                                       playerNameLabel.js
                                       animation/
                                         animationManager.js
                                         playerAnimationLoader.js
                                         playerColorUtils.js
                            │
                         input/
                        inputState.js
                            │
                        loaders/
                        fbxLoader.js
```

---

## Root-Level Files

### `vite.config.js`
**Purpose:** Vite build tool configuration.  
**What it does:** Sets the dev server to run on port 3000 with auto-open, and configures the production build to target `esnext` with Terser minification.  
**Connections:** Used by Vite internally — no imports from or to other JS files.

---

## `src/` – Entry Point

### `src/main.js`
**Purpose:** Entry point for the 3D game.  
**What it does:** Waits for `DOMContentLoaded`, then creates a `GameLogic` instance and calls `init()`.  
**Imports:** `GameLogic` from `core/gameLogic.js`  
**Connections:** This is the module entry point that Vite picks up (referenced in `index.html`). It bootstraps the entire 3D application.

---

## `src/core/` – Application Orchestration

### `src/core/gameLogic.js` (`GameLogic` class)
**Purpose:** Central orchestrator — the "brain" of the 3D game.  
**What it does:**
- Creates and owns the Three.js camera, scene, character, and FPS camera
- Delegates renderer creation to `renderer.js`
- Delegates all event listener setup to `EventManager`
- Establishes a WebSocket connection to the backend (port 8080)
- Delegates the game loop to `gameLoop.js`
- Delegates incoming WebSocket messages to `MessageHandler`
- Updates the DOM status indicator

**Imports:**
| Import | From |
|---|---|
| `Scene3D` | `../scene/scene3d.js` |
| `Character` | `../player/character.js` |
| `FPSCamera` | `../camera/fpsCamera.js` |
| `InputState` | `../input/inputState.js` |
| `EventManager` | `../events/eventManager.js` |
| `MessageHandler` | `../networking/messageHandler.js` |
| `createRenderer` | `./renderer.js` |
| `startGameLoop` | `./gameLoop.js` |

**Connections:** This is the hub. Nearly every other module is used by or called from `GameLogic`. It holds references to all major subsystems and passes itself (`this`) to `EventManager.setup()`, `startGameLoop()`, and `MessageHandler.handleMessage()`.

---

### `src/core/renderer.js`
**Purpose:** Creates and configures the WebGL renderer.  
**What it does:** Creates a `THREE.WebGLRenderer` with performance settings, shadow maps, and pixel ratio capping, then appends it to `#gameContainer`.  
**Exports:** `createRenderer()` function  
**Used by:** `GameLogic` (called in `init()`)

---

### `src/core/gameLoop.js`
**Purpose:** Game loop — update logic, network throttling, and rendering.  
**What it does:**
- Runs the `requestAnimationFrame` loop
- Updates character movement, camera position, spotlight, and animations each frame
- Throttles network sends to ~15 updates/sec and only sends when position/rotation actually changed
- Renders the frame

**Exports:** `startGameLoop(game)` function  
**Used by:** `GameLogic` (called when WebSocket connects)

---

## `src/events/` – Centralized Event Listeners

### `src/events/eventManager.js`
**Purpose:** **All `addEventListener` calls live here** for easy tracking and cleanup.  
**What it does:**
- **Keyboard:** `keydown`/`keyup` on `window` — updates `InputState.keys`, prevents default for movement keys, handles animation debug keys (I/R)
- **Mouse:** `mousemove` on `document` — updates character yaw and camera pitch when pointer is locked
- **Pointer lock:** `click` on `document` to request pointer lock, `pointerlockchange` to track lock state
- **Window:** `resize` to update camera aspect ratio and renderer size, `visibilitychange` for clock pause

**Imports:** None (receives `game` object with all subsystem references)  
**Used by:** `GameLogic` (called once in `init()`)

---

## `src/input/` – Input State

### `src/input/inputState.js`
**Purpose:** Centralized input state tracker.  
**What it does:** Stores keyboard pressed-state (`keys` dictionary) and pointer lock state. Shared between `EventManager` (writes) and `Character` (reads).  
**Used by:** `GameLogic` (creates it), `EventManager` (mutates keys), `Character` (reads keys for movement)

---

## `src/camera/` – Camera System

### `src/camera/fpsCamera.js`
**Purpose:** Third-person camera that follows the character.  
**What it does:**
- Positions the camera behind and above the character based on yaw angle
- Updates camera position and look-at target every frame
- Pure math — contains no event listeners (those are in `EventManager`)

**Imports:** None (only THREE)  
**Used by:** `GameLogic` (created in `setupScene()`, `update()` called every frame via `gameLoop.js`)  
**Depends on:** `Character` instance (reads position and yaw)

---

## `src/player/` – Player Representation

### `src/player/character.js`
**Purpose:** Local player physics and movement controller.  
**What it does:**
- Reads keyboard input from `InputState` to compute movement direction
- Applies velocity, friction, gravity, and jumping
- Delegates collision detection to `characterCollision.js`
- Exposes position and yaw for the camera and network systems

**Imports:** `checkCollisionMultiRay`, `stickToSurface` from `characterCollision.js`  
**Used by:** `GameLogic` (created in `setupScene()`, `update()` called every frame)  
**Depends on:** `InputState` (passed via constructor to read input), ship meshes (set via `setShipMeshes()` after ship loads)

---

### `src/player/characterCollision.js`
**Purpose:** Raycasting-based collision detection, extracted from `character.js`.  
**What it does:**
- `checkCollisionMultiRay()`: casts 8 rays from offset positions to detect horizontal collisions within distance 1
- `stickToSurface()`: casts a downward ray to snap the character onto the ship's surface

**Exports:** `checkCollisionMultiRay()`, `stickToSurface()` functions  
**Used by:** `Character` (called every frame during `update()`)

---

### `src/player/characterAnimation.js`
**Purpose:** Visual representation of a player (both local and remote).  
**What it does:**
- Creates a `THREE.Group` to hold the player's FBX model, name label, and spotlight
- For remote players: delegates spotlight creation to `playerSpotlight.js` and creates a floating name label
- Manages movement-based animation switching (Idle ↔ Run) by checking if position changed
- Delegates FBX model + animation loading to `PlayerAnimationLoader`
- `update()` sets position, rotation, spotlight aim, and ticks the animation mixer

**Imports:**
| Import | From |
|---|---|
| `PlayerAnimationLoader` | `animation/playerAnimationLoader.js` |
| `PlayerNameLabel` | `playerNameLabel.js` |
| `createPlayerSpotlight`, `updateSpotlightForPlayer` | `playerSpotlight.js` |

**Used by:** `MessageHandler` (creates local player), `GameStateManager` (creates remote players), `GameLogic` (updates local player model in game loop)

---

### `src/player/playerSpotlight.js`
**Purpose:** Spotlight (flashlight) logic for remote players, extracted from `characterAnimation.js`.  
**What it does:**
- `createPlayerSpotlight()`: creates a `SpotLight` + `Object3D` target pair
- `updateSpotlightForPlayer()`: positions and aims the spotlight based on character position and yaw

**Exports:** `createPlayerSpotlight()`, `updateSpotlightForPlayer()` functions  
**Used by:** `CharacterAnimation` (called in constructor and `update()`)

---

### `src/player/playerNameLabel.js`
**Purpose:** Creates a floating name label above a player.  
**What it does:**
- Draws the player's name onto an off-screen canvas (white text on semi-transparent black background)
- Creates a `THREE.CanvasTexture` from the canvas and applies it to a plane mesh
- Positions the label above the player's head and adds it to the player's group

**Imports:** None (only THREE)  
**Used by:** `CharacterAnimation` (called in constructor for remote players)

---

## `src/player/animation/` – Animation & Coloring

### `src/player/animation/animationManager.js`
**Purpose:** Manages Three.js animation playback for a single model.  
**What it does:**
- Wraps `THREE.AnimationMixer` for a given model
- Stores animation clips by name in a Map
- `playAnimationWithBlend()`: crossfades from the current animation to a new one over a configurable duration
- `update()`: ticks the mixer each frame with the delta time
- `dispose()`: cleans up the mixer

**Imports:** None (only THREE)  
**Used by:** `PlayerAnimationLoader` (creates it and registers clips), `CharacterAnimation` (calls `update()` and `playAnimationWithBlend()`), `gameLoop.js` (calls `update()` on remote players' animation managers)

---

### `src/player/animation/playerAnimationLoader.js`
**Purpose:** Loads FBX character models and their animations.  
**What it does:**
- Loads `Idle.fbx` as the base model, scales it, adds it to the player group
- Creates an `AnimationManager` and registers the Idle animation clip
- Then loads `Run.fbx`, extracts the run animation clip (filtering out root bone position track to prevent sliding), and registers it
- Delegates color application to `playerColorUtils.js`

**Imports:**
| Import | From |
|---|---|
| `FBXLoader` | `../../loaders/fbxLoader.js` |
| `AnimationManager` | `./animationManager.js` |
| `generateRandomColor`, `applyPlayerColor` | `./playerColorUtils.js` |

**Used by:** `CharacterAnimation` (called in constructor to load the player's model and animations)

---

### `src/player/animation/playerColorUtils.js`
**Purpose:** Player color generation and bone-based vertex coloring.  
**What it does:**
- `generateRandomColor()`: picks a random color from a predefined palette
- `applyPlayerColor()`: colors the player model by painting vertex colors based on bone influence (targets spine/shoulder bones for a "shirt color" effect)

**Exports:** `generateRandomColor()`, `applyPlayerColor()` functions  
**Used by:** `PlayerAnimationLoader` (applies color when model loads), `MessageHandler` (generates random color for local player)

---

## `src/networking/` – Server Communication

### `src/networking/messageHandler.js`
**Purpose:** Routes incoming WebSocket messages to the correct handler.  
**What it does:**
- Handles `welcomeMessage`: stores player/game IDs, updates DOM, and creates the local `CharacterAnimation` instance
- Handles `gameState`: delegates to `GameStateManager`
- `createLocalPlayer()`: creates a `CharacterAnimation` with a random color, adds it to the scene and the players map

**Imports:**
| Import | From |
|---|---|
| `CharacterAnimation` | `../player/characterAnimation.js` |
| `GameStateManager` | `./gameStateManager.js` |
| `generateRandomColor` | `../player/animation/playerColorUtils.js` |

**Used by:** `GameLogic` (called from `ws.onmessage`)

---

### `src/networking/gameStateManager.js`
**Purpose:** Synchronizes remote player state from server broadcasts.  
**What it does:**
- Receives `gameState` messages containing all players' positions
- For the **local player**: syncs initial position from server but doesn't override local movement
- For **remote players**: creates new `CharacterAnimation` instances when they join, updates their position/rotation/animation every tick, and removes them when they disconnect
- Throttles DOM player-list updates to max every 500ms for performance

**Imports:** `CharacterAnimation` from `../player/characterAnimation.js`  
**Used by:** `MessageHandler` (called on every `gameState` message)

---

## `src/loaders/` – Asset Loading

### `src/loaders/fbxLoader.js`
**Purpose:** Thin wrapper around Three.js's FBXLoader.  
**What it does:** Re-exports `FBXLoader` from `three/examples/jsm/loaders/FBXLoader.js` as a custom class (currently adds no extra functionality, but provides a single import point for future customization).

**Imports:** `FBXLoader` from `three/examples/jsm/loaders/FBXLoader.js`  
**Used by:** `EnvironmentBuilder` (loads ship model), `PlayerAnimationLoader` (loads player FBX files)

---

## `src/scene/` – 3D World Setup

### `src/scene/scene3d.js`
**Purpose:** Manages the Three.js scene, lighting, and environment.  
**What it does:**
- Creates a `THREE.Scene` with a black background and fog
- Sets up ambient light (very dim, 0.05 intensity) and a spotlight that acts as a flashlight
- Provides `updateSpotlightPosition()` to move the flashlight with the character
- Delegates environment loading to `EnvironmentBuilder`
- Exposes `addObject()` / `removeObject()` for adding players and objects to the scene

**Imports:** `EnvironmentBuilder` from `environment.js`  
**Used by:** `GameLogic` (creates it, calls `updateSpotlightPosition` every frame, adds/removes player models)

---

### `src/scene/environment.js`
**Purpose:** Loads the 3D ship model into the scene.  
**What it does:**
- Uses `FBXLoader` to load `/ship.fbx`
- Applies a texture (`/DefaultMaterial_Base_Color.png`) to all meshes
- Scales and positions the ship, enables shadows
- Fires a callback when loading is complete (so `GameLogic` can collect meshes for collision raycasting)

**Imports:** `FBXLoader` from `../loaders/fbxLoader.js`  
**Used by:** `Scene3D` (called during `setupEnvironment()`)

---

## Data Flow Summary

### Startup
1. `main.js` → creates `GameLogic` → calls `init()`
2. `GameLogic.init()` → creates renderer (`renderer.js`), scene (`Scene3D`), `Character`, `FPSCamera`
3. `EventManager.setup()` → registers all keyboard, mouse, pointer lock, and window events
4. `Scene3D` → uses `EnvironmentBuilder` → loads ship via `FBXLoader`
5. `GameLogic` connects WebSocket → sends `join` → starts game loop (`gameLoop.js`)

### Per-Frame Update (game loop in `gameLoop.js`)
1. `Character.update()` — reads `InputState.getKeys()`, applies physics, delegates collision to `characterCollision.js`
2. `FPSCamera.update()` — positions camera behind character
3. `Scene3D.updateSpotlightPosition()` — aims flashlight with character
4. Local `CharacterAnimation.update()` — syncs 3D model position/rotation, ticks animations
5. Remote `CharacterAnimation` animation managers are ticked
6. Position sent to server (throttled to ~15/sec, only if changed)
7. `renderer.render()` — draws the frame

### Network Messages
1. Server → `ws.onmessage` → `MessageHandler.handleMessage(game, message)`
2. `welcomeMessage` → stores IDs, creates local `CharacterAnimation`
3. `gameState` → `GameStateManager.updateGameState()` → creates/updates/removes remote `CharacterAnimation` instances

---

## Dependency Graph (imports only)

```
main.js
  └─► core/gameLogic.js
        ├─► core/renderer.js
        ├─► core/gameLoop.js
        ├─► events/eventManager.js
        ├─► input/inputState.js
        ├─► scene/scene3d.js
        │     └─► scene/environment.js
        │           └─► loaders/fbxLoader.js
        ├─► player/character.js
        │     └─► player/characterCollision.js
        ├─► camera/fpsCamera.js
        └─► networking/messageHandler.js
              ├─► player/characterAnimation.js
              │     ├─► player/animation/playerAnimationLoader.js
              │     │     ├─► loaders/fbxLoader.js
              │     │     ├─► player/animation/animationManager.js
              │     │     └─► player/animation/playerColorUtils.js
              │     ├─► player/playerNameLabel.js
              │     └─► player/playerSpotlight.js
              ├─► networking/gameStateManager.js
              │     └─► player/characterAnimation.js (same as above)
              └─► player/animation/playerColorUtils.js (for color generation)
```
