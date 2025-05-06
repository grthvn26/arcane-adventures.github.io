import * as THREE from 'three';
import { setupScene } from 'sceneSetup';
import { Player } from 'player';
import { InputHandler } from 'inputHandler';
import { Environment } from 'environment';
import { UIManager } from 'UIManager';
import { MenuEffects } from 'MenuEffects';
// Postprocessing imports
import { EffectComposer, RenderPass } from 'postprocessing'; // Simplified imports
// Fog is removed - Constants no longer needed
// const FOG_COLOR = 0x6e7f9e;
// const FOG_NEAR = 10;
// const FOG_FAR = 40;
const BACKGROUND_MUSIC_URL = 'https://play.rosebud.ai/assets/Clement Panchout_ Village_ 2002.mp3?McdG';
// Placeholder URLs - Replace with actual sound asset URLs
const JUMP_SOUND_URL = 'https://play.rosebud.ai/assets/zapsplat_multimedia_game_sound_classic_jump_002_40395.mp3'; // Replace with actual URL
const ATTACK_SOUND_URL = 'https://play.rosebud.ai/assets/zapsplat_warfare_sword_swing_fast_whoosh_blade_001_110489.mp3'; // Replace with actual URL
// Enum for game states
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
        this.composer = null; // Added for post-processing
        // References to specific effects and passes removed
        this.player = null;
        this.inputHandler = null;
        this.environment = null;
        this.uiManager = null;
        this.menuEffects = null;
        this.gameState = GameState.MENU; // Start in menu state
        this.audioListener = null; // For 3D audio
        this.backgroundMusic = null; // To hold the loaded background music
        this.jumpSound = null; // To hold jump sound effect
        this.attackSound = null; // To hold attack sound effect
        this.audioLoader = new THREE.AudioLoader(); // Reusable loader
        this.isAudioContextResumed = false; // Track if user interaction resumed context
        this.isMusicLoaded = false; // Track music loading status
        this.areSoundsLoaded = { jump: false, attack: false }; // Track SFX loading
        // Game settings
        this.settings = {
            cameraSensitivity: 1.0, // Default sensitivity
            // bloomEnabled and vignetteEnabled removed
        };
        this._setupRenderer();
        this._setupAudio(); // Setup audio listener and load music
        this._setupUI(); // Setup UI before renderer appends canvas
        this._setupScene();
        this._setupMenuEffects();
        this._setupPlayer(); // Player needs game instance for sounds
        this._setupInput();
        this._setupMenuControls();
        this._setupFirstInteractionAudioUnlock(); // Add listener for initial audio play
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }
    _setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color output
        this.renderDiv.appendChild(this.renderer.domElement);
        // Postprocessing Setup
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        // Bloom and Vignette effect setup removed.
        // Other effects could be added here in the future.
        // Apply initial settings (which will no longer include bloom/vignette)
        this.applyGraphicsSettings();
    }
     _setupAudio() {
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener); // Attach listener to camera
        this.backgroundMusic = new THREE.Audio(this.audioListener);
        console.log("Starting background music load...");
        this.audioLoader.load(BACKGROUND_MUSIC_URL, (buffer) => {
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(0.3); // Lower volume slightly
            this.isMusicLoaded = true;
            console.log("Background music loaded.");
            // Music will be played after first interaction via playMenuMusicIfReady()
        }, undefined, (error) => {
            console.error('Error loading background music:', error);
            this.isMusicLoaded = false; // Explicitly mark as not loaded on error
        });
         // Load Jump Sound
        console.log("Starting jump sound load...");
        this.audioLoader.load(JUMP_SOUND_URL, (buffer) => {
            this.jumpSound = new THREE.Audio(this.audioListener);
            this.jumpSound.setBuffer(buffer);
            this.jumpSound.setLoop(false);
            this.jumpSound.setVolume(0.6); // Slightly louder than music maybe
            this.areSoundsLoaded.jump = true;
            console.log("Jump sound loaded.");
        }, undefined, (error) => {
            console.error('Error loading jump sound:', error);
            this.areSoundsLoaded.jump = false;
        });
         // Load Attack Sound
        console.log("Starting attack sound load...");
        this.audioLoader.load(ATTACK_SOUND_URL, (buffer) => {
            this.attackSound = new THREE.Audio(this.audioListener);
            this.attackSound.setBuffer(buffer);
            this.attackSound.setLoop(false);
            this.attackSound.setVolume(0.5);
            this.areSoundsLoaded.attack = true;
            console.log("Attack sound loaded.");
        }, undefined, (error) => {
            console.error('Error loading attack sound:', error);
            this.areSoundsLoaded.attack = false;
        });
    }
     _setupUI() {
        this.uiManager = new UIManager(this.renderDiv);
        // Initially show menu, hide game UI
        this.uiManager.showMainMenu();
        this.uiManager.hideGameUI();
        if (this.menuEffects) {
            this.menuEffects.activate(); // Activate effects when UI shows menu
        }
        // DO NOT attempt initial music play here - wait for interaction
     }
    _setupScene() {
        // Removed fog setup
        // this.scene.background = new THREE.Color(FOG_COLOR);
        // this.scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
        this.scene.background = new THREE.Color(0x6e7f9e); // Keep background color for now
        setupScene(this.scene);
        this.environment = new Environment(this.scene);
    }
    _setupMenuEffects() {
        this.menuEffects = new MenuEffects(this.scene);
    }
    _setupPlayer() {
        // Pass 'this' (the game instance) to the Player so it can call playSoundEffect
        this.player = new Player(this, this.scene, this.camera);
        // Player handles its own initial positioning async
        // No need to set position here anymore
    }
    _setupInput() {
        this.inputHandler = new InputHandler(); // REMOVED passing canvas
    }
     _setupMenuControls() {
         const startButton = document.getElementById('menu-start-game');
         if (startButton) {
             startButton.addEventListener('click', () => {
                 // No need to handle audio here, interaction listener does it.
                 this.startGamePlay();
            });
         }
         // Add listeners for Settings/Exit later if needed
         const settingsButton = document.getElementById('menu-settings');
         if (settingsButton) {
             settingsButton.addEventListener('click', () => {
                 console.log("Settings clicked (implement functionality)");
                 // Call the new method to show the settings panel
                 this.uiManager.showSettingsPanel();
             });
         }
         const exitButton = document.getElementById('menu-exit');
          if (exitButton) {
             exitButton.addEventListener('click', () => {
                 console.log("Exit button clicked. Attempting to close window...");
                 // Note: window.close() might not work depending on how the window was opened.
                 // It typically only works for windows opened by a script using window.open().
                 window.close();
                 // As a fallback for environments where window.close() is blocked:
                 this.uiManager.hideMainMenu();
                 this.uiManager.hideSettingsPanel();
                 this.renderDiv.innerHTML = '<div style="color:white; text-align:center; padding-top: 50px; font-family: Garamond, serif; font-size: 24px;">Thank you for playing! You can now close this tab.</div>';
                 this.renderer.setAnimationLoop(null); // Stop rendering loop
            });
         }
        // Add listener for the Settings Back button
        const settingsBackButton = document.getElementById('menu-settings-back');
         if (settingsBackButton) {
            settingsBackButton.addEventListener('click', () => {
                this.uiManager.hideSettingsPanel();
            });
        }
         // Add listener for the volume slider
        const volumeSlider = this.uiManager.getVolumeSlider();
        const volumeLabel = this.uiManager.getVolumeValueLabel();
        if (volumeSlider && this.backgroundMusic && volumeLabel) {
            // Initialize slider value based on current music volume
            const initialVolume = this.backgroundMusic.getVolume();
            volumeSlider.value = initialVolume;
            volumeLabel.textContent = `${Math.round(initialVolume * 100)}%`;
            volumeSlider.addEventListener('input', (e) => {
                const volume = parseFloat(e.target.value);
                this.backgroundMusic.setVolume(volume);
                 // Label update is handled within UIManager, no need to do it here again
                // volumeLabel.textContent = `${Math.round(volume * 100)}%`;
            });
        } else {
            console.warn("Could not find volume slider, background music, or volume label to attach listener.");
        }
        // --- Sensitivity Slider ---
        const sensitivitySlider = this.uiManager.getSensitivitySlider();
        const sensitivityLabel = this.uiManager.getSensitivityValueLabel();
        if (sensitivitySlider && sensitivityLabel) {
            sensitivitySlider.value = this.settings.cameraSensitivity;
            sensitivityLabel.textContent = parseFloat(this.settings.cameraSensitivity).toFixed(2);
            sensitivitySlider.addEventListener('input', (e) => {
                const sensitivity = parseFloat(e.target.value);
                this.settings.cameraSensitivity = sensitivity;
                if (this.player) { // Update player sensitivity if player exists
                    // Player class will need a method to set sensitivity
                    // this.player.setCameraSensitivity(sensitivity);
                    console.log("Player sensitivity to be set to:", sensitivity);
                }
                // Label update is handled by UIManager's own listener for the slider
            });
        }
        // Graphics toggles for Bloom and Vignette were removed as the effects are no longer part of the settings.
    }
    applyGraphicsSettings() {
        if (!this.composer) return;
        // Bloom and Vignette pass toggling removed
        // The bloomPassInstance and vignettePassInstance references were removed earlier.
        // If other effects were present, their logic would remain here.
        // Reset the composer to ensure its internal state and buffers are correctly updated,
        // especially if other passes might be dynamically enabled/disabled in the future.
        // The outer 'if (!this.composer) return;' already handles this.
        this.composer.reset();
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    _setupFirstInteractionAudioUnlock() {
        const unlockAudio = async () => {
            if (!this.isAudioContextResumed && this.audioListener) {
                console.log("First interaction detected, attempting to resume audio context...");
                try {
                    if (this.audioListener.context.state === 'suspended') {
                        await this.audioListener.context.resume();
                    }
                    this.isAudioContextResumed = true;
                    console.log("Audio context is running.");
                    this.playMenuMusicIfReady(); // Attempt to play music now that context is active
                } catch (e) {
                    console.error("Error resuming audio context:", e);
                    this.isAudioContextResumed = false; // Failed to resume
                } finally {
                     // Remove the listeners after the first interaction attempt
                     window.removeEventListener('keydown', unlockAudio);
                     window.removeEventListener('mousedown', unlockAudio);
                     window.removeEventListener('touchstart', unlockAudio);
                     console.log("Audio unlock listeners removed.");
                }
            } else if (this.isAudioContextResumed) {
                // If context was already resumed, just remove listeners
                window.removeEventListener('keydown', unlockAudio);
                window.removeEventListener('mousedown', unlockAudio);
                window.removeEventListener('touchstart', unlockAudio);
            }
        };
        window.addEventListener('keydown', unlockAudio, { once: false }); // Use once:false initially to ensure capture before removal
        window.addEventListener('mousedown', unlockAudio, { once: false });
        window.addEventListener('touchstart', unlockAudio, { once: false });
    }
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight); // Resize composer too
    }
    playMenuMusicIfReady() {
        if (this.isMusicLoaded && this.gameState === GameState.MENU && this.isAudioContextResumed && !this.backgroundMusic.isPlaying) {
            try {
                this.backgroundMusic.play();
                console.log("Playing background music.");
            } catch (e) {
                console.error("Error trying to play background music:", e);
            }
        } else {
             // Log why it didn't play for debugging
             if (!this.isMusicLoaded) console.log("Music not played: Not loaded yet.");
             if (this.gameState !== GameState.MENU) console.log("Music not played: Not in menu state.");
             if (!this.isAudioContextResumed) console.log("Music not played: Audio context not resumed.");
             if (this.backgroundMusic && this.backgroundMusic.isPlaying) console.log("Music not played: Already playing.");
        }
    }
    stopMenuMusic() {
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
            console.log("Stopped background music.");
        }
    }
    startGamePlay() {
        this.gameState = GameState.PLAYING;
        this.uiManager.hideMainMenu();
        this.uiManager.showGameUI();
        if (this.menuEffects) {
            this.menuEffects.deactivate(); // Deactivate effects when game starts
        }
        this.stopMenuMusic(); // Stop menu music when game starts
        // Optional: Reset player position/state if needed
        // this.player.resetState();
    }
    // Helper to play non-positional sound effects attached to the listener
     playSoundEffect(sound, forceResumeCheck = false) {
         if (!this.isAudioContextResumed && !forceResumeCheck) {
            console.warn("Audio context not resumed, cannot play sound effect yet.");
            return;
         }
         if (sound && sound.buffer) { // Check if sound is loaded
            // Ensure context is running (especially important if called before first interaction somehow)
            if (this.audioListener.context.state === 'suspended' && forceResumeCheck) {
                console.log("Attempting to resume context for sound effect...");
                this.audioListener.context.resume().then(() => {
                    console.log("Context resumed, playing sound.");
                    this.playLoadedSound(sound);
                }).catch(e => console.error("Failed to resume context for sound:", e));
            } else if (this.audioListener.context.state === 'running') {
                 this.playLoadedSound(sound);
            }
         } else {
             // console.warn("Sound effect not loaded or not provided."); // Can be spammy
         }
    }
    playLoadedSound(sound) {
         if (sound.isPlaying) {
            sound.stop(); // Stop previous instance if overlapping rapidly
         }
         sound.play();
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
    // Ensure player and mesh exist before updating environment based on player position
    if (this.environment && this.player && this.player.mesh) {
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
        // Use composer to render
        // this.composer.render(deltaTime); // Temporarily bypassed for diagnostics
        // Diagnostic: Render directly to see if core scene is okay
        this.renderer.render(this.scene, this.camera);
    }
}