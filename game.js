import * as THREE from 'three';
import { setupScene } from 'sceneSetup';
import { Player } from 'player';
import { InputHandler } from 'inputHandler';
import { Environment } from 'environment';
import { UIManager } from 'UIManager';
import { MenuEffects } from 'MenuEffects'; // Import MenuEffects
const FOG_COLOR = 0x6e7f9e; // A mystical blue-grey fog
const FOG_NEAR = 10;
const FOG_FAR = 40;
// Enum for game states
const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED' // Added for potential future use
};
export class Game {
    constructor(renderDiv) {
        this.renderDiv = renderDiv;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        this.player = null;
        this.inputHandler = null;
        this.environment = null;
        this.uiManager = null;
        this.menuEffects = null; // Add property for menu effects
        this.gameState = GameState.MENU; // Start in menu state
        this._setupRenderer();
        this._setupUI(); // Setup UI before renderer appends canvas
        this._setupScene();
        this._setupMenuEffects(); // Setup menu effects after scene
        this._setupPlayer();
        this._setupInput();
        // this._setupPointerLock(); // REMOVED Pointer lock setup
        this._setupMenuControls(); // Add menu button listeners
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    _setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color output
        this.renderDiv.appendChild(this.renderer.domElement);
    }
     _setupUI() {
        this.uiManager = new UIManager(this.renderDiv);
        // Initially show menu, hide game UI
        this.uiManager.showMainMenu();
        this.uiManager.hideGameUI();
        if (this.menuEffects) {
            this.menuEffects.activate(); // Activate effects when UI shows menu
        }
     }
    _setupScene() {
        this.scene.background = new THREE.Color(FOG_COLOR);
        this.scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
        setupScene(this.scene);
        this.environment = new Environment(this.scene);
    }
    _setupMenuEffects() {
        this.menuEffects = new MenuEffects(this.scene);
    }
    _setupPlayer() {
        this.player = new Player(this.scene, this.camera); // Player now handles its own initial positioning async
        // No need to set position here anymore
    }
    _setupInput() {
        this.inputHandler = new InputHandler(); // REMOVED passing canvas
    }
     _setupMenuControls() {
         const startButton = document.getElementById('menu-start-game');
         if (startButton) {
             startButton.addEventListener('click', () => {
                 this.startGamePlay();
            });
         }
         // Add listeners for Settings/Exit later if needed
         const settingsButton = document.getElementById('menu-settings');
         if (settingsButton) {
             settingsButton.addEventListener('click', () => {
                 console.log("Settings clicked (implement functionality)");
                 // Example: this.uiManager.showSettingsMenu();
             });
         }
         const exitButton = document.getElementById('menu-exit');
          if (exitButton) {
             exitButton.addEventListener('click', () => {
                 console.log("Exit clicked (Note: Cannot close browser tab programmatically)");
                // In a real application (like Electron), you might use: window.close();
            });
         }
    }
    // _setupPointerLock() { ... } // REMOVED entire function
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
    }
    startGamePlay() {
        this.gameState = GameState.PLAYING;
        this.uiManager.hideMainMenu();
        this.uiManager.showGameUI();
        if (this.menuEffects) {
            this.menuEffects.deactivate(); // Deactivate effects when game starts
        }
        // Optional: Reset player position/state if needed
        // this.player.resetState();
    }
    start() {
        this.renderer.setAnimationLoop(this.animate.bind(this));
    }
    animate() {
        const deltaTime = this.clock.getDelta();
        // Only update game elements if playing
if (this.gameState === GameState.PLAYING) {
    if (this.player && this.inputHandler && this.environment) {
        // Pass the keys object and mouse delta directly
        this.player.update(deltaTime, this.inputHandler.keys, this.inputHandler, this.environment);
    }
    if (this.environment) {
                 this.environment.update(deltaTime, this.player.mesh.position);
            }
             // Update UI based on player stats only when playing
            if (this.player && this.uiManager) {
                 this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
                 this.uiManager.updateMana(this.player.mana, this.player.maxMana);
                 // Update hotbar later if needed
            }
         } else if (this.gameState === GameState.MENU) {
            // Update menu effects when in the menu state
            if (this.menuEffects) {
                // Pass camera position so effects can follow roughly
                this.menuEffects.update(deltaTime, this.camera.position);
            }
         }
        this.renderer.render(this.scene, this.camera);
    }
}