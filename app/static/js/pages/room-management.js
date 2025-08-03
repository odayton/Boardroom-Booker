/**
 * Room Management Page
 * Handles room listing, creation, editing, and deletion
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Room management script loaded');
    if (!document.getElementById('rooms-container')) {
        console.log('Rooms container not found, exiting');
        return;
    }
    
    console.log('Initializing room management');
    let rooms = [];
    let roomToDelete = null;

    // Initialize
    loadRooms();
    bindEvents();

    function bindEvents() {
        // Room modal events
        const addRoomBtn = document.getElementById('add-room-btn');
        console.log('Add room button found:', addRoomBtn);
        addRoomBtn?.addEventListener('click', (e) => {
            console.log('Add room button clicked');
            showAddRoomModal();
        });
        
        // Empty state button
        const addFirstRoomBtn = document.getElementById('add-first-room-btn');
        console.log('Add first room button found:', addFirstRoomBtn);
        addFirstRoomBtn?.addEventListener('click', (e) => {
            console.log('Add first room button clicked');
            showAddRoomModal();
        });
        
        document.getElementById('close-room-modal')?.addEventListener('click', hideRoomModal);
        document.getElementById('cancel-room-btn')?.addEventListener('click', hideRoomModal);
        document.getElementById('save-room-btn')?.addEventListener('click', saveRoom);

        // Delete confirmation modal events
        document.getElementById('cancel-delete-btn')?.addEventListener('click', hideDeleteModal);
        document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDeleteRoom);
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
            <div class="card hover:shadow-lg transition-shadow">
                <div class="card-body">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center">
                            <div class="h-12 w-12 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                </svg>
                            </div>
                            <div class="ml-4">
                                <h3 class="text-lg font-semibold text-gray-900">${room.name}</h3>
                                <div class="flex items-center space-x-2 mt-1">
                                    <span class="text-sm text-gray-600">${room.room_type || 'Meeting Room'}</span>
                                    ${room.capacity ? `<span class="text-sm text-gray-500">• ${room.capacity} people</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="window.editRoom(${room.id})" class="btn btn-secondary btn-sm">
                                Edit
                            </button>
                            <button onclick="window.deleteRoom(${room.id})" class="btn btn-danger btn-sm">
                                Delete
                            </button>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        ${room.location ? `
                            <div class="flex items-center text-sm text-gray-600">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                                ${room.location}
                            </div>
                        ` : ''}
                        
                        <div class="flex items-center text-sm">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                room.status === 'available' ? 'bg-green-100 text-green-800' :
                                room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }">
                                ${room.status === 'available' ? 'Available' :
                                  room.status === 'maintenance' ? 'Maintenance' :
                                  'Out of Service'}
                            </span>
                            <span class="ml-2 text-gray-500">•</span>
                            <span class="ml-2 text-gray-600">${room.access_level === 'all' ? 'All Employees' :
                                                           room.access_level === 'managers_only' ? 'Managers Only' :
                                                           'Owners Only'}</span>
                        </div>
                        
                        ${room.equipment && room.equipment.length > 0 ? `
                            <div class="flex flex-wrap gap-1">
                                ${room.equipment.slice(0, 3).map(item => `
                                    <span class="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                        ${item.replace('_', ' ')}
                                    </span>
                                `).join('')}
                                ${room.equipment.length > 3 ? `
                                    <span class="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                        +${room.equipment.length - 3} more
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    function showAddRoomModal() {
        console.log('showAddRoomModal called');
        const modal = document.getElementById('room-modal');
        console.log('Room modal element:', modal);
        if (modal) {
            document.getElementById('room-modal-title').textContent = 'Add New Room';
            // Reset form
            document.getElementById('room-id').value = '';
            document.getElementById('room-name').value = '';
            document.getElementById('room-type').value = '';
            document.getElementById('room-capacity').value = '';
            document.getElementById('room-location').value = '';
            document.getElementById('room-description').value = '';
            document.getElementById('room-status').value = 'available';
            document.getElementById('room-access').value = 'all';
            document.getElementById('room-hours-start').value = '';
            document.getElementById('room-hours-end').value = '';
            
            // Reset equipment checkboxes
            document.querySelectorAll('input[name="equipment"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            modal.classList.add('show');
            console.log('Added show class to room modal');
        } else {
            console.error('Room modal element not found');
        }
    }

    function showEditRoomModal(room) {
        document.getElementById('room-modal-title').textContent = 'Edit Room';
        document.getElementById('room-id').value = room.id;
        document.getElementById('room-name').value = room.name;
        document.getElementById('room-type').value = room.room_type || '';
        document.getElementById('room-capacity').value = room.capacity || '';
        document.getElementById('room-location').value = room.location || '';
        document.getElementById('room-description').value = room.description || '';
        document.getElementById('room-status').value = room.status || 'available';
        document.getElementById('room-access').value = room.access_level || 'all';
        document.getElementById('room-hours-start').value = room.operating_hours_start || '';
        document.getElementById('room-hours-end').value = room.operating_hours_end || '';
        
        // Set equipment checkboxes
        const equipment = room.equipment || [];
        document.querySelectorAll('input[name="equipment"]').forEach(checkbox => {
            checkbox.checked = equipment.includes(checkbox.value);
        });
        
        document.getElementById('room-modal').classList.add('show');
    }

    function hideRoomModal() {
        document.getElementById('room-modal').classList.remove('show');
    }

    async function saveRoom(event) {
        event.preventDefault();
        
        const roomId = document.getElementById('room-id').value;
        const roomName = document.getElementById('room-name').value;
        
        if (!ApiUtils.validateRequiredFields({ name: roomName }, ['name'])) {
            return;
        }
        
        // Collect equipment checkboxes
        const equipment = [];
        document.querySelectorAll('input[name="equipment"]:checked').forEach(checkbox => {
            equipment.push(checkbox.value);
        });
        
        // Prepare room data
        const roomData = {
            name: roomName,
            room_type: document.getElementById('room-type').value || null,
            capacity: document.getElementById('room-capacity').value ? parseInt(document.getElementById('room-capacity').value) : null,
            location: document.getElementById('room-location').value || null,
            description: document.getElementById('room-description').value || null,
            status: document.getElementById('room-status').value,
            access_level: document.getElementById('room-access').value,
            operating_hours_start: document.getElementById('room-hours-start').value || null,
            operating_hours_end: document.getElementById('room-hours-end').value || null,
            equipment: equipment
        };
        
        const url = roomId ? `/api/rooms/${roomId}` : '/api/rooms';
        const method = roomId ? 'PUT' : 'POST';
        
        try {
            await ApiUtils.fetchWithErrorHandling(url, {
                method: method,
                body: JSON.stringify(roomData)
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
        document.getElementById('delete-modal').classList.add('show');
    }

    function hideDeleteModal() {
        document.getElementById('delete-modal').classList.remove('show');
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