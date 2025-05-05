export class UIManager {
    constructor(renderDiv) {
        this.renderDiv = renderDiv; // The div containing the canvas
        this.container = null;
        this.healthBarFill = null;
        this.manaBarFill = null;
        this.hotbarSlots = [];
        this.mainMenuElement = null; // Added for main menu
        this.statusBarContainer = null; // Store ref for status bars
        this.hotbarContainer = null; // Store ref for hotbar
        this._createStyles();
        this._createUIContainer();
        this._createMainMenu(); // Create menu first
        this._createBars();
        this._createHotbar();
    }

    _createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ui-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none; /* Allow clicks to pass through to the canvas */
                color: white;
                font-family: 'Arial', sans-serif;
                text-shadow: 1px 1px 2px black;
                overflow: hidden; /* Prevents scrollbars if content overflows */
                z-index: 10; /* Ensure UI is above the canvas */
            }

            .status-bars {
                position: absolute;
                top: 20px;
                left: 20px;
                width: 200px;
            }

            .bar {
                background-color: rgba(50, 50, 50, 0.7);
                border-radius: 5px;
                height: 15px;
                margin-bottom: 8px;
                overflow: hidden;
                border: 1px solid rgba(20, 20, 20, 0.8);
                box-shadow: 0 0 5px rgba(0,0,0,0.5) inset;
            }

            .bar-fill {
                height: 100%;
                width: 100%; /* Start full */
                border-radius: 4px;
                transition: width 0.3s ease-out;
            }

            .health-bar-fill {
                background: linear-gradient(to right, #ff4d4d, #cc0000);
                 box-shadow: 0 0 8px rgba(255, 0, 0, 0.6);
            }

            .mana-bar-fill {
                 background: linear-gradient(to right, #4d4dff, #0000cc);
                 box-shadow: 0 0 8px rgba(0, 0, 255, 0.6);
            }

            .hotbar {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 8px;
                background-color: rgba(30, 30, 30, 0.8);
                padding: 8px;
                border-radius: 8px;
                border: 1px solid rgba(0, 0, 0, 0.9);
                 box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            }

            .hotbar-slot {
                width: 50px;
                height: 50px;
                background-color: rgba(80, 80, 80, 0.6);
                border: 2px solid rgba(150, 150, 150, 0.7);
                border-radius: 5px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 10px; /* For keybind hint */
                position: relative;
            }

             .hotbar-slot .keybind {
                position: absolute;
                bottom: 2px;
                right: 4px;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.7);
            }

            /* Basic responsiveness */
             @media (max-width: 600px) {
                .status-bars {
                    width: 150px;
                    top: 10px;
                    left: 10px;
                }
                .bar {
                     height: 12px;
                }
                 .hotbar {
                     bottom: 10px;
                     gap: 5px;
                     padding: 5px;
                 }
                 .hotbar-slot {
                     width: 40px;
                     height: 40px;
                 }
                 .hotbar-slot .keybind {
                     font-size: 9px;
                 }
            }
            }
             /* Main Menu Styles */
            .main-menu {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 10, 20, 0.85); /* Dark mystical overlay */
                display: flex;
                flex-direction: column;
                justify-content: center; /* Center content vertically */
                align-items: center;
                text-align: center; /* Ensure text within is centered */
                gap: 30px; /* Add space between title and buttons using gap */
                box-sizing: border-box; /* Include padding in height calculation */
                z-index: 100; /* Above other UI */
                opacity: 1;
                transition: opacity 0.5s ease-out;
            }
             .main-menu.hidden {
                 opacity: 0;
                 pointer-events: none; /* Prevent interaction when hidden */
            }
            @keyframes fadeInTitle {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .menu-title {
                font-size: 3.2em; /* Slightly smaller again */
                color: #e0d6b3; /* Parchment-like color */
                /* margin-bottom: 50px; Removed - Use gap on parent flex container instead */
                text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.8); /* Darker shadow */
                font-family: 'Garamond', serif; /* Using Garamond */
                font-weight: bold;
                animation: fadeInTitle 1s ease-out forwards; /* Add fade-in animation */
                width: 100%; /* Ensure it takes full width */
                text-align: center; /* Explicitly center the text within the h1 */
            }
            .menu-options {
                display: flex;
                flex-direction: column;
                align-items: center; /* Center buttons horizontally within the column */
                gap: 15px; /* Increased gap between buttons */
                width: 100%; /* Ensure container takes width for centering */
            }
             @keyframes popInButton {
                 from { opacity: 0; transform: scale(0.8); }
                 to { opacity: 1; transform: scale(1); }
            }
            .menu-button {
                 font-size: 1.1em; /* Medium button font size */
                 padding: 10px 20px; /* Medium button padding */
                 background: linear-gradient(to bottom, rgba(80, 60, 40, 0.8), rgba(50, 40, 30, 0.9)); /* Brownish gradient */
                 border: 1px solid #a89468; /* Slightly darker base border */
                 color: #e0d6b3; /* Parchment text color */
                 cursor: pointer;
                 border-radius: 5px; /* Slightly rounded edges */
                 transition: background 0.2s ease-out, transform 0.15s ease-out, border-color 0.2s ease-out, box-shadow 0.2s ease-out;
                 text-align: center;
                 min-width: 180px; /* Enforce a consistent medium width */
                 pointer-events: all; /* Buttons should be clickable */
                 font-family: 'Garamond', serif; /* Consistent RPG font */
                 text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
                 opacity: 0; /* Start hidden for animation */
                 transform: scale(0.8); /* Start smaller for animation */
                 animation: popInButton 0.5s ease-out forwards; /* Pop-in animation */
                 box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
            /* Stagger button animations */
            .menu-button:nth-child(1) { animation-delay: 0.6s; }
            .menu-button:nth-child(2) { animation-delay: 0.7s; }
            .menu-button:nth-child(3) { animation-delay: 0.8s; }
            .menu-button:hover {
                 background: linear-gradient(to bottom, rgba(95, 75, 55, 0.95), rgba(65, 55, 45, 1.0));
                 border-color: #d4c08c; /* Brighter border on hover */
                 transform: scale(1.05) translateY(-1px); /* More noticeable scale and lift */
                 box-shadow: 0 3px 5px rgba(0,0,0,0.4); /* Increased shadow */
            }
            /* Responsive adjustments for Menu */
            @media (max-width: 600px) {
                .menu-title {
                    font-size: 2.5em; /* Adjusted responsive title size */
                    margin-bottom: 30px;
                }
                 .menu-button {
                     font-size: 1.0em; /* Adjust responsive button font */
                     padding: 8px 15px; /* Adjust responsive button padding */
                     min-width: 150px; /* Adjust responsive button width */
                 }
             }
        `;
        document.head.appendChild(style);
    }

    _createUIContainer() {
        this.container = document.createElement('div');
        this.container.className = 'ui-container';
        // Prepend to renderDiv so canvas is added after it
        this.renderDiv.prepend(this.container);
    }
    _createMainMenu() {
        this.mainMenuElement = document.createElement('div');
        this.mainMenuElement.className = 'main-menu hidden'; // Start hidden by default, game.js will show it
        const title = document.createElement('h1');
        title.className = 'menu-title';
        title.textContent = 'Arcane Adventures';
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'menu-options';
        const startButton = this._createMenuButton('Start Game', 'start-game');
        const settingsButton = this._createMenuButton('Settings', 'settings');
        const exitButton = this._createMenuButton('Exit', 'exit');
        optionsContainer.appendChild(startButton);
        optionsContainer.appendChild(settingsButton);
        optionsContainer.appendChild(exitButton);
        this.mainMenuElement.appendChild(title);
        this.mainMenuElement.appendChild(optionsContainer);
        this.container.appendChild(this.mainMenuElement);
    }
    _createMenuButton(text, id) {
        const button = document.createElement('button');
        button.className = 'menu-button';
        button.textContent = text;
        button.id = `menu-${id}`;
        return button;
    }
    _createBars() {
        this.statusBarContainer = document.createElement('div'); // Store reference
        this.statusBarContainer.className = 'status-bars';

        // Health Bar
        const healthBar = document.createElement('div');
        healthBar.className = 'bar health-bar';
        this.healthBarFill = document.createElement('div');
        this.healthBarFill.className = 'bar-fill health-bar-fill';
        healthBar.appendChild(this.healthBarFill);

        // Mana Bar
        const manaBar = document.createElement('div');
        manaBar.className = 'bar mana-bar';
        this.manaBarFill = document.createElement('div');
        this.manaBarFill.className = 'bar-fill mana-bar-fill';
        manaBar.appendChild(this.manaBarFill);

        this.statusBarContainer.appendChild(healthBar);
        this.statusBarContainer.appendChild(manaBar);
        this.container.appendChild(this.statusBarContainer);
    }
    _createHotbar(numSlots = 6) {
        this.hotbarContainer = document.createElement('div'); // Store reference
        this.hotbarContainer.className = 'hotbar';

        for (let i = 0; i < numSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.id = `hotbar-slot-${i + 1}`;

            // Add keybind hint
            const keybindHint = document.createElement('span');
            keybindHint.className = 'keybind';
            keybindHint.textContent = `${i + 1}`;
            slot.appendChild(keybindHint);

            this.hotbarContainer.appendChild(slot); // Use this.hotbarContainer
            this.hotbarSlots.push(slot);
        }

        this.container.appendChild(this.hotbarContainer);
    }
    // --- Control Methods ---
    showMainMenu() {
        if (this.mainMenuElement) {
            this.mainMenuElement.classList.remove('hidden');
        }
    }
    hideMainMenu() {
        if (this.mainMenuElement) {
           this.mainMenuElement.classList.add('hidden');
        }
    }
    showGameUI() {
        // Show health/mana bars and hotbar (assuming they exist and refs are stored)
        if (this.statusBarContainer) this.statusBarContainer.style.display = 'block';
        if (this.hotbarContainer) this.hotbarContainer.style.display = 'flex';
    }
    hideGameUI() {
       // Hide health/mana bars and hotbar
        if (this.statusBarContainer) this.statusBarContainer.style.display = 'none';
        if (this.hotbarContainer) this.hotbarContainer.style.display = 'none';
    }
    // --- Update Methods ---

    updateHealth(currentHealth, maxHealth) {
        const percentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
        if (this.healthBarFill) {
            this.healthBarFill.style.width = `${percentage}%`;
        }
    }

    updateMana(currentMana, maxMana) {
        const percentage = Math.max(0, Math.min(100, (currentMana / maxMana) * 100));
         if (this.manaBarFill) {
            this.manaBarFill.style.width = `${percentage}%`;
        }
    }

    // Placeholder for updating hotbar slots later
    updateHotbarSlot(slotIndex, content) {
        if (slotIndex >= 0 && slotIndex < this.hotbarSlots.length) {
            // Example: Set background image or icon
            // this.hotbarSlots[slotIndex].innerHTML = content; // Or modify specific elements
        }
    }
}