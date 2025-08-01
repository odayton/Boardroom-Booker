/**
 * User Management Page
 * Handles user listing, invitation, editing, and deletion
 */

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('users-container')) return;
    
    let users = [];
    let userToDelete = null;

    // Initialize
    loadUsers();
    bindEvents();

    function bindEvents() {
        // Invite user modal events
        document.getElementById('invite-user-btn')?.addEventListener('click', showInviteModal);
        document.getElementById('cancel-invite')?.addEventListener('click', hideInviteModal);
        document.getElementById('submit-invite')?.addEventListener('click', sendInvitation);

        // Edit user modal events
        document.getElementById('cancel-edit')?.addEventListener('click', hideEditModal);
        document.getElementById('submit-edit')?.addEventListener('click', saveUser);

        // Delete confirmation modal events
        document.getElementById('cancel-delete')?.addEventListener('click', hideDeleteUserModal);
        document.getElementById('confirm-delete')?.addEventListener('click', confirmDeleteUser);
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
        const usersContainer = document.getElementById('users-container');
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
                        user.role === 'admin' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'
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
        document.getElementById('invite-modal').classList.remove('hidden');
    }

    function hideInviteModal() {
        document.getElementById('invite-modal').classList.add('hidden');
    }

    async function sendInvitation(event) {
        event.preventDefault();
        
        const form = document.getElementById('invite-form');
        const data = ApiUtils.getFormData(form);
        
        if (!ApiUtils.validateRequiredFields(data, ['name', 'email', 'role'])) {
            return;
        }
        
        try {
            await ApiUtils.fetchWithErrorHandling('/api/users/invite', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            hideInviteModal();
            loadUsers();
            ApiUtils.showSuccess('Invitation sent successfully!');
        } catch (error) {
            ApiUtils.showError(error.message);
        }
    }

    function showEditUserModal(user) {
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-role').value = user.role;
        document.getElementById('edit-user-modal').classList.remove('hidden');
    }

    function hideEditModal() {
        document.getElementById('edit-user-modal').classList.add('hidden');
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
        document.getElementById('delete-confirmation-modal').classList.remove('hidden');
    }

    function hideDeleteUserModal() {
        document.getElementById('delete-confirmation-modal').classList.add('hidden');
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
}); 