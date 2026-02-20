import * as THREE from 'three';
import { EnvironmentBuilder } from './environment.js';
import { ControlPanel } from './controlPanel.js';

export class Scene3D {
  constructor(onSceneReady) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 0, 150);
    this.onSceneReady = onSceneReady;
    this.spotlight = null;
    this._shipLoaded = false;
    this._cpanelLoaded = false;
    this.setupLighting();
    this.setupEnvironment();
  }

  _checkAllLoaded() {
    if (this._shipLoaded && this._cpanelLoaded && this.onSceneReady) {
      this.onSceneReady();
    }
  }

  setupLighting() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    this.scene.add(ambientLight);

    // Handheld flashlight spotlight - narrow, focused beam
    this.spotlight = new THREE.SpotLight(0xffffff, 10, 200, Math.PI / 3, 0.3, 0.1);
    this.spotlight.position.set(0, 10, 0);
    this.spotlight.castShadow = true;
    this.spotlight.shadow.mapSize.width = 1024;
    this.spotlight.shadow.mapSize.height = 1024;  
    this.scene.add(this.spotlight);
    this.scene.add(this.spotlight.target);
  }
  
  updateSpotlightPosition(characterPos, characterYaw) {
    if (this.spotlight) {
      // Position flashlight centered in hand ahead of character
      this.spotlight.position.set(
        characterPos.x - Math.sin(characterYaw) * -1, // Position in front of character
        characterPos.y + 10,                          // Height above character
        characterPos.z - Math.cos(characterYaw) * -1  // Position in front of character
      );
      
      // Point target ahead of character, angled slightly downward
      const downwardAngle = Math.PI / 12; // 15 degrees down
      const targetDistance = 50;
      const targetYaw = characterYaw + 3 * Math.PI / 3; // Rotate 120 degrees from front
      const horizontalDistance = targetDistance * Math.cos(downwardAngle);
      this.spotlight.target.position.set(
        characterPos.x - Math.sin(targetYaw) * horizontalDistance,
        characterPos.y - targetDistance * Math.sin(downwardAngle),
        characterPos.z - Math.cos(targetYaw) * horizontalDistance
      );
    }
  }

  setupEnvironment() {
    EnvironmentBuilder.loadShip(this.scene, () => {
      this._shipLoaded = true;
      this._checkAllLoaded();
    });
    ControlPanel.loadCPanel(this.scene, () => {
      this._cpanelLoaded = true;
      this._checkAllLoaded();
    });
  }

  getScene() {
    return this.scene;
  }

  addObject(object) {
    this.scene.add(object);
  }

  removeObject(object) {
    this.scene.remove(object);
  }
}
