/**
 * API Utilities
 * Common API functions and error handling
 */

// Global API utilities
window.ApiUtils = {
    /**
     * Make a fetch request with error handling
     * @param {string} url - The URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise with response data
     */
    fetchWithErrorHandling: async function(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Show a simple alert with error message
     * @param {string} message - Error message to display
     */
    showError: function(message) {
        alert(`Error: ${message}`);
    },

    /**
     * Show a success message
     * @param {string} message - Success message to display
     */
    showSuccess: function(message) {
        alert(message);
    },

    /**
     * Get form data as an object
     * @param {HTMLFormElement} form - The form element
     * @returns {Object} - Form data as object
     */
    getFormData: function(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    },

    /**
     * Validate required fields in a form
     * @param {Object} data - Form data object
     * @param {Array} requiredFields - Array of required field names
     * @returns {boolean} - True if all required fields are present
     */
    validateRequiredFields: function(data, requiredFields) {
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                this.showError(`${field} is required`);
                return false;
            }
        }
        return true;
    }
}; 