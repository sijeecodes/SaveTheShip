import * as THREE from 'three';

const CHARACTER_HEIGHT = 2;
const GROUND_CHECK_DISTANCE = 5;

export class Character {
  constructor(cameraControls) {
    this.controls = cameraControls;
    
    this.position = new THREE.Vector3(0 + Math.random() * 30 - 15, 20, -225 + Math.random() * 30 - 15);
    this.rotation = new THREE.Euler(0, 0, 0);
    
    this.velocity = new THREE.Vector3();
    this.speed = 0.2;
    this.jumpForce = 1;
    this.gravity = 0.03;
    this.onGround = true;
    
    this.yaw = 0; // Camera rotation around character
    
    // Raycasting for ground collision
    this.raycaster = new THREE.Raycaster();
    this.shipMeshes = [];
  }
  
  setShipMeshes(meshes) {
    this.shipMeshes = meshes;
  }

  update() {
    const keys = this.controls.getKeys();
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const movement = new THREE.Vector3();
    
    // Handle movement input
    if (keys['w'] || keys['arrowup']) movement.add(forward.clone().multiplyScalar(-1));
    if (keys['s'] || keys['arrowdown']) movement.add(forward.clone());
    if (keys['d'] || keys['arrowright']) this.yaw -= 0.05;
    if (keys['a'] || keys['arrowleft']) this.yaw += 0.05;

    if (movement.length() > 0) {
      movement.normalize();
      this.velocity.add(movement.multiplyScalar(this.speed));
    }

    // Apply friction
    this.velocity.x *= 0.85;
    this.velocity.z *= 0.85;
    this.velocity.y -= this.gravity;

    // Handle jumping
    if ((keys[' '] || keys['space']) && this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }

    // Update position
    this.position.add(this.velocity);
    
    // Stick character to surface using raycasting
    this.stickCharacterToSurface();

    // Update character rotation
    this.rotation.y = this.yaw;
  }

  getPosition() {
    return this.position.clone();
  }

  getYaw() {
    return this.yaw;
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
  }
  
  stickCharacterToSurface() {
    // Cast ray downward from character position
    this.raycaster.set(this.position, new THREE.Vector3(0, -1, 0));
    const intersects = this.raycaster.intersectObjects(this.shipMeshes, true);

    if (intersects.length > 0) {
      const surfacePoint = intersects[0].point;
      const distanceToSurface = this.position.y - surfacePoint.y;
      
      // Only snap to ground if falling (negative velocity) and close to surface
      if (this.velocity.y <= 0 && distanceToSurface < GROUND_CHECK_DISTANCE) {
        const surfaceY = surfacePoint.y + CHARACTER_HEIGHT / 2;
        this.position.y = surfaceY;
        this.velocity.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }
  }
}
