import * as THREE from 'three';
// Removed SimpleParticleSystem import
const GROUND_SIZE = 50;
const NUM_TREES = 30;
export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.ground = null;
        this.trees = new THREE.Group();
        this._createGround();
        this._scatterTrees();
        this.scene.add(this.trees);
    }
    _createGround() {
        const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 10, 10);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x558855, // Lush green
            roughness: 0.9,
            metalness: 0.0,
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Lay flat
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    _scatterTrees() {
        const trunkHeight = 2;
        const trunkRadius = 0.2;
        const leavesHeight = 3;
        const leavesRadius = 1;

        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }); // Brown

        const leavesGeometry = new THREE.ConeGeometry(leavesRadius, leavesHeight, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 }); // Forest green

        for (let i = 0; i < NUM_TREES; i++) {
            const tree = new THREE.Group();

            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            trunk.castShadow = true;

            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = trunkHeight + leavesHeight / 2;
            leaves.castShadow = true;

            tree.add(trunk);
            tree.add(leaves);

            // Random position within the ground area, avoiding the center spawn
            let validPosition = false;
            while (!validPosition) {
                tree.position.x = (Math.random() - 0.5) * (GROUND_SIZE * 0.9);
                tree.position.z = (Math.random() - 0.5) * (GROUND_SIZE * 0.9);
                if (tree.position.length() > 5) { // Keep away from player start (0,0)
                    validPosition = true;
                }
            }

            tree.position.y = this.getGroundHeight(tree.position.x, tree.position.z); // Place on ground
            tree.scale.setScalar(Math.random() * 0.5 + 0.75); // Random size variation

            this.trees.add(tree);
        }
    }
    // _scatterCrystals() { ... } // Removed entire function
    getGroundHeight(x, z) {
        // For a flat plane, height is always 0
        // Later, could use raycasting or heightmap data
        return 0;
    }
     update(deltaTime, playerPosition) {
         // No updates needed currently for the static environment
     }
}