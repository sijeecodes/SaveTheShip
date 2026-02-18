import * as THREE from 'three';
import { FBXLoader } from '../loaders/fbxLoader.js';
import { AnimationManager } from '../animation/animationManager.js';

export class PlayerAnimationLoader {
    static generateRandomColor() {
        const colors = [0x000000, 0x8B00FF, 0xFF0000, 0x00FF00, 0xFFFF00, 0x0000FF, 0xFFFFFF, 0xFFA500];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static colorMeshByName(model, meshPattern, color) {
        model.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                if (meshPattern.some(pattern => name.includes(pattern.toLowerCase()))) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat.color) mat.color.setHex(color);
                        });
                    } else {
                        if (child.material.color) child.material.color.setHex(color);
                    }
                }
            }
        });
    }

    static applyColorScheme(model, colorMap) {
        for (const [meshPatterns, color] of Object.entries(colorMap)) {
            const patterns = meshPatterns.split(',').map(p => p.trim());
            this.colorMeshByName(model, patterns, color);
        }
    }

    static loadAnimations(player) {
        this.loadIdleAnimation(player);
    }

    static applyPlayerColor(model, color) {
        model.traverse((child) => {
            if (child.isMesh && child.material && child.skeleton) {
                // Color by bone influence - target torso/upper body for shirt
                this.colorByBoneInfluence(child, ['spine', 'shoulder'], color);
            }
        });
    }
    
    static colorByBoneInfluence(mesh, bonePatterns, color) {
        const geometry = mesh.geometry;
        const skeleton = mesh.skeleton;
        
        if (!skeleton || !skeleton.bones || !geometry.attributes.skinIndex) {
            console.warn('Model missing skeleton or skin indices');
            return;
        }

        // Find bone indices matching patterns
        const boneIndices = new Set();
        skeleton.bones.forEach((bone, idx) => {
            const boneName = bone.name.toLowerCase();
            if (bonePatterns.some(pattern => 
                boneName.includes(pattern.toLowerCase())
            )) {
                boneIndices.add(idx);
            }
        });

        // Initialize vertex colors
        if (!geometry.attributes.color) {
            const colors = new Float32Array(geometry.attributes.position.count * 3);
            colors.fill(1); // Default white
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }

        const vertexColors = geometry.attributes.color.array;
        const skinIndex = geometry.attributes.skinIndex.array;
        const skinWeight = geometry.attributes.skinWeight.array;

        // Convert color to RGB
        const colorObj = new THREE.Color(color);
        const r = colorObj.r;
        const g = colorObj.g;
        const b = colorObj.b;

        // Paint vertices influenced by target bones
        for (let i = 0; i < skinIndex.length; i += 4) {
            const indices = [skinIndex[i], skinIndex[i+1], skinIndex[i+2], skinIndex[i+3]];
            const weights = [skinWeight[i], skinWeight[i+1], skinWeight[i+2], skinWeight[i+3]];
            
            let influence = 0;
            for (let j = 0; j < 4; j++) {
                if (boneIndices.has(indices[j])) {
                    influence += weights[j];
                }
            }

            if (influence > 0.1) {
                const vertexIdx = Math.floor(i / 4);
                const colorIdx = vertexIdx * 3;
                
                // Blend color based on bone influence
                vertexColors[colorIdx] = r * influence + vertexColors[colorIdx] * (1 - influence);
                vertexColors[colorIdx + 1] = g * influence + vertexColors[colorIdx + 1] * (1 - influence);
                vertexColors[colorIdx + 2] = b * influence + vertexColors[colorIdx + 2] * (1 - influence);
            }
        }

        geometry.attributes.color.needsUpdate = true;
        
        // Enable vertex coloring on material
        mesh.material.vertexColors = true;
        mesh.material.needsUpdate = true;
    }

    static loadIdleAnimation(player) {
        const loader = new FBXLoader();

        loader.load('/Idle.fbx', (model) => {
            try {
                player.fbxModel = model;
                model.position.y = 0;
                model.scale.set(0.1, 0.1, 0.1);

                this.applyPlayerColor(model, player.color);
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
            console.warn('FBX file loading failed:', error);
        });
    }

    static loadRunAnimation(player) {
        const loader = new FBXLoader();

        loader.load('/Run.fbx', (model) => {
            try {
                const runClip = model.animations[1];

                if (!player.animationManager) return;

                if (runClip && runClip.tracks.length > 0) {
                    const boneNames = new Set();
                    runClip.tracks.forEach(track => {
                        const boneName = track.name.split('.')[0];
                        if (boneName) boneNames.add(boneName);
                    });

                    let rootBoneName = null;
                    for (const name of boneNames) {
                        if (name === 'Armature' || name === 'Root' || name === 'root' || name === 'CTRL_root') {
                            rootBoneName = name;
                            break;
                        }
                    }

                    if (!rootBoneName) {
                        rootBoneName = Array.from(boneNames)[0];
                    }

                    const filteredTracks = runClip.tracks.filter(track => {
                        const boneName = track.name.split('.')[0];
                        const propertyName = track.name.split('.')[1];

                        if (boneName === rootBoneName && propertyName === 'position') {
                            return false;
                        }
                        return true;
                    });

                    const fixedClip = new THREE.AnimationClip(runClip.name, runClip.duration, filteredTracks);
                    player.animationManager.addAnimation('Run', fixedClip);
                } else {
                    player.animationManager.addAnimation('Run', runClip);
                }
                player.runAnimationName = 'Run';
            } catch (error) {
                console.warn('FBX model error:', error);
            }
        }, undefined, (error) => {
            console.warn('FBX file loading failed:', error);
        });
    }
}
