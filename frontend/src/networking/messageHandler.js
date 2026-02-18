import { Player3D } from '../player/player3d.js';
import { GameStateManager } from './gameStateManager.js';
import { PlayerAnimationLoader } from '../player/playerAnimationLoader.js';

export class MessageHandler {
  static handleMessage(game, message) {
    if (message.type === 'welcomeMessage') {
      this.handleWelcomeMessage(game, message);
    }

    if (message.type === 'gameState') {
      GameStateManager.updateGameState(game, message);
    }
  }

  static handleWelcomeMessage(game, message) {
    game.playerId = message.playerId;
    game.gameId = message.gameId;

    document.getElementById('gameId').textContent = game.gameId;
    document.getElementById('playerId').textContent = game.playerId.substr(0, 8);
    document.getElementById('instructions').textContent = 'Click to lock mouse, use WASD to move, mouse to look';

    this.createLocalPlayer(game);
  }

  static createLocalPlayer(game) {
    if (!game.players.has(game.playerId)) {
      const randomColor = PlayerAnimationLoader.generateRandomColor();
      const localPlayer = new Player3D(game.playerId, game.playerName, true, randomColor);
      game.players.set(game.playerId, {
        id: game.playerId,
        name: game.playerName,
        color: randomColor,
        x: 0,
        y: 0,
        z: 0,
        _model: localPlayer
      });
      game.scene3d.addObject(localPlayer.getGroup());
      console.log('✓ Local player created with color:', randomColor.toString(16));
    }
  }
}
