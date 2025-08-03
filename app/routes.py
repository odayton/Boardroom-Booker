# app/routes.py
import os
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, session
from flask_login import login_required, current_user, login_user, logout_user
from .models import Booking, User, Company, Room, Invitation
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

def manager_required(f):
    """Decorator to ensure user is a manager or admin"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if not current_user.can_manage_users():
            return jsonify({'success': False, 'error': 'Manager or Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

def room_management_required(f):
    """Decorator to ensure user can manage rooms (admin only)"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if not current_user.can_manage_rooms():
            return jsonify({'success': False, 'error': 'Admin access required for room management'}), 403
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/')
def index():
    # Redirect non-authenticated users to login page
    if not current_user.is_authenticated:
        return redirect(url_for('auth.login'))
    
    # Auto-login in dev mode
    if os.environ.get('DEV_MODE') == 'true' and not current_user.is_authenticated:
        dev_user = User.query.filter_by(email='dev@test.com').first()
        if dev_user:
            login_user(dev_user)
            print(f"🔐 Auto-logged in as: {dev_user.name}")
    # Force logout in user mode if dev user is logged in
    elif os.environ.get('DEV_MODE') == 'false' and current_user.is_authenticated and current_user.email == 'dev@test.com':
        logout_user()
        print("🔓 Logged out dev user in user mode")
    
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
@room_management_required
def room_management():
    """Room management page for admins"""
    return render_template('management/room_management.html', title='Room Management')

@bp.route('/user-management')
@login_required
@manager_required
def user_management():
    """User management page for managers and admins"""
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
        'name': room.name,
        'description': room.description,
        'capacity': room.capacity,
        'room_type': room.room_type,
        'location': room.location,
        'equipment': room.get_equipment_list(),
        'status': room.status,
        'access_level': room.access_level,
        'operating_hours_start': room.operating_hours_start.strftime('%H:%M') if room.operating_hours_start else None,
        'operating_hours_end': room.operating_hours_end.strftime('%H:%M') if room.operating_hours_end else None,
        'created_at': room.created_at.isoformat() if room.created_at else None,
        'updated_at': room.updated_at.isoformat() if room.updated_at else room.created_at.isoformat() if room.created_at else None
    } for room in rooms])

# User Management Endpoints
@bp.route('/api/users', methods=['GET'])
@company_required
@manager_required
def get_users():
    """Get all users for the current user's company (filtered by role hierarchy)"""
    # Get all users in the company
    all_users = User.query.filter_by(company_id=current_user.company_id).all()
    
    # Filter users based on role hierarchy
    visible_users = [user for user in all_users if current_user.can_see_user(user)]
    
    return jsonify([{
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'role_display': user.get_role_display(),
        'expires_at': user.expires_at.isoformat() if user.expires_at else None,
        'is_active': user.is_active_user(),
        'created_at': user.created_at.isoformat() if user.created_at else None
    } for user in visible_users])

@bp.route('/api/users/invite', methods=['POST'])
@company_required
@manager_required
def invite_user():
    """Invite a new user to the company (legacy route - now redirects to invitation system)"""
    # This route is kept for backward compatibility but now uses the invitation system
    return create_invitation()

@bp.route('/api/users/<int:user_id>', methods=['PUT'])
@company_required
@manager_required
def update_user(user_id):
    """Update a user"""
    user = User.query.filter_by(
        id=user_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    # Check if user can be updated based on role hierarchy
    if not current_user.can_edit_user(user):
        return jsonify({'success': False, 'error': 'Cannot update this user'}), 403
    
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').lower().strip()
    role = data.get('role', 'employee')
    expires_at = data.get('expires_at')  # For guest accounts
    
    if not all([name, email, role]):
        return jsonify({'success': False, 'error': 'All fields are required'}), 400
    
    if role not in ['admin', 'manager', 'employee', 'guest']:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    # Check role hierarchy - managers can only update employees and guests
    if current_user.is_manager() and role not in ['employee', 'guest']:
        return jsonify({'success': False, 'error': 'Managers can only update employees and guests'}), 403
    
    # Check if email is already taken by another user
    existing_user = User.query.filter_by(email=email).first()
    if existing_user and existing_user.id != user_id:
        return jsonify({'success': False, 'error': 'Email already taken'}), 400
    
    user.name = name
    user.email = email
    user.role = role
    
    # Handle expiration for guest accounts
    if role == 'guest' and expires_at:
        try:
            user.expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except:
            return jsonify({'success': False, 'error': 'Invalid expiration date format'}), 400
    elif role != 'guest':
        user.expires_at = None
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'User updated successfully',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'role_display': user.get_role_display(),
            'expires_at': user.expires_at.isoformat() if user.expires_at else None,
            'is_active': user.is_active_user()
        }
    })

@bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@company_required
@manager_required
def delete_user(user_id):
    """Delete a user"""
    if user_id == current_user.id:
        return jsonify({'success': False, 'error': 'Cannot delete yourself'}), 400
    
    user = User.query.filter_by(
        id=user_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    # Check if user can be deleted based on role hierarchy
    if not current_user.can_edit_user(user):
        return jsonify({'success': False, 'error': 'Cannot delete this user'}), 403
    
    # Check if user has any bookings
    if user.bookings:
        return jsonify({'success': False, 'error': 'Cannot delete user with existing bookings'}), 400
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'User deleted successfully'
    })

# Invitation Management Routes
@bp.route('/api/invitations', methods=['GET'])
@company_required
@manager_required
def get_invitations():
    """Get all invitations for the company"""
    invitations = Invitation.query.filter_by(company_id=current_user.company_id).all()
    
    return jsonify({
        'success': True,
        'invitations': [{
            'id': inv.id,
            'code': inv.code,
            'email': inv.email,
            'name': inv.name,
            'role': inv.role,
            'role_display': inv.get_role_display(),
            'invited_by': inv.invited_by.name,
            'expires_at': inv.expires_at.isoformat(),
            'guest_duration_days': inv.guest_duration_days,
            'is_used': inv.is_used,
            'is_expired': inv.is_expired(),
            'created_at': inv.created_at.isoformat()
        } for inv in invitations]
    })

@bp.route('/api/invitations', methods=['POST'])
@company_required
@manager_required
def create_invitation():
    """Create a new invitation"""
    if not current_user.can_invite_users():
        return jsonify({'success': False, 'error': 'Cannot invite users'}), 403
    
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    name = data.get('name', '').strip()
    role = data.get('role', 'employee')
    guest_duration_days = data.get('guest_duration_days')  # For guest accounts
    
    if not all([email, name, role]):
        return jsonify({'success': False, 'error': 'All fields are required'}), 400
    
    if role not in ['admin', 'manager', 'employee', 'guest']:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    # Check role hierarchy - managers can only invite employees and guests
    if current_user.is_manager() and role not in ['employee', 'guest']:
        return jsonify({'success': False, 'error': 'Managers can only invite employees and guests'}), 403
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'User with this email already exists'}), 400
    
    # Check if invitation already exists
    existing_invitation = Invitation.query.filter_by(
        email=email,
        company_id=current_user.company_id,
        is_used=False
    ).first()
    
    if existing_invitation and not existing_invitation.is_expired():
        return jsonify({'success': False, 'error': 'Invitation already exists for this email'}), 400
    
    # Create invitation
    invitation = Invitation(
        email=email,
        name=name,
        role=role,
        company_id=current_user.company_id,
        invited_by_id=current_user.id,
        guest_duration_days=guest_duration_days if role == 'guest' else None
    )
    
    db.session.add(invitation)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Invitation created successfully',
        'invitation': {
            'id': invitation.id,
            'code': invitation.code,
            'email': invitation.email,
            'name': invitation.name,
            'role': invitation.role,
            'expires_at': invitation.expires_at.isoformat()
        }
    }), 201

@bp.route('/api/invitations/<int:invitation_id>', methods=['DELETE'])
@company_required
@manager_required
def delete_invitation(invitation_id):
    """Delete an invitation"""
    invitation = Invitation.query.filter_by(
        id=invitation_id,
        company_id=current_user.company_id
    ).first_or_404()
    
    if invitation.is_used:
        return jsonify({'success': False, 'error': 'Cannot delete used invitation'}), 400
    
    db.session.delete(invitation)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Invitation deleted successfully'
    })

@bp.route('/api/invitations/<invitation_code>/accept', methods=['POST'])
def accept_invitation(invitation_code):
    """Accept an invitation and create user account"""
    data = request.get_json()
    password = data.get('password', '')
    
    if not password:
        return jsonify({'success': False, 'error': 'Password is required'}), 400
    
    invitation = Invitation.query.filter_by(code=invitation_code).first()
    
    if not invitation:
        return jsonify({'success': False, 'error': 'Invalid invitation code'}), 404
    
    if invitation.is_used:
        return jsonify({'success': False, 'error': 'Invitation has already been used'}), 400
    
    if invitation.is_expired():
        return jsonify({'success': False, 'error': 'Invitation has expired'}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=invitation.email).first():
        return jsonify({'success': False, 'error': 'User with this email already exists'}), 400
    
    # Create user
    user = User(
        email=invitation.email,
        name=invitation.name,
        role=invitation.role,
        company_id=invitation.company_id
    )
    user.set_password(password)
    
    # Mark invitation as used
    invitation.is_used = True
    
    db.session.add(user)
    db.session.commit()
    
    # Auto-login the user
    login_user(user)
    
    return jsonify({
        'success': True,
        'message': 'Account created successfully',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role
        }
    }), 201

@bp.route('/api/invitations/<invitation_code>/validate', methods=['GET'])
def validate_invitation(invitation_code):
    """Validate an invitation code"""
    invitation = Invitation.query.filter_by(code=invitation_code).first()
    
    if not invitation:
        return jsonify({'success': False, 'error': 'Invalid invitation code'}), 404
    
    if invitation.is_used:
        return jsonify({'success': False, 'error': 'Invitation has already been used'}), 400
    
    if invitation.is_expired():
        return jsonify({'success': False, 'error': 'Invitation has expired'}), 400
    
    return jsonify({
        'success': True,
        'invitation': {
            'email': invitation.email,
            'name': invitation.name,
            'role': invitation.role,
            'company_name': invitation.company.name,
            'expires_at': invitation.expires_at.isoformat()
        }
    })

@bp.route('/api/rooms', methods=['POST'])
@room_management_required
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
    
    # Create room with all fields
    room = Room(
        name=name,
        description=data.get('description'),
        capacity=data.get('capacity'),
        room_type=data.get('room_type'),
        location=data.get('location'),
        status=data.get('status', 'available'),
        access_level=data.get('access_level', 'all'),
        operating_hours_start=datetime.strptime(data['operating_hours_start'], '%H:%M').time() if data.get('operating_hours_start') else None,
        operating_hours_end=datetime.strptime(data['operating_hours_end'], '%H:%M').time() if data.get('operating_hours_end') else None,
        company_id=current_user.company_id
    )
    
    # Set equipment
    if data.get('equipment'):
        room.set_equipment_list(data['equipment'])
    
    db.session.add(room)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'room': {
            'id': room.id,
            'name': room.name,
            'description': room.description,
            'capacity': room.capacity,
            'room_type': room.room_type,
            'location': room.location,
            'equipment': room.get_equipment_list(),
            'status': room.status,
            'access_level': room.access_level,
            'operating_hours_start': room.operating_hours_start.strftime('%H:%M') if room.operating_hours_start else None,
            'operating_hours_end': room.operating_hours_end.strftime('%H:%M') if room.operating_hours_end else None
        }
    }), 201

@bp.route('/api/rooms/<int:room_id>', methods=['PUT'])
@room_management_required
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
    
    # Update all fields
    room.name = name
    room.description = data.get('description')
    room.capacity = data.get('capacity')
    room.room_type = data.get('room_type')
    room.location = data.get('location')
    room.status = data.get('status', 'available')
    room.access_level = data.get('access_level', 'all')
    
    # Handle time fields
    if data.get('operating_hours_start'):
        room.operating_hours_start = datetime.strptime(data['operating_hours_start'], '%H:%M').time()
    else:
        room.operating_hours_start = None
        
    if data.get('operating_hours_end'):
        room.operating_hours_end = datetime.strptime(data['operating_hours_end'], '%H:%M').time()
    else:
        room.operating_hours_end = None
    
    # Set equipment
    if data.get('equipment') is not None:
        room.set_equipment_list(data['equipment'])
    
    db.session.commit()
    
    return jsonify({'success': True})

@bp.route('/api/rooms/<int:room_id>', methods=['DELETE'])
@room_management_required
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