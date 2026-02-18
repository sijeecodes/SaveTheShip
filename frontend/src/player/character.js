import * as THREE from 'three';

const CHARACTER_HEIGHT = 2;
const GROUND_CHECK_DISTANCE = 5;
const RAY_OFFSETS = [
  new THREE.Vector3(0, 1, 5), // center
  new THREE.Vector3(4, 1, 4), // center-forward-right
  new THREE.Vector3(-4, 1, 4), // center-forward-left
  new THREE.Vector3(4, 1, 0), // center-right
  new THREE.Vector3(-4, 1, 0), // center-left
  new THREE.Vector3(4, 1, -4), // center-back-right
  new THREE.Vector3(-4, 1, -4), // center-back-left
  new THREE.Vector3(0, 1, -3), // center-back

  // new THREE.Vector3(0, 1, 7),  // forward
  // new THREE.Vector3(7, 1, 0),  // right
  // new THREE.Vector3(6, 1, 6),  // right-forward
  // new THREE.Vector3(6, 1, -6),  // right-back
  // new THREE.Vector3(-7, 1, 0), // left
  // new THREE.Vector3(-6, 1, 6), // left-forward
  // new THREE.Vector3(-6, 1, -6), // left-back
  // new THREE.Vector3(0, 1, -5), // back
];
const CHARACTER_CENTER = new THREE.Vector3(0, 1, 0);

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

    // Raycasting for collision
    this.raycaster = new THREE.Raycaster();
    this.shipMeshes = [];

    // Reusable vectors to avoid per-frame allocations
    this._forward = new THREE.Vector3();
    this._movement = new THREE.Vector3();
    this._horizontalVel = new THREE.Vector3();
    this._rayOrigin = new THREE.Vector3();
    this._downDir = new THREE.Vector3(0, -1, 0);
    this._returnPos = new THREE.Vector3();
  }

  setShipMeshes(meshes) {
    this.shipMeshes = meshes;
  }

  checkCollisionMultiRay(direction) {
    for (const offset of RAY_OFFSETS) {
      this._rayOrigin.copy(this.position).add(offset);
      this.raycaster.set(this._rayOrigin, direction);
      const hits = this.raycaster.intersectObjects(this.shipMeshes, true);
      if (hits.length > 0 && hits[0].distance < 1) return hits[0];
    }
    return null;
  }

  update() {
    const keys = this.controls.getKeys();
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._movement.set(0, 0, 0);

    // Handle movement input
    if (keys['w'] || keys['arrowup']) this._movement.add(this._forward.clone().multiplyScalar(-1));
    if (keys['s'] || keys['arrowdown']) this._movement.add(this._forward);
    if (keys['d'] || keys['arrowright']) this.yaw -= 0.05;
    if (keys['a'] || keys['arrowleft']) this.yaw += 0.05;

    if (this._movement.length() > 0) {
      this._movement.normalize();
      this.velocity.add(this._movement.multiplyScalar(this.speed));
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

    // Check for horizontal collisions before moving
    this._horizontalVel.set(this.velocity.x, 0, this.velocity.z);
    if (this._horizontalVel.length() > 0) {
      const direction = this._horizontalVel.normalize();
      const collision = this.checkCollisionMultiRay(direction);
      if (collision) {
        // Stop movement in that direction
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    // Update position
    this.position.add(this.velocity);

    // Stick character to surface using raycasting
    this.stickCharacterToSurface();

    // Update character rotation
    this.rotation.y = this.yaw;
  }

  getPosition() {
    return this._returnPos.copy(this.position);
  }

  getYaw() {
    return this.yaw;
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
  }

  stickCharacterToSurface() {
    // Cast ray downward from character position
    this.raycaster.set(this.position, this._downDir);
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
