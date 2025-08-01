/**
 * Sidebar Component
 * Handles sidebar toggle functionality and keyboard navigation
 */

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebarBtn = document.getElementById('open-sidebar');

    // Initialize sidebar state based on screen size
    function initializeSidebar() {
        if (window.innerWidth >= 1024) { // lg breakpoint
            // Desktop: show sidebar by default
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        } else {
            // Mobile: hide sidebar by default
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        }
    }

    function toggleSidebar() {
        const isOpen = !sidebar.classList.contains('-translate-x-full');
        
        if (isOpen) {
            // Close sidebar
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        } else {
            // Open sidebar
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    // Initialize on load
    initializeSidebar();

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024) {
            // Desktop: show sidebar and hide overlay
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        } else {
            // Mobile: hide sidebar
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
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
        if (e.key === 'Escape' && !sidebar.classList.contains('-translate-x-full')) {
            toggleSidebar();
        }
    });
}); 