/**
 * Main JavaScript file for JRU Lost and Found System
 */

// Execute when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltips.length > 0) {
        [...tooltips].map(tooltipEl => new bootstrap.Tooltip(tooltipEl));
    }
    
    // Set current year in footer
    const yearElement = document.querySelector('footer .container');
    if (yearElement) {
        const year = new Date().getFullYear();
        yearElement.innerHTML = yearElement.innerHTML.replace('{{ now.year }}', year);
    }
    
    // Automatically close alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    if (alerts.length > 0) {
        setTimeout(() => {
            alerts.forEach(alert => {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            });
        }, 5000);
    }
});

/**
 * Format a date as a readable string
 * @param {string} dateString - ISO format date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
}

/**
 * Get the appropriate badge class for an item status
 * @param {string} status - Item status (lost, found, claimed)
 * @returns {string} CSS class for the badge
 */
function getStatusBadgeClass(status) {
    const statusClasses = {
        'lost': 'bg-danger',
        'found': 'bg-success',
        'claimed': 'bg-info'
    };
    
    return `badge ${statusClasses[status] || 'bg-secondary'}`;
}

/**
 * Display an error message to the user
 * @param {string} message - Error message to display
 * @param {string} containerId - ID of container to show message in, defaults to body
 */
function showError(message, containerId = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.prepend(errorDiv);
        }
    } else {
        document.querySelector('main.container').prepend(errorDiv);
    }
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(errorDiv);
        bsAlert.close();
    }, 5000);
}

/**
 * Simple debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
