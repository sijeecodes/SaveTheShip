import { GameLogic } from './core/gameLogic.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new GameLogic();
  game.init();
});
