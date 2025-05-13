import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ENEMY_MODEL_URL = 'https://play.rosebud.ai/assets/Skeleton_Warrior.glb?ymv2';
const ENEMY_SCALE = 1.0; // Adjust as needed
const ENEMY_INITIAL_POSITION = new THREE.Vector3(5, 0, 0); // Example starting position

export class Enemy {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player; // Reference to the player for AI later
        this.mesh = null;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.health = 50; // Example health
        this.maxHealth = 50;
        this.isAlive = true;
        this.originalMaterials = new Map(); // To store original materials for damage flash
        this.damageFlashColor = new THREE.Color(0xff0000); // Red flash
        this.damageFlashDuration = 0.15; // Seconds
        this.damageFlashTimer = 0;
        this.movementSpeed = 1.5; // Units per second
        this.attackRange = 2.0; // Distance to stop and attack
        this.sightRange = 20.0; // Distance to start chasing
        this.targetPosition = new THREE.Vector3(); // For AI movement
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.attackDamage = 10; // Damage dealt by enemy
        this.attackCooldown = 2.0; // Seconds between attacks
        this.lastAttackTime = -Infinity; // Time of last attack
        this.isAttacking = false; // Is enemy currently in an attack animation
        this.attackWindUpTime = 0.5; // Time from attack anim start to damage dealt (sync with animation)
        this.radius = 0.5; // Approximate radius for collision
        this._loadModel();
    }

    _loadModel() {
        const loader = new GLTFLoader();
        loader.load(ENEMY_MODEL_URL, (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.scale.set(ENEMY_SCALE, ENEMY_SCALE, ENEMY_SCALE);
            this.mesh.position.copy(ENEMY_INITIAL_POSITION);

            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true; // Enemies can receive shadows
                    if (child.material) {
                        // Store original material(s) for flashing
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat, index) => {
                                this.originalMaterials.set(`${child.uuid}_${index}`, mat.clone());
                            });
                        } else {
                            this.originalMaterials.set(child.uuid, child.material.clone());
                        }
                    }
                }
            });
            this.scene.add(this.mesh);
            console.log("Skeleton Warrior model loaded successfully.");
            // Animation Setup
            this.mixer = new THREE.AnimationMixer(this.mesh);
            const clips = gltf.animations;
            console.log("Skeleton Warrior available animations:", clips.map(clip => clip.name));

            // Example: Load common animations (adjust names based on GLB content)
            const idleClip = THREE.AnimationClip.findByName(clips, 'Idle'); // Or 'Armature|Idle' etc.
            const walkClip = THREE.AnimationClip.findByName(clips, 'Walk'); // Or 'Armature|Walk'
            const attackClip = THREE.AnimationClip.findByName(clips, '1H_Melee_Attack_Chop'); // Updated attack animation name
            if (idleClip) {
                this.animations['idle'] = this.mixer.clipAction(idleClip);
                this.animations['idle'].play();
                this.currentAction = this.animations['idle'];
                console.log("Skeleton Idle animation loaded.");
            } else {
                console.warn("Skeleton Idle animation not found.");
            }
            if (walkClip) {
                this.animations['walk'] = this.mixer.clipAction(walkClip);
                console.log("Skeleton Walk animation loaded.");
            } else {
                console.warn("Skeleton Walk animation not found.");
            }
            if (attackClip) {
                this.animations['attack'] = this.mixer.clipAction(attackClip);
                this.animations['attack'].setLoop(THREE.LoopOnce);
                this.animations['attack'].clampWhenFinished = false; // Don't clamp, let it transition
                console.log("Skeleton Attack animation loaded.");
                // Listen for attack animation finish
                this.mixer.addEventListener('finished', (e) => {
                    if (e.action === this.animations['attack']) {
                        this.isAttacking = false;
                        // No explicit transition here; update loop will handle it
                        // by re-evaluating player distance and choosing walk or idle.
                    }
                });
            } else {
                console.warn("Skeleton Attack animation not found.");
            }
             // Attempt to set initial ground position after model loads
            if (this.scene.environment) { // Assuming environment is accessible via scene
                const groundY = this.scene.environment.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
                this.mesh.position.y = groundY;
                this.onGround = true;
            }


        }, undefined, (error) => {
            console.error('Error loading enemy model:', error);
            // Optional: Create a fallback placeholder
            const fallbackGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
            const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x880000 });
            this.mesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
            this.mesh.position.copy(ENEMY_INITIAL_POSITION);
            this.mesh.castShadow = true;
            this.scene.add(this.mesh);
        });
    }

    update(deltaTime, environment) {
        if (!this.mesh || !this.isAlive || !this.mixer) return; // Added mixer check
        // Handle damage flash
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
            if (this.damageFlashTimer <= 0) {
                this._revertMaterial();
            }
        }
        this.mixer.update(deltaTime); // Moved mixer update to happen before AI logic for current frame
        let isMoving = false;
        let targetAnimation = 'idle'; // Default animation
        if (this.isAttacking) {
            // If currently in an attack animation, keep playing 'attack'.
            // The 'finished' listener will set this.isAttacking = false.
            targetAnimation = 'attack';
            this.velocity.x = 0;
            this.velocity.z = 0;
            isMoving = false; // Explicitly set isMoving to false during attack
        } else if (this.player && this.player.mesh && this.player.isAlive) {
            const playerPosition = this.player.mesh.position;
            const enemyPosition = this.mesh.position;
            const distanceToPlayer = enemyPosition.distanceTo(playerPosition);
            const now = this.mixer.time;
            if (distanceToPlayer <= this.sightRange) {
                const lookAtTarget = new THREE.Vector3(playerPosition.x, enemyPosition.y, playerPosition.z);
                this.mesh.lookAt(lookAtTarget);
                if (distanceToPlayer <= this.attackRange && (now - this.lastAttackTime) >= this.attackCooldown) {
                    this._performAttack(now); // This will set isAttacking = true and targetAnimation = 'attack'
                    targetAnimation = 'attack'; // _performAttack will trigger this via playAnimation
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                    isMoving = false;
                } else if (distanceToPlayer > this.attackRange) {
                    // Move towards player
                    const direction = new THREE.Vector3().subVectors(playerPosition, enemyPosition).normalize();
                    this.velocity.x = direction.x * this.movementSpeed;
                    this.velocity.z = direction.z * this.movementSpeed;
                    targetAnimation = 'walk';
                    isMoving = true;
                } else {
                    // In attack range, but on cooldown or just finished an attack and isAttacking is now false
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                    targetAnimation = 'idle'; // Default to idle if in range but not attacking
                    isMoving = false;
                }
            } else {
                // Player out of sight
                this.velocity.x = 0;
                this.velocity.z = 0;
                targetAnimation = 'idle';
                isMoving = false;
            }
        } else {
            // No player or player is dead
            this.velocity.x = 0;
            this.velocity.z = 0;
            targetAnimation = 'idle';
            isMoving = false;
        }
        // Play the determined animation
        this.playAnimation(targetAnimation);
        // Apply movement (if any)
        // Movement should only happen if not attacking and isMoving is true
        if (isMoving && !this.isAttacking) {
            this.mesh.position.x += this.velocity.x * deltaTime;
            this.mesh.position.z += this.velocity.z * deltaTime;
        }
        // Apply gravity
// Corrected previous GRAVITY constant name (was missing from provided snippet)
// Assuming GRAVITY is defined elsewhere, e.g., const GRAVITY = -18.0;
// This edit block is just to ensure the context for the next one is correct.
// No actual code change in this block for this step if GRAVITY is globally accessible or defined in class.
// For this specific step, we'll assume GRAVITY is implicitly available.
// The actual change is about the AI logic and animation handling.
// This is a placeholder to ensure the diff tool has a line to match.
// If GRAVITY is a class member (e.g. this.GRAVITY), no change needed here.
// If it was a local const, it might need to be this.GRAVITY or passed.
// For now, let's assume it's fine.
// ... (lines 184-189 from the previous response)
// this.velocity.y += GRAVITY * deltaTime;
// ...
// This block is primarily to adjust line numbers for the following important changes.
// The key modifications are in the AI decision-making and attack execution logic.
// No changes to gravity application itself in this step.
        const GRAVITY = -18.0; // Define GRAVITY if not already accessible
        if (!this.onGround) {
            this.velocity.y += GRAVITY * deltaTime; 
        } else {
            this.velocity.y = Math.max(0, this.velocity.y);
        }
        this.mesh.position.y += this.velocity.y * deltaTime;
        if (!this.onGround) {
            this.velocity.y += GRAVITY * deltaTime; // Simple gravity
        } else {
            this.velocity.y = Math.max(0, this.velocity.y);
        }
        this.mesh.position.y += this.velocity.y * deltaTime;
        // Ground check
        if (environment) {
            const groundLevel = environment.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
            if (this.mesh.position.y <= groundLevel) {
                this.mesh.position.y = groundLevel;
                this.velocity.y = 0;
                this.onGround = true;
            } else {
                this.onGround = false;
            }
        }
        // Player collision (after movement and ground check)
        this._handlePlayerCollision();
    }
    // Placeholder for taking damage
    takeDamage(amount) {
        this.health -= amount;
        console.log(`Enemy took ${amount} damage, health is now ${this.health}`);
        // Trigger damage flash
        this._flashMaterial();
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (!this.isAlive) return;
        this.isAlive = false;
        console.log("Enemy has died.");
        // Placeholder: Play death animation, then remove from scene or make non-interactive
        if (this.animations['death']) { // Assuming a 'death' animation exists
            this.playAnimation('death', 0.2, THREE.LoopOnce);
            // Remove after animation finishes
            // this.mixer.addEventListener('finished', (e) => {
            // if (e.action === this.animations['death']) {
            // this.scene.remove(this.mesh);
            // }
            // });
        } else {
            this.scene.remove(this.mesh); // If no death animation, remove immediately
        }
    }
    _performAttack(currentTime) {
        if (!this.isAlive || this.isAttacking || !this.animations['attack']) return;
        console.log("Enemy is attacking!");
        this.isAttacking = true;
        this.lastAttackTime = currentTime;
        this.playAnimation('attack', 0.1, THREE.LoopOnce, false); // Fast transition to attack
        // Deal damage after a delay (wind-up)
        setTimeout(() => {
            if (!this.isAlive || !this.player || !this.player.isAlive || !this.player.mesh || !this.mesh) {
                // Player might have died or enemy died during wind-up
                this.isAttacking = false; // Ensure state is reset if attack is aborted
                return;
            }
            const enemyPosition = this.mesh.position;
            const playerPosition = this.player.mesh.position;
            const distanceToPlayer = enemyPosition.distanceTo(playerPosition);
            if (distanceToPlayer <= this.attackRange * 1.2) { // Allow a little extra range for hit confirm
                const enemyForward = new THREE.Vector3();
                this.mesh.getWorldDirection(enemyForward);
                enemyForward.y = 0;
                enemyForward.normalize();
                const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, enemyPosition);
                directionToPlayer.y = 0;
                directionToPlayer.normalize();
                const angle = enemyForward.angleTo(directionToPlayer);
                // Use a wider angle for enemy attacks to make them a bit more forgiving
                if (angle <= (Math.PI / 2)) { // 90 degree cone
                    console.log(`Enemy hits player! Dealing ${this.attackDamage} damage.`);
                    this.player.takeDamage(this.attackDamage);
                } else {
                    console.log("Enemy attack missed (angle).");
                }
            } else {
                console.log("Enemy attack missed (range).");
            }
            // isAttacking will be reset by the animation 'finished' listener
        }, this.attackWindUpTime * 1000);
    }
playAnimation(name, crossFadeDuration = 0.3, loop = THREE.LoopRepeat, clampWhenFinished = false) {
    if (!this.mesh || !this.mixer) return; // Ensure mesh and mixer are ready
    let targetAction = this.animations[name];
    if (!targetAction) {
        // Attempt common fallbacks if direct name not found
        if (name.toLowerCase() === 'idle' && this.animations['Idle']) {
            targetAction = this.animations['Idle'];
        } else if (name.toLowerCase() === 'walk' && this.animations['Walk']) {
            targetAction = this.animations['Walk'];
        } else if (name.toLowerCase() === 'attack' && this.animations['1H_Melee_Attack_Chop']) {
             targetAction = this.animations['1H_Melee_Attack_Chop'];
        }
        if (!targetAction) {
            // console.warn(`Enemy animation "${name}" not found.`); // Can be noisy
            return;
        }
    }
    // If this action is already the current one and is running:
    // - For looping animations, do nothing.
    // - For LoopOnce animations (like 'attack'), also do nothing if it's already running (let it finish).
    if (this.currentAction === targetAction && targetAction.isRunning()) {
        return;
    }
    // Prepare the target action
    targetAction.enabled = true; // Make sure it's enabled before potential play/fade
    targetAction.setLoop(loop);
    targetAction.clampWhenFinished = clampWhenFinished;
    // Always reset LoopOnce animations before playing them or fading to them,
    // if they are not the current running action or if they are but finished.
    if (loop === THREE.LoopOnce) {
        targetAction.reset();
    }
    if (this.currentAction && this.currentAction !== targetAction) {
        // If there's a current action and it's different, fade to the new one
        // Stop the current action before fading to prevent issues if currentAction is also LoopOnce
        if (this.currentAction.loop === THREE.LoopOnce) {
            this.currentAction.stop(); // Stop explicitly if it was a non-looping one
        }
        this.currentAction.crossFadeTo(targetAction, crossFadeDuration, true);
        targetAction.play(); // Must play the action being faded TO
    } else {
        // No current action, or it's the same action but wasn't running (e.g., a LoopOnce that finished)
        targetAction.play();
    }
    this.currentAction = targetAction;
}
    _flashMaterial() {
        if (!this.mesh) return;
        this.damageFlashTimer = this.damageFlashDuration;
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.color) mat.emissive.copy(this.damageFlashColor); // Use emissive for flash
                    });
                } else {
                    if (child.material.color) child.material.emissive.copy(this.damageFlashColor);
                }
            }
        });
    }
    _revertMaterial() {
        if (!this.mesh) return;
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat, index) => {
                        const originalMat = this.originalMaterials.get(`${child.uuid}_${index}`);
                        if (originalMat && mat.emissive) mat.emissive.set(0x000000); // Reset emissive
                        // Note: If other properties were changed, revert them here.
                        // For simple color flash, just resetting emissive is often enough.
                        // Or, more robustly, copy all properties from originalMat.
                        // e.g., mat.copy(originalMat); but this might be too much if only color/emissive changed.
                    });
                } else {
                    const originalMat = this.originalMaterials.get(child.uuid);
                    if (originalMat && child.material.emissive) child.material.emissive.set(0x000000);
                }
            }
        });
    }
    _handlePlayerCollision() {
        if (!this.mesh || !this.player || !this.player.mesh || !this.player.isAlive) {
            return;
        }
        const enemyPosition = this.mesh.position;
        const playerPosition = this.player.mesh.position;
        // Using PLAYER_RADIUS from player.js would be better if accessible
        // For now, assuming a similar radius for player for this check.
        const playerRadius = this.player.radius || 0.4; // Use player's radius if available
        const combinedRadii = this.radius + playerRadius;
        const distanceSq = enemyPosition.distanceToSquared(playerPosition);
        if (distanceSq < combinedRadii * combinedRadii) {
            // Collision detected
            const distance = Math.sqrt(distanceSq);
            const overlap = combinedRadii - distance;
            if (distance === 0) { // Avoid division by zero if perfectly overlapped
                // Nudge enemy randomly if perfectly on top
                this.mesh.position.x += (Math.random() - 0.5) * 0.1;
                this.mesh.position.z += (Math.random() - 0.5) * 0.1;
                return;
            }
            const pushDirection = new THREE.Vector3().subVectors(enemyPosition, playerPosition).normalize();
            
            // Push enemy away from player
            this.mesh.position.addScaledVector(pushDirection, overlap);
            // Optional: Slightly reduce enemy velocity if it was moving towards player
            // This helps prevent "sticking" due to continuous movement updates.
            const movingTowardsPlayer = this.velocity.dot(pushDirection.clone().negate()) > 0;
            if (movingTowardsPlayer) {
                this.velocity.multiplyScalar(0.8); // Dampen velocity
            }
        }
    }
}