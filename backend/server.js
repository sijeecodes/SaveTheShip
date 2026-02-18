const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Game state
const games = new Map();
const players = new Map();

const GAME_WIDTH = 1400;
const GAME_HEIGHT = 800;
const PLAYER_SIZE = 20;
const MAX_PLAYERS_PER_GAME = 5;
const MIN_PLAYERS_PER_GAME = 2;

// Generate unique IDs
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Generate random color from palette
function generateRandomColor() {
  const colors = [0x000000, 0x8B00FF, 0xFF0000, 0x00FF00, 0xFFFF00, 0x0000FF, 0xFFFFFF, 0xFFA500];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Create or join a game
function findOrCreateGame(playerId, playerName) {
  // Try to find an existing game with space
  for (let [gameId, game] of games.entries()) {
    if (game.players.size < MAX_PLAYERS_PER_GAME && game.state === 'waiting') {
      return gameId;
    }
  }
  
  // Create new game
  const gameId = generateId();
  const game = {
    id: gameId,
    players: new Map(),
    state: 'waiting',
    createdAt: Date.now()
  };
  
  games.set(gameId, game);
  return gameId;
}

// Broadcast to all players in a game
function broadcastToGame(gameId, message) {
  const game = games.get(gameId);
  if (!game) return;
  
  const data = JSON.stringify(message);
  game.players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

// Get game state for broadcasting
function getGameState(gameId) {
  const game = games.get(gameId);
  if (!game) return null;
  
  const playersList = Array.from(game.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    z: p.z,
    rotationY: p.rotationY,
    color: p.color
  }));
  
  return {
    type: 'gameState',
    gameId,
    players: playersList,
    gameWidth: GAME_WIDTH,
    gameHeight: GAME_HEIGHT,
    playerSize: PLAYER_SIZE
  };
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  let playerId = null;
  let gameId = null;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Player joins game
      if (message.type === 'join') {
        playerId = generateId();
        const playerName = message.name || `Player_${playerId.substr(0, 5)}`;
        
        gameId = findOrCreateGame(playerId, playerName);
        const game = games.get(gameId);
        
        const color = generateRandomColor();
        
        const player = {
          id: playerId,
          name: playerName,
          ws: ws,
          x: 0,
          y: 10,
          z: -225,
          rotationY: 0,
          color: color,
          joinedAt: Date.now()
        };

        
        game.players.set(playerId, player);
        players.set(playerId, { gameId, ws });
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: 'welcomeMessage',
          playerId,
          gameId,
          playerName,
          color
        }));
        
        // Update all players in game
        broadcastToGame(gameId, getGameState(gameId));
      }
      
      // Player moved
      if (message.type === 'move' && playerId && gameId) {
        const game = games.get(gameId);
        if (!game) return;
        
        const player = game.players.get(playerId);
        if (!player) return;
        
        // Update position and rotation
        player.x = message.x;
        player.y = message.y;
        player.z = message.z;
        if (message.rotationY !== undefined) {
          player.rotationY = message.rotationY;
        }
        
        // Broadcast updated game state
        broadcastToGame(gameId, getGameState(gameId));
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  });
  
  ws.on('close', () => {
    if (playerId && gameId) {
      const game = games.get(gameId);
      if (game) {
        game.players.delete(playerId);
        
        // Remove empty games
        if (game.players.size === 0) {
          games.delete(gameId);
        } else {
          // Notify remaining players
          broadcastToGame(gameId, getGameState(gameId));
        }
      }
      
      players.delete(playerId);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
