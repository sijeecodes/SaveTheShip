import * as THREE from 'three';
import { FBXLoader } from '../../loaders/fbxLoader.js';
import { AnimationManager } from './animationManager.js';
import { generateRandomColor, applyPlayerColor } from './playerColorUtils.js';

export class PlayerAnimationLoader {
  static generateRandomColor = generateRandomColor;

  static loadAnimations(player) {
    this.loadIdleAnimation(player);
  }

  static loadIdleAnimation(player) {
    const loader = new FBXLoader();

    loader.load('/Idle.fbx', (model) => {
      try {
        player.fbxModel = model;
        model.position.y = 0;
        model.scale.set(0.1, 0.1, 0.1);

        applyPlayerColor(model, player.color);
        player.group.add(model);

        player.animationManager = new AnimationManager(model);
        player.animationManager.addAnimation('Idle', model.animations[0]);
        player.idleAnimationName = 'Idle';
        player.fbxLoaded = true;
        player.playAnimation(player.idleAnimationName);

        this.loadRunAnimation(player);
      } catch (error) {
        console.warn('FBX model error:', error);
      }
    }, undefined, (error) => {
      console.warn('FBX idle loading failed:', error);
    });
  }

  static loadRunAnimation(player) {
    const loader = new FBXLoader();

    loader.load('/Run.fbx', (model) => {
      try {
        const runClip = model.animations[1];
        if (!player.animationManager) return;

        if (runClip?.tracks.length > 0) {
          const boneNames = new Set();
          runClip.tracks.forEach(track => {
            const name = track.name.split('.')[0];
            if (name) boneNames.add(name);
          });

          const rootBoneName =
            ['Armature', 'Root', 'root', 'CTRL_root']
              .find(n => boneNames.has(n)) || Array.from(boneNames)[0];

          const filteredTracks = runClip.tracks.filter(track => {
            const bone = track.name.split('.')[0];
            const prop = track.name.split('.')[1];
            return !(bone === rootBoneName && prop === 'position');
          });

          const fixedClip = new THREE.AnimationClip(
            runClip.name, runClip.duration, filteredTracks
          );
          player.animationManager.addAnimation('Run', fixedClip);
        } else {
          player.animationManager.addAnimation('Run', runClip);
        }
        player.runAnimationName = 'Run';

        this.loadFixAnimation(player);
      } catch (error) {
        console.warn('FBX model error:', error);
      }
    }, undefined, (error) => {
      console.warn('FBX run loading failed:', error);
    });
  }

  static loadFixAnimation(player) {
    const loader = new FBXLoader();

    loader.load('/Fix.fbx', (model) => {
      try {
        const fixClip = model.animations[0];
        if (!player.animationManager) return;
        if (fixClip) {
          player.animationManager.addAnimation('Fix', fixClip);
          player.fixAnimationName = 'Fix';
        }
      } catch (error) {
        console.warn('FBX Fix animation error:', error);
      }
    }, undefined, (error) => {
      console.warn('FBX fix loading failed:', error);
    });
  }
}
