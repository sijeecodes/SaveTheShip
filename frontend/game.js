class GameClient {
  constructor() {
    // Canvas setup
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Game state
    this.playerId = null;
    this.gameId = null;
    this.playerName = `Player_${Math.random().toString(36).substr(2, 5)}`;
    this.players = new Map();
    this.gameWidth = 800;
    this.gameHeight = 800;
    this.playerSize = 20;
    
    // Input handling
    this.keys = {};
    this.velocity = { x: 0, y: 0 };
    this.speed = 5;
    
    // WebSocket
    this.ws = null;
    this.wsUrl = this.getWebSocketUrl();
    
    // Animation
    this.animationId = null;
    
    this.init();
  }
  
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Always connect to port 8080 (where WebSocket server runs)
    return `${protocol}//${window.location.hostname}:8080`;
  }
  
  init() {
    this.setupEventListeners();
    this.connect();
  }
  
  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      
      // Prevent default scrolling for arrow keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Can be used for mouse-based movement
    });
  }
  
  connect() {
    try {
      console.log('Attempting to connect to:', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to server');
        this.updateStatus('Connected', true);
        
        // Send join message
        this.ws.send(JSON.stringify({
          type: 'join',
          name: this.playerName
        }));
        
        // Start game loop
        this.startGameLoop();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Message parse error:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStatus('Error', false);
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from server');
        this.updateStatus('Disconnected', false);
        this.cancelAnimationFrame();
        
        // Attempt reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.updateStatus('Connection Failed', false);
    }
  }
  
  handleMessage(message) {
    if (message.type === 'welcomeMessage') {
      this.playerId = message.playerId;
      this.gameId = message.gameId;
      
      document.getElementById('gameId').textContent = this.gameId;
      document.getElementById('playerId').textContent = this.playerId.substr(0, 8);
      document.getElementById('instructions').textContent = 'Use Arrow Keys or WASD to move';
    }
    
    if (message.type === 'gameState') {
      this.updateGameState(message);
    }
  }
  
  updateGameState(state) {
    this.players.clear();
    
    state.players.forEach(playerData => {
      this.players.set(playerData.id, playerData);
    });
    
    this.updatePlayersList();
    document.getElementById('playerCount').textContent = state.players.length;
  }
  
  updatePlayersList() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    this.players.forEach((player) => {
      const li = document.createElement('li');
      li.className = 'player-item';
      
      const colorDiv = document.createElement('div');
      colorDiv.className = 'player-color';
      colorDiv.style.backgroundColor = player.color;
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = player.name;
      
      li.appendChild(colorDiv);
      li.appendChild(nameSpan);
      playersList.appendChild(li);
    });
  }
  
  startGameLoop() {
    const gameLoop = () => {
      this.update();
      this.render();
      
      this.animationId = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
  }
  
  update() {
    if (!this.playerId) return;
    
    // Handle input
    let moved = false;
    this.velocity.x = 0;
    this.velocity.y = 0;
    
    if (this.keys['arrowup'] || this.keys['w']) {
      this.velocity.y = -this.speed;
      moved = true;
    }
    if (this.keys['arrowdown'] || this.keys['s']) {
      this.velocity.y = this.speed;
      moved = true;
    }
    if (this.keys['arrowleft'] || this.keys['a']) {
      this.velocity.x = -this.speed;
      moved = true;
    }
    if (this.keys['arrowright'] || this.keys['d']) {
      this.velocity.x = this.speed;
      moved = true;
    }
    
    // Get current player
    const currentPlayer = this.players.get(this.playerId);
    if (currentPlayer && moved) {
      const newX = currentPlayer.x + this.velocity.x;
      const newY = currentPlayer.y + this.velocity.y;
      
      // Send movement to server
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'move',
          x: newX,
          y: newY
        }));
      }
    }
  }
  
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid
    this.drawGrid();
    
    // Draw players
    this.players.forEach((player) => {
      this.drawPlayer(player);
    });
    
    // Draw current player highlight
    const currentPlayer = this.players.get(this.playerId);
    if (currentPlayer) {
      this.drawPlayerHighlight(currentPlayer);
    }
  }
  
  drawGrid() {
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let i = 0; i <= this.canvas.width; i += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }
  }
  
  drawPlayer(player) {
    const x = player.x + this.playerSize / 2;
    const y = player.y + this.playerSize / 2;
    
    // Draw circle
    this.ctx.fillStyle = player.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.playerSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw player name
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(player.name, x, y - this.playerSize / 2 - 5);
  }
  
  drawPlayerHighlight(player) {
    const x = player.x + this.playerSize / 2;
    const y = player.y + this.playerSize / 2;
    
    // Draw highlight circle
    this.ctx.strokeStyle = '#667eea';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.playerSize / 2 + 3, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  updateStatus(text, connected) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = text;
    
    if (connected) {
      statusEl.classList.add('connected');
      statusEl.classList.remove('disconnected');
    } else {
      statusEl.classList.add('disconnected');
      statusEl.classList.remove('connected');
    }
  }
  
  cancelAnimationFrame() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new GameClient();
});
