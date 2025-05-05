import * as THREE from 'three';

const PARTICLE_COUNT = 100;
const PARTICLE_SIZE = 0.08;
const SPREAD_RADIUS = 15; // How far particles spread horizontally/vertically
const DEPTH_SPREAD = 10; // How far particles spread in depth
const DRIFT_SPEED = 0.2; // How fast particles move

export class MenuEffects {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.particlePositions = null;
        this.particleVelocities = [];
        this.isActive = false; // Start inactive

        this._createParticles();
    }

    _createParticles() {
        const geometry = new THREE.BufferGeometry();
        this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            // Initial random position within the spread volume
            this.particlePositions[i3] = (Math.random() - 0.5) * SPREAD_RADIUS * 2;
            this.particlePositions[i3 + 1] = (Math.random() - 0.5) * SPREAD_RADIUS * 2; // Vertical spread
            this.particlePositions[i3 + 2] = (Math.random() - 0.5) * DEPTH_SPREAD * 2 - (DEPTH_SPREAD); // Spread in front/behind camera a bit

            // Simple upward drift velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1, // Slight horizontal drift
                 Math.random() * DRIFT_SPEED + DRIFT_SPEED * 0.5, // Mostly upward drift
                (Math.random() - 0.5) * 0.1 // Slight depth drift
            );
            this.particleVelocities.push(velocity);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xaaccff, // Light mystical blue
            size: PARTICLE_SIZE,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false, // Don't obscure things behind them unnecessarily
            sizeAttenuation: true,
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.visible = false; // Initially hidden
        this.scene.add(this.particles);
    }

    activate() {
        if (this.particles) {
            this.particles.visible = true;
            this.isActive = true;
        }
    }

    deactivate() {
        if (this.particles) {
            this.particles.visible = false;
            this.isActive = false;
        }
    }

    update(deltaTime, cameraPosition) {
         if (!this.isActive || !this.particles) return;

         // Center the particle system around the camera roughly
        this.particles.position.copy(cameraPosition).add(new THREE.Vector3(0, 0, -DEPTH_SPREAD));


        const positions = this.particles.geometry.attributes.position.array;
        const halfSpread = SPREAD_RADIUS; // Use radius for boundary check

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const velocity = this.particleVelocities[i];

            positions[i3] += velocity.x * deltaTime;
            positions[i3 + 1] += velocity.y * deltaTime;
            positions[i3 + 2] += velocity.z * deltaTime;

            // Simple wrapping behavior (teleport to bottom if too high)
            if (positions[i3 + 1] > halfSpread) {
                positions[i3 + 1] = -halfSpread; // Wrap to bottom
                 // Randomize horizontal position slightly on wrap
                positions[i3] = (Math.random() - 0.5) * SPREAD_RADIUS * 2;
                positions[i3 + 2] = (Math.random() - 0.5) * DEPTH_SPREAD * 2 - DEPTH_SPREAD / 2;
            }
            // Could add wrapping for X and Z too if needed
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
         if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
            this.particleVelocities = [];
            this.particlePositions = null;
        }
    }
}