/**
 * Room Management Page
 * Handles room listing, creation, editing, and deletion
 */

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('rooms-container')) return;
    
    let rooms = [];
    let roomToDelete = null;

    // Initialize
    loadRooms();
    bindEvents();

    function bindEvents() {
        // Room modal events
        document.getElementById('add-room-btn')?.addEventListener('click', showAddRoomModal);
        document.getElementById('cancel-room-btn')?.addEventListener('click', hideRoomModal);
        document.getElementById('save-room-btn')?.addEventListener('click', saveRoom);

        // Delete confirmation modal events
        document.getElementById('cancel-delete')?.addEventListener('click', hideDeleteModal);
        document.getElementById('confirm-delete')?.addEventListener('click', confirmDeleteRoom);
    }

    async function loadRooms() {
        try {
            const data = await ApiUtils.fetchWithErrorHandling('/api/rooms');
            rooms = data.rooms;
            renderRooms();
            hideLoadingState();
            
            if (rooms.length === 0) {
                showEmptyState();
            }
        } catch (error) {
            ApiUtils.showError('Failed to load rooms');
            hideLoadingState();
        }
    }

    function renderRooms() {
        const roomsContainer = document.getElementById('rooms-container');
        if (!roomsContainer) return;

        if (rooms.length === 0) {
            roomsContainer.innerHTML = '';
            return;
        }

        roomsContainer.innerHTML = rooms.map(room => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${room.name}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="window.editRoom(${room.id})" class="text-primary-600 hover:text-primary-900 mr-3">
                        Edit
                    </button>
                    <button onclick="window.deleteRoom(${room.id})" class="text-red-600 hover:text-red-900">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function showAddRoomModal() {
        document.getElementById('room-modal-title').textContent = 'Add New Room';
        document.getElementById('room-id').value = '';
        document.getElementById('room-name').value = '';
        document.getElementById('room-modal').classList.remove('hidden');
    }

    function showEditRoomModal(room) {
        document.getElementById('room-modal-title').textContent = 'Edit Room';
        document.getElementById('room-id').value = room.id;
        document.getElementById('room-name').value = room.name;
        document.getElementById('room-modal').classList.remove('hidden');
    }

    function hideRoomModal() {
        document.getElementById('room-modal').classList.add('hidden');
    }

    async function saveRoom(event) {
        event.preventDefault();
        
        const roomId = document.getElementById('room-id').value;
        const roomName = document.getElementById('room-name').value;
        
        if (!ApiUtils.validateRequiredFields({ name: roomName }, ['name'])) {
            return;
        }
        
        const url = roomId ? `/api/rooms/${roomId}` : '/api/rooms';
        const method = roomId ? 'PUT' : 'POST';
        
        try {
            await ApiUtils.fetchWithErrorHandling(url, {
                method: method,
                body: JSON.stringify({ name: roomName })
            });
            
            hideRoomModal();
            loadRooms();
            ApiUtils.showSuccess(roomId ? 'Room updated successfully!' : 'Room created successfully!');
        } catch (error) {
            ApiUtils.showError(error.message);
        }
    }

    function deleteRoom(roomId) {
        roomToDelete = roomId;
        document.getElementById('delete-modal').classList.remove('hidden');
    }

    function hideDeleteModal() {
        document.getElementById('delete-modal').classList.add('hidden');
        roomToDelete = null;
    }

    async function confirmDeleteRoom() {
        if (!roomToDelete) return;
        
        try {
            await ApiUtils.fetchWithErrorHandling(`/api/rooms/${roomToDelete}`, {
                method: 'DELETE'
            });
            
            hideDeleteModal();
            loadRooms();
            ApiUtils.showSuccess('Room deleted successfully!');
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
    window.editRoom = function(roomId) {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            showEditRoomModal(room);
        }
    };

    window.deleteRoom = function(roomId) {
        deleteRoom(roomId);
    };
}); 