/**
 * Game loop: update logic, network throttling, and rendering.
 */
export function startGameLoop(game) {
  const loop = () => {
    game.animationId = requestAnimationFrame(loop);
    updateGame(game);
    render(game);
  };
  loop();
}

function updateGame(game) {
  if (!game.playerId || !game.character || !game.fpsCamera) return;

  const deltaTime = game.clock.getDelta();

  // Movement → camera → spotlight
  game.character.update();
  game.fpsCamera.update();

  const characterPos = game.character.getPosition();
  const characterYaw = game.character.getYaw();
  game.scene3d.updateSpotlightPosition(characterPos, characterYaw);

  // Update local player model
  const localPlayer = game.players.get(game.playerId);
  if (localPlayer?._model) {
    localPlayer._model.update(
      characterPos.x, characterPos.y, characterPos.z,
      deltaTime, characterYaw
    );
  }

  // Update remote player animations
  for (const [, character] of game.otherPlayers.entries()) {
    if (character?.animationManager) {
      character.animationManager.update(deltaTime);
    }
  }

  sendNetworkUpdate(game, characterPos, characterYaw);
}

function sendNetworkUpdate(game, pos, yaw) {
  const now = performance.now();
  const posChanged = game.lastSentPosition.distanceToSquared(pos) > 0.001;
  const rotChanged = Math.abs(yaw - game.lastSentRotationY) > 0.01;

  if (
    game.ws?.readyState === WebSocket.OPEN &&
    now - game.lastNetworkSend >= game.networkSendInterval &&
    (posChanged || rotChanged)
  ) {
    game.lastNetworkSend = now;
    game.lastSentPosition.copy(pos);
    game.lastSentRotationY = yaw;
    game.ws.send(JSON.stringify({
      type: 'move',
      x: pos.x, y: pos.y, z: pos.z,
      rotationY: yaw
    }));
  }
}

function render(game) {
  game.renderer.render(game.scene3d.getScene(), game.camera);
}
