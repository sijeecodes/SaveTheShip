import * as THREE from 'three';
import { PlayerAnimationLoader } from './playerAnimationLoader.js';
import { PlayerNameLabel } from './playerNameLabel.js';

export class Player3D {
  constructor(id, name, isLocalPlayer = false, color = 0xff0000) {
    this.id = id;
    this.name = name;
    this.isLocalPlayer = isLocalPlayer;
    this.color = color;

    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.lastPosition = new THREE.Vector3(0, 0, 0);
    this.isMoving = false;
    this.movementThreshold = 0.05;

    this.animationManager = null;
    this.currentAnimation = 'Idle';
    this.idleAnimationName = 'Idle';
    this.runAnimationName = 'Run';

    this.group = new THREE.Group();
    this.fbxModel = null;
    this.fbxLoaded = false;

    if (!isLocalPlayer) {
      PlayerNameLabel.createNameLabel(name, this.group);
    }

    PlayerAnimationLoader.loadAnimations(this);
  }

  setPosition(x, y, z) {
    this.lastPosition.copy(this.position);
    this.position.set(x, y, z);
    this.group.position.copy(this.position);
    
    const delta = this.lastPosition.distanceTo(this.position);
    const wasMoving = this.isMoving;
    this.isMoving = delta > this.movementThreshold;

    if (this.fbxLoaded && this.animationManager && this.isMoving !== wasMoving) {
      const targetAnimationName = this.isMoving ? this.runAnimationName : this.idleAnimationName;
      this.playAnimation(targetAnimationName);
    }
  }

  setRotation(x, y, z) {
    this.rotation.set(x, y, z);
    this.group.rotation.copy(this.rotation);
  }

  playAnimation(name) {
    if (!this.fbxLoaded || !this.animationManager) {
      return;
    }

    this.currentAnimation = name;

    if (this.animationManager.animations.has(name)) {
      this.animationManager.playAnimationWithBlend(name, 0.3);
    } else {
      console.warn(`Animation "${name}" not found`);
    }
  }

  update(x, y, z, deltaTime = 0.016, yaw = 0) {
    this.setPosition(x, y, z);
    this.setRotation(0, yaw, 0);

    if (this.animationManager) {
      this.animationManager.update(deltaTime);
    }
  }

  getGroup() {
    return this.group;
  }

  getPosition() {
    return this.position.clone();
  }

  dispose() {
    if (this.animationManager) {
      this.animationManager.dispose();
    }
  }
}
