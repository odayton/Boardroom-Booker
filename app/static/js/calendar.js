document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const bookingModal = document.getElementById('booking-modal');
    const newBookingBtn = document.getElementById('new-booking-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const bookingForm = document.getElementById('booking-form');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // More useful default view
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: '/api/bookings',
        editable: true,
        selectable: true,
    });

    calendar.render();

    // Show the modal
    newBookingBtn.addEventListener('click', function() {
        bookingModal.classList.remove('hidden');
    });

    // Hide the modal
    cancelBtn.addEventListener('click', function() {
        bookingModal.classList.add('hidden');
    });

    // Handle form submission
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(bookingForm);
        const bookingData = {
            title: formData.get('title'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
        };

        fetch('/api/bookings/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                bookingModal.classList.add('hidden');
                bookingForm.reset();
                calendar.refetchEvents(); // Refresh the calendar
            } else {
                alert('Error creating booking: ' + data.error);
            }
        });
    });
});