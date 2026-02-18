import * as THREE from 'three';
import { EnvironmentBuilder } from './environment.js';

export class Scene3D {
  constructor(onShipLoaded) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 0, 150);
    this.onShipLoaded = onShipLoaded;
    
    this.spotlight = null;
    
    this.setupLighting();
    this.setupEnvironment();
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
      const forwardDistance = -1;
      const heightOffset = 10;
      
      const forwardX = characterPos.x - Math.sin(characterYaw) * forwardDistance;
      const forwardZ = characterPos.z - Math.cos(characterYaw) * forwardDistance;
      
      this.spotlight.position.set(forwardX, characterPos.y + heightOffset, forwardZ);
      
      // Point target 120 degrees from character front, rotated down towards ground
      const angleOffset = 3*Math.PI / 3; // 120 degrees
      const targetYaw = characterYaw + angleOffset;
      const targetDistance = 50; // Distance to target point
      const downwardAngle = Math.PI / 12; // 15 degrees down
      const horizontalDistance = targetDistance * Math.cos(downwardAngle);
      const verticalDrop = targetDistance * Math.sin(downwardAngle);
      const targetX = characterPos.x - Math.sin(targetYaw) * horizontalDistance;
      const targetZ = characterPos.z - Math.cos(targetYaw) * horizontalDistance;
      this.spotlight.target.position.set(targetX, characterPos.y - verticalDrop, targetZ);
    }
  }

  setupEnvironment() {
    EnvironmentBuilder.loadShip(this.scene, () => {
      if (this.onShipLoaded) {
        this.onShipLoaded();
      }
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
