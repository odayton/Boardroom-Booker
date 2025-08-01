# app/routes.py
import os
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, session
from flask_login import login_required, current_user, login_user
from .models import Booking, User, Company, Room
from app import db
from datetime import datetime
import functools

# Import our new Microsoft service
from app.services import microsoft_calendar
from app.services import google_calendar

bp = Blueprint('main', __name__)

def company_required(f):
    """Decorator to ensure user belongs to a company"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if not current_user.company_id:
            return jsonify({'success': False, 'error': 'Company membership required'}), 403
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to ensure user is an admin"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if not current_user.is_admin():
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/')
def index():
    # Auto-login in dev mode
    if os.environ.get('DEV_MODE') == 'true' and not current_user.is_authenticated:
        dev_user = User.query.filter_by(email='dev@test.com').first()
        if dev_user:
            login_user(dev_user)
            print(f"🔐 Auto-logged in as: {dev_user.name}")
    
    is_microsoft_logged_in = "microsoft_user_token" in session
    is_google_logged_in = "google_credentials" in session
    return render_template(
        'index.html',
        title='Boardroom Booker',
        is_microsoft_logged_in=is_microsoft_logged_in,
        is_google_logged_in=is_google_logged_in
    )

@bp.route('/room-management')
@login_required
@admin_required
def room_management():
    """Room management page for admins"""
    return render_template('management/room_management.html', title='Room Management')

@bp.route('/user-management')
@login_required
@admin_required
def user_management():
    """User management page for admins"""
    return render_template('management/user_management.html', title='User Management')

@bp.route('/login/microsoft')
def microsoft_login():
    """Redirects the user to Microsoft's login page."""
    auth_url = microsoft_calendar.get_auth_url()
    return redirect(auth_url)

@bp.route('/callback/microsoft')
def microsoft_callback():
    """Handles the callback from Microsoft after authentication."""
    if request.args.get('state') != session.get('state'):
        return "State does not match. Possible CSRF attack.", 403

    if "code" in request.args:
        microsoft_calendar.get_token_from_code(request.args.get('code'))

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
        return f"An error occurred: {e}", 400
    return redirect(url_for('main.index'))

# Room Management Endpoints
@bp.route('/api/rooms', methods=['GET'])
@company_required
def get_rooms():
    """Get all rooms for the current user's company"""
    rooms = Room.query.filter_by(company_id=current_user.company_id).all()
    return jsonify([{
        'id': room.id,
        'name': room.name
    } for room in rooms])

# User Management Endpoints
@bp.route('/api/users', methods=['GET'])
@company_required
@admin_required
def get_users():
    """Get all users for the current user's company"""
    users = User.query.filter_by(company_id=current_user.company_id).all()
    return jsonify([{
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'created_at': user.created_at.isoformat() if user.created_at else None
    } for user in users])

@bp.route('/api/users/invite', methods=['POST'])
@company_required
@admin_required
def invite_user():
    """Invite a new user to the company"""
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').lower().strip()
    role = data.get('role', 'user')
    
    if not all([name, email, role]):
        return jsonify({'success': False, 'error': 'All fields are required'}), 400
    
    if role not in ['user', 'admin']:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'User with this email already exists'}), 400
    
    # Create user
    user = User(
        email=email,
        name=name,
        role=role,
        company_id=current_user.company_id
    )
    # Set a temporary password (user will need to reset it)
    user.set_password('temp_password_123')
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'User invited successfully',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role
        }
    }), 201

@bp.route('/api/users/<int:user_id>', methods=['PUT'])
@company_required
@admin_required
def update_user(user_id):
    """Update a user"""
    user = User.query.filter_by(
        id=user_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').lower().strip()
    role = data.get('role', 'user')
    
    if not all([name, email, role]):
        return jsonify({'success': False, 'error': 'All fields are required'}), 400
    
    if role not in ['user', 'admin']:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    # Check if email is already taken by another user
    existing_user = User.query.filter_by(email=email).first()
    if existing_user and existing_user.id != user_id:
        return jsonify({'success': False, 'error': 'Email already taken'}), 400
    
    user.name = name
    user.email = email
    user.role = role
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'User updated successfully',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role
        }
    })

@bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@company_required
@admin_required
def delete_user(user_id):
    """Delete a user"""
    if user_id == current_user.id:
        return jsonify({'success': False, 'error': 'Cannot delete yourself'}), 400
    
    user = User.query.filter_by(
        id=user_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'User deleted successfully'
    })

@bp.route('/api/rooms', methods=['POST'])
@admin_required
def create_room():
    """Create a new room (admin only)"""
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'success': False, 'error': 'Room name is required'}), 400
    
    # Check if room with same name already exists in company
    existing_room = Room.query.filter_by(
        company_id=current_user.company_id,
        name=name
    ).first()
    
    if existing_room:
        return jsonify({'success': False, 'error': 'Room with this name already exists'}), 400
    
    room = Room(name=name, company_id=current_user.company_id)
    db.session.add(room)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'room': {
            'id': room.id,
            'name': room.name
        }
    }), 201

@bp.route('/api/rooms/<int:room_id>', methods=['PUT'])
@admin_required
def update_room(room_id):
    """Update a room (admin only)"""
    room = Room.query.filter_by(
        id=room_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'success': False, 'error': 'Room name is required'}), 400
    
    # Check if room with same name already exists in company
    existing_room = Room.query.filter_by(
        company_id=current_user.company_id,
        name=name
    ).filter(Room.id != room_id).first()
    
    if existing_room:
        return jsonify({'success': False, 'error': 'Room with this name already exists'}), 400
    
    room.name = name
    db.session.commit()
    
    return jsonify({'success': True})

@bp.route('/api/rooms/<int:room_id>', methods=['DELETE'])
@admin_required
def delete_room(room_id):
    """Delete a room (admin only)"""
    room = Room.query.filter_by(
        id=room_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    # Check if room has any bookings
    if room.bookings:
        return jsonify({'success': False, 'error': 'Cannot delete room with existing bookings'}), 400
    
    db.session.delete(room)
    db.session.commit()
    
    return jsonify({'success': True})

# Booking Endpoints
@bp.route('/api/bookings')
@company_required
def get_bookings():
    """Get all bookings for the current user's company"""
    room_id = request.args.get('room_id', type=int)
    
    query = Booking.query.filter_by(company_id=current_user.company_id)
    
    if room_id:
        query = query.filter_by(room_id=room_id)
    
    bookings = query.all()
    
    events = []
    for booking in bookings:
        # Only show public bookings or user's own bookings
        if booking.is_public or booking.user_id == current_user.id:
            events.append({
                'title': booking.title,
                'start': booking.start_time.isoformat(),
                'end': booking.end_time.isoformat(),
                'id': booking.id,
                'room_id': booking.room_id,
                'room_name': booking.room.name,
                'is_public': booking.is_public,
                'user_id': booking.user_id,
                'user_name': booking.user.name,
                'can_edit': booking.user_id == current_user.id or current_user.is_admin(),
                'extendedProps': {
                    'organizer': booking.user.name,
                    'room': booking.room.name
                }
            })
        else:
            # Show private booking as "Unavailable"
            events.append({
                'title': 'Unavailable',
                'start': booking.start_time.isoformat(),
                'end': booking.end_time.isoformat(),
                'id': f'private_{booking.id}',
                'room_id': booking.room_id,
                'room_name': booking.room.name,
                'is_public': False,
                'user_id': booking.user_id,
                'user_name': booking.user.name,
                'can_edit': False,
                'backgroundColor': '#6B7280',
                'borderColor': '#6B7280',
                'extendedProps': {
                    'organizer': 'Private',
                    'room': booking.room.name
                }
            })
    
    return jsonify(events)

@bp.route('/api/bookings/new', methods=['POST'])
@company_required
def new_booking():
    """Create a new booking"""
    try:
        data = request.get_json()
        
        if not all(k in data for k in ['title', 'start_time', 'end_time', 'room_id']):
            return jsonify({'success': False, 'error': 'Missing required fields.'}), 400

        title = data['title'].strip()
        if not title or len(title) > 120:
            return jsonify({'success': False, 'error': 'Invalid title provided.'}), 400

        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])
        room_id = data['room_id']
        is_public = data.get('is_public', True)

        if start_time >= end_time:
            return jsonify({'success': False, 'error': 'End time must be after start time.'}), 400
        
        # Verify room belongs to user's company
        room = Room.query.filter_by(
            id=room_id,
            company_id=current_user.company_id
        ).first()
        
        if not room:
            return jsonify({'success': False, 'error': 'Invalid room selected.'}), 400
        
        # Check for overlapping bookings in the same room
        overlapping_booking = Booking.query.filter(
            Booking.room_id == room_id,
            Booking.start_time < end_time,
            Booking.end_time > start_time
        ).first()

        if overlapping_booking:
            return jsonify({'success': False, 'error': 'This time slot is already booked.'}), 409

        new_booking = Booking(
            title=title,
            start_time=start_time,
            end_time=end_time,
            room_id=room_id,
            company_id=current_user.company_id,
            user_id=current_user.id,
            is_public=is_public
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
@company_required
def update_booking(booking_id):
    """Update a booking"""
    booking = Booking.query.filter_by(
        id=booking_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    # Check if user can edit this booking
    if booking.user_id != current_user.id and not current_user.is_admin():
        return jsonify({'success': False, 'error': 'You can only edit your own bookings.'}), 403
    
    try:
        data = request.get_json()
        
        title = data.get('title', '').strip()
        if not title or len(title) > 120:
            return jsonify({'success': False, 'error': 'Invalid title provided.'}), 400
        
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])
        room_id = data.get('room_id', booking.room_id)
        is_public = data.get('is_public', booking.is_public)

        if start_time >= end_time:
            return jsonify({'success': False, 'error': 'End time must be after start time.'}), 400
        
        # Verify room belongs to user's company
        if room_id != booking.room_id:
            room = Room.query.filter_by(
                id=room_id,
                company_id=current_user.company_id
            ).first()
            
            if not room:
                return jsonify({'success': False, 'error': 'Invalid room selected.'}), 400
        
        # Check for overlapping bookings in the same room (excluding current booking)
        overlapping_booking = Booking.query.filter(
            Booking.room_id == room_id,
            Booking.id != booking_id,
            Booking.start_time < end_time,
            Booking.end_time > start_time
        ).first()

        if overlapping_booking:
            return jsonify({'success': False, 'error': 'This time slot is already booked.'}), 409
        
        booking.title = title
        booking.start_time = start_time
        booking.end_time = end_time
        booking.room_id = room_id
        booking.is_public = is_public
        
        db.session.commit()
        return jsonify({'success': True})
        
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format provided.'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error updating booking: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred.'}), 500

@bp.route('/api/bookings/<int:booking_id>/delete', methods=['POST'])
@company_required
def delete_booking(booking_id):
    """Delete a booking"""
    booking = Booking.query.filter_by(
        id=booking_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    # Check if user can delete this booking
    if booking.user_id != current_user.id and not current_user.is_admin():
        return jsonify({'success': False, 'error': 'You can only delete your own bookings.'}), 403
    
    db.session.delete(booking)
    db.session.commit()
    return jsonify({'success': True})