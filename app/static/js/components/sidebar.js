/**
 * Sidebar Component
 * Handles sidebar toggle functionality and keyboard navigation
 */

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebarBtn = document.getElementById('open-sidebar');

    // Initialize sidebar state - hidden by default on all screen sizes
    function initializeSidebar() {
        // Always hide sidebar by default
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('visible');
    }

    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            // Close sidebar
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('visible');
            document.body.style.overflow = '';
        } else {
            // Open sidebar
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('visible');
            // Don't set overflow hidden as it can interfere with modals
            // document.body.style.overflow = 'hidden';
        }
    }

    // Initialize on load
    initializeSidebar();

    // Handle window resize - keep sidebar hidden by default
    window.addEventListener('resize', function() {
        // Always keep sidebar hidden by default on all screen sizes
        if (!sidebar.classList.contains('open')) {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('visible');
            document.body.style.overflow = '';
        }
    });

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });
}); 