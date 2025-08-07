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
    const calendarRoomFilter = document.getElementById('calendar-room-filter');
    const selectedRoomInfo = document.getElementById('selected-room-info');

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
    let selectedPresetDuration = null; // Track the selected preset duration

    const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const formatDateForInput = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`; // HTML date input still needs YYYY-MM-DD
    };

    // --- Load Rooms Function ---
    async function loadRooms() {
        try {
            console.log('Loading rooms...');
            const response = await fetch('/api/rooms');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to load rooms: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Rooms data:', data);
            
            const rooms = data.rooms || []; // Extract rooms array from response
            console.log('Rooms array:', rooms);
            
            // Populate booking modal room select
            if (roomSelect) {
                roomSelect.innerHTML = '<option value="">Select a room</option>';
                rooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = room.name;
                    roomSelect.appendChild(option);
                });
                console.log('Populated booking modal room select');
            }
            
            // Populate calendar room filter
            const currentCalendarRoomFilter = calendarRoomFilter || window.calendarRoomFilter;
            if (currentCalendarRoomFilter) {
                console.log('Found calendar room filter element, populating with', rooms.length, 'rooms');
                currentCalendarRoomFilter.innerHTML = '';
                rooms.forEach((room, index) => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = room.name;
                    currentCalendarRoomFilter.appendChild(option);
                    console.log('Added room option:', room.name);
                    
                    // Select the first room by default
                    if (index === 0) {
                        option.selected = true;
                        console.log('Selected first room:', room.name);
                    }
                });
                console.log('Populated calendar room filter');
                
                // Trigger change event to load filtered events
                if (rooms.length > 0) {
                    currentCalendarRoomFilter.dispatchEvent(new Event('change'));
                }
            } else {
                console.log('Calendar room filter element not found!');
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
            if (roomSelect) {
                roomSelect.innerHTML = '<option value="">Error loading rooms</option>';
            }
            if (calendarRoomFilter) {
                calendarRoomFilter.innerHTML = '<option value="">Error loading rooms</option>';
            }
        }
    }

    // --- Time Picker Logic ---
    function generateHourSlots() {
        const slots = [];
        for (let i = 6; i <= 18; i++) { // Generate 6am to 6pm
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
            option.className = 'time-dropdown-option';
            option.textContent = slot.label;
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                els.text.textContent = slot.label;
                stateObject[type] = slot.value;
                
                // If this is a start time change and we have a preset selected, update end time
                if (mode === 'new' && selectedPresetDuration && (type === 'startHour' || type === 'startMinute')) {
                    console.log(`Start ${type} changed to ${slot.value}, updating end time...`);
                    setTimeout(() => {
                        updateEndTimeFromPreset();
                    }, 150);
                }
                
                // Add visual feedback
                els.btn.classList.add('selected');
                
                // Hide dropdown with animation
                els.dropdown.classList.add('hidden');
                els.dropdown.classList.remove('show');
                els.btn.classList.remove('dropdown-open');
                
                // Update duration display for new booking modal
                if (mode === 'new') {
                    updateDurationDisplay();
                    // Auto-update end time if a preset is selected
                    updateEndTimeFromPreset();
                }
                
                // Auto-update end time when start time changes (if preset is selected)
                if (mode === 'new' && (type === 'startHour' || type === 'startMinute')) {
                    // Small delay to ensure the state is updated
                    setTimeout(() => {
                        console.log('Start time changed, checking for preset update...');
                        updateEndTimeFromPreset();
                    }, 100);
                }
                
                // Clear selected preset if user manually changes end time
                if (mode === 'new' && (type === 'endHour' || type === 'endMinute')) {
                    selectedPresetDuration = null;
                    // Remove active class from all preset buttons
                    document.querySelectorAll('.time-preset-btn').forEach(btn => btn.classList.remove('active'));
                    console.log('Preset cleared because end time was manually changed');
                }
            });
            els.dropdown.appendChild(option);
        });

        els.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Close all other dropdowns first
            const allDropdowns = Object.values(timePickerElements.new).concat(Object.values(timePickerElements.edit));
            allDropdowns.forEach(item => {
                if (item.dropdown && item.dropdown !== els.dropdown) {
                    item.dropdown.classList.add('hidden');
                    item.dropdown.classList.remove('show');
                    // Remove dropdown-open class from other buttons
                    if (item.btn) {
                        item.btn.classList.remove('dropdown-open');
                    }
                }
            });
            
            // Toggle current dropdown
            const isHidden = els.dropdown.classList.contains('hidden');
            els.dropdown.classList.toggle('hidden');
            
            if (!els.dropdown.classList.contains('hidden')) {
                els.dropdown.classList.add('show');
                // Add focus state to button and remove selected state when opening dropdown
                els.btn.classList.add('dropdown-open');
                els.btn.classList.remove('selected');
            } else {
                els.dropdown.classList.remove('show');
                els.btn.classList.remove('dropdown-open');
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!els.btn.contains(e.target) && !els.dropdown.contains(e.target)) {
                els.dropdown.classList.add('hidden');
                els.dropdown.classList.remove('show');
                els.btn.classList.remove('dropdown-open');
                // Remove selected state when clicking outside
                els.btn.classList.remove('selected');
            }
        });
        
        // Add keyboard navigation
        els.btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                els.btn.click();
            }
        });
        
        // Remove selected state when button loses focus (but keep it briefly for visual feedback)
        els.btn.addEventListener('blur', () => {
            // Small delay to allow for dropdown option clicks
            setTimeout(() => {
                if (!els.dropdown.contains(document.activeElement)) {
                    els.btn.classList.remove('selected');
                }
            }, 150);
        });
        

    }

    // --- Initialize Time Pickers ---
    Object.keys(timePickerElements.new).forEach(type => {
        setupDropdown(type, 'new', newBookingState);
    });

    Object.keys(timePickerElements.edit).forEach(type => {
        setupDropdown(type, 'edit', editBookingState);
    });
    
    // Add additional listeners for start time changes
    if (timePickerElements.new.startHour && timePickerElements.new.startHour.btn) {
        timePickerElements.new.startHour.btn.addEventListener('click', () => {
            setTimeout(() => {
                if (selectedPresetDuration) {
                    console.log('Start hour button clicked, updating end time...');
                    updateEndTimeFromPreset();
                }
            }, 200);
        });
    }
    
    if (timePickerElements.new.startMinute && timePickerElements.new.startMinute.btn) {
        timePickerElements.new.startMinute.btn.addEventListener('click', () => {
            setTimeout(() => {
                if (selectedPresetDuration) {
                    console.log('Start minute button clicked, updating end time...');
                    updateEndTimeFromPreset();
                }
            }, 200);
        });
    }
    
    // --- Initialize New Features ---
    // Time preset buttons
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOMContentLoaded event fired');
        initializeTimePresets();
        initializeRecurringOptions();
    });
    
    // Fallback initialization in case DOMContentLoaded has already fired
    if (document.readyState === 'loading') {
        console.log('Document still loading, waiting for DOMContentLoaded');
    } else {
        console.log('Document already loaded, initializing immediately');
        initializeTimePresets();
        initializeRecurringOptions();
    }
    
    function initializeTimePresets() {
        const timePresetBtns = document.querySelectorAll('.time-preset-btn');
        console.log('Found time preset buttons:', timePresetBtns.length);
        
        timePresetBtns.forEach((btn, index) => {
            console.log(`Button ${index}:`, btn.textContent, 'duration:', btn.dataset.duration);
            btn.addEventListener('click', function() {
                console.log('Time preset button clicked:', this.textContent, 'duration:', this.dataset.duration);
                const duration = parseInt(this.dataset.duration);
                
                // Remove active class from all buttons
                timePresetBtns.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Apply the time preset
                applyTimePreset(duration);
                
                // Show duration display
                const durationDisplay = document.getElementById('duration-display');
                if (durationDisplay) {
                    durationDisplay.classList.remove('hidden');
                }
            });
        });
    }
    
    function initializeRecurringOptions() {
        // Recurring options
        const recurringRadios = document.querySelectorAll('input[name="recurring"]');
        const recurringEndDate = document.getElementById('recurring-end-date');
        
        recurringRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value !== 'none') {
                    recurringEndDate.classList.remove('hidden');
                    // Set default end date to 1 month from now
                    const defaultEndDate = new Date();
                    defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
                    
                    // Update the hidden input
                    document.getElementById('recurring_end_date').value = formatDateForInput(defaultEndDate);
                    
                    // Update the custom date picker display
                    if (window.recurringSelectedDate !== undefined) {
                        window.recurringSelectedDate = defaultEndDate;
                        if (window.updateRecurringDateDisplay) {
                            window.updateRecurringDateDisplay();
                        }
                    }
                } else {
                    recurringEndDate.classList.add('hidden');
                    // Reset the recurring date picker
                    if (window.recurringSelectedDate !== undefined) {
                        window.recurringSelectedDate = null;
                        if (window.updateRecurringDateDisplay) {
                            window.updateRecurringDateDisplay();
                        }
                    }
                }
            });
        });
        
        // Visibility options
        const visibilityRadios = document.querySelectorAll('input[name="is_public"]');
        const companySelection = document.getElementById('company-selection');
        
        visibilityRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'select_companies') {
                    companySelection.classList.remove('hidden');
                    loadCompanies();
                } else {
                    companySelection.classList.add('hidden');
                }
                
                // Log the selected visibility option
                console.log('Visibility changed to:', this.value);
            });
        });
        
        // Function to load companies from database
        async function loadCompanies() {
            const companiesList = document.getElementById('companies-list');
            if (!companiesList) return;
            
            try {
                const response = await fetch('/api/companies/list');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const companies = data.companies || [];
                
                // Clear loading state
                companiesList.innerHTML = '';
                
                if (companies.length === 0) {
                    companiesList.innerHTML = `
                        <div class="text-center text-gray-500 text-sm py-4">
                            No companies available
                        </div>
                    `;
                    return;
                }
                
                // Add company checkboxes
                companies.forEach(company => {
                    const companyDiv = document.createElement('div');
                    companyDiv.innerHTML = `
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" name="selected_companies" value="${company.id}" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                            <span class="ml-2 text-sm text-gray-700">${company.name}</span>
                        </label>
                    `;
                    companiesList.appendChild(companyDiv);
                });
                
                console.log(`Loaded ${companies.length} companies from database`);
                
            } catch (error) {
                console.error('Error loading companies:', error);
                companiesList.innerHTML = `
                    <div class="text-center text-red-500 text-sm py-4">
                        Error loading companies. Please try again.
                    </div>
                `;
            }
        }
    }

    // --- Date Formatting Function ---
    let datesFormatted = false;
    
    function formatCalendarDates() {
        if (datesFormatted) return; // Prevent re-formatting
        
        const headerCells = document.querySelectorAll('.fc-col-header-cell');
        headerCells.forEach(cell => {
            const dateElement = cell.querySelector('.fc-col-header-cell-cushion');
            if (dateElement && !dateElement.dataset.formatted) {
                const text = dateElement.textContent;
                // Only convert if it's in MM/DD format
                const match = text.match(/(\w+)[,\s]*(\d+)\/(\d+)/);
                if (match) {
                    const weekday = match[1];
                    const firstNum = parseInt(match[2]);
                    const secondNum = parseInt(match[3]);
                    
                    // Convert MM/DD to DD/MM
                    const newText = `${weekday} ${secondNum}/${firstNum}`;
                    dateElement.textContent = newText;
                    dateElement.dataset.formatted = 'true'; // Mark as formatted
                }
            }
        });
        datesFormatted = true;
    }

    // --- Calendar Initialization ---
    if (calendarEl) {
        window.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Today',
                month: 'Month',
                week: 'Week',
                day: 'Day'
            },
            slotMinTime: '06:00:00',
            slotMaxTime: '18:00:00',
            allDaySlot: false,
            height: 'auto',
            events: function(info, successCallback, failureCallback) {
                const selectedRoomId = calendarRoomFilter ? calendarRoomFilter.value : '';
                let url = '/api/bookings';
                if (selectedRoomId) {
                    url += `?room_id=${selectedRoomId}`;
                }
                
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        successCallback(data);
                    })
                    .catch(error => {
                        console.error('Error fetching events:', error);
                        failureCallback(error);
                    });
            },
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
                                info.el.classList.add('fc-event-gray');
                }
            },
            datesSet: function(info) {
                // Reset formatting flag when calendar dates change
                datesFormatted = false;
                // Format dates to DD/MM when calendar dates change
                setTimeout(formatCalendarDates, 50);
            }
        });
        
        // Replace calendar title with room filter
        setTimeout(() => {
            const titleElement = document.querySelector('.fc-toolbar-title');
            console.log('Title element found:', !!titleElement);
            if (titleElement) {
                // Create room filter container
                const filterContainer = document.createElement('div');
                filterContainer.className = 'flex items-center space-x-3';
                filterContainer.innerHTML = `
                    <select id="calendar-room-filter" class="form-select w-64 text-base">
                    </select>
                `;
                
                // Replace the title with the room filter
                titleElement.style.display = 'none';
                titleElement.parentNode.appendChild(filterContainer);
                console.log('Room filter container added to DOM');
                
                // Check if the select element was created
                const selectElement = document.getElementById('calendar-room-filter');
                console.log('Calendar room filter select found:', !!selectElement);
                
                // Update the global reference to the new element
                if (selectElement) {
                    window.calendarRoomFilter = selectElement;
                    console.log('Updated calendar room filter reference');
                    
                    // Now populate the room filter
                    loadRooms();
                }
            }
        }, 100);
        
        window.calendar.render();
        
        // Initial date formatting
        setTimeout(formatCalendarDates, 100);
        
        // Load rooms for filter
        console.log('About to load rooms...');
        loadRooms();
        
        // Add room filter event listener
        const currentCalendarRoomFilter = calendarRoomFilter || window.calendarRoomFilter;
        if (currentCalendarRoomFilter) {
            currentCalendarRoomFilter.addEventListener('change', function() {
                // Refetch calendar events with room filter
                calendar.refetchEvents();
            });
        }
    }

    // --- Modal Control Functions ---
    const showModal = (modal) => modal.classList.add('show');
    const hideModal = (modal) => modal.classList.remove('show');

    // --- Custom Date Picker ---
    const bookingDateInput = document.getElementById('booking_date');
    const dateDisplay = document.getElementById('date-display');
    const dateDisplayText = document.getElementById('date-display-text');
    const customDatePicker = document.getElementById('custom-date-picker');
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    let currentDate = new Date();
    let selectedDate = new Date(); // Initialize with today's date
    
    if (bookingDateInput && dateDisplay && customDatePicker) {
        // Initialize the date picker
        function initDatePicker() {
            // Ensure selectedDate is set to today if it's null
            if (!selectedDate) {
                selectedDate = new Date();
            }
            renderCalendar();
            updateDateDisplay();
        }
        
        // Render the calendar
        function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Update header
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            currentMonthYear.textContent = `${monthNames[month]} ${year}`;
            
            // Clear grid
            calendarGrid.innerHTML = '';
            
            // Get first day of month and number of days
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            // Calculate how many weeks we need for this month
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const firstDayWeekday = firstDayOfMonth.getDay();
            const lastDayDate = lastDayOfMonth.getDate();
            
            // Calculate total days needed (previous month days + current month days)
            const daysFromPrevMonth = firstDayWeekday;
            const totalDaysNeeded = daysFromPrevMonth + lastDayDate;
            const weeksNeeded = Math.ceil(totalDaysNeeded / 7);
            
            // Generate calendar days dynamically
            for (let i = 0; i < weeksNeeded * 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                const dayElement = document.createElement('div');
                dayElement.className = 'text-center py-1 px-1 cursor-pointer rounded hover:bg-gray-100 text-xs';
                
                // Check if it's the current month
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                
                if (!isCurrentMonth) {
                    dayElement.classList.add('bg-gray-100', 'text-gray-500', 'opacity-30');
                } else if (isToday) {
                    dayElement.classList.add('bg-blue-100', 'text-blue-600', 'font-semibold');
                } else if (isSelected) {
                    dayElement.classList.add('bg-blue-500', 'text-white', 'font-semibold');
                }
                
                dayElement.textContent = date.getDate();
                dayElement.addEventListener('click', () => selectDate(date));
                
                calendarGrid.appendChild(dayElement);
            }
        }
        
        // Select a date
        function selectDate(date) {
            selectedDate = date;
            bookingDateInput.value = formatDateForInput(date);
            updateDateDisplay();
            hideDatePicker();
        }
        
        // Update the display text
        function updateDateDisplay() {
            if (selectedDate) {
                const formattedDate = selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                dateDisplayText.textContent = formattedDate;
                // Also update the hidden input value
                if (bookingDateInput) {
                    bookingDateInput.value = formatDateForInput(selectedDate);
                }
            } else {
                dateDisplayText.textContent = 'Select a date';
            }
        }
        
        // Show date picker
        function showDatePicker() {
            customDatePicker.classList.remove('hidden');
            renderCalendar();
        }
        
        // Hide date picker
        function hideDatePicker() {
            customDatePicker.classList.add('hidden');
        }
        
        // Event listeners
        dateDisplay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showDatePicker();
        });
        
        // Handle focus event for keyboard navigation
        dateDisplay.addEventListener('focus', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showDatePicker();
        });
        
        // Prevent clicks inside the date picker from closing it
        customDatePicker.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        prevMonthBtn.addEventListener('click', function() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
        
        nextMonthBtn.addEventListener('click', function() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
        
        // Close date picker when clicking outside
        document.addEventListener('click', function(e) {
            // Check if the date picker is currently visible
            if (customDatePicker.classList.contains('hidden')) {
                return;
            }
            
            // Check if the click target is outside both the date picker and the date display
            const isOutsideDatePicker = !customDatePicker.contains(e.target);
            const isOutsideDateDisplay = !dateDisplay.contains(e.target);
            
            if (isOutsideDatePicker && isOutsideDateDisplay) {
                hideDatePicker();
            }
        });
        
        // Also close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !customDatePicker.classList.contains('hidden')) {
                hideDatePicker();
            }
        });
        
        // Additional click outside handler specifically for the modal context
        const modalOverlay = document.getElementById('booking-modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                // Only handle clicks if the date picker is visible
                if (!customDatePicker.classList.contains('hidden')) {
                    const isOutsideDatePicker = !customDatePicker.contains(e.target);
                    const isOutsideDateDisplay = !dateDisplay.contains(e.target);
                    
                    if (isOutsideDatePicker && isOutsideDateDisplay) {
                        hideDatePicker();
                    }
                }
            });
        }
        
        // Initialize
        initDatePicker();
        
        // Make functions globally available
        window.updateDateDisplay = updateDateDisplay;
        window.selectedDate = selectedDate;
    }

    // --- Custom Recurring Date Picker ---
    const recurringEndDateInput = document.getElementById('recurring_end_date');
    const recurringDateDisplay = document.getElementById('recurring-date-display');
    const recurringDateDisplayText = document.getElementById('recurring-date-display-text');
    const customRecurringDatePicker = document.getElementById('custom-recurring-date-picker');
    const recurringCalendarGrid = document.getElementById('recurring-calendar-grid');
    const recurringCurrentMonthYear = document.getElementById('recurring-current-month-year');
    const recurringPrevMonthBtn = document.getElementById('recurring-prev-month');
    const recurringNextMonthBtn = document.getElementById('recurring-next-month');
    
    let recurringCurrentDate = new Date();
    let recurringSelectedDate = null; // Initialize as null for recurring end date
    
    if (recurringEndDateInput && recurringDateDisplay && customRecurringDatePicker) {
        // Initialize the recurring date picker
        function initRecurringDatePicker() {
            renderRecurringCalendar();
            updateRecurringDateDisplay();
        }
        
        // Render the recurring calendar
        function renderRecurringCalendar() {
            const year = recurringCurrentDate.getFullYear();
            const month = recurringCurrentDate.getMonth();
            
            // Update header
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            recurringCurrentMonthYear.textContent = `${monthNames[month]} ${year}`;
            
            // Clear grid
            recurringCalendarGrid.innerHTML = '';
            
            // Get first day of month and number of days
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            // Calculate how many weeks we need for this month
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const firstDayWeekday = firstDayOfMonth.getDay();
            const lastDayDate = lastDayOfMonth.getDate();
            
            // Calculate total days needed (previous month days + current month days)
            const daysFromPrevMonth = firstDayWeekday;
            const totalDaysNeeded = daysFromPrevMonth + lastDayDate;
            const weeksNeeded = Math.ceil(totalDaysNeeded / 7);
            
            // Generate calendar days dynamically
            for (let i = 0; i < weeksNeeded * 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                const dayElement = document.createElement('div');
                dayElement.className = 'text-center py-1 px-1 cursor-pointer rounded hover:bg-gray-100 text-xs';
                
                // Check if it's the current month
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = recurringSelectedDate && date.toDateString() === recurringSelectedDate.toDateString();
                
                if (!isCurrentMonth) {
                    dayElement.classList.add('bg-gray-100', 'text-gray-500', 'opacity-30');
                } else if (isToday) {
                    dayElement.classList.add('bg-blue-100', 'text-blue-600', 'font-semibold');
                } else if (isSelected) {
                    dayElement.classList.add('bg-blue-500', 'text-white', 'font-semibold');
                }
                
                dayElement.textContent = date.getDate();
                dayElement.addEventListener('click', () => selectRecurringDate(date));
                
                recurringCalendarGrid.appendChild(dayElement);
            }
        }
        
        // Select a recurring date
        function selectRecurringDate(date) {
            recurringSelectedDate = date;
            recurringEndDateInput.value = formatDateForInput(date);
            updateRecurringDateDisplay();
            hideRecurringDatePicker();
        }
        
        // Update the recurring display text
        function updateRecurringDateDisplay() {
            if (recurringSelectedDate) {
                const formattedDate = recurringSelectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                recurringDateDisplayText.textContent = formattedDate;
                // Also update the hidden input value
                if (recurringEndDateInput) {
                    recurringEndDateInput.value = formatDateForInput(recurringSelectedDate);
                }
            } else {
                recurringDateDisplayText.textContent = 'Select an end date';
            }
        }
        
        // Show recurring date picker
        function showRecurringDatePicker() {
            customRecurringDatePicker.classList.remove('hidden');
            renderRecurringCalendar();
        }
        
        // Hide recurring date picker
        function hideRecurringDatePicker() {
            customRecurringDatePicker.classList.add('hidden');
        }
        
        // Event listeners
        recurringDateDisplay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showRecurringDatePicker();
        });
        
        // Handle focus event for keyboard navigation
        recurringDateDisplay.addEventListener('focus', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showRecurringDatePicker();
        });
        
        // Prevent clicks inside the recurring date picker from closing it
        customRecurringDatePicker.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        recurringPrevMonthBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            recurringCurrentDate.setMonth(recurringCurrentDate.getMonth() - 1);
            renderRecurringCalendar();
        });
        
        recurringNextMonthBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            recurringCurrentDate.setMonth(recurringCurrentDate.getMonth() + 1);
            renderRecurringCalendar();
        });
        
        // Close recurring date picker when clicking outside
        document.addEventListener('click', function(e) {
            // Check if the recurring date picker is currently visible
            if (customRecurringDatePicker.classList.contains('hidden')) {
                return;
            }
            
            // Check if the click target is outside both the recurring date picker and the recurring date display
            const isOutsideRecurringDatePicker = !customRecurringDatePicker.contains(e.target);
            const isOutsideRecurringDateDisplay = !recurringDateDisplay.contains(e.target);
            
            if (isOutsideRecurringDatePicker && isOutsideRecurringDateDisplay) {
                hideRecurringDatePicker();
            }
        });
        
        // Also close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !customRecurringDatePicker.classList.contains('hidden')) {
                hideRecurringDatePicker();
            }
        });
        
        // Additional click outside handler specifically for the modal context
        const modalOverlay = document.getElementById('booking-modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                // Only handle clicks if the recurring date picker is visible
                if (!customRecurringDatePicker.classList.contains('hidden')) {
                    const isOutsideRecurringDatePicker = !customRecurringDatePicker.contains(e.target);
                    const isOutsideRecurringDateDisplay = !recurringDateDisplay.contains(e.target);
                    
                    if (isOutsideRecurringDatePicker && isOutsideRecurringDateDisplay) {
                        hideRecurringDatePicker();
                    }
                }
            });
        }
        
        // Initialize
        initRecurringDatePicker();
        
        // Make functions globally available
        window.updateRecurringDateDisplay = updateRecurringDateDisplay;
        window.recurringSelectedDate = recurringSelectedDate;
    }

    // --- New Booking Logic ---
    function openNewBookingModal(start, end) {
        bookingForm.reset();
        const startDate = start || new Date();
        const endDate = end || new Date(startDate.getTime() + 60 * 60 * 1000);

        // Set the booking date input value
        bookingForm.querySelector('#booking_date').value = formatDateForInput(startDate);
        
        // Set the selected date for the custom date picker
        if (window.selectedDate !== undefined) {
            window.selectedDate = new Date(startDate);
        }
        
        newBookingState.startHour = startDate.getHours().toString().padStart(2, '0');
        newBookingState.startMinute = (Math.round(startDate.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');
        newBookingState.endHour = endDate.getHours().toString().padStart(2, '0');
        newBookingState.endMinute = (Math.round(endDate.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');

        timePickerElements.new.startHour.text.textContent = generateHourSlots().find(s => s.value === newBookingState.startHour)?.label || 'Hour';
        timePickerElements.new.startMinute.text.textContent = newBookingState.startMinute;
        timePickerElements.new.endHour.text.textContent = generateHourSlots().find(s => s.value === newBookingState.endHour)?.label || 'Hour';
        timePickerElements.new.endMinute.text.textContent = newBookingState.endMinute;
        
        bookingForm.querySelector('#title').value = 'New Booking';
        
        // Reset recurring options
        bookingForm.querySelector('input[name="recurring"][value="none"]').checked = true;
        document.getElementById('recurring-end-date').classList.add('hidden');
        
        // Reset recurring date picker
        if (window.recurringSelectedDate !== undefined) {
            window.recurringSelectedDate = null;
            if (window.updateRecurringDateDisplay) {
                window.updateRecurringDateDisplay();
            }
        }
        
        // Reset time presets
        document.querySelectorAll('.time-preset-btn').forEach(btn => btn.classList.remove('active'));
        
        // Hide duration display
        document.getElementById('duration-display').classList.add('hidden');
        
        // Reset selected preset duration
        selectedPresetDuration = null;
        console.log('Modal opened, selectedPresetDuration reset to:', selectedPresetDuration);
        
        // Load rooms when opening modal
        loadRooms();
        
        showModal(bookingModal);
        bookingForm.querySelector('#title').focus();
        
        // Update duration display
        updateDurationDisplay();
        
        // Update date display
        setTimeout(() => {
            // Set the selected date to today's date
            if (window.selectedDate !== undefined) {
                window.selectedDate = new Date(startDate);
                window.updateDateDisplay();
            }
        }, 100);
    }
    
    // --- Duration Calculation ---
    function updateDurationDisplay() {
        const startHour = parseInt(newBookingState.startHour) || 0;
        const startMinute = parseInt(newBookingState.startMinute) || 0;
        const endHour = parseInt(newBookingState.endHour) || 0;
        const endMinute = parseInt(newBookingState.endMinute) || 0;
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        let durationMinutes = endTotalMinutes - startTotalMinutes;
        
        if (durationMinutes <= 0) {
            durationMinutes = 0;
        }
        
        const durationDisplay = document.getElementById('duration-display');
        const durationText = document.getElementById('duration-text');
        
        if (durationMinutes > 0) {
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            
            let durationString = '';
            if (hours > 0) {
                durationString = `${hours} hour${hours > 1 ? 's' : ''}`;
                if (minutes > 0) {
                    durationString += ` ${minutes} minute${minutes > 1 ? 's' : ''}`;
                }
            } else {
                durationString = `${minutes} minute${minutes > 1 ? 's' : ''}`;
            }
            
            durationText.textContent = `Duration: ${durationString}`;
            durationDisplay.classList.remove('hidden');
        } else {
            durationDisplay.classList.add('hidden');
        }
    }
    
    // --- Time Preset Functions ---
    function applyTimePreset(durationMinutes) {
        // Store the selected preset duration
        selectedPresetDuration = durationMinutes;
        
        // Check if start time is set
        const hasStartTime = newBookingState.startHour && newBookingState.startMinute;
        
        if (!hasStartTime) {
            // Set default start time to current hour or 9 AM if before 9 AM
            const now = new Date();
            const currentHour = now.getHours();
            const defaultHour = currentHour < 9 ? 9 : currentHour;
            
            newBookingState.startHour = defaultHour.toString().padStart(2, '0');
            newBookingState.startMinute = '00';
            
            // Update start time UI - properly format the hour display
            const startHourSlots = generateHourSlots();
            const startHourSlot = startHourSlots.find(s => s.value === newBookingState.startHour);
            if (startHourSlot) {
                timePickerElements.new.startHour.text.textContent = startHourSlot.label;
            } else {
                // Fallback: format the hour manually
                const startHour12 = (defaultHour % 12 === 0) ? 12 : defaultHour % 12;
                const startAmpm = defaultHour < 12 ? 'am' : 'pm';
                timePickerElements.new.startHour.text.textContent = `${startHour12} ${startAmpm}`;
            }
            timePickerElements.new.startMinute.text.textContent = newBookingState.startMinute;
            
            console.log(`No start time set. Using default: ${defaultHour}:00`);
        } else {
            console.log(`Using existing start time: ${newBookingState.startHour}:${newBookingState.startMinute}`);
        }
        
        const startHour = parseInt(newBookingState.startHour);
        const startMinute = parseInt(newBookingState.startMinute);
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = startTotalMinutes + durationMinutes;
        
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        
        // Validate that end time doesn't exceed 6pm (18:00)
        if (endHour > 18) {
            alert('End time cannot be after 6:00 PM. Please choose a shorter duration or earlier start time.');
            return;
        }
        
        // Update end time state
        newBookingState.endHour = endHour.toString().padStart(2, '0');
        newBookingState.endMinute = endMinute.toString().padStart(2, '0');
        
        // Update UI - properly format the hour display
        const hourSlots = generateHourSlots();
        const endHourSlot = hourSlots.find(s => s.value === newBookingState.endHour);
        if (endHourSlot) {
            timePickerElements.new.endHour.text.textContent = endHourSlot.label;
        } else {
            // Fallback: format the hour manually
            const hour12 = (endHour % 12 === 0) ? 12 : endHour % 12;
            const ampm = endHour < 12 ? 'am' : 'pm';
            timePickerElements.new.endHour.text.textContent = `${hour12} ${ampm}`;
        }
        
        // Update minute display
        timePickerElements.new.endMinute.text.textContent = newBookingState.endMinute;
        
        // Add selected state to end time buttons to show they have been updated
        timePickerElements.new.endHour.btn.classList.add('selected');
        timePickerElements.new.endMinute.btn.classList.add('selected');
        
        // Remove selected state after a brief delay to show the update
        setTimeout(() => {
            timePickerElements.new.endHour.btn.classList.remove('selected');
            timePickerElements.new.endMinute.btn.classList.remove('selected');
        }, 1000);
        
        // Update duration display
        updateDurationDisplay();
        
        // Show success feedback
        const startTimeFormatted = `${startHour}:${startMinute.toString().padStart(2, '0')}`;
        const endTimeFormatted = `${endHour}:${endMinute.toString().padStart(2, '0')}`;
        console.log(`Applied ${durationMinutes}-minute preset. Start: ${startTimeFormatted}, End: ${endTimeFormatted}`);
        console.log('End time state updated:', newBookingState.endHour, newBookingState.endMinute);
        console.log('End time UI elements:', timePickerElements.new.endHour.text.textContent, timePickerElements.new.endMinute.text.textContent);
        
        // Show visual feedback to user
        const durationDisplay = document.getElementById('duration-display');
        if (durationDisplay) {
            durationDisplay.classList.remove('hidden');
            durationDisplay.classList.add('show');
        }
    }
    
    // Function to update end time based on selected preset duration
    function updateEndTimeFromPreset() {
        console.log('updateEndTimeFromPreset called with selectedPresetDuration:', selectedPresetDuration);
        console.log('Current start time state:', newBookingState.startHour, newBookingState.startMinute);
        
        if (!selectedPresetDuration) {
            console.log('No preset selected, skipping auto-update');
            return; // No preset selected
        }
        
        const startHour = parseInt(newBookingState.startHour);
        const startMinute = parseInt(newBookingState.startMinute);
        
        if (!startHour || !startMinute) {
            console.log('Start time not fully set, skipping auto-update');
            return; // No start time set
        }
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = startTotalMinutes + selectedPresetDuration;
        
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        
        // Validate that end time doesn't exceed 6pm (18:00)
        if (endHour > 18) {
            console.log(`End time would exceed 6 PM (${endHour}:${endMinute.toString().padStart(2, '0')}), not updating`);
            return;
        }
        
        // Update end time state
        newBookingState.endHour = endHour.toString().padStart(2, '0');
        newBookingState.endMinute = endMinute.toString().padStart(2, '0');
        
        // Update UI - properly format the hour display
        const hourSlots = generateHourSlots();
        const endHourSlot = hourSlots.find(s => s.value === newBookingState.endHour);
        if (endHourSlot) {
            timePickerElements.new.endHour.text.textContent = endHourSlot.label;
        } else {
            // Fallback: format the hour manually
            const hour12 = (endHour % 12 === 0) ? 12 : endHour % 12;
            const ampm = endHour < 12 ? 'am' : 'pm';
            timePickerElements.new.endHour.text.textContent = `${hour12} ${ampm}`;
        }
        
        // Update minute display
        timePickerElements.new.endMinute.text.textContent = newBookingState.endMinute;
        
        // Add visual feedback for the update
        timePickerElements.new.endHour.btn.classList.add('selected');
        timePickerElements.new.endMinute.btn.classList.add('selected');
        
        // Remove selected state after a brief delay
        setTimeout(() => {
            timePickerElements.new.endHour.btn.classList.remove('selected');
            timePickerElements.new.endMinute.btn.classList.remove('selected');
        }, 800);
        
        // Update duration display
        updateDurationDisplay();
        
        console.log(`Auto-updated end time based on ${selectedPresetDuration}-minute preset. Start: ${startHour}:${startMinute.toString().padStart(2, '0')}, End: ${endHour}:${endMinute.toString().padStart(2, '0')}`);
    }
    
    // --- Time Validation ---
    function validateTimeRange() {
        const startHour = parseInt(newBookingState.startHour) || 0;
        const startMinute = parseInt(newBookingState.startMinute) || 0;
        const endHour = parseInt(newBookingState.endHour) || 0;
        const endMinute = parseInt(newBookingState.endMinute) || 0;
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        // Clear previous validation states
        document.querySelectorAll('.time-picker-container').forEach(container => {
            container.classList.remove('error', 'valid');
        });
        
        if (endTotalMinutes <= startTotalMinutes) {
            // Add error state to time pickers
            document.querySelectorAll('.time-picker-container').forEach(container => {
                container.classList.add('error');
            });
            alert('End time must be after start time.');
            return false;
        }
        
        if (endHour > 18) {
            // Add error state to end time picker
            document.querySelectorAll('.time-picker-container').forEach((container, index) => {
                if (index >= 2) { // End time containers
                    container.classList.add('error');
                }
            });
            alert('End time cannot be after 6:00 PM.');
            return false;
        }
        
        // Add valid state to time pickers
        document.querySelectorAll('.time-picker-container').forEach(container => {
            container.classList.add('valid');
        });
        
        return true;
    }
    
    // --- Form Loading States ---
    function setFormLoading(loading) {
        const submitBtn = document.querySelector('#booking-form button[type="submit"]');
        const form = document.getElementById('booking-form');
        
        if (loading) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            form.classList.add('form-loading');
        } else {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
            form.classList.remove('form-loading');
        }
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
            const formInputs = bookingModal.querySelectorAll('input:not([type="date"]), select, textarea, button:not(.btn-close):not(#cancel-booking-btn), .time-dropdown-btn, .time-dropdown-menu');
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
        
        // Validate time range
        if (!validateTimeRange()) {
            return;
        }
        
        // Set loading state
        setFormLoading(true);
        
        // Convert YYYY-MM-DD to DD-MM-YYYY for backend
        const dateParts = date.split('-');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        
        const bookingData = {
            title: formData.get('title'),
            start_time: `${formattedDate}T${newBookingState.startHour}:${newBookingState.startMinute}`,
            end_time: `${formattedDate}T${newBookingState.endHour}:${newBookingState.endMinute}`,
            room_id: parseInt(roomId),
            is_public: isPublic,
            description: formData.get('description') || '',
            recurring: formData.get('recurring') || 'none',
            recurring_end_date: formData.get('recurring_end_date') || null
        };
        
        fetch('/api/bookings/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData),
        })
        .then(response => response.json())
        .then(data => {
            setFormLoading(false);
            if (data.success) {
                hideModal(bookingModal);
                calendar.refetchEvents();
                alert('Booking created successfully!');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            setFormLoading(false);
            console.error('Error:', error);
            alert('An error occurred while creating the booking');
        });
    });

    // --- View/Edit/Delete Booking Logic ---
    function populateBookingDetails(event) {
        const timeFormat = { hour: 'numeric', minute: '2-digit', hour12: true };
        const startTime = event.start.toLocaleTimeString('en-US', timeFormat);
        const endTime = event.end ? event.end.toLocaleTimeString('en-US', timeFormat) : '';

        // Format date in DD-MM-YYYY
        const startDate = event.start;
        const formattedDate = `${startDate.getDate().toString().padStart(2, '0')}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getFullYear()}`;

        // Populate the read-only view
        detailsTitle.textContent = event.title;
        detailsTime.textContent = `${formattedDate} ${startTime} - ${endTime}`;
        detailsOrganizer.textContent = event.extendedProps.organizer || '';

        // Show/hide edit/delete buttons based on permissions
        if (editBookingBtn) {
            editBookingBtn.classList.toggle('hidden', !event.extendedProps.can_edit);
        }
        if (deleteBookingBtn) {
            deleteBookingBtn.classList.toggle('hidden', !event.extendedProps.can_edit);
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
        editDate.value = formatDateForInput(currentEvent.start);

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
        // Convert YYYY-MM-DD to DD-MM-YYYY for backend
        const dateParts = date.split('-');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        
        const bookingData = {
            title: editTitle.value,
            start_time: `${formattedDate}T${editBookingState.startHour}:${editBookingState.startMinute}`,
            end_time: `${formattedDate}T${editBookingState.endHour}:${editBookingState.endMinute}`,
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