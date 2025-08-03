document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element Selection ---
    const calendarEl = document.getElementById('calendar');
    const authModal = document.getElementById('auth-modal');
    const bookingModal = document.getElementById('booking-modal');
    const bookingForm = document.getElementById('booking-form');
    const authModalBtn = document.getElementById('auth-modal-btn');
    const newBookingBtn = document.getElementById('new-booking-btn');
    const authModalCloseBtn = document.getElementById('auth-modal-close-btn');
    const bookingModalCloseBtn = document.getElementById('booking-modal-close-btn');
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    const bookingModalOverlay = document.getElementById('booking-modal-overlay');
    const roomSelect = document.getElementById('room-select');

    // --- Details Modal Elements ---
    const bookingDetailsModal = document.getElementById('booking-details-modal');
    const bookingDetailsCloseBtn = document.getElementById('booking-details-close-btn');
    const detailsTitleHeading = document.getElementById('details-title-heading');
    const detailsTitle = document.getElementById('details-title');
    const detailsTime = document.getElementById('details-time');
    const detailsOrganizer = document.getElementById('details-organizer');
    const editBookingBtn = document.getElementById('edit-booking-btn');
    const deleteBookingBtn = document.getElementById('delete-booking-btn');
    const detailsView = document.getElementById('details-view'); // The container for the details view

    // --- Edit Form Elements ---
    const detailsEditForm = document.getElementById('details-edit-form');
    const editTitle = document.getElementById('edit-title');
    const editDate = document.getElementById('edit-date');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // --- Time Picker Elements for both Modals ---
    const timePickerElements = {
        new: {
            startHour: { btn: document.getElementById('start-hour-btn'), text: document.getElementById('start-hour-text'), dropdown: document.getElementById('start-hour-dropdown') },
            startMinute: { btn: document.getElementById('start-minute-btn'), text: document.getElementById('start-minute-text'), dropdown: document.getElementById('start-minute-dropdown') },
            endHour: { btn: document.getElementById('end-hour-btn'), text: document.getElementById('end-hour-text'), dropdown: document.getElementById('end-hour-dropdown') },
            endMinute: { btn: document.getElementById('end-minute-btn'), text: document.getElementById('end-minute-text'), dropdown: document.getElementById('end-minute-dropdown') },
        },
        edit: {
            startHour: { btn: document.getElementById('edit-start-hour-btn'), text: document.getElementById('edit-start-hour-text'), dropdown: document.getElementById('edit-start-hour-dropdown') },
            startMinute: { btn: document.getElementById('edit-start-minute-btn'), text: document.getElementById('edit-start-minute-text'), dropdown: document.getElementById('edit-start-minute-dropdown') },
            endHour: { btn: document.getElementById('edit-end-hour-btn'), text: document.getElementById('edit-end-hour-text'), dropdown: document.getElementById('edit-end-hour-dropdown') },
            endMinute: { btn: document.getElementById('edit-end-minute-btn'), text: document.getElementById('edit-end-minute-text'), dropdown: document.getElementById('edit-end-minute-dropdown') },
        }
    };

    // --- State & Helper Functions ---
    let newBookingState = { startHour: '', startMinute: '', endHour: '', endMinute: '' };
    let editBookingState = { startHour: '', startMinute: '', endHour: '', endMinute: '' };
    let currentEvent = null;

    const formatDate = (date) => date.toISOString().slice(0, 10);

    // --- Load Rooms Function ---
    async function loadRooms() {
        try {
            const response = await fetch('/api/rooms');
            if (!response.ok) {
                throw new Error('Failed to load rooms');
            }
            const rooms = await response.json();
            
            roomSelect.innerHTML = '<option value="">Select a room</option>';
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = room.name;
                roomSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading rooms:', error);
            roomSelect.innerHTML = '<option value="">Error loading rooms</option>';
        }
    }

    // --- Time Picker Logic ---
    function generateHourSlots() {
        const slots = [];
        for (let i = 6; i < 18; i++) { // Correctly generates 6am to 5pm
            const hour12 = (i % 12 === 0) ? 12 : i % 12;
            const ampm = i < 12 ? 'am' : 'pm';
            const hour24 = i.toString().padStart(2, '0');
            slots.push({ label: `${hour12} ${ampm}`, value: hour24 });
        }
        return slots;
    }

    function generateMinuteSlots() {
        return ['00', '15', '30', '45'].map(m => ({ label: m, value: m }));
    }

    function setupDropdown(type, mode, stateObject) {
        const els = timePickerElements[mode][type];
        const slots = type.includes('Hour') ? generateHourSlots() : generateMinuteSlots();
        if (!els || !els.btn) return;

        els.dropdown.innerHTML = '';
        slots.forEach(slot => {
            const option = document.createElement('a');
            option.href = '#';
            option.className = '';
            option.textContent = slot.label;
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                els.text.textContent = slot.label;
                stateObject[type] = slot.value;
                els.dropdown.classList.add('hidden');
            });
            els.dropdown.appendChild(option);
        });

        els.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const allDropdowns = Object.values(timePickerElements.new).concat(Object.values(timePickerElements.edit));
            allDropdowns.forEach(item => {
                if (item.dropdown && item.dropdown !== els.dropdown) {
                    item.dropdown.classList.add('hidden');
                }
            });
            els.dropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!els.btn.contains(e.target) && !els.dropdown.contains(e.target)) {
                els.dropdown.classList.add('hidden');
            }
        });
    }

    // --- Initialize Time Pickers ---
    Object.keys(timePickerElements.new).forEach(type => {
        setupDropdown(type, 'new', newBookingState);
    });

    Object.keys(timePickerElements.edit).forEach(type => {
        setupDropdown(type, 'edit', editBookingState);
    });

    // --- Calendar Initialization ---
    if (calendarEl) {
        window.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            slotMinTime: '06:00:00',
            slotMaxTime: '18:00:00',
            allDaySlot: false,
            height: 'auto',
            events: '/api/bookings',
            selectable: true,
            select: function(info) {
                openNewBookingModal(info.start, info.end);
            },
            eventClick: function(info) {
                currentEvent = info.event;
                populateBookingDetails(info.event);
                showModal(bookingDetailsModal);
            },
            eventDidMount: function(info) {
                // Add custom styling for private bookings
                if (info.event.extendedProps.is_public === false) {
                    info.el.style.backgroundColor = '#6B7280';
                    info.el.style.borderColor = '#6B7280';
                }
            }
        });
        window.calendar.render();
    }

    // --- Modal Control Functions ---
    const showModal = (modal) => modal.classList.add('show');
    const hideModal = (modal) => modal.classList.remove('show');

    // --- New Booking Logic ---
    function openNewBookingModal(start, end) {
        bookingForm.reset();
        const startDate = start || new Date();
        const endDate = end || new Date(startDate.getTime() + 60 * 60 * 1000);

        bookingForm.querySelector('#booking_date').value = formatDate(startDate);
        
        newBookingState.startHour = startDate.getHours().toString().padStart(2, '0');
        newBookingState.startMinute = (Math.round(startDate.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');
        newBookingState.endHour = endDate.getHours().toString().padStart(2, '0');
        newBookingState.endMinute = (Math.round(endDate.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');

        timePickerElements.new.startHour.text.textContent = generateHourSlots().find(s => s.value === newBookingState.startHour)?.label || 'Hour';
        timePickerElements.new.startMinute.text.textContent = newBookingState.startMinute;
        timePickerElements.new.endHour.text.textContent = generateHourSlots().find(s => s.value === newBookingState.endHour)?.label || 'Hour';
        timePickerElements.new.endMinute.text.textContent = newBookingState.endMinute;
        
        bookingForm.querySelector('#title').value = 'New Booking';
        
        // Load rooms when opening modal
        loadRooms();
        
        showModal(bookingModal);
        bookingForm.querySelector('#title').focus();
    }
    
    // --- Auth Modal Event Listeners ---
    if (authModalBtn) authModalBtn.addEventListener('click', () => showModal(authModal));
    if (authModalCloseBtn) authModalCloseBtn.addEventListener('click', () => hideModal(authModal));
    if (authModalOverlay) authModalOverlay.addEventListener('click', () => hideModal(authModal));

    // --- Booking Modal Event Listeners ---
    // Use a flag to prevent multiple event listener attachments
    if (!window.bookingModalInitialized) {
        window.bookingModalInitialized = true;
        
        if (newBookingBtn) {
            newBookingBtn.addEventListener('click', () => openNewBookingModal(null, null));
        }
        
        if (bookingModalCloseBtn) {
            bookingModalCloseBtn.addEventListener('click', () => hideModal(bookingModal));
        }
        
        // Add cancel button event listener
        const cancelBookingBtn = document.getElementById('cancel-booking-btn');
        if (cancelBookingBtn) {
            cancelBookingBtn.addEventListener('click', () => hideModal(bookingModal));
        }
        
        // Prevent modal from closing when clicking anywhere inside the modal content
        if (bookingModal) {
            const modalContent = bookingModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            // Prevent closing when clicking on form inputs and other interactive elements
            const formInputs = bookingModal.querySelectorAll('input, select, textarea, button:not(.btn-close):not(#cancel-booking-btn), .dropdown-btn, .dropdown-menu');
            formInputs.forEach(input => {
                input.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });
            
            // Also prevent closing when clicking on the modal overlay (the background)
            if (bookingModalOverlay) {
                bookingModalOverlay.addEventListener('click', (e) => {
                    // Don't close - remove this functionality
                    e.stopPropagation();
                });
            }
        }
    }



    if (bookingForm) bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(bookingForm);
        const date = formData.get('booking_date');
        const roomId = formData.get('room_id');
        const isPublic = formData.get('is_public') === 'true';
        
        if (!roomId) {
            alert('Please select a room');
            return;
        }
        
        const bookingData = {
            title: formData.get('title'),
            start_time: `${date}T${newBookingState.startHour}:${newBookingState.startMinute}`,
            end_time: `${date}T${newBookingState.endHour}:${newBookingState.endMinute}`,
            room_id: parseInt(roomId),
            is_public: isPublic
        };
        
        fetch('/api/bookings/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                hideModal(bookingModal);
                calendar.refetchEvents();
                alert('Booking created successfully!');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while creating the booking');
        });
    });

    // --- View/Edit/Delete Booking Logic ---
    function populateBookingDetails(event) {
        const timeFormat = { hour: 'numeric', minute: '2-digit', hour12: true };
        const startTime = event.start.toLocaleTimeString('en-US', timeFormat);
        const endTime = event.end ? event.end.toLocaleTimeString('en-US', timeFormat) : '';

        // Populate the read-only view
        detailsTitle.textContent = event.title;
        detailsTime.textContent = `${startTime} - ${endTime}`;
        detailsOrganizer.textContent = event.extendedProps.organizer || '';

        // Show/hide edit/delete buttons based on permissions
        if (editBookingBtn) {
            editBookingBtn.style.display = event.extendedProps.can_edit ? 'block' : 'none';
        }
        if (deleteBookingBtn) {
            deleteBookingBtn.style.display = event.extendedProps.can_edit ? 'block' : 'none';
        }

        // Reset to show details and hide edit form
        detailsView.classList.remove('hidden');
        detailsEditForm.classList.add('hidden');
        if (detailsTitleHeading) detailsTitleHeading.textContent = "Booking Details";
    }

    if (editBookingBtn) editBookingBtn.addEventListener('click', function() {
        detailsView.classList.add('hidden');
        detailsEditForm.classList.remove('hidden');
        if (detailsTitleHeading) detailsTitleHeading.textContent = "Edit Booking";

        // Populate form with current event data
        editTitle.value = currentEvent.title;
        editDate.value = formatDate(currentEvent.start);

        editBookingState.startHour = currentEvent.start.getHours().toString().padStart(2, '0');
        editBookingState.startMinute = currentEvent.start.getMinutes().toString().padStart(2, '0');
        editBookingState.endHour = currentEvent.end ? currentEvent.end.getHours().toString().padStart(2, '0') : '';
        editBookingState.endMinute = currentEvent.end ? currentEvent.end.getMinutes().toString().padStart(2, '0') : '';

        // Set the text for the custom dropdowns
        timePickerElements.edit.startHour.text.textContent = generateHourSlots().find(s => s.value === editBookingState.startHour)?.label || 'Hour';
        timePickerElements.edit.startMinute.text.textContent = editBookingState.startMinute;
        timePickerElements.edit.endHour.text.textContent = generateHourSlots().find(s => s.value === editBookingState.endHour)?.label || 'Hour';
        timePickerElements.edit.endMinute.text.textContent = editBookingState.endMinute || 'Min';
    });
    
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', function() {
        // Just switch back to the details view without saving
        populateBookingDetails(currentEvent);
    });

    if (detailsEditForm) detailsEditForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const date = editDate.value;
        const bookingData = {
            title: editTitle.value,
            start_time: `${date}T${editBookingState.startHour}:${editBookingState.startMinute}`,
            end_time: `${date}T${editBookingState.endHour}:${editBookingState.endMinute}`,
        };

        fetch(`/api/bookings/${currentEvent.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                hideModal(bookingDetailsModal);
                calendar.refetchEvents();
                alert('Booking updated!');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating the booking');
        });
    });

    if (deleteBookingBtn) deleteBookingBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this booking?')) {
            fetch(`/api/bookings/${currentEvent.id}/delete`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    hideModal(bookingDetailsModal);
                    calendar.refetchEvents();
                    alert('Booking deleted!');
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting the booking');
            });
        }
    });

    if (bookingDetailsCloseBtn) bookingDetailsCloseBtn.addEventListener('click', () => hideModal(bookingDetailsModal));
    const detailsModalOverlay = document.getElementById('booking-details-modal-overlay');
    if (detailsModalOverlay) detailsModalOverlay.addEventListener('click', () => hideModal(bookingDetailsModal));

    // Global click listener to close dropdowns
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.relative')) {
            const allDropdowns = Object.values(timePickerElements.new).concat(Object.values(timePickerElements.edit));
            allDropdowns.forEach(item => {
                if (item.dropdown) {
                    item.dropdown.classList.add('hidden');
                }
            });
        }
    });
});