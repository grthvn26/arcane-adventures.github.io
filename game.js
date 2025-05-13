import * as THREE from 'three';
import { setupScene } from 'sceneSetup';
import { Player } from 'player';
import { InputHandler } from 'inputHandler';
import { Environment } from 'environment';
import { UIManager } from 'UIManager';
import { MenuEffects } from 'MenuEffects';
import { Enemy } from 'Enemy'; // Import the Enemy class
// Postprocessing imports
import { EffectComposer, RenderPass } from 'postprocessing'; // Simplified imports
// Fog is removed - Constants no longer needed
// const FOG_COLOR = 0x6e7f9e;
// const FOG_NEAR = 10;
// const FOG_FAR = 40;
const BACKGROUND_MUSIC_URL = 'https://play.rosebud.ai/assets/Clement Panchout_ Village_ 2002.mp3?McdG';
const GAME_PLAY_MUSIC_URL = 'https://play.rosebud.ai/assets/Clement Panchout _ LJ_Tel_DnB.wav?8HYT';
// Placeholder URLs - Replace with actual sound asset URLs
const JUMP_SOUND_URL = 'https://play.rosebud.ai/assets/zapsplat_multimedia_game_sound_classic_jump_002_40395.mp3'; // Replace with actual URL
const ATTACK_SOUND_URL = 'https://play.rosebud.ai/assets/zapsplat_warfare_sword_swing_fast_whoosh_blade_001_110489.mp3'; // Replace with actual URL
const UI_CLICK_SOUND_URL = 'https://play.rosebud.ai/assets/mixkit-select-click-1109.wav?k0k0'; // Updated with new asset
// Enum for game states
const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED', // Added for potential future use
    GAMEOVER: 'GAMEOVER' // Added for Game Over state
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
            this.gamePlayMusic = null; // To hold the loaded main game music
            this.enemies = []; // Array to hold enemy instances
            this.jumpSound = null; // To hold jump sound effect
            this.attackSound = null; // To hold attack sound effect
            this.uiClickSound = null; // To hold UI click sound effect
            this.audioLoader = new THREE.AudioLoader(); // Reusable loader
            this.isAudioContextResumed = false; // Track if user interaction resumed context
            this.isMusicLoaded = false; // Track menu music loading status
            this.isGameMusicLoaded = false; // Track game music loading status
            this.areSoundsLoaded = { jump: false, attack: false, uiClick: false }; // Track SFX loading
        this._escapePressedLastFrame = false; // For detecting single escape key press
        // Game settings
        this.settings = {
            cameraSensitivity: 1.0, // Default sensitivity
            // bloomEnabled and vignetteEnabled removed
        };
        this._setupRenderer();
        this._setupAudio(); // Setup audio listener and load music
        this._setupUI(); // Setup UI before renderer appends canvas
        this._setupScene();
        this._setupMenuEffects(); // MenuEffects are created
        this._setupPlayer(); // Player needs game instance for sounds
        this._setupInput();
        this._setupMenuControls(); // This will implicitly call _enterMenuState initially via _setupUI
        this._setupFirstInteractionAudioUnlock(); // Add listener for initial audio play
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this._enterMenuState(); // Explicitly enter menu state after all setups
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
            // Attempt to play music now that it's loaded, if other conditions are met
            this.playMenuMusicIfReady();
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
        // Load UI Click Sound
        console.log("Starting UI click sound load...");
        this.audioLoader.load(UI_CLICK_SOUND_URL, (buffer) => {
            this.uiClickSound = new THREE.Audio(this.audioListener);
            this.uiClickSound.setBuffer(buffer);
            this.uiClickSound.setLoop(false);
            this.uiClickSound.setVolume(0.7); // Click sounds are usually distinct
            this.areSoundsLoaded.uiClick = true;
            console.log("UI click sound loaded.");
        }, undefined, (error) => {
            console.error('Error loading UI click sound:', error);
            this.areSoundsLoaded.uiClick = false;
        });
        // Load Game Play Music
        console.log("Starting game play music load...");
        this.audioLoader.load(GAME_PLAY_MUSIC_URL, (buffer) => {
            this.gamePlayMusic = new THREE.Audio(this.audioListener);
            this.gamePlayMusic.setBuffer(buffer);
            this.gamePlayMusic.setLoop(true);
            this.gamePlayMusic.setVolume(0.25); // Initial volume, can be adjusted
            this.isGameMusicLoaded = true;
            console.log("Game play music loaded.");
            // We won't play it immediately, it will play when entering gameplay state
        }, undefined, (error) => {
            console.error('Error loading game play music:', error);
            this.isGameMusicLoaded = false;
        });
    }
     _setupUI() {
        this.uiManager = new UIManager(this.renderDiv);
        // Initial UI state is handled by _enterMenuState now
        // this.uiManager.showMainMenu();
        // this.uiManager.hideGameUI();
        // if (this.menuEffects) {
            // this.menuEffects.activate(); // MenuEffects activation handled by state changes
        // }
        // this.playMenuMusicIfReady(); // Music play handled by state changes
    }
    _enterMenuState() {
        this.gameState = GameState.MENU;
        this.uiManager.showMainMenu();
        this.uiManager.hideGameUI();
        this.camera.position.set(0, 10, 25); // Elevated, pulled back view
        this.camera.lookAt(0, 2, 0); // Look slightly down towards the center of the environment
        if (this.player && this.player.mesh) {
            this.player.mesh.visible = false;
        }
        this.enemies.forEach(enemy => {
            if (enemy.mesh) enemy.mesh.visible = false;
        });
        if (this.menuEffects) {
            this.menuEffects.activate(); // Activate particles for the menu
        }
        this.playMenuMusicIfReady();
        this.stopGameMusic(); // Ensure game music is stopped when entering menu
    }
    _setupScene() {
        // Removed fog setup
        // this.scene.background = new THREE.Color(FOG_COLOR);
        // this.scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
        this.scene.background = new THREE.Color(0x6e7f9e); // Keep background color for now
        setupScene(this.scene);
        this.environment = new Environment(this.scene);
        this.scene.environment = this.environment; // Make environment accessible for Enemy ground check
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
                 this.playSoundEffect(this.uiClickSound, true);
                 this.tryResumeAudioContextAndStartGame();
            });
         }
        // _setupEnemies() is called later or as part of initial setup, no change here for menu controls
         // Add listeners for Settings/Exit later if needed
         const settingsButton = document.getElementById('menu-settings');
         if (settingsButton) {
             settingsButton.addEventListener('click', () => {
                 this.playSoundEffect(this.uiClickSound, true);
                 console.log("Settings clicked (implement functionality)");
                 // Call the new method to show the settings panel
                 this.uiManager.showSettingsPanel();
             });
         }
         const exitButton = document.getElementById('menu-exit');
          if (exitButton) {
             exitButton.addEventListener('click', () => {
                 this.playSoundEffect(this.uiClickSound, true);
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
                this.playSoundEffect(this.uiClickSound, true);
                this.uiManager.hideSettingsPanel();
                // If settings were opened from the pause menu, re-show the pause menu.
                // Otherwise, it was opened from the main menu, and the main menu is already visible.
                // If settings are open from Game Over, no specific action needed here for that case.
                if (this.gameState === GameState.PAUSED) {
                    this.uiManager.showPauseMenu();
                }
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
                if (this.backgroundMusic && this.backgroundMusic.buffer) { // Check if music object and buffer exist
                    this.backgroundMusic.setVolume(volume);
                }
                if (this.gamePlayMusic && this.gamePlayMusic.buffer) { // Check if music object and buffer exist
                    this.gamePlayMusic.setVolume(volume);
                }
                // Label update is handled within UIManager
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
        // --- Pause Menu Button Listeners ---
        const pauseResumeButton = document.getElementById('menu-pause-resume');
        if (pauseResumeButton) {
            pauseResumeButton.addEventListener('click', () => {
                this.playSoundEffect(this.uiClickSound, true);
                this._resumePlayingState();
            });
        }
        const pauseSettingsButton = document.getElementById('menu-pause-settings');
        if (pauseSettingsButton) {
            pauseSettingsButton.addEventListener('click', () => {
                this.playSoundEffect(this.uiClickSound, true);
                // When opening settings from pause menu, we want to keep the pause menu "active" in the background
                // So, just show settings panel. Game state remains PAUSED.
                this.uiManager.showSettingsPanel();
                this.uiManager.hidePauseMenu(); // Hide pause menu when settings are shown from pause
            });
        }
        const pauseExitToMenuButton = document.getElementById('menu-pause-exit-menu');
        if (pauseExitToMenuButton) {
            pauseExitToMenuButton.addEventListener('click', () => {
                this.playSoundEffect(this.uiClickSound, true);
                this.uiManager.hidePauseMenu(); // Hide pause menu
                this.uiManager.hideSettingsPanel(); // Ensure settings is also hidden if it was open
                this._enterMenuState(); // Transition to main menu
                if (this.inputHandler) {
                     this.inputHandler.unlockPointer(); // Ensure pointer is unlocked when returning to menu
                }
            });
        }
        // --- Game Over Screen Button Listeners ---
        const gameOverRestartButton = document.getElementById('menu-gameover-restart');
        if (gameOverRestartButton) {
            gameOverRestartButton.addEventListener('click', () => {
                this.playSoundEffect(this.uiClickSound, true);
                this.restartGame();
            });
        }
        const gameOverExitToMenuButton = document.getElementById('menu-gameover-exit-menu');
        if (gameOverExitToMenuButton) {
            gameOverExitToMenuButton.addEventListener('click', () => {
                this.playSoundEffect(this.uiClickSound, true);
                this.uiManager.hideGameOverScreen();
                this._enterMenuState(); // Transition to main menu
                 if (this.inputHandler) {
                     this.inputHandler.unlockPointer(); // Ensure pointer is unlocked
                 }
            });
        }
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
    async _attemptResumeAudioContext() {
        if (!this.isAudioContextResumed && this.audioListener && this.audioListener.context.state === 'suspended') {
            console.log("Attempting to resume audio context...");
            try {
                await this.audioListener.context.resume();
                this.isAudioContextResumed = true;
                console.log("Audio context is running.");
                return true;
            } catch (e) {
                console.error("Error resuming audio context:", e);
                this.isAudioContextResumed = false;
                return false;
            }
        } else if (this.audioListener && this.audioListener.context.state === 'running') {
            this.isAudioContextResumed = true; // Already running
            return true;
        }
        return this.isAudioContextResumed; // Return current status
    }
    _setupFirstInteractionAudioUnlock() {
        const unlockAudioAndPlayMusic = async () => {
            const audioResumed = await this._attemptResumeAudioContext();
            if (audioResumed) {
                this.playMenuMusicIfReady();
                // Remove listeners once audio context is successfully resumed
                window.removeEventListener('keydown', unlockAudioAndPlayMusic);
                window.removeEventListener('mousedown', unlockAudioAndPlayMusic);
                window.removeEventListener('touchstart', unlockAudioAndPlayMusic);
                console.log("Audio unlock listeners removed.");
            }
        };
        // Add these listeners to attempt audio context resume on first interaction
        window.addEventListener('keydown', unlockAudioAndPlayMusic, { once: true });
        window.addEventListener('mousedown', unlockAudioAndPlayMusic, { once: true });
        window.addEventListener('touchstart', unlockAudioAndPlayMusic, { once: true });
    }
    async tryResumeAudioContextAndStartGame() {
        await this._attemptResumeAudioContext(); // Ensure context is active
        this._enterPlayingState(); // Transition to playing state
    }
    _enterPlayingState() {
        this.gameState = GameState.PLAYING;
        this.uiManager.hideMainMenu();
        this.uiManager.showGameUI();
        // Player camera logic will take over, reset if necessary
        if (this.player) {
            if (this.player.mesh) this.player.mesh.visible = true;
            this.player.resetControlsAndCamera(); // Ensure player controls are active
        }
        this.enemies.forEach(enemy => {
            if (enemy.mesh) enemy.mesh.visible = true;
        });
        if (this.menuEffects) {
            this.menuEffects.deactivate(); // Ensure menu effects are off
        }
        this.stopMenuMusic();
        this.playGameMusicIfReady(); // Play game music when entering playing state
        // Optional: Reset player position/state if needed (already partially in restartGame)
        // this.player.resetState(); 
        // Respawn/reset enemies
        this.enemies.forEach(enemy => {
            if (!enemy.isAlive) {
                // Simple respawn logic for now, can be expanded
                 if (enemy.mesh) {
                    enemy.health = enemy.maxHealth;
                    enemy.isAlive = true;
                    enemy.mesh.position.set(Math.random() * 10 - 5, 0, Math.random() * 10 - 5); // Example respawn
                    this.scene.add(enemy.mesh); // Ensure it's added back if removed
                }
            }
        });
         if (this.enemies.length === 0 && this.player) { // If no enemies, try to set them up
            this._setupEnemies();
        }
    }
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight); // Resize composer too
    }
    playMenuMusicIfReady() {
        if (this.isMusicLoaded && 
            this.gameState === GameState.MENU && 
            this.isAudioContextResumed && 
            this.backgroundMusic && // Ensure backgroundMusic object exists
            !this.backgroundMusic.isPlaying) {
            try {
                this.backgroundMusic.play();
                console.log("Playing background music for menu.");
            } catch (e) {
                console.error("Error trying to play background music for menu:", e);
            }
        } else {
             // Log why it didn't play for debugging
             if (!this.isMusicLoaded) console.log("Menu music not played: Not loaded yet.");
             if (this.gameState !== GameState.MENU) console.log("Menu music not played: Not in menu state.");
             if (!this.isAudioContextResumed) console.log("Menu music not played: Audio context not resumed.");
             if (this.backgroundMusic && this.backgroundMusic.isPlaying) console.log("Menu music not played: Already playing.");
             if (!this.backgroundMusic) console.log("Menu music not played: backgroundMusic object is null/undefined.");
        }
    }
    stopMenuMusic() {
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
            console.log("Stopped background music.");
        }
    }
    startGamePlay() { // This method is now effectively replaced by _enterPlayingState
        // Content moved to _enterPlayingState
        // Kept for now if any other part of the code accidentally calls it,
        // but should be phased out or call _enterPlayingState.
        console.warn("startGamePlay() called, should use _enterPlayingState()");
        this._enterPlayingState();
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
    _setupEnemies() {
        // For now, let's add one enemy. Player needs to be available.
        if (this.player) {
            const enemy = new Enemy(this.scene, this.player);
            this.enemies.push(enemy);
        } else {
            console.warn("Player not initialized before _setupEnemies was called.");
        }
    }
    gameOver() {
        if (this.gameState === GameState.GAMEOVER) return; // Already game over
        this.gameState = GameState.GAMEOVER;
        console.log("Game Over!");
        // Show game over UI
        if (this.uiManager) {
            this.uiManager.showGameOverScreen();
            // Hide in-game UI elements like health bar if they are separate
            this.uiManager.hideGameUI();
        }
        // Stop background music or change to a game over track if desired
        this.stopMenuMusic(); 
        this.stopGameMusic(); // Stop game music on game over
        if (this.menuEffects) {
            this.menuEffects.deactivate(); // Ensure menu effects are off
        }
        // Optionally, make enemies stop their AI update loop here
        // For now, their `update` method checks `player.isAlive` which should suffice.
    }
    restartGame() {
        console.log("Restarting game...");
        // Reset player state
        if (this.player) {
            this.player.health = this.player.maxHealth;
            this.player.mana = this.player.maxMana; // Or a starting mana
            this.player.isAlive = true;
            this.player.mesh.position.set(0, 0, 5); // Reset position
            this.player.velocity.set(0, 0, 0);
            this.player.onGround = false; // Will be re-evaluated
             if (this.player.animations['idle'] && this.player.mixer) {
                const idleAction = this.player.animations['idle'];
                if (this.player.currentAction) {
                    this.player.currentAction.crossFadeTo(idleAction, 0.1, true);
                } else {
                    idleAction.reset().play();
                }
                this.player.currentAction = idleAction;
            }
            if (this.uiManager) { // Update UI
                 this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
                 this.uiManager.updateMana(this.player.mana, this.player.maxMana);
            }
        }
        // Reset enemies
        this.enemies.forEach(enemy => {
            // Simple reset: respawn at initial position with full health
            // A more robust enemy.reset() method would be better
            enemy.health = enemy.maxHealth;
            enemy.isAlive = true;
            if (enemy.mesh) { // Ensure mesh exists
                 // Use the constant for initial position if it's stored or accessible
                 // For now, hardcoding a general area for respawn.
                 // This should ideally come from enemy's own initial config or a spawn point system.
                enemy.mesh.position.set(Math.random() * 10 - 5, 0, Math.random() * 10 - 5);
                enemy.velocity.set(0,0,0);
                enemy.onGround = false; // will be re-evaluated
                if(enemy.animations['idle'] && enemy.mixer){
                    const idleAction = enemy.animations['idle'];
                    if(enemy.currentAction) {
                        enemy.currentAction.crossFadeTo(idleAction, 0.1, true);
                    } else {
                        idleAction.reset().play();
                    }
                    enemy.currentAction = idleAction;
                }
            }
            if (!enemy.mesh.parent) { // If enemy was removed from scene on death
                this.scene.add(enemy.mesh);
            }
        });
        if (this.enemies.length === 0) { // If all enemies were removed, re-setup
            this._setupEnemies();
        }
        // Change game state and UI
        this.gameState = GameState.PLAYING;
        if (this.uiManager) {
            this.uiManager.hideGameOverScreen();
            this.uiManager.showGameUI();
        }
        // Music handling for restart
        this.stopMenuMusic(); // Ensure menu music is definitely stopped
        this.playGameMusicIfReady(); // Start game music for the new session
    }
    _enterPausedState() {
        if (this.gameState !== GameState.PLAYING) return;
        this.gameState = GameState.PAUSED;
        this.uiManager.showPauseMenu();
        // Ensure settings panel is hidden if it was open from a previous pause
        this.uiManager.hideSettingsPanel(); 
        if (this.inputHandler) {
            this.inputHandler.unlockPointer();
        }
        console.log("Game Paused.");
        // Potentially stop background music or lower its volume
        // if (this.backgroundMusic && this.backgroundMusic.isPlaying) this.backgroundMusic.pause();
        this.pauseGameMusic(); // Pause game music when game is paused
    }
    _resumePlayingState() {
        if (this.gameState !== GameState.PAUSED) return;
        this.gameState = GameState.PLAYING;
        this.uiManager.hidePauseMenu();
        if (this.inputHandler) {
            // Attempt to re-lock pointer. Player might need to click/right-click if this fails or isn't desired.
            this.inputHandler.lockPointer();
        }
        console.log("Game Resumed.");
        // Potentially resume background music
        // if (this.backgroundMusic && !this.backgroundMusic.isPlaying && this.isAudioContextResumed) this.backgroundMusic.play();
        this.resumeGameMusic(); // Resume game music when game is unpaused
    }
    playGameMusicIfReady() {
        if (this.isGameMusicLoaded &&
            this.gameState === GameState.PLAYING &&
            this.isAudioContextResumed &&
            this.gamePlayMusic &&
            !this.gamePlayMusic.isPlaying) {
            try {
                this.gamePlayMusic.play();
                console.log("Playing game play music.");
            } catch (e) {
                console.error("Error trying to play game play music:", e);
            }
        } else {
            if (!this.isGameMusicLoaded) console.log("Game music not played: Not loaded yet.");
            if (this.gameState !== GameState.PLAYING) console.log("Game music not played: Not in playing state.");
            if (!this.isAudioContextResumed) console.log("Game music not played: Audio context not resumed.");
            if (this.gamePlayMusic && this.gamePlayMusic.isPlaying) console.log("Game music not played: Already playing.");
            if (!this.gamePlayMusic) console.log("Game music not played: gamePlayMusic object is null/undefined.");
        }
    }
    stopGameMusic() {
        if (this.gamePlayMusic && this.gamePlayMusic.isPlaying) {
            this.gamePlayMusic.stop();
            console.log("Stopped game play music.");
        }
    }
    pauseGameMusic() {
        if (this.gamePlayMusic && this.gamePlayMusic.isPlaying) {
            this.gamePlayMusic.pause();
            console.log("Paused game play music.");
        }
    }
    resumeGameMusic() {
        if (this.isGameMusicLoaded &&
            this.gameState === GameState.PLAYING &&
            this.isAudioContextResumed &&
            this.gamePlayMusic &&
            !this.gamePlayMusic.isPlaying) {
            try {
                this.gamePlayMusic.play(); // play() resumes a paused THREE.Audio
                console.log("Resumed game play music.");
            } catch (e) {
                console.error("Error trying to resume game play music:", e);
            }
        }
    }
    start() {
        this.renderer.setAnimationLoop(this.animate.bind(this));
    }
    animate() {
        const deltaTime = this.clock.getDelta();
        // Handle Escape key for pausing/resuming
        if (this.inputHandler) {
            const escapeCurrentlyPressed = this.inputHandler.keys['escape'];
            if (escapeCurrentlyPressed && !this._escapePressedLastFrame) {
                if (this.gameState === GameState.PLAYING) {
                    this._enterPausedState();
                } else if (this.gameState === GameState.PAUSED) {
                    this._resumePlayingState();
                }
            }
            this._escapePressedLastFrame = escapeCurrentlyPressed;
        }
        if (this.gameState === GameState.PLAYING) {
            if (this.player && this.inputHandler && this.environment) {
                this.player.update(deltaTime, this.inputHandler.keys, this.inputHandler, this.environment);
            }
            if (this.environment && this.player && this.player.mesh && this.player.isAlive) {
                this.environment.update(deltaTime, this.player.mesh.position);
            }
            this.enemies.forEach(enemy => {
                if (enemy.isAlive) {
                    enemy.update(deltaTime, this.environment);
                }
            });
            if (this.player && this.uiManager && this.player.isAlive) {
                this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
                this.uiManager.updateMana(this.player.mana, this.player.maxMana);
            }
        } else if (this.gameState === GameState.MENU) {
            const time = this.clock.getElapsedTime();
            this.camera.position.x = Math.sin(time * 0.05) * 20;
            this.camera.position.z = Math.cos(time * 0.05) * 20;
            this.camera.position.y = 10 + Math.sin(time * 0.03) * 2;
            this.camera.lookAt(0, 2, 0);
            if (this.menuEffects) {
                this.menuEffects.update(deltaTime, this.camera.position);
            }
        } else if (this.gameState === GameState.PAUSED) {
            // Game logic is paused. UI is active.
            // Potentially update menu effects if they are shown behind pause menu.
            // For now, we keep the 3D scene static.
        } else if (this.gameState === GameState.GAMEOVER) {
            if(this.player) this.player.update(deltaTime, {}, this.inputHandler, this.environment);
        }
        // Render the scene regardless of game state (to show menus, etc.)
        this.renderer.render(this.scene, this.camera);
        // this.composer.render(deltaTime); // If using postprocessing
    }
}