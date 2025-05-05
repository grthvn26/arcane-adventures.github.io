import * as THREE from 'three';

export function setupScene(scene) {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xadc4ff, 0.6); // Soft bluish ambient light
    scene.add(ambientLight);

    // Directional Light (Sun)
    const directionalLight = new THREE.DirectionalLight(0xffeeb1, 1.5); // Warm sunlight
    directionalLight.position.set(15, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    // directionalLight.shadow.bias = -0.001; // Adjust if shadow acne occurs
    scene.add(directionalLight);
    scene.add(directionalLight.target); // Target defaults to (0,0,0)

    // Optional: Light Helper (for debugging)
    // const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(helper);
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowHelper);
}