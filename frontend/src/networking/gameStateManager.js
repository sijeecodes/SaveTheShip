import { CharacterAnimation } from '../player/characterAnimation.js';

let lastListUpdate = 0;
const LIST_UPDATE_INTERVAL = 500; // Update DOM list at most every 500ms

export class GameStateManager {
  static updateGameState(game, state) {
    const playerIds = new Set();

    state.players.forEach(playerData => {
      playerIds.add(playerData.id);

      if (playerData.id === game.playerId) {
        const existingPlayer = game.players.get(playerData.id);
        if (existingPlayer) {
          existingPlayer.x = playerData.x;
          existingPlayer.y = playerData.y;
          existingPlayer.color = playerData.color;
          
          // Sync Character position with server's initial position
          if (game.character && game.character.getPosition().length() < 0.1) {
            game.character.setPosition(playerData.x, playerData.y, playerData.z);
            console.log(`Synced local player position: (${playerData.x.toFixed(1)}, ${playerData.y.toFixed(1)}, ${playerData.z.toFixed(1)})`);
          }
        }
      } else {
        if (!game.players.has(playerData.id)) {
          game.players.set(playerData.id, playerData);
        } else {
          Object.assign(game.players.get(playerData.id), playerData);
        }

        if (!game.otherPlayers.has(playerData.id)) {
          const character = new CharacterAnimation(playerData.id, playerData.name, false, playerData.color || 0xff0000);
          game.otherPlayers.set(playerData.id, character);
          game.scene3d.addObject(character.getGroup());
          // Add remote player's spotlight and target to scene
          if (character.spotlight) {
            game.scene3d.addObject(character.spotlight);
            game.scene3d.addObject(character.spotlightTarget);
          }
          console.log(`Other player created: ${playerData.name} (${playerData.id})`);
        }

        const character = game.otherPlayers.get(playerData.id);
        // Use x and z from server (3D coordinates), not x and y
        character.update(playerData.x, playerData.y, playerData.z, 0.016, playerData.rotationY || 0);
      }
    });

    for (const [id, character] of game.otherPlayers.entries()) {
      if (!playerIds.has(id)) {
        game.scene3d.removeObject(character.getGroup());
        character.dispose();
        game.otherPlayers.delete(id);
      }
    }

    const now = performance.now();
    if (now - lastListUpdate > LIST_UPDATE_INTERVAL) {
      lastListUpdate = now;
      this.updatePlayersList(game);
    }
    document.getElementById('playerCount').textContent = state.players.length;
  }

  static updatePlayersList(game) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';

    game.players.forEach((player) => {
      const li = document.createElement('li');
      li.className = 'player-item';

      const colorDiv = document.createElement('div');
      colorDiv.className = 'player-color';
      colorDiv.style.backgroundColor = typeof player.color === 'string' ? player.color : `#${player.color.toString(16)}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = player.name;

      li.appendChild(colorDiv);
      li.appendChild(nameSpan);
      playersList.appendChild(li);
    });
  }
}
