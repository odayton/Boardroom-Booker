/**
 * User Management Page
 * Handles user listing, invitation, editing, deletion, and invitation management
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('User management script loaded');
    if (!document.getElementById('users-table-body')) {
        console.log('Users table body not found, exiting');
        return;
    }
    
    console.log('Initializing user management');
    let users = [];
    let invitations = [];
    let userToDelete = null;
    let invitationToDelete = null;
    let currentUser = null; // Store current user information

    // Initialize
    loadUsers();
    loadInvitations();
    loadCurrentUser(); // Load current user information
    bindEvents();

    function bindEvents() {
        // Invite user modal events
        const inviteBtn = document.getElementById('invite-user-btn');
        console.log('Invite button found:', inviteBtn);
        inviteBtn?.addEventListener('click', (e) => {
            console.log('Invite button clicked');
            showInviteModal();
        });
        document.getElementById('close-invite-modal')?.addEventListener('click', hideInviteModal);
        document.getElementById('cancel-invite')?.addEventListener('click', hideInviteModal);
        document.getElementById('invite-form')?.addEventListener('submit', sendInvitation);

        // Edit user modal events
        document.getElementById('close-edit-modal')?.addEventListener('click', hideEditModal);
        document.getElementById('cancel-edit')?.addEventListener('click', hideEditModal);
        document.getElementById('submit-edit')?.addEventListener('click', saveUser);

        // Delete confirmation modal events
        document.getElementById('cancel-delete')?.addEventListener('click', hideDeleteUserModal);
        document.getElementById('confirm-delete')?.addEventListener('click', confirmDeleteUser);

        // Invitation management events
        document.getElementById('refresh-invitations-btn')?.addEventListener('click', loadInvitations);
        document.getElementById('close-invitation-details-modal')?.addEventListener('click', hideInvitationDetailsModal);
        document.getElementById('cancel-invitation-confirmation')?.addEventListener('click', hideInvitationConfirmationModal);
        document.getElementById('confirm-invitation-action')?.addEventListener('click', confirmInvitationAction);

        // Modal overlays
        document.getElementById('invite-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'invite-modal') hideInviteModal();
        });
        document.getElementById('invitation-details-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'invitation-details-modal') hideInvitationDetailsModal();
        });
        document.getElementById('invitation-confirmation-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'invitation-confirmation-modal') hideInvitationConfirmationModal();
        });

        // Role selection change
        document.getElementById('invite-role')?.addEventListener('change', handleRoleChange);
        
        // Invitation type change
        document.querySelectorAll('input[name="invitation_type"]').forEach(radio => {
            radio.addEventListener('change', handleInvitationTypeChange);
        });
        

    }

    async function loadUsers() {
        console.log('🔍 loadUsers() called');
        try {
            console.log('📡 Making API call to /api/users...');
            const data = await ApiUtils.fetchWithErrorHandling('/api/users');
            console.log('✅ API response received:', data);
            users = data.users || data; // Handle both formats
            console.log('👥 Users loaded:', users);
            renderUsers();
            hideLoadingState();
            
            if (users.length === 0) {
                console.log('⚠️ No users found, showing empty state');
                showEmptyState();
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            ApiUtils.showError('Failed to load users');
            hideLoadingState();
        }
    }

    function renderUsers() {
        const usersContainer = document.getElementById('users-table-body');
        if (!usersContainer) return;

        if (users.length === 0) {
            usersContainer.innerHTML = '';
            return;
        }

                       usersContainer.innerHTML = users.map(user => `
                   <tr class="user-table-row">
                       <td class="user-table-cell">
                           <div class="user-info">
                               <div class="user-name">${user.name}</div>
                               <div class="user-email">${user.email}</div>
                           </div>
                       </td>
                       <td class="user-table-cell">
                           <span class="role-badge role-badge-${user.role}">
                               ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                           </span>
                       </td>
                       <td class="user-table-cell">
                           <div class="action-buttons action-buttons-right">
                               <button onclick="window.editUser(${user.id})" class="btn btn-warning btn-sm" title="Edit">
                                   <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                   </svg>
                                   Edit
                               </button>
                               <button onclick="window.deleteUser(${user.id})" class="btn btn-danger btn-sm" title="Delete">
                                   <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                   </svg>
                                   Delete
                               </button>
                           </div>
                       </td>
                   </tr>
               `).join('');
    }

    function showInviteModal() {
        console.log('showInviteModal called');
        const modal = document.getElementById('invite-modal');
        console.log('Modal element:', modal);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('show');
            console.log('Set display to show');
            // Set up role visibility when modal is shown
            setupRoleVisibility();
        } else {
            console.error('Modal element not found');
        }
    }

    function hideInviteModal() {
        const modal = document.getElementById('invite-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        }
        
        // Reset form fields
        const form = document.getElementById('invite-form');
        if (form) {
            form.reset();
        }
        

        
        // Reset invitation type to internal
        const internalInvite = document.getElementById('internal-invite');
        if (internalInvite) {
            internalInvite.checked = true;
            handleInvitationTypeChange();
        }
    }

    async function sendInvitation(event) {
        event.preventDefault();
        
        const form = document.getElementById('invite-form');
        const formData = new FormData(form);
        
        const invitationType = formData.get('invitation_type');
        
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
            invitation_type: invitationType
        };
        
        if (!ApiUtils.validateRequiredFields(data, ['name', 'email', 'role', 'invitation_type'])) {
            return;
        }
        
        // Add guest duration if it's a guest role
        if (data.role === 'guest') {
            const guestDuration = formData.get('guest_duration_days');
            if (guestDuration) {
                data.guest_duration_days = parseInt(guestDuration);
            }
        }
        
        try {
            const response = await fetch('/api/invitations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                hideInviteModal();
                form.reset();
                // Reset invitation type to internal
                document.getElementById('internal-invite').checked = true;
                handleInvitationTypeChange();
                loadInvitations();
                
                const successMessage = invitationType === 'external' 
                    ? 'External company invitation created successfully!' 
                    : 'Invitation created successfully!';
                ApiUtils.showSuccess(successMessage);
            } else {
                ApiUtils.showError('Failed to create invitation: ' + result.error);
            }
        } catch (error) {
            ApiUtils.showError('Failed to create invitation: ' + error.message);
        }
    }

    function showEditUserModal(user) {
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-role').value = user.role;
        document.getElementById('edit-user-modal').classList.add('show');
    }

    function hideEditModal() {
        document.getElementById('edit-user-modal').classList.remove('show');
    }

    async function saveUser(event) {
        event.preventDefault();
        
        const userId = document.getElementById('edit-user-id').value;
        const form = document.getElementById('edit-user-form');
        const data = ApiUtils.getFormData(form);
        
        if (!ApiUtils.validateRequiredFields(data, ['name', 'email', 'role'])) {
            return;
        }
        
        try {
            await ApiUtils.fetchWithErrorHandling(`/api/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            hideEditModal();
            loadUsers();
            ApiUtils.showSuccess('User updated successfully!');
        } catch (error) {
            ApiUtils.showError(error.message);
        }
    }

    function deleteUser(userId) {
        userToDelete = userId;
        document.getElementById('delete-confirmation-modal').classList.add('show');
    }

    function hideDeleteUserModal() {
        document.getElementById('delete-confirmation-modal').classList.remove('show');
        userToDelete = null;
    }

    async function confirmDeleteUser() {
        if (!userToDelete) return;
        
        try {
            await ApiUtils.fetchWithErrorHandling(`/api/users/${userToDelete}`, {
                method: 'DELETE'
            });
            
            hideDeleteUserModal();
            loadUsers();
            ApiUtils.showSuccess('User deleted successfully!');
        } catch (error) {
            ApiUtils.showError(error.message);
        }
    }

    function hideLoadingState() {
        document.getElementById('loading-state')?.classList.add('hidden');
    }

    function showEmptyState() {
        document.getElementById('empty-state')?.classList.remove('hidden');
    }

    // Invitation Management Functions
    async function loadInvitations() {
        const tbody = document.getElementById('invitations-tbody');
        const loading = document.getElementById('invitations-loading');
        const empty = document.getElementById('invitations-empty');
        const table = document.getElementById('invitations-table');

        try {
            loading.classList.remove('hidden');
            loading.classList.add('flex');
            table.classList.add('hidden');
            empty.classList.add('hidden');

            const response = await fetch('/api/invitations');
            const data = await response.json();

            if (data.success) {
                invitations = data.invitations;
                renderInvitations();
            } else {
                ApiUtils.showError('Failed to load invitations: ' + data.error);
            }
        } catch (error) {
            ApiUtils.showError('Failed to load invitations: ' + error.message);
        } finally {
            loading.classList.add('hidden');
            loading.classList.remove('flex');
        }
    }

    function renderInvitations() {
        const tbody = document.getElementById('invitations-tbody');
        const empty = document.getElementById('invitations-empty');
        const table = document.getElementById('invitations-table');

        if (invitations.length === 0) {
            table.classList.add('hidden');
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            return;
        }

                    table.classList.remove('hidden');
            empty.classList.add('hidden');
            empty.classList.remove('flex');

        tbody.innerHTML = invitations.map(invitation => `
            <tr class="user-table-row">
                <td class="user-table-cell">
                    <div class="flex items-center space-x-3">
                        <code class="invitation-code">${invitation.code}</code>
                        <button class="copy-button" onclick="copyToClipboard('${invitation.code}')" title="Copy invitation code">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                    </div>
                </td>
                <td class="user-table-cell user-name">${invitation.name}</td>
                <td class="user-table-cell user-email">${invitation.email}</td>
                <td class="user-table-cell">
                    <span class="role-badge role-badge-${invitation.role}">
                        ${invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                    </span>
                </td>
                <td class="user-table-cell user-name">${invitation.invited_by}</td>
                <td class="user-table-cell user-email">${formatDate(invitation.expires_at)}</td>
                <td class="user-table-cell">
                    ${invitation.is_used ? 
                        '<span class="status-badge status-badge-used">Used</span>' : 
                        invitation.is_expired ? 
                            '<span class="status-badge status-badge-expired">Expired</span>' : 
                            '<span class="status-badge status-badge-active">Active</span>'
                    }
                </td>
                <td class="user-table-cell">
                    <div class="action-buttons action-buttons-right">
                        <button onclick="viewInvitation('${invitation.code}')" class="action-btn action-btn-view" title="View invitation details">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        ${!invitation.is_used && !invitation.is_expired ? `
                            <button onclick="deleteInvitation(${invitation.id})" class="action-btn action-btn-delete" title="Delete invitation">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function viewInvitation(code) {
        try {
            const response = await fetch(`/api/invitations/${code}/validate`);
            const result = await response.json();

            if (result.success) {
                showInvitationDetails(result.invitation, code);
            } else {
                ApiUtils.showError('Failed to load invitation details: ' + result.error);
            }
        } catch (error) {
            ApiUtils.showError('Failed to load invitation details: ' + error.message);
        }
    }

    function showInvitationDetails(invitation, code) {
        const content = document.getElementById('invitation-details-content');
        content.innerHTML = `
            <div class="space-y-6">
                <div class="invitation-details-section">
                    <h4 class="invitation-details-title">Invitation Code</h4>
                    <div class="flex items-center space-x-3">
                        <code class="invitation-code-display">${code}</code>
                        <button class="copy-button" onclick="copyToClipboard('${code}')" title="Copy invitation code">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="invitation-details-section">
                        <h4 class="invitation-details-title">User Information</h4>
                        <div class="space-y-3">
                            <div>
                                <label class="invitation-details-label">Name:</label>
                                <p class="invitation-details-value">${invitation.name}</p>
                            </div>
                            <div>
                                <label class="invitation-details-label">Email:</label>
                                <p class="invitation-details-value">${invitation.email}</p>
                            </div>
                            <div>
                                <label class="invitation-details-label">Role:</label>
                                <span class="role-badge role-badge-${invitation.role}">
                                    ${invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="invitation-details-section">
                        <h4 class="invitation-details-title">Invitation Details</h4>
                        <div class="space-y-3">
                            <div>
                                <label class="invitation-details-label">Company:</label>
                                <p class="invitation-details-value">${invitation.company_name}</p>
                            </div>
                            <div>
                                <label class="invitation-details-label">Expires:</label>
                                <p class="invitation-details-value">${formatDate(invitation.expires_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="invitation-details-section bg-blue-50">
                    <h4 class="invitation-details-title">Invitation Link</h4>
                    <div class="flex items-center space-x-2">
                        <input type="text" value="${window.location.origin}/register?code=${code}" readonly 
                               class="invitation-link-input">
                        <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${window.location.origin}/register?code=${code}')">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            Copy Link
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        showInvitationDetailsModal();
    }

    function deleteInvitation(invitationId) {
        invitationToDelete = invitationId;
        showInvitationConfirmationModal(
            'Delete Invitation',
            'Are you sure you want to delete this invitation? This action cannot be undone.'
        );
    }

    async function confirmInvitationAction() {
        if (!invitationToDelete) return;
        
        try {
            const response = await fetch(`/api/invitations/${invitationToDelete}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                ApiUtils.showSuccess('Invitation deleted successfully!');
                hideInvitationConfirmationModal();
                loadInvitations();
            } else {
                ApiUtils.showError('Failed to delete invitation: ' + result.error);
            }
        } catch (error) {
            ApiUtils.showError('Failed to delete invitation: ' + error.message);
        }
    }

    // Modal management functions
    function showInvitationDetailsModal() {
        document.getElementById('invitation-details-modal').classList.add('show');
    }

    function hideInvitationDetailsModal() {
        document.getElementById('invitation-details-modal').classList.remove('show');
    }

    function showInvitationConfirmationModal(title, message) {
        document.getElementById('invitation-confirmation-title').textContent = title;
        document.getElementById('invitation-confirmation-message').textContent = message;
        document.getElementById('invitation-confirmation-modal').classList.add('show');
    }

    function hideInvitationConfirmationModal() {
        document.getElementById('invitation-confirmation-modal').classList.remove('show');
        invitationToDelete = null;
    }

    // Utility functions
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Find the button that was clicked and provide visual feedback
            const buttons = document.querySelectorAll('.copy-button');
            buttons.forEach(button => {
                if (button.getAttribute('onclick')?.includes(text)) {
                    const originalHTML = button.innerHTML;
                    button.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    `;
                    button.style.background = 'linear-gradient(135deg, var(--green-50) 0%, var(--green-100) 100%)';
                    button.style.borderColor = 'var(--green-200)';
                    button.style.color = 'var(--green-600)';
                    
                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                        button.style.background = '';
                        button.style.borderColor = '';
                        button.style.color = '';
                    }, 1500);
                }
            });
            
            ApiUtils.showSuccess('Invitation code copied to clipboard!');
        } catch (error) {
            ApiUtils.showError('Failed to copy to clipboard');
        }
    }

    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/current-user');
            const data = await response.json();
            if (data.success) {
                currentUser = data.user;
                setupRoleVisibility();
            } else {
                ApiUtils.showError('Failed to load current user: ' + data.error);
            }
        } catch (error) {
            ApiUtils.showError('Failed to load current user: ' + error.message);
        }
    }

    function setupRoleVisibility() {
        if (!currentUser) {
            console.warn('Current user not loaded, cannot set role visibility.');
            return;
        }

        const inviteAdminOption = document.getElementById('invite-admin-option');
        const adminRoleInfo = document.getElementById('admin-role-info');

        // Show/hide admin option based on current user's role
        if (currentUser.is_admin) {
            // Admin users can see and assign admin role
            inviteAdminOption.classList.remove('hidden');
        } else {
            // Manager users cannot see admin role option
            inviteAdminOption.classList.add('hidden');
            // If admin was selected, reset to empty
            const inviteRoleSelect = document.getElementById('invite-role');
            if (inviteRoleSelect.value === 'admin') {
                inviteRoleSelect.value = '';
            }
        }
    }

    function handleRoleChange() {
        const role = document.getElementById('invite-role').value;
        const guestDurationGroup = document.getElementById('guest-duration-group');
        const guestRoleInfo = document.getElementById('guest-role-info');
        const adminRoleInfo = document.getElementById('admin-role-info');
        const adminOption = document.getElementById('invite-admin-option');
        
        // Show/hide guest duration field
                    guestDurationGroup.classList.toggle('hidden', role !== 'guest');
            guestRoleInfo.classList.toggle('hidden', role !== 'guest');
        
        // Show/hide admin role info
                    adminRoleInfo.classList.toggle('hidden', role !== 'admin');
            adminOption.classList.toggle('hidden', role !== 'admin');
    }
    
    function handleInvitationTypeChange() {
        const invitationType = document.querySelector('input[name="invitation_type"]:checked').value;
        const externalCompanyInfo = document.getElementById('external-company-info');
        const managerDescription = document.getElementById('manager-description');
        
        if (invitationType === 'external') {
            externalCompanyInfo.classList.remove('hidden');
            managerDescription.textContent = 'Can invite their own employees to access your calendar';
        } else {
            externalCompanyInfo.classList.add('hidden');
            managerDescription.textContent = 'Can manage employees and create invitations';
        }
    }
    


    // Global functions for onclick handlers
    window.editUser = function(userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            showEditUserModal(user);
        }
    };

    window.deleteUser = function(userId) {
        deleteUser(userId);
    };

    window.viewInvitation = function(code) {
        viewInvitation(code);
    };

    window.deleteInvitation = function(invitationId) {
        deleteInvitation(invitationId);
    };

    window.copyToClipboard = function(text) {
        copyToClipboard(text);
    };
}); 