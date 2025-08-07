/**
 * Sidebar Component
 * Handles sidebar toggle functionality and keyboard navigation
 */

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebarBtn = document.getElementById('open-sidebar');
    


    // Initialize sidebar state
    function initializeSidebar() {
        // Always start with overlay hidden
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
        }
        document.body.classList.remove('overflow-hidden');
        
        // Sidebar starts closed on all screen sizes
        sidebar.classList.remove('open');
    }

    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open');
        const mainContainer = document.querySelector('.main-container');
        
        // Use requestAnimationFrame to ensure smooth transitions
        requestAnimationFrame(() => {
            if (isOpen) {
                // Close sidebar
                sidebar.classList.remove('open');
                if (mainContainer) {
                    mainContainer.classList.remove('sidebar-open');
                }
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('show');
                }
                document.body.classList.remove('overflow-hidden');
            } else {
                // Open sidebar
                sidebar.classList.add('open');
                if (mainContainer) {
                    mainContainer.classList.add('sidebar-open');
                }
                // Only show overlay on mobile
                if (window.innerWidth < 768 && sidebarOverlay) {
                    sidebarOverlay.classList.add('show');
                    document.body.classList.add('overflow-hidden');
                }
            }
        });
    }

    // Initialize on load
    initializeSidebar();

    // Handle window resize
    window.addEventListener('resize', function() {
        const mainContainer = document.querySelector('.main-container');
        
        if (window.innerWidth >= 768) {
            // On desktop, hide overlay but keep sidebar state
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('show');
            }
            document.body.classList.remove('overflow-hidden');
            
            // Update main container class based on sidebar state
            if (sidebar.classList.contains('open') && mainContainer) {
                mainContainer.classList.add('sidebar-open');
            } else if (mainContainer) {
                mainContainer.classList.remove('sidebar-open');
            }
        } else {
            // On mobile, hide sidebar if not manually opened
            if (!sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                if (mainContainer) {
                    mainContainer.classList.remove('sidebar-open');
                }
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('show');
                }
                document.body.classList.remove('overflow-hidden');
            }
        }
    });

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            // Only close sidebar on mobile when clicking overlay
            if (window.innerWidth < 768) {
                toggleSidebar();
            }
        });
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });
}); 