import * as THREE from 'three';
import { Scene3D } from '../scene/scene3d.js';
import { Character } from '../player/character.js';
import { FPSCamera } from '../camera/fpsCamera.js';
import { InputState } from '../input/inputState.js';
import { EventManager } from '../events/eventManager.js';
import { MessageHandler } from '../networking/messageHandler.js';
import { createRenderer } from './renderer.js';
import { startGameLoop } from './gameLoop.js';

export class GameLogic {
  constructor() {
    this.playerId = null;
    this.gameId = null;
    this.playerName = `Player_${Math.random().toString(36).substring(2, 7)}`;
    this.players = new Map();
    this.otherPlayers = new Map();
    this.controlPanels = new Map();

    this.renderer = null;
    this.camera = null;
    this.scene3d = null;
    this.character = null;
    this.fpsCamera = null;
    this.inputState = new InputState();

    this.ws = null;
    this.wsUrl = this.getWebSocketUrl();
    this.clock = new THREE.Clock();
    this.animationId = null;

    // Throttle network sends (~15 updates/sec)
    this.lastNetworkSend = 0;
    this.networkSendInterval = 1000 / 15;
    this.lastSentPosition = new THREE.Vector3();
    this.lastSentRotationY = 0;
  }

  init() {
    this.renderer = createRenderer();
    this.setupScene();
    EventManager.setup(this);
    this.connect();
  }

  setupScene() {
    this.scene3d = new Scene3D(() => {
      const shipMeshes = [];
      this.scene3d.getScene().traverse((node) => {
        if (node.isMesh) shipMeshes.push(node);
      });
      this.character.setShipMeshes(shipMeshes);
    });

    this.camera = new THREE.PerspectiveCamera(
      75,
      (window.innerWidth - 320) / (window.innerHeight - 100),
      0.1,
      1000
    );

    this.character = new Character(this.inputState);
    this.fpsCamera = new FPSCamera(this.camera, this.character);
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:8080`;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.updateStatus('Connected', true);
        this.ws.send(JSON.stringify({ type: 'join', name: this.playerName }));
        startGameLoop(this);
      };

      this.ws.onmessage = (event) => {
        try {
          MessageHandler.handleMessage(this, JSON.parse(event.data));
        } catch (error) {
          console.error('Message parse error:', error);
        }
      };

      this.ws.onerror = () => this.updateStatus('Error', false);

      this.ws.onclose = () => {
        this.updateStatus('Disconnected', false);
        setTimeout(() => this.connect(), 3000);
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.updateStatus('Connection Failed', false);
    }
  }

  updateStatus(message, isConnected) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = isConnected ? '#0f0' : '#f00';
    }
  }
}
