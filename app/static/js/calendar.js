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

    // Time Picker Elements
    const timePickerElements = {
        startHour: { btn: document.getElementById('start-hour-btn'), text: document.getElementById('start-hour-text'), dropdown: document.getElementById('start-hour-dropdown') },
        startMinute: { btn: document.getElementById('start-minute-btn'), text: document.getElementById('start-minute-text'), dropdown: document.getElementById('start-minute-dropdown') },
        endHour: { btn: document.getElementById('end-hour-btn'), text: document.getElementById('end-hour-text'), dropdown: document.getElementById('end-hour-dropdown') },
        endMinute: { btn: document.getElementById('end-minute-btn'), text: document.getElementById('end-minute-text'), dropdown: document.getElementById('end-minute-dropdown') },
    };

    // --- State & Helper Functions ---
    let bookingState = { startHour: '', startMinute: '', endHour: '', endMinute: '' };
    function formatDate(date) { return date.toISOString().slice(0, 10); }

    // --- Time Picker Logic ---
    function generateHourSlots() {
        const slots = [];
        for (let i = 6; i < 18; i++) {
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

    function setupDropdown(type, slots) {
        const els = timePickerElements[type];
        els.dropdown.innerHTML = '';
        slots.forEach(slot => {
            const option = document.createElement('a');
            option.href = '#';
            option.className = 'block px-4 py-2 text-sm text-slate-700 hover:bg-indigo-100';
            option.textContent = slot.label;
            option.addEventListener('click', (e) => {
                e.preventDefault();
                els.text.textContent = slot.label;
                bookingState[type] = slot.value;
                els.dropdown.classList.add('hidden');
            });
            els.dropdown.appendChild(option);
        });
        els.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            Object.values(timePickerElements).forEach(item => {
                if (item.dropdown !== els.dropdown) {
                    item.dropdown.classList.add('hidden');
                }
            });
            els.dropdown.classList.toggle('hidden');
        });
    }

    setupDropdown('startHour', generateHourSlots());
    setupDropdown('startMinute', generateMinuteSlots());
    setupDropdown('endHour', generateHourSlots());
    setupDropdown('endMinute', generateMinuteSlots());

    // --- FullCalendar Initialization ---
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'dayGridDay,timeGridWeek,dayGridMonth',
            center: 'title',
            right: 'prev,next today'
        },
        views: {
            dayGridDay: { buttonText: 'Day' },
            timeGridWeek: { buttonText: 'Week' },
            dayGridMonth: { buttonText: 'Month' }
        },
        firstDay: 1,
        locale: 'en-AU',
        allDaySlot: false,
        slotMinTime: '06:00:00',
        slotMaxTime: '18:00:00',
        slotDuration: '00:30:00',      // grid lines every 30 minutes
        slotLabelInterval: '01:00',    // label every hour
        dayHeaderFormat: {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            omitCommas: true
        },
        titleFormat: {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        },
        events: '/api/bookings',
        editable: true,
        selectable: true,
        select: function (info) {
            const startDate = info.start;
            const endDate = info.end;
            bookingForm.querySelector('#booking_date').value = formatDate(startDate);
            const startMinutes = Math.round(startDate.getMinutes() / 15) * 15 % 60;
            const endMinutes = Math.round(endDate.getMinutes() / 15) * 15 % 60;
            bookingState.startHour = startDate.getHours().toString().padStart(2, '0');
            bookingState.startMinute = startMinutes.toString().padStart(2, '0');
            bookingState.endHour = endDate.getHours().toString().padStart(2, '0');
            bookingState.endMinute = endMinutes.toString().padStart(2, '0');
            timePickerElements.startHour.text.textContent = generateHourSlots().find(s => s.value === bookingState.startHour)?.label || 'Hour';
            timePickerElements.startMinute.text.textContent = bookingState.startMinute;
            timePickerElements.endHour.text.textContent = generateHourSlots().find(s => s.value === bookingState.endHour)?.label || 'Hour';
            timePickerElements.endMinute.text.textContent = bookingState.endMinute;
            bookingForm.querySelector('#title').value = 'New Booking';
            showModal(bookingModal);
            bookingForm.querySelector('#title').focus();
        },
        eventContent: function (arg) {
            const timeFormat = { hour: 'numeric', minute: '2-digit', hour12: true };
            const startTime = arg.event.start.toLocaleTimeString('en-US', timeFormat).replace(' ', '');
            const endTime = arg.event.end ? arg.event.end.toLocaleTimeString('en-US', timeFormat).replace(' ', '') : '';
            let organizer = arg.event.extendedProps.organizer || '';
            let title = arg.event.title;
            let eventHtml = `
                <div class="p-1 overflow-hidden">
                    <b class="font-semibold">${title}</b>
                    <div class="text-xs">${startTime} - ${endTime}</div>
                    <div class="text-xs italic">${organizer}</div>
                </div>
            `;
            return { html: eventHtml };
        }
    });

    function setCalendarHeight() {
        calendar.setOption('height', '100%');
    }

    calendar.render();
    calendar.setOption('contentHeight', 700); // 24 slots × 40px

    // --- Modal Control Functions ---
    const showModal = (modal) => modal.classList.remove('hidden');
    const hideModal = (modal) => modal.classList.add('hidden');

    // --- Event Listeners ---
    authModalBtn.addEventListener('click', () => showModal(authModal));
    if (authModalCloseBtn) {
        authModalCloseBtn.addEventListener('click', () => hideModal(authModal));
    }
    authModalOverlay.addEventListener('click', () => hideModal(authModal));
    bookingModalCloseBtn.addEventListener('click', () => hideModal(bookingModal));
    bookingModalOverlay.addEventListener('click', () => hideModal(bookingModal));
    newBookingBtn.addEventListener('click', function () {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        bookingForm.querySelector('#booking_date').value = formatDate(now);
        const startMinutes = Math.round(now.getMinutes() / 15) * 15 % 60;
        const endMinutes = Math.round(oneHourLater.getMinutes() / 15) * 15 % 60;
        bookingState.startHour = now.getHours().toString().padStart(2, '0');
        bookingState.startMinute = startMinutes.toString().padStart(2, '0');
        bookingState.endHour = oneHourLater.getHours().toString().padStart(2, '0');
        bookingState.endMinute = endMinutes.toString().padStart(2, '0');
        timePickerElements.startHour.text.textContent = generateHourSlots().find(s => s.value === bookingState.startHour)?.label || 'Hour';
        timePickerElements.startMinute.text.textContent = bookingState.startMinute;
        timePickerElements.endHour.text.textContent = generateHourSlots().find(s => s.value === bookingState.endHour)?.label || 'Hour';
        timePickerElements.endMinute.text.textContent = bookingState.endMinute;
        bookingForm.querySelector('#title').value = 'New Booking';
        showModal(bookingModal);
        bookingForm.querySelector('#title').focus();
    });

    bookingForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(bookingForm);
        const date = formData.get('booking_date');
        if (!bookingState.startHour || !bookingState.startMinute || !bookingState.endHour || !bookingState.endMinute) {
            alert('Please select a valid start and end time.');
            return;
        }
        const bookingData = {
            title: formData.get('title'),
            start_time: `${date}T${bookingState.startHour}:${bookingState.startMinute}`,
            end_time: `${date}T${bookingState.endHour}:${bookingState.endMinute}`,
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
                    bookingForm.reset();
                    calendar.refetchEvents();
                    alert('Booking created successfully!');
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                alert('Something went wrong while creating the booking.');
            });
    });

    // Global click listener to close all dropdowns
    document.addEventListener('click', function () {
        Object.values(timePickerElements).forEach(item => {
            item.dropdown.classList.add('hidden');
        });
    });

    // Recalculate calendar height on window resize
    window.addEventListener('resize', setCalendarHeight);
});
