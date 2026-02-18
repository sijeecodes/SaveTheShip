import * as THREE from 'three';

export class FPSCamera {
  constructor(camera, character, domElement) {
    this.camera = camera;
    this.character = character;
    this.domElement = domElement;
    
    this.pitch = 0; // Camera look up/down
    this.mouseSensitivity = 0.003;
    this.isPointerLocked = false;
    
    this.setupMouseLock();
    this.setupMouseMove();
    
    this.updateCamera();
  }

  setupMouseLock() {
    document.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });
  }

  setupMouseMove() {
    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.character.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
      }
    });
  }

  update() {
    this.updateCamera();
  }

  updateCamera() {
    const cameraDistance = 7;
    const cameraHeight = 20;
    
    const characterPos = this.character.getPosition();
    const characterYaw = this.character.getYaw();
    
    const cameraOffset = new THREE.Vector3(
      -Math.sin(characterYaw) * cameraDistance,
      cameraHeight,
      -Math.cos(characterYaw) * cameraDistance
    );
    
    const cameraTarget = characterPos.clone().add(cameraOffset);
    this.camera.position.copy(cameraTarget);
    
    const lookAtTarget = characterPos.clone();
    lookAtTarget.y += 15;
    this.camera.lookAt(lookAtTarget);
  }

  getPosition() {
    return this.character.getPosition().clone();
  }

  getYaw() {
    return this.character.getYaw();
  }

  getDirection() {
    const yaw = this.character.getYaw();
    return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  }
}
