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

    // Spotlight for remote players so others can see their flashlight
    this.spotlight = null;
    this.spotlightTarget = null;
    if (!isLocalPlayer) {
      this.spotlight = new THREE.SpotLight(0xffffff, 10, 200, Math.PI / 3, 0.3, 0.1);
      this.spotlight.castShadow = false;
      this.spotlightTarget = new THREE.Object3D();
      this.spotlight.target = this.spotlightTarget;
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

    // Update spotlight for remote players
    if (this.spotlight) {
      const forwardDistance = -1;
      const heightOffset = 10;
      const forwardX = x - Math.sin(yaw) * forwardDistance;
      const forwardZ = z - Math.cos(yaw) * forwardDistance;
      this.spotlight.position.set(forwardX, y + heightOffset, forwardZ);

      const angleOffset = 3 * Math.PI / 3;
      const targetYaw = yaw + angleOffset;
      const targetDistance = 50;
      const downwardAngle = Math.PI / 12;
      const horizontalDistance = targetDistance * Math.cos(downwardAngle);
      const verticalDrop = targetDistance * Math.sin(downwardAngle);
      const targetX = x - Math.sin(targetYaw) * horizontalDistance;
      const targetZ = z - Math.cos(targetYaw) * horizontalDistance;
      this.spotlightTarget.position.set(targetX, y - verticalDrop, targetZ);
    }

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
    if (this.spotlight) {
      if (this.spotlight.parent) this.spotlight.parent.remove(this.spotlight);
      if (this.spotlightTarget && this.spotlightTarget.parent) this.spotlightTarget.parent.remove(this.spotlightTarget);
      this.spotlight.dispose();
      this.spotlight = null;
      this.spotlightTarget = null;
    }
    if (this.animationManager) {
      this.animationManager.dispose();
    }
  }
}
