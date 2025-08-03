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
        try {
            const data = await ApiUtils.fetchWithErrorHandling('/api/users');
            users = data.users;
            renderUsers();
            hideLoadingState();
            
            if (users.length === 0) {
                showEmptyState();
            }
        } catch (error) {
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
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                            <span class="text-sm font-semibold text-white">${user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.name}</div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="window.editUser(${user.id})" class="text-primary-600 hover:text-primary-900 mr-3">
                        Edit
                    </button>
                    <button onclick="window.deleteUser(${user.id})" class="text-red-600 hover:text-red-900">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function showInviteModal() {
        console.log('showInviteModal called');
        const modal = document.getElementById('invite-modal');
        console.log('Modal element:', modal);
        if (modal) {
            modal.style.display = 'flex';
            console.log('Set display to flex');
            // Set up role visibility when modal is shown
            setupRoleVisibility();
        } else {
            console.error('Modal element not found');
        }
    }

    function hideInviteModal() {
        const modal = document.getElementById('invite-modal');
        if (modal) {
            modal.style.display = 'none';
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
            loading.style.display = 'flex';
            table.style.display = 'none';
            empty.style.display = 'none';

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
            loading.style.display = 'none';
        }
    }

    function renderInvitations() {
        const tbody = document.getElementById('invitations-tbody');
        const empty = document.getElementById('invitations-empty');
        const table = document.getElementById('invitations-table');

        if (invitations.length === 0) {
            table.style.display = 'none';
            empty.style.display = 'flex';
            return;
        }

        table.style.display = 'table';
        empty.style.display = 'none';

        tbody.innerHTML = invitations.map(invitation => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-2">
                        <code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">${invitation.code}</code>
                        <button class="text-gray-400 hover:text-gray-600" onclick="copyToClipboard('${invitation.code}')" title="Copy code">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${invitation.name}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${invitation.email}</td>
                <td class="px-6 py-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invitation.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                        invitation.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${invitation.role}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${invitation.invited_by}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${formatDate(invitation.expires_at)}</td>
                <td class="px-6 py-4">
                    ${invitation.is_used ? 
                        '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Used</span>' : 
                        invitation.is_expired ? 
                            '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Expired</span>' : 
                            '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Active</span>'
                    }
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="viewInvitation('${invitation.code}')" class="text-blue-600 hover:text-blue-900 mr-3" title="View details">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    ${!invitation.is_used && !invitation.is_expired ? `
                        <button onclick="deleteInvitation(${invitation.id})" class="text-red-600 hover:text-red-900" title="Delete invitation">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    ` : ''}
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
                <div class="bg-gray-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">Invitation Code</h4>
                    <div class="flex items-center space-x-2">
                        <code class="bg-white px-3 py-2 rounded border text-sm font-mono flex-1">${code}</code>
                        <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${code}')">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-50 rounded-lg p-6">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4">User Information</h4>
                        <div class="space-y-3">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Name:</label>
                                <p class="text-gray-900">${invitation.name}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Email:</label>
                                <p class="text-gray-900">${invitation.email}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Role:</label>
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    invitation.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                    invitation.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }">
                                    ${invitation.role}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-6">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Invitation Details</h4>
                        <div class="space-y-3">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Company:</label>
                                <p class="text-gray-900">${invitation.company_name}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Expires:</label>
                                <p class="text-gray-900">${formatDate(invitation.expires_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-blue-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">Invitation Link</h4>
                    <div class="flex items-center space-x-2">
                        <input type="text" value="${window.location.origin}/register?code=${code}" readonly 
                               class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
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
            ApiUtils.showSuccess('Copied to clipboard!');
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
            inviteAdminOption.style.display = 'block';
        } else {
            // Manager users cannot see admin role option
            inviteAdminOption.style.display = 'none';
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
        guestDurationGroup.style.display = role === 'guest' ? 'block' : 'none';
        guestRoleInfo.style.display = role === 'guest' ? 'block' : 'none';
        
        // Show/hide admin role info
        adminRoleInfo.style.display = role === 'admin' ? 'block' : 'none';
        adminOption.style.display = role === 'admin' ? 'block' : 'none';
    }
    
    function handleInvitationTypeChange() {
        const invitationType = document.querySelector('input[name="invitation_type"]:checked').value;
        const externalCompanyInfo = document.getElementById('external-company-info');
        const managerDescription = document.getElementById('manager-description');
        
        if (invitationType === 'external') {
            externalCompanyInfo.style.display = 'block';
            managerDescription.textContent = 'Can invite their own employees to access your calendar';
        } else {
            externalCompanyInfo.style.display = 'none';
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