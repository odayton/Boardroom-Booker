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
        
        // Ensure form inputs in modal are clickable
        const formInputs = modal.querySelectorAll('input:not([type="date"]), select, textarea, button');
        formInputs.forEach(input => {
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
        
        // Close on close button click
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide(modal.id));
        }
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
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
            modal.classList.add('show');
            modal.style.display = 'flex';
            document.body.classList.add('overflow-hidden');
        }
    },
    
    /**
     * Hide a modal
     * @param {string} modalId - The modal ID
     */
    hide: function(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.classList.remove('overflow-hidden');
        }
    },
    
    /**
     * Hide all modals
     */
    hideAll: function() {
        this.modals.forEach(modal => {
            modal.classList.remove('show');
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
        document.body.classList.remove('overflow-hidden');
    }
};

// Initialize modals when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Auto-register all modals except booking-modal (handled by calendar.js), user management modals, and room management modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.id !== 'booking-modal' && 
            !modal.id.includes('invite-modal') && 
            !modal.id.includes('edit-user-modal') && 
            !modal.id.includes('delete-confirmation-modal') && 
            !modal.id.includes('invitation-details-modal') && 
            !modal.id.includes('invitation-confirmation-modal') &&
            !modal.id.includes('room-modal') &&
            !modal.id.includes('delete-modal')) {
            window.modalManager.register(modal.id);
        }
    });
}); 