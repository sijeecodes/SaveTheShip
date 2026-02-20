import { CharacterAnimation } from '../player/characterAnimation.js';
import { GameStateManager } from './gameStateManager.js';
import { generateRandomColor } from '../player/animation/playerColorUtils.js';
import { ControlPanel } from '../scene/controlPanel.js';

export class MessageHandler {
  static handleMessage(game, message) {
    if (message.type === 'welcomeMessage') {
      this.handleWelcomeMessage(game, message);
    }

    if (message.type === 'gameState') {
      GameStateManager.updateGameState(game, message);
    }

    if (message.type === 'panelsNeedFix') {
      this.handlePanelsNeedFix(game, message);
    }

    if (message.type === 'playerFixing') {
      this.handlePlayerFixing(game, message);
    }

    if (message.type === 'panelFixed') {
      this.handlePanelFixed(game, message);
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
      const randomColor = generateRandomColor();
      const localPlayer = new CharacterAnimation(game.playerId, game.playerName, true, randomColor);
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

  static handlePanelsNeedFix(game, message) {
    const panelIds = message.panelIds; // Array of panel IDs that need fixing
    ControlPanel.setNeedFix(panelIds);
    console.log('⚠ Panels need fix:', panelIds);
  }

  static handlePlayerFixing(game, message) {
    // Another player started fixing — play Fix animation on their character
    const character = game.otherPlayers.get(message.playerId);
    if (character) {
      character.isFixing = true;
      character.playAnimation('Fix');
      setTimeout(() => {
        character.isFixing = false;
        character.playAnimation('Idle');
      }, 5000);
    }
  }

  static handlePanelFixed(game, message) {
    ControlPanel.fixPanel(message.panelId);
    console.log(`✓ Panel ${message.panelId} has been fixed!`);
  }
}
