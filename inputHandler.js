import * as THREE from 'three'; // Needed for Vector2 potentially later
export class InputHandler {
    constructor() { // REMOVED targetElement parameter
        // this.targetElement = targetElement; // REMOVED canvas storage
        this.keys = {};
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.isPointerDown = false; // Tracks if *any* pointer (mouse or touch) is down
        this.mouseButtonDown = -1; // Tracks which mouse button is down (-1 for none, 0 left, 1 middle, 2 right)
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        // this.pointerLocked = false; // REMOVED pointer lock state
        this._addEventListeners();
    }

    _addEventListeners() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            // console.log(`Keydown: ${key}`); // DEBUG LOG REMOVED
            this.keys[key] = true;
            // console.log(`[InputHandler] Internal keys after keydown:`, JSON.stringify(this.keys)); // REMOVED LOG
             // Prevent default browser behavior for spacebar scrolling
            if (e.key === ' ') {
                 e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            // console.log(`Keyup: ${key}`); // DEBUG LOG REMOVED
            this.keys[key] = false;
             // console.log(`[InputHandler] Internal keys after keyup:`, JSON.stringify(this.keys)); // REMOVED LOG
        });
// --- Mouse Listeners ---
        window.addEventListener('mousedown', (e) => {
            this.isPointerDown = true;
            this.mouseButtonDown = e.button; // Store which button was pressed
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
            // No longer need preventDefault here, pointer lock handles it
            // e.preventDefault();
        });
        window.addEventListener('mouseup', (e) => {
            // Reset button state more robustly on ANY mouse up event
            this.isPointerDown = false;
            this.mouseButtonDown = -1;
             // Important: If an attack was triggered, it's the Player's job to handle
             // the attack state completion based on animation/cooldown,
             // not the input handler's job to prematurely reset it on mouseup.
        });
window.addEventListener('mousemove', (e) => {
            // Only update camera delta if the *right* mouse button is down (or if it's a touch drag)
            // Check mouseButtonDown specifically for mouse, isPointerDown covers touch
            // Always update delta based on clientX/clientY changes
            // (Pointer lock is not currently used for camera control based on this change)
            const deltaX = e.clientX - this.lastPointerX;
            const deltaY = e.clientY - this.lastPointerY;
            this.mouseDeltaX += deltaX;
            this.mouseDeltaY += deltaY;
            // Update last position for the next frame's calculation
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
            // Removed pointer lock check block
            // Touch drag logic remains separate if needed
            // const isTouchDrag = e.pointerType === 'touch' && this.isPointerDown;
            // if (isTouchDrag) { /* Handle touch separately if necessary */ }
        });
// --- Touch Listeners ---
window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { // Single touch for camera/movement
        this.isPointerDown = true;
            const touch = e.touches[0];
            this.lastPointerX = touch.clientX;
            this.lastPointerY = touch.clientY;
            this.mouseButtonDown = -1; // Ensure mouse button state is cleared on touch start
            // TODO: Implement on-screen buttons for mobile attack/jump
            // For now, touch drag controls camera, no attack/jump via touch.
    }
    e.preventDefault(); // Prevent default touch actions like scrolling
}, { passive: false });
window.addEventListener('touchend', (e) => {
        // Reset pointer state regardless of which touch ended if it was the last one
        if (e.touches.length === 0) {
             this.isPointerDown = false;
             this.mouseButtonDown = -1; // Also reset mouse button state
        }
        e.preventDefault();
    });
window.addEventListener('touchmove', (e) => {
        if (this.isPointerDown && e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.lastPointerX;
            const deltaY = touch.clientY - this.lastPointerY;
        // Add touch movement directly to mouse delta
        // Sensitivity can be adjusted here or in Player camera logic if needed
        this.mouseDeltaX += deltaX;
        this.mouseDeltaY += deltaY;
        this.lastPointerX = touch.clientX;
        this.lastPointerY = touch.clientY;
        // Movement key updates based on drag removed.
    }
    e.preventDefault(); // Prevent scrolling/zooming
        }, { passive: false });
        // --- Pointer Lock Listeners --- REMOVED
        // document.addEventListener('pointerlockchange', ...)
        // document.addEventListener('pointerlockerror', ...)
    }
    // _onPointerLockChange() { ... } // REMOVED
    // _onPointerLockError(e) { ... } // REMOVED
    // lockPointer() { ... } // REMOVED
    // isPointerLocked() { ... } // REMOVED
    // Add a method to consume/reset the delta after the player uses it
resetMouseDelta() {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
}
}