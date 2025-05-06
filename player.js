import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Added
// Adjusted constants for Knight model (approximate)
const PLAYER_HEIGHT = 1.8; // Keep for camera target offset logic
const PLAYER_RADIUS = 0.4; // Keep for simple collision logic for now
const MOVEMENT_SPEED = 5.0;
const JUMP_VELOCITY = 7.0;
const GRAVITY = -18.0;
const CAMERA_DISTANCE = 6.0; // Slightly further back
const CAMERA_HEIGHT = 1.8; // Slightly lower target height
const CAMERA_LAG = 0.1;
const ROTATION_SPEED = 10.0;
// Default camera rotation speed, will be multiplied by sensitivity
const BASE_CAMERA_ROTATION_SPEED = 0.005;
const CAMERA_PITCH_MIN = -Math.PI / 3;
const CAMERA_PITCH_MAX = Math.PI / 2.5;
export class Player {
    constructor(game, scene, camera) { // Add game as the first argument
        this.game = game; // Store the game instance
        this.scene = scene;
        this.camera = camera;
        this.health = 100;
        this.maxHealth = 100;
        this.mana = 50;
        this.maxMana = 50;
        this.mesh = null; // Initialize mesh as null, will be loaded async
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.moveDirection = new THREE.Vector3();
        this.targetCameraPosition = new THREE.Vector3();
        this.currentCameraPosition = new THREE.Vector3();
        this.cameraPhi = 0;
        this.cameraTheta = Math.PI / 6;
        // Animation properties
        this.mixer = null;
        this.animations = {}; // Store actions by name
        this.currentAction = null;
        this.isJumping = false; // Track jump state for animation
        this.isAttacking = false; // Track attack state
        this.attackCooldown = 0.8; // Seconds between attacks
        this.lastAttackTime = -Infinity; // Time of the last attack start
        this._loadModel();
        this._updateCameraRotation(0, 0); // Initial rotation setup
    }
    _loadModel() {
        const loader = new GLTFLoader();
        const modelUrl = 'https://play.rosebud.ai/assets/Knight.glb?QjIz';
        loader.load(modelUrl, (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.scale.set(1.0, 1.0, 1.0); // Adjust scale if needed
            this.mesh.position.set(0, 0, 5); // Initial position, Y adjusted by collision later
            // Set shadows for all meshes in the loaded model
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = false; // Typically characters don't receive on themselves
                }
            });
            this.scene.add(this.mesh);
            // Initialize camera position *after* mesh is loaded and added
            this.currentCameraPosition.copy(this.mesh.position).add(this._calculateCameraOffset());
            this.camera.position.copy(this.currentCameraPosition);
            this.camera.lookAt(this._getCameraLookAtTarget());
             // --- Animation Setup ---
             this.mixer = new THREE.AnimationMixer(this.mesh);
             const clips = gltf.animations;
             console.log("Available animations:", clips.map(clip => clip.name)); // DEBUG LOG - List all animation names
             // Find specific clips (adjust names if needed based on the GLB file)
             const idleClip = THREE.AnimationClip.findByName(clips, 'Idle');
             const walkClip = THREE.AnimationClip.findByName(clips, 'Walk');
             const jumpClip = THREE.AnimationClip.findByName(clips, 'Jump');
             const attackClip = THREE.AnimationClip.findByName(clips, 'Attack'); // Common name for attack
            if (idleClip) {
                 this.animations['idle'] = this.mixer.clipAction(idleClip);
                 this.animations['idle'].play(); // Start in idle state
                 this.currentAction = this.animations['idle'];
                 console.log("Idle animation loaded.");
             } else {
                console.warn("Idle animation not found in model.");
             }
             if (walkClip) {
                this.animations['walk'] = this.mixer.clipAction(walkClip);
                console.log("Walk animation loaded.");
             } else {
                 console.warn("Walk animation not found in model.");
             }
             if (jumpClip) {
                 this.animations['jump'] = this.mixer.clipAction(jumpClip);
                 this.animations['jump'].setLoop(THREE.LoopOnce); // Jump animation plays once
                 this.animations['jump'].clampWhenFinished = true; // Hold the last frame when done
                 console.log("Jump animation loaded.");
             } else {
                 console.warn("Jump animation not found in model.");
             }
             if (attackClip) {
                this.animations['attack'] = this.mixer.clipAction(attackClip);
                this.animations['attack'].setLoop(THREE.LoopOnce);
                // No clampWhenFinished needed if we transition back manually
                 console.log("Attack animation loaded.");
                 // Listen for the attack animation to finish
                 this.mixer.addEventListener('finished', (e) => {
                     if (e.action === this.animations['attack']) {
                         this.isAttacking = false; // Reset attack state when animation completes
                     }
                 });
             } else {
                 console.warn("Attack animation not found in model.");
             }
             // --- End Animation Setup ---
            console.log("Knight model loaded successfully.");
        }, undefined, (error) => {
            console.error('An error happened loading the player model:', error);
            // Fallback or error handling: maybe create a simple box?
            const fallbackGeometry = new THREE.BoxGeometry(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2);
            const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            this.mesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
            this.mesh.position.set(0, PLAYER_HEIGHT / 2, 5); // Pivot at base
            this.mesh.castShadow = true;
            this.scene.add(this.mesh);
             // Initialize camera for fallback
            this.currentCameraPosition.copy(this.mesh.position).add(this._calculateCameraOffset());
            this.camera.position.copy(this.currentCameraPosition);
            this.camera.lookAt(this._getCameraLookAtTarget());
        });
    }
    // Updated signature: now receives keys directly, but keeps inputHandler for mouse/attack
    update(deltaTime, keys, inputHandler, environment) {
        // Wait until the mesh and mixer are ready
        if (!this.mesh || !this.mixer) return;
        // const keys = inputHandler.keys; // No longer needed, keys is passed directly
        this._handleInput(keys, inputHandler, deltaTime); // Pass keys and inputHandler separately
        // --- Animation State ---
        const isMoving = this.moveDirection.lengthSq() > 0.01;
        let targetActionName = 'idle'; // Default action
        // Determine base action (idle or walk) based on movement and ground state
        // --- Animation State ---
        // Note: isMoving is already declared above at line 129
        // Removed duplicate 'let' below
        targetActionName = 'idle'; // Default action
        // Prioritize Attack > Jump > Walk/Idle
        if (this.isAttacking && this.animations['attack']) {
            targetActionName = 'attack';
        } else if (!this.onGround) {
             // Player is in the air
            if (this.isJumping && this.animations['jump']) {
                 targetActionName = 'jump'; // Prioritize jump animation if currently jumping
            } else {
                 // Optional: Falling animation could go here
                 targetActionName = 'idle'; // Fallback to idle while falling
                 if(this.animations['jump']?.isRunning()){
                     targetActionName = 'jump'; // Let jump finish if running
                 }
            }
        } else {
             // Player is on the ground
            if (isMoving && this.animations['walk']) {
                targetActionName = 'walk';
            } else {
                targetActionName = 'idle';
            }
            // Reset jump flag only when grounded and not attacking
             if (this.isJumping && !this.isAttacking) {
                this.isJumping = false;
                 if(this.animations['jump']) this.animations['jump'].stop();
            }
        }
        // Switch animation if the target is different and exists
        // (This if block starting at 163 seems redundant/misplaced after the refactor. Removing it.)
        // Switch animation if the target is different from the current one
        if (this.animations[targetActionName] && this.currentAction !== this.animations[targetActionName]) {
            const nextAction = this.animations[targetActionName];
            nextAction.reset(); // Reset before playing
            nextAction.enabled = true;
            // Special handling for jump: play immediately, don't fade in if coming from ground
             // Special handling for attack: Play immediately, interrupt others
             if (targetActionName === 'attack' && this.animations['attack']) {
                 nextAction.reset().play();
                 if (this.currentAction && this.currentAction !== nextAction) {
                     this.currentAction.fadeOut(0.1); // Fade out previous quickly
                 }
            } else if (targetActionName === 'jump' && this.animations['jump']) {
                // Jump also plays immediately but allows attack to interrupt
                 nextAction.reset().play();
                 if (this.currentAction && this.currentAction !== nextAction) {
                    this.currentAction.fadeOut(0.1);
                 }
             } else if (this.currentAction) {
                 // Standard fade for idle/walk transitions
                this.currentAction.crossFadeTo(nextAction, 0.3, true);
             } else {
                 nextAction.play(); // If no current action, play directly
             }
            this.currentAction = nextAction;
        }
        // --- End Animation State ---
        // --- Player Rotation ---
        // Rotate only when moving on the ground AND not attacking
        if (isMoving && this.onGround && !this.isAttacking) {
        // Convert world-space moveDirection to camera-relative direction
        const cameraForward = new THREE.Vector3();
        this.camera.getWorldDirection(cameraForward);
        cameraForward.y = 0; // Ignore vertical component for movement rotation
        cameraForward.normalize();
        const cameraRight = new THREE.Vector3().crossVectors(this.camera.up, cameraForward).normalize();
        const moveLocal = new THREE.Vector3();
        moveLocal.addScaledVector(cameraForward, this.moveDirection.z);
        moveLocal.addScaledVector(cameraRight, this.moveDirection.x);
        moveLocal.normalize();
        const targetAngle = Math.atan2(moveLocal.x, moveLocal.z);
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
        // Interpolate player model rotation
        this.mesh.quaternion.slerp(targetQuaternion, deltaTime * ROTATION_SPEED);
    }
    this._applyMovement(deltaTime); // Apply camera-relative movement
    this._applyGravity(deltaTime);
    this._checkCollisions(environment);
    this._updateCamera(deltaTime);
     // Update animation mixer
     this.mixer.update(deltaTime);
    // Reset mouse delta after using it
    inputHandler.resetMouseDelta();
    }
    _getCameraLookAtTarget() {
        // Target roughly the center of the loaded mesh
        if (!this.mesh) return new THREE.Vector3(); // Return default if mesh not loaded
        return this.mesh.position.clone().add(new THREE.Vector3(0, PLAYER_HEIGHT * 0.7, 0)); // Adjust height offset
    }
    _updateCameraRotation(deltaX, deltaY) {
    const effectiveRotationSpeed = BASE_CAMERA_ROTATION_SPEED * (this.game.settings.cameraSensitivity || 1.0);
    this.cameraPhi -= deltaX * effectiveRotationSpeed;
    this.cameraTheta += deltaY * effectiveRotationSpeed;
    // Clamp vertical rotation (theta)
    this.cameraTheta = Math.max(CAMERA_PITCH_MIN, Math.min(CAMERA_PITCH_MAX, this.cameraTheta));
}
// Public method to update sensitivity if game settings change
// Note: Sensitivity is now read directly from game.settings in _updateCameraRotation
// So this explicit method might not be strictly needed unless there are other things to update.
// setCameraSensitivity(sensitivity) {
    // this.cameraSensitivity = sensitivity; // Store it locally if preferred
// }
_calculateCameraOffset() {
    const offset = new THREE.Vector3();
    // Calculate offset using spherical coordinates
    offset.x = CAMERA_DISTANCE * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    offset.y = CAMERA_DISTANCE * Math.sin(this.cameraTheta) + CAMERA_HEIGHT; // Add base height
    offset.z = CAMERA_DISTANCE * Math.cos(this.cameraPhi) * Math.cos(this.cameraTheta);
    return offset;
}
// Updated signature: receives keys directly
_handleInput(keys, inputHandler, deltaTime) {
    // --- Camera Rotation Input ---
    // Still need inputHandler for mouse data
    this._updateCameraRotation(inputHandler.mouseDeltaX, inputHandler.mouseDeltaY);
    // --- Movement Input ---
    // Allow movement input only if not currently attacking
    if (!this.isAttacking) {
        let forward = 0;
        let right = 0;
        // --- DETAILED LOGGING REMOVED ---
        // console.log(`Key states: w=${keys['w']}, s=${keys['s']}, a=${keys['a']}, d=${keys['d']}, space=${keys[' ']}, arrowup=${keys['arrowup']}, arrowdown=${keys['arrowdown']}, arrowleft=${keys['arrowleft']}, arrowright=${keys['arrowright']}`);
        if (keys['w'] || keys['arrowup']) { forward += 1; }
        if (keys['s'] || keys['arrowdown']) { forward -= 1; }
        if (keys['a'] || keys['arrowleft']) { right += 1; } // Swapped - to +
        if (keys['d'] || keys['arrowright']) { right -= 1; } // Swapped + to -
        this.moveDirection.set(right, 0, forward);
        // Normalize movement input vector
        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection.normalize();
        }
         // Calculate world-space velocity based on camera orientation
        const cameraForward = new THREE.Vector3();
    this.camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();
    const cameraRight = new THREE.Vector3().crossVectors(this.camera.up, cameraForward).normalize();
    // Calculate desired velocity in world space
        const desiredVelocity = new THREE.Vector3();
        desiredVelocity.addScaledVector(cameraForward, this.moveDirection.z * MOVEMENT_SPEED);
        // Corrected: Use positive moveDirection.x for cameraRight
        desiredVelocity.addScaledVector(cameraRight, this.moveDirection.x * MOVEMENT_SPEED);
        // Assign calculated velocity (keeping existing Y velocity for gravity/jump)
        // Removed redundant assignment block below
        this.velocity.x = desiredVelocity.x;
        this.velocity.z = desiredVelocity.z;
        // Jump - Allow jumping only if on ground and not attacking
        // The detailed log above already includes spacebar state.
        if (keys[' '] && this.onGround && !this.isAttacking) {
            // console.log("Space detected"); // Redundant with detailed log
            this.velocity.y = JUMP_VELOCITY;
            this.onGround = false;
            this.isJumping = true; // Set jumping flag for animation state
            // Play jump sound
             if (this.game && this.game.jumpSound) {
                this.game.playSoundEffect(this.game.jumpSound);
            }
            // Animation switch handled in update()
        }
    } else {
        // If attacking, stop horizontal movement
        this.moveDirection.set(0, 0, 0);
        this.velocity.x = 0;
        this.velocity.z = 0;
    }
    // --- Attack Input ---
    // Still need inputHandler for mouse button data
    const now = this.mixer.time; // Use mixer time for cooldown consistency
    // --- Attack Trigger Re-enabled ---
     if (inputHandler.mouseButtonDown === 0 && !this.isAttacking && (now - this.lastAttackTime) >= this.attackCooldown && this.animations['attack']) {
         this.isAttacking = true;
         this.lastAttackTime = now;
         // Stop current walk/idle/jump smoothly before attack
         if (this.currentAction && this.currentAction !== this.animations['attack']) {
             // Allow jump animation to finish naturally unless attacking
             if (this.currentAction !== this.animations['jump']) {
                this.currentAction.fadeOut(0.1);
             }
             // If jump is running, let attack override it (handled in animation state switch)
         }
         // Play attack sound
         if (this.game && this.game.attackSound) {
             this.game.playSoundEffect(this.game.attackSound);
         }
        // The actual animation switch is now reliably handled in the main update() animation state section
         console.log("Attack triggered!"); // DEBUG LOG
     }
    }
_applyMovement(deltaTime) {
    // Calculate displacement based on X and Z velocity only
    const displacement = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).multiplyScalar(deltaTime);
    this.mesh.position.add(displacement);
}
     _applyGravity(deltaTime) {
        if (!this.onGround) {
            this.velocity.y += GRAVITY * deltaTime;
        } else {
            this.velocity.y = Math.max(0, this.velocity.y); // Prevent sinking if already on ground
        }
        const verticalDisplacement = new THREE.Vector3(0, this.velocity.y * deltaTime, 0);
        this.mesh.position.add(verticalDisplacement);
    }

    _checkCollisions(environment) {
        if (!this.mesh) return; // Need mesh for collision checks
        // Simple ground collision (using mesh base)
        const groundLevel = environment.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
        if (this.mesh.position.y <= groundLevel) {
            this.mesh.position.y = groundLevel;
            this.velocity.y = 0;
            this.onGround = true;
            // Landing logic handled in the animation state section of update()
        } else {
            this.onGround = false;
        }
        // --- Tree Collision ---
        if (environment && environment.trees && environment.trees.children.length > 0) {
            const playerPos2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z);
            const collisionRadius = PLAYER_RADIUS + 0.8; // Player radius + approx tree radius
            const collisionRadiusSq = collisionRadius * collisionRadius;
            environment.trees.children.forEach(tree => {
                // Ensure tree has position data (might not be loaded instantly)
                if (!tree.position) return;
                const treePos2D = new THREE.Vector2(tree.position.x, tree.position.z);
                const distanceSq = playerPos2D.distanceToSquared(treePos2D);
                if (distanceSq < collisionRadiusSq) {
                    // Collision detected!
                    const collisionVector = playerPos2D.clone().sub(treePos2D).normalize();
                    const pushBackDistance = collisionRadius - Math.sqrt(distanceSq);
                    // Apply correction directly to mesh position
                    this.mesh.position.x += collisionVector.x * pushBackDistance;
                    this.mesh.position.z += collisionVector.y * pushBackDistance; // Vector2 y corresponds to world z
                    // Optional: Dampen velocity in the direction of the collision (simple approach)
                    // This helps prevent sticking or jittering in some cases
                    const velocityCorrection = new THREE.Vector3(collisionVector.x, 0, collisionVector.y);
                    const velocityInCollisionDir = this.velocity.dot(velocityCorrection);
                    if (velocityInCollisionDir > 0) { // Only correct if moving towards the tree
                         // Replace subScaledVector with multiplyScalar and sub
                         const correctionAmount = velocityCorrection.clone().multiplyScalar(velocityInCollisionDir * 0.5);
                         this.velocity.sub(correctionAmount); // Reduce velocity into the tree
                    }
                }
            });
        }
    }
    _updateCamera(deltaTime) {
        if (!this.mesh) return; // Need mesh for camera positioning
    // Calculate target position based on current angles and player position
    const offset = this._calculateCameraOffset();
    this.targetCameraPosition.copy(this.mesh.position).add(offset);
    // Smoothly interpolate camera position
    // Use a smaller lerp factor for faster response during rotation
    const lerpFactor = Math.min(1.0, CAMERA_LAG / deltaTime); // Adjust interpolation based on framerate
    this.currentCameraPosition.lerp(this.targetCameraPosition, lerpFactor);
    this.camera.position.copy(this.currentCameraPosition);
    // Always look towards the player's look-at target
    this.camera.lookAt(this._getCameraLookAtTarget());
    }
}