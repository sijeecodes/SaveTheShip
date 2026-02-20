import * as THREE from 'three';
import { checkCollisionMultiRay, stickToSurface } from './characterCollision.js';

export class Character {
  constructor(inputState) {
    this.inputState = inputState;

    this.position = new THREE.Vector3(
      Math.random() * 30 - 15,
      20,
      -225 + Math.random() * 30 - 15
    );
    this.rotation = new THREE.Euler(0, 0, 0);
    this.velocity = new THREE.Vector3();

    this.speed = 0.2;
    this.jumpForce = 1;
    this.gravity = 0.03;
    this.onGround = true;
    this.yaw = 0;

    this.isFixing = false;

    this.shipMeshes = [];

    // Reusable vectors
    this._forward = new THREE.Vector3();
    this._movement = new THREE.Vector3();
    this._horizontalVel = new THREE.Vector3();
    this._returnPos = new THREE.Vector3();
  }

  setShipMeshes(meshes) {
    this.shipMeshes = meshes;
  }

  update() {
    if (this.isFixing) return;

    const keys = this.inputState.getKeys();
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._movement.set(0, 0, 0);

    if (keys['w'] || keys['arrowup']) this._movement.add(this._forward.clone().multiplyScalar(-1));
    if (keys['s'] || keys['arrowdown']) this._movement.add(this._forward);
    if (keys['d'] || keys['arrowright']) this.yaw -= 0.05;
    if (keys['a'] || keys['arrowleft']) this.yaw += 0.05;
    if (keys['1']) console.log('Position:', this.position);

    if (this._movement.length() > 0) {
      this._movement.normalize();
      this.velocity.add(this._movement.multiplyScalar(this.speed));
    }

    // Friction and gravity
    this.velocity.x *= 0.85;
    this.velocity.z *= 0.85;
    this.velocity.y -= this.gravity;

    // Jumping
    if ((keys[' '] || keys['space']) && this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }

    // Horizontal collision check
    this._horizontalVel.set(this.velocity.x, 0, this.velocity.z);
    if (this._horizontalVel.length() > 0) {
      const direction = this._horizontalVel.normalize();
      if (checkCollisionMultiRay(this.position, direction, this.shipMeshes)) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    this.position.add(this.velocity);
    this.onGround = stickToSurface(this.position, this.velocity, this.shipMeshes);
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
}

