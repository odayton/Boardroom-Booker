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
    let currentUserCompanyId = null;

    // Initialize
    loadCurrentUser();
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
        
        // Modal close events
        document.getElementById('close-room-modal')?.addEventListener('click', hideRoomModal);
        document.getElementById('cancel-room-btn')?.addEventListener('click', hideRoomModal);
        
        // Form submission
        const roomForm = document.getElementById('room-form');
        if (roomForm) {
            roomForm.addEventListener('submit', saveRoom);
        }
        
        // Save button (backup)
        document.getElementById('save-room-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            saveRoom(e);
        });

        // Operating hours checkbox handlers
        document.getElementById('no-restriction-start')?.addEventListener('change', (e) => {
            const startControls = document.getElementById('start-time-controls');
            if (e.target.checked) {
                startControls.classList.add('opacity-50', 'pointer-events-none');
            } else {
                startControls.classList.remove('opacity-50', 'pointer-events-none');
            }
        });

        document.getElementById('no-restriction-end')?.addEventListener('change', (e) => {
            const endControls = document.getElementById('end-time-controls');
            if (e.target.checked) {
                endControls.classList.add('opacity-50', 'pointer-events-none');
            } else {
                endControls.classList.remove('opacity-50', 'pointer-events-none');
            }
        });

        // Company visibility handler
        document.getElementById('room-visibility')?.addEventListener('change', (e) => {
            const specificCompaniesGroup = document.getElementById('specific-companies-group');
            const specificCompaniesPlaceholder = document.getElementById('specific-companies-placeholder');
            if (e.target.value === 'specific_companies') {
                specificCompaniesGroup.style.display = 'block';
                specificCompaniesPlaceholder.style.display = 'none';
                loadCompanies();
            } else {
                specificCompaniesGroup.style.display = 'none';
                specificCompaniesPlaceholder.style.display = 'block';
            }
        });

        // Delete confirmation modal events
        document.getElementById('cancel-delete-btn')?.addEventListener('click', hideDeleteModal);
        document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDeleteRoom);
        
        // Register modals with modal manager
        if (window.modalManager) {
            window.modalManager.register('room-modal');
            window.modalManager.register('delete-modal');
        }
    }

    async function loadCurrentUser() {
        try {
            const response = await ApiUtils.fetchWithErrorHandling('/api/current-user');
            currentUserCompanyId = response.company_id;
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }

    async function loadRooms() {
        try {
            const data = await ApiUtils.fetchWithErrorHandling('/api/rooms');
            rooms = data.rooms;
            renderRooms();
            hideLoadingState();
            
            if (rooms.length === 0) {
                showEmptyState();
            } else {
                hideEmptyState();
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
                        <div class="flex items-start flex-1">
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold text-gray-900">${room.name}</h3>
                                <div class="flex items-center space-x-2 mt-1">
                                    <span class="text-sm text-gray-600">${room.room_type ? room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1).replace('_', ' ') : 'Meeting Room'}</span>
                                    ${room.capacity ? `<span class="text-sm text-gray-500">• ${room.capacity} people</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-2 flex-shrink-0 ml-4">
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
                            <span class="ml-2 text-gray-600">${room.access_level === 'employee' ? 'Employee or higher' :
                                                           room.access_level === 'manager' ? 'Manager or higher' :
                                                           room.access_level === 'admin' ? 'Admin only' :
                                                           'All Users'}</span>
                            <span class="ml-2 text-gray-500">•</span>
                            <span class="ml-2 text-gray-600">${room.visibility_type === 'company' ? 'My Company Only' :
                                                           room.visibility_type === 'specific_companies' ? 'Specific Companies' :
                                                           room.visibility_type === 'public' ? 'Public' :
                                                           'Company Only'}</span>
                            ${room.company_name && room.company_id !== currentUserCompanyId ? 
                                `<span class="ml-2 text-gray-500">•</span>
                                 <span class="ml-2 text-gray-600">Shared by ${room.company_name}</span>` : ''}
                        </div>
                        
                        ${room.equipment && room.equipment.length > 0 ? `
                            <div class="flex flex-wrap gap-2">
                                ${room.equipment.slice(0, 3).map(item => `
                                    <span class="inline-flex px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                                        ${item.charAt(0).toUpperCase() + item.slice(1).replace('_', ' ')}
                                    </span>
                                `).join('')}
                                ${room.equipment.length > 3 ? `
                                    <span class="inline-flex px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
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
            document.getElementById('room-visibility').value = 'company';
            document.getElementById('specific-companies-group').style.display = 'none';
            document.getElementById('specific-companies-placeholder').style.display = 'block';
            document.getElementById('room-hours-start-hour').value = '0';
            document.getElementById('room-hours-start-minute').value = '0';
            document.getElementById('room-hours-end-hour').value = '0';
            document.getElementById('room-hours-end-minute').value = '0';
            document.getElementById('no-restriction-start').checked = true;
            document.getElementById('no-restriction-end').checked = true;
            document.getElementById('start-time-controls').classList.add('opacity-50', 'pointer-events-none');
            document.getElementById('end-time-controls').classList.add('opacity-50', 'pointer-events-none');
            
            // Reset equipment checkboxes
            document.querySelectorAll('input[name="equipment"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Use modal manager if available, otherwise fallback
            if (window.modalManager) {
                window.modalManager.show('room-modal');
            } else {
                modal.classList.remove('hidden');
                modal.classList.add('show');
                modal.style.display = 'flex';
            }
            console.log('Room modal shown');
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
        document.getElementById('room-visibility').value = room.visibility_type || 'company';
        
        // Handle company visibility
        if (room.visibility_type === 'specific_companies') {
            document.getElementById('specific-companies-group').style.display = 'block';
            document.getElementById('specific-companies-placeholder').style.display = 'none';
            loadCompanies().then(() => {
                // Set the selected companies
                if (room.visible_companies && Array.isArray(room.visible_companies)) {
                    room.visible_companies.forEach(companyId => {
                        const checkbox = document.getElementById(`company-${companyId}`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
            });
        } else {
            document.getElementById('specific-companies-group').style.display = 'none';
            document.getElementById('specific-companies-placeholder').style.display = 'block';
        }
        // Handle operating hours start
        if (room.operating_hours_start) {
            const startTime = room.operating_hours_start;
            const startHour = startTime.split(':')[0];
            const startMinute = startTime.split(':')[1];
            document.getElementById('room-hours-start-hour').value = parseInt(startHour);
            document.getElementById('room-hours-start-minute').value = parseInt(startMinute);
            document.getElementById('no-restriction-start').checked = false;
            document.getElementById('start-time-controls').classList.remove('opacity-50', 'pointer-events-none');
        } else {
            document.getElementById('room-hours-start-hour').value = '0';
            document.getElementById('room-hours-start-minute').value = '0';
            document.getElementById('no-restriction-start').checked = true;
            document.getElementById('start-time-controls').classList.add('opacity-50', 'pointer-events-none');
        }
        
        // Handle operating hours end
        if (room.operating_hours_end) {
            const endTime = room.operating_hours_end;
            const endHour = endTime.split(':')[0];
            const endMinute = endTime.split(':')[1];
            document.getElementById('room-hours-end-hour').value = parseInt(endHour);
            document.getElementById('room-hours-end-minute').value = parseInt(endMinute);
            document.getElementById('no-restriction-end').checked = false;
            document.getElementById('end-time-controls').classList.remove('opacity-50', 'pointer-events-none');
        } else {
            document.getElementById('room-hours-end-hour').value = '0';
            document.getElementById('room-hours-end-minute').value = '0';
            document.getElementById('no-restriction-end').checked = true;
            document.getElementById('end-time-controls').classList.add('opacity-50', 'pointer-events-none');
        }
        
        // Set equipment checkboxes
        const equipment = room.equipment || [];
        document.querySelectorAll('input[name="equipment"]').forEach(checkbox => {
            checkbox.checked = equipment.includes(checkbox.value);
        });
        
        // Use modal manager if available, otherwise fallback
        if (window.modalManager) {
            window.modalManager.show('room-modal');
        } else {
            const modal = document.getElementById('room-modal');
            modal.classList.remove('hidden');
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    }

    function hideRoomModal() {
        // Use modal manager if available, otherwise fallback
        if (window.modalManager) {
            window.modalManager.hide('room-modal');
        } else {
            const modal = document.getElementById('room-modal');
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }
    }

    async function saveRoom(event) {
        event.preventDefault();
        console.log('saveRoom called');
        
        const roomId = document.getElementById('room-id').value;
        const roomName = document.getElementById('room-name').value.trim();
        
        // Validate required fields
        if (!roomName) {
            ApiUtils.showError('Room name is required');
            document.getElementById('room-name').focus();
            return;
        }
        
        // Validate capacity if provided
        const capacity = document.getElementById('room-capacity').value;
        if (capacity && (isNaN(capacity) || parseInt(capacity) < 1)) {
            ApiUtils.showError('Capacity must be a positive number');
            document.getElementById('room-capacity').focus();
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
            visibility_type: document.getElementById('room-visibility').value,
            visible_companies: (() => {
                const visibilityType = document.getElementById('room-visibility').value;
                if (visibilityType === 'specific_companies') {
                    const checkboxes = document.querySelectorAll('input[name="visible_companies"]:checked');
                    return Array.from(checkboxes).map(cb => parseInt(cb.value));
                }
                return null;
            })(),
            operating_hours_start: (() => {
                const noRestriction = document.getElementById('no-restriction-start').checked;
                if (noRestriction) {
                    return null;
                }
                const hour = document.getElementById('room-hours-start-hour').value;
                const minute = document.getElementById('room-hours-start-minute').value;
                if (hour && minute !== '') {
                    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
                }
                return null;
            })(),
            operating_hours_end: (() => {
                const noRestriction = document.getElementById('no-restriction-end').checked;
                if (noRestriction) {
                    return null;
                }
                const hour = document.getElementById('room-hours-end-hour').value;
                const minute = document.getElementById('room-hours-end-minute').value;
                if (hour && minute !== '') {
                    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
                }
                return null;
            })(),
            equipment: equipment
        };
        
        console.log('Room data to save:', roomData);
        
        const url = roomId ? `/api/rooms/${roomId}` : '/api/rooms';
        const method = roomId ? 'PUT' : 'POST';
        
        // Show loading state
        const saveBtn = document.getElementById('save-room-btn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
            const response = await ApiUtils.fetchWithErrorHandling(url, {
                method: method,
                body: JSON.stringify(roomData)
            });
            
            hideRoomModal();
            await loadRooms();
            ApiUtils.showSuccess(roomId ? 'Room updated successfully!' : 'Room created successfully!');
        } catch (error) {
            console.error('Error saving room:', error);
            ApiUtils.showError(error.message || 'Failed to save room');
        } finally {
            // Restore button state
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    function deleteRoom(roomId) {
        roomToDelete = roomId;
        if (window.modalManager) {
            window.modalManager.show('delete-modal');
        } else {
            const modal = document.getElementById('delete-modal');
            modal.classList.remove('hidden');
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    }

    function hideDeleteModal() {
        if (window.modalManager) {
            window.modalManager.hide('delete-modal');
        } else {
            const modal = document.getElementById('delete-modal');
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }
        roomToDelete = null;
    }

    async function confirmDeleteRoom() {
        if (!roomToDelete) return;
        
        // Show loading state
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const originalText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';
        
        try {
            await ApiUtils.fetchWithErrorHandling(`/api/rooms/${roomToDelete}`, {
                method: 'DELETE'
            });
            
            hideDeleteModal();
            await loadRooms();
            ApiUtils.showSuccess('Room deleted successfully!');
        } catch (error) {
            console.error('Error deleting room:', error);
            ApiUtils.showError(error.message || 'Failed to delete room');
        } finally {
            // Restore button state
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
        }
    }

    function hideLoadingState() {
        document.getElementById('loading-state')?.classList.add('hidden');
    }

    function showEmptyState() {
        document.getElementById('empty-state')?.classList.remove('hidden');
    }

    function hideEmptyState() {
        document.getElementById('empty-state')?.classList.add('hidden');
    }

    async function loadCompanies() {
        try {
            const response = await ApiUtils.fetchWithErrorHandling('/api/companies/list');
            const companies = response.companies;
            
            const companiesContainer = document.getElementById('companies-checkboxes');
            companiesContainer.innerHTML = companies.map(company => `
                <div class="flex items-center">
                    <input type="checkbox" id="company-${company.id}" name="visible_companies" value="${company.id}" class="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500">
                    <label for="company-${company.id}" class="text-sm font-medium text-gray-700">${company.name}</label>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading companies:', error);
        }
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