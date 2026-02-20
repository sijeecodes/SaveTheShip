/**
 * Central event listener registry.
 * ALL addEventListener calls live here for easy tracking and cleanup.
 */
import { ControlPanel } from '../scene/controlPanel.js';

export class EventManager {
  static setup(game) {
    this.setupKeyboard(game);
    this.setupMouse(game);
    this.setupPointerLock(game);
    this.setupWindow(game);
  }

  static setupKeyboard(game) {
    const movementKeys = [
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      'w', 'a', 's', 'd', ' '
    ];

    window.addEventListener('keydown', (e) => {
      game.inputState.keys[e.key.toLowerCase()] = true;

      if (movementKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      // Animation debug keys
      if (e.key === 'i' || e.key === 'I') {
        const localPlayer = game.players.get(game.playerId);
        if (localPlayer?._model) localPlayer._model.playAnimation('Idle');
      }
      if (e.key === 'r' || e.key === 'R') {
        const localPlayer = game.players.get(game.playerId);
        if (localPlayer?._model) localPlayer._model.playAnimation('Run');
      }

      // Fix interaction: press F near a broken control panel
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        if (!game.character.isFixing) {
          const playerPos = game.character.getPosition();
          const panel = ControlPanel.getNearestFixablePanel(playerPos, 11);
          if (panel) {
            // Lock movement
            game.character.isFixing = true;

            // Face the control panel
            const panelPos = panel.model.position;
            const dx = panelPos.x - playerPos.x;
            const dz = panelPos.z - playerPos.z;
            const yawToPanel = Math.atan2(dx, dz);
            game.character.yaw = yawToPanel;
            game.character.rotation.y = yawToPanel;

            // Play Fix animation on local model
            const localPlayer = game.players.get(game.playerId);
            if (localPlayer?._model) {
              localPlayer._model.isFixing = true;
              localPlayer._model.playAnimation('Fix');
            }

            // Notify server
            if (game.ws?.readyState === WebSocket.OPEN) {
              game.ws.send(JSON.stringify({ type: 'startFix', panelId: panel.id }));
            }

            // After 5 seconds, complete the fix
            const fixingPanelId = panel.id;
            setTimeout(() => {
              game.character.isFixing = false;
              if (localPlayer?._model) {
                localPlayer._model.isFixing = false;
                localPlayer._model.playAnimation('Idle');
              }

              // Tell server the fix is complete
              if (game.ws?.readyState === WebSocket.OPEN) {
                game.ws.send(JSON.stringify({ type: 'fixComplete', panelId: fixingPanelId }));
              }
            }, 5000);
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      game.inputState.keys[e.key.toLowerCase()] = false;
    });
  }

  static setupMouse(game) {
    document.addEventListener('mousemove', (e) => {
      if (!game.inputState.isPointerLocked) return;
      if (game.character.isFixing) return;

      game.character.yaw -= e.movementX * game.fpsCamera.mouseSensitivity;
      game.fpsCamera.pitch -= e.movementY * game.fpsCamera.mouseSensitivity;
      game.fpsCamera.pitch = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, game.fpsCamera.pitch)
      );
    });
  }

  static setupPointerLock(game) {
    const domElement = game.renderer.domElement;

    document.addEventListener('click', () => {
      domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      game.inputState.isPointerLocked =
        document.pointerLockElement === domElement;
    });
  }

  static setupWindow(game) {
    window.addEventListener('resize', () => {
      const width = window.innerWidth - 320;
      const height = window.innerHeight - 100;
      game.camera.aspect = width / height;
      game.camera.updateProjectionMatrix();
      game.renderer.setSize(width, height);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) game.clock.getElapsedTime();
    });
  }
}
