/**
 * Modal Component
 * Reusable modal functionality for the application
 */

// Global modal manager
window.modalManager = {
    modals: new Map(),
    
    /**
     * Register a modal
     * @param {string} modalId - The modal ID
     */
    register: function(modalId) {
        if (!this.modals.has(modalId)) {
            const modal = document.getElementById(modalId);
            if (modal) {
                this.modals.set(modalId, modal);
                this.initModal(modal);
            }
        }
    },
    
    /**
     * Initialize modal functionality
     * @param {HTMLElement} modal - The modal element
     */
    initModal: function(modal) {
        const overlay = modal.querySelector('.modal-overlay');
        const closeBtn = modal.querySelector('.btn-close');
        
        // Close on overlay click
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hide(modal.id);
                }
            });
        }
        
        // Close on close button click
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide(modal.id));
        }
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.hide(modal.id);
            }
        });
    },
    
    /**
     * Show a modal
     * @param {string} modalId - The modal ID
     */
    show: function(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    },
    
    /**
     * Hide a modal
     * @param {string} modalId - The modal ID
     */
    hide: function(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Hide all modals
     */
    hideAll: function() {
        this.modals.forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }
};

// Initialize modals when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Auto-register all modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        window.modalManager.register(modal.id);
    });
}); 