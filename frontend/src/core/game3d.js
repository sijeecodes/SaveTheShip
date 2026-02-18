import * as THREE from 'three';
import { Scene3D } from '../scene/scene3d.js';
import { Character } from '../player/character.js';
import { CameraControls } from '../camera/cameraControls.js';
import { FPSCamera } from '../camera/fpsCamera.js';
import { MessageHandler } from '../networking/messageHandler.js';

export class Game3D {
  constructor() {
    this.playerId = null;
    this.gameId = null;
    this.playerName = `Player_${Math.random().toString(36).substr(2, 5)}`;
    this.players = new Map();
    this.otherPlayers = new Map();

    this.renderer = null;
    this.camera = null;
    this.scene3d = null;
    this.character = null;
    this.cameraControls = null;
    this.fpsCamera = null;

    this.ws = null;
    this.wsUrl = this.getWebSocketUrl();

    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.fps = 0;
    this.lastFPSUpdate = performance.now();

    this.animationId = null;

    // Throttle network sends (~15 updates/sec instead of every frame)
    this.lastNetworkSend = 0;
    this.networkSendInterval = 1000 / 15;
    this.lastSentPosition = new THREE.Vector3();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupEventListeners();
    this.connect();
  }

  setupRenderer() {
    const container = document.getElementById('gameContainer');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth - 320, window.innerHeight - 100);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupScene() {
    this.scene3d = new Scene3D(() => {
      // Callback when ship is loaded - now collect meshes for raycasting
      const shipMeshes = [];
      this.scene3d.getScene().traverse((node) => {
        if (node.isMesh) {
          shipMeshes.push(node);
        }
      });
      this.character.setShipMeshes(shipMeshes);
      console.log('Ship loaded, meshes set for raycasting:', shipMeshes.length);
    });

    this.camera = new THREE.PerspectiveCamera(
      75,
      (window.innerWidth - 320) / (window.innerHeight - 100),
      0.1,
      1000
    );

    this.cameraControls = new CameraControls(this.renderer.domElement);
    this.character = new Character(this.cameraControls);
    this.fpsCamera = new FPSCamera(this.camera, this.character, this.renderer.domElement);
  }

  setupEventListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clock.getElapsedTime();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'i' || e.key === 'I') {
        const localPlayer = this.players.get(this.playerId);
        if (localPlayer && localPlayer._model) {
          localPlayer._model.playAnimation('Idle');
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        const localPlayer = this.players.get(this.playerId);
        if (localPlayer && localPlayer._model) {
          localPlayer._model.playAnimation('Run');
        }
      }
    });
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:8080`;
  }

  connect() {
    try {
      console.log('Attempting to connect to:', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to server');
        this.updateStatus('Connected', true);

        this.ws.send(JSON.stringify({
          type: 'join',
          name: this.playerName
        }));

        this.startGameLoop();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          MessageHandler.handleMessage(this, message);
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
        setTimeout(() => this.connect(), 3000);
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.updateStatus('Connection Failed', false);
    }
  }

  startGameLoop() {
    const gameLoop = () => {
      this.animationId = requestAnimationFrame(gameLoop);
      this.update();
      this.render();
    };

    gameLoop();
  }

  update() {
    if (!this.playerId || !this.character || !this.fpsCamera) return;

    const deltaTime = this.clock.getDelta();

    // Update character first (movement based on input)
    this.character.update();

    // Then position camera relative to character
    this.fpsCamera.update();
    
    // Update spotlight to follow character
    const characterPos = this.character.getPosition();
    const characterYaw = this.character.getYaw();
    this.scene3d.updateSpotlightPosition(characterPos, characterYaw);

    const localPlayer = this.players.get(this.playerId);
    if (localPlayer && localPlayer._model) {
      localPlayer._model.update(characterPos.x, characterPos.y, characterPos.z, deltaTime, characterYaw);
    }

    for (const [id, player3d] of this.otherPlayers.entries()) {
      if (player3d && player3d.animationManager) {
        player3d.animationManager.update(deltaTime);
      }
    }

    // Throttle network sends and only send when position changed
    const now = performance.now();
    const currentPlayer = this.players.get(this.playerId);
    if (currentPlayer && this.ws && this.ws.readyState === WebSocket.OPEN
        && now - this.lastNetworkSend >= this.networkSendInterval
        && this.lastSentPosition.distanceToSquared(characterPos) > 0.001) {
      this.lastNetworkSend = now;
      this.lastSentPosition.copy(characterPos);
      this.ws.send(JSON.stringify({
        type: 'move',
        x: characterPos.x,
        y: characterPos.y,
        z: characterPos.z
      }));
    }
  }

  render() {
    this.renderer.render(this.scene3d.getScene(), this.camera);
  }

  onWindowResize() {
    const width = window.innerWidth - 320;
    const height = window.innerHeight - 100;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  updateStatus(message, isConnected) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = isConnected ? '#0f0' : '#f00';
    }
  }
}
