# app/routes.py
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, session
from .models import Booking
from app import db
from datetime import datetime

# Import our new Microsoft service
from app.services import microsoft_calendar
from app.services import google_calendar

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    is_microsoft_logged_in = "microsoft_user_token" in session
    is_google_logged_in = "google_credentials" in session # <-- Check for Google login
    return render_template(
        'index.html',
        title='Boardroom Booker',
        is_microsoft_logged_in=is_microsoft_logged_in,
        is_google_logged_in=is_google_logged_in # <-- Pass to template
    )

@bp.route('/login/microsoft')
def microsoft_login():
    """Redirects the user to Microsoft's login page."""
    auth_url = microsoft_calendar.get_auth_url()
    return redirect(auth_url)

@bp.route('/callback/microsoft')
def microsoft_callback():
    """Handles the callback from Microsoft after authentication."""
    # First, verify the "state" to ensure the request is legitimate (prevents CSRF)
    if request.args.get('state') != session.get('state'):
        return "State does not match. Possible CSRF attack.", 403

    # If the user granted permission, there will be a 'code' in the URL
    if "code" in request.args:
        # Exchange the code for an access token and store it
        microsoft_calendar.get_token_from_code(request.args.get('code'))

    # Redirect back to the homepage
    return redirect(url_for('main.index'))

@bp.route('/login/google')
def google_login():
    """Redirects the user to Google's login page."""
    auth_url = google_calendar.get_google_auth_url()
    return redirect(auth_url)

@bp.route('/callback/google')
def google_callback():
    """Handles the callback from Google after authentication."""
    try:
        google_calendar.get_token_from_code_for_google(request.url)
    except Exception as e:
        # Handle state mismatch or other errors
        return f"An error occurred: {e}", 400
    return redirect(url_for('main.index'))



# In get_bookings() function in app/routes.py

@bp.route('/api/bookings')
def get_bookings():
    bookings = Booking.query.all()
    events = [
        {
            'title': booking.title,
            'start': booking.start_time.isoformat(),
            'end': booking.end_time.isoformat(),
            'id': booking.id,
            'extendedProps': {
                'organizer': booking.organizer_name or 'Unknown'
            }
        } for booking in bookings
    ]
    return jsonify(events)

@bp.route('/api/bookings/new', methods=['POST'])
def new_booking():
    # --- Check for login status ---
    user_name = None
    user_email = None

    if 'google_credentials' in session:
        # NOTE: To get user info like name/email from Google, we'd need to make another API call
        # after requesting 'openid', 'email', 'profile' scopes. For now, we'll use a placeholder.
        user_name = "Google User"
        user_email = "user@google.com" # Placeholder
    elif 'microsoft_user_token' in session:
        # The MSAL token response includes user info
        token_claims = session['microsoft_user_token'].get('id_token_claims', {})
        user_name = token_claims.get('name', 'Microsoft User')
        user_email = token_claims.get('preferred_username')
    
    if not user_email:
        return jsonify({'success': False, 'error': 'You must be logged in to create a booking.'}), 401 # 401 Unauthorized

    try:
        data = request.get_json()
        
        # ... (Input validation and overlap checking logic remains the same) ...
        if not all(k in data for k in ['title', 'start_time', 'end_time']):
            return jsonify({'success': False, 'error': 'Missing required fields.'}), 400

        title = data['title']
        if not title or not isinstance(title, str) or len(title) > 120:
             return jsonify({'success': False, 'error': 'Invalid title provided.'}), 400

        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])

        if start_time >= end_time:
            return jsonify({'success': False, 'error': 'End time must be after start time.'}), 400
        
        overlapping_booking = Booking.query.filter(
            Booking.start_time < end_time,
            Booking.end_time > start_time
        ).first()

        if overlapping_booking:
            return jsonify({'success': False, 'error': 'This time slot is already booked.'}), 409

        # --- Create the new booking with organizer info ---
        new_booking = Booking(
            title=title,
            start_time=start_time,
            end_time=end_time,
            organizer_name=user_name,
            organizer_email=user_email
        )
        db.session.add(new_booking)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'id': new_booking.id,
            'message': 'Booking created successfully.'
        }), 201

    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format provided.'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error creating booking: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred.'}), 500

@bp.route('/api/bookings/<int:booking_id>/update', methods=['POST'])
def update_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    data = request.get_json()
    booking.title = data['title']
    booking.start_time = datetime.fromisoformat(data['start_time'])
    booking.end_time = datetime.fromisoformat(data['end_time'])
    db.session.commit()
    return jsonify({'success': True})

@bp.route('/api/bookings/<int:booking_id>/delete', methods=['POST'])
def delete_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    db.session.delete(booking)
    db.session.commit()
    return jsonify({'success': True})