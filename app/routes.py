# app/routes.py
import os
import json
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, session
from flask_login import login_required, current_user, login_user, logout_user
from .models import Booking, User, Company, Room, Invitation
from app import db
from datetime import datetime, timedelta
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
        print(f"🔐 manager_required decorator called")
        print(f"👤 Current user authenticated: {current_user.is_authenticated}")
        if current_user.is_authenticated:
            print(f"👤 Current user: {current_user.name} ({current_user.role})")
            print(f"👤 Can manage users: {current_user.can_manage_users()}")
        
        if not current_user.is_authenticated:
            print("❌ User not authenticated")
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        if not current_user.can_manage_users():
            print("❌ User cannot manage users")
            return jsonify({'success': False, 'error': 'Manager or Admin access required'}), 403
        print("✅ User authorized")
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

@bp.route('/company-management')
@login_required
@admin_required
def company_management():
    """Company management page for admins only"""
    return render_template('management/company_management.html', title='Company Management')



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
    """Get all rooms visible to the current user's company"""
    # Get rooms that are visible to the current user's company
    rooms = Room.query.filter(
        (Room.company_id == current_user.company_id) |  # Own company's rooms
        (Room.visibility_type == 'public') |  # Public rooms
        (Room.visibility_type == 'specific_companies') &  # Rooms shared with specific companies
        (Room.visible_companies.contains(str(current_user.company_id)))  # Current company is in the list
    ).all()
    
    return jsonify({
        'rooms': [{
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
            'visibility_type': room.visibility_type,
            'visible_companies': room.get_visible_companies_list(),
            'company_id': room.company_id,
            'company_name': room.company.name if room.company else None,
            'created_at': room.created_at.isoformat() if room.created_at else None,
            'updated_at': room.updated_at.isoformat() if room.updated_at else room.created_at.isoformat() if room.created_at else None
        } for room in rooms]
    })

# User Management Endpoints
@bp.route('/api/users', methods=['GET'])
@company_required
@manager_required
def get_users():
    """Get all users for the current user's company (filtered by role hierarchy)"""
    print(f"🔍 API /api/users called by user: {current_user.name} ({current_user.role})")
    print(f"🏢 User's company ID: {current_user.company_id}")
    
    # Get all users in the company
    all_users = User.query.filter_by(company_id=current_user.company_id).all()
    print(f"👥 All users in company: {len(all_users)}")
    for user in all_users:
        print(f"  - {user.name} ({user.role})")
    
    # Filter users based on role hierarchy
    visible_users = [user for user in all_users if current_user.can_see_user(user)]
    print(f"👀 Visible users: {len(visible_users)}")
    for user in visible_users:
        print(f"  - {user.name} ({user.role}) - can_see: {current_user.can_see_user(user)}")
    
    result = [{
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'role_display': user.get_role_display(),
        'expires_at': user.expires_at.isoformat() if user.expires_at else None,
        'is_active': user.is_active_user(),
        'created_at': user.created_at.isoformat() if user.created_at else None
    } for user in visible_users]
    
    print(f"📤 Returning {len(result)} users")
    return jsonify(result)

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
    invitation_type = data.get('invitation_type', 'internal')  # 'internal' or 'external'
    guest_duration_days = data.get('guest_duration_days')  # For guest accounts
    
    if not all([email, name, role, invitation_type]):
        return jsonify({'success': False, 'error': 'Email, name, role, and invitation type are required'}), 400
    
    if not all([role, invitation_type]):
        return jsonify({'success': False, 'error': 'Role and invitation type are required'}), 400
    
    if role not in ['admin', 'manager', 'employee', 'guest']:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    if invitation_type not in ['internal', 'external']:
        return jsonify({'success': False, 'error': 'Invalid invitation type'}), 400
    
    # Check role hierarchy - managers can only invite employees and guests
    if current_user.is_manager() and role not in ['employee', 'guest']:
        return jsonify({'success': False, 'error': 'Managers can only invite employees and guests'}), 403
    
    # For external invitations, only allow manager role for security
    if invitation_type == 'external' and role not in ['manager', 'employee', 'guest']:
        return jsonify({'success': False, 'error': 'External users can only be assigned manager, employee, or guest roles'}), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        # If user exists and this is an external invitation, check if they already have access
        if invitation_type == 'external':
            if existing_user.external_company_access == current_user.company_id:
                return jsonify({'success': False, 'error': 'User already has access to this company'}), 400
        else:
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
    
    # Add metadata for invitations
    invitation.invitation_metadata = json.dumps({'invitation_type': invitation_type})
    
    db.session.add(invitation)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'{invitation_type.title()} invitation created successfully',
        'invitation': {
            'id': invitation.id,
            'code': invitation.code,
            'email': invitation.email,
            'name': invitation.name,
            'role': invitation.role,
            'invitation_type': invitation_type,
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
    
    # Check if this is an external invitation
    is_external = False
    if invitation.invitation_metadata:
        try:
            metadata = json.loads(invitation.invitation_metadata)
            is_external = metadata.get('invitation_type') == 'external'
        except:
            pass
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=invitation.email).first()
    
    if existing_user:
        if is_external:
            # For external invitations, update the existing user's external access
            existing_user.external_company_access = invitation.company_id
            existing_user.role = invitation.role
            user = existing_user
        else:
            return jsonify({'success': False, 'error': 'User with this email already exists'}), 400
    else:
        # Create new user
        if is_external:
            # For external invitations, set external_company_access instead of company_id
            user = User(
                email=invitation.email,
                name=invitation.name,
                role=invitation.role,
                company_id=None,  # No primary company
                external_company_access=invitation.company_id
            )
        else:
            # For internal invitations, set company_id normally
            user = User(
                email=invitation.email,
                name=invitation.name,
                role=invitation.role,
                company_id=invitation.company_id
            )
        
        user.set_password(password)
        db.session.add(user)
    
    # Mark invitation as used
    invitation.is_used = True
    
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
        operating_hours_start=datetime.strptime(data['operating_hours_start'], '%H:%M').time() if data.get('operating_hours_start') and data['operating_hours_start'].strip() and data['operating_hours_start'] != '' else None,
        operating_hours_end=datetime.strptime(data['operating_hours_end'], '%H:%M').time() if data.get('operating_hours_end') and data['operating_hours_end'].strip() and data['operating_hours_end'] != '' else None,
        company_id=current_user.company_id,
        visibility_type=data.get('visibility_type', 'company'),
        visible_companies=data.get('visible_companies')
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
            'operating_hours_end': room.operating_hours_end.strftime('%H:%M') if room.operating_hours_end else None,
            'visibility_type': room.visibility_type,
            'visible_companies': room.get_visible_companies_list(),
            'company_id': room.company_id
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
    room.visibility_type = data.get('visibility_type', 'company')
    
    # Handle visible companies
    if data.get('visible_companies') is not None:
        room.set_visible_companies_list(data['visible_companies'])
    
    # Handle time fields
    if data.get('operating_hours_start') and data['operating_hours_start'].strip() and data['operating_hours_start'] != '':
        room.operating_hours_start = datetime.strptime(data['operating_hours_start'], '%H:%M').time()
    else:
        room.operating_hours_start = None
        
    if data.get('operating_hours_end') and data['operating_hours_end'].strip() and data['operating_hours_end'] != '':
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

        # Parse dates in DD-MM-YYYY format
        start_date_str = data['start_time'].split('T')[0]
        end_date_str = data['end_time'].split('T')[0]
        
        # Convert DD-MM-YYYY to YYYY-MM-DD for datetime parsing
        def convert_date_format(date_str):
            if '-' in date_str and len(date_str.split('-')[0]) == 2:
                # Format is DD-MM-YYYY, convert to YYYY-MM-DD
                parts = date_str.split('-')
                if len(parts) == 3:
                    day, month, year = parts
                    return f"{year}-{month}-{day}"
            return date_str  # Already in YYYY-MM-DD format
        
        start_date_formatted = convert_date_format(start_date_str)
        end_date_formatted = convert_date_format(end_date_str)
        
        start_time = datetime.fromisoformat(f"{start_date_formatted}T{data['start_time'].split('T')[1]}")
        end_time = datetime.fromisoformat(f"{end_date_formatted}T{data['end_time'].split('T')[1]}")
        room_id = data['room_id']
        
        # Handle new visibility system
        visibility_type = data.get('visibility_type', 'all_companies')
        selected_companies = data.get('selected_companies', [])
        
        # Legacy support for is_public
        is_public = data.get('is_public', True)
        if 'is_public' in data and 'visibility_type' not in data:
            # Convert legacy boolean to new system
            visibility_type = 'all_companies' if is_public else 'owner_company'

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
            is_public=is_public,  # Legacy field
            visibility_type=visibility_type,
            visible_companies=json.dumps(selected_companies) if selected_companies else None
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
        
        # Parse dates in DD-MM-YYYY format
        start_date_str = data['start_time'].split('T')[0]
        end_date_str = data['end_time'].split('T')[0]
        
        # Convert DD-MM-YYYY to YYYY-MM-DD for datetime parsing
        def convert_date_format(date_str):
            if '-' in date_str and len(date_str.split('-')[0]) == 2:
                # Format is DD-MM-YYYY, convert to YYYY-MM-DD
                parts = date_str.split('-')
                if len(parts) == 3:
                    day, month, year = parts
                    return f"{year}-{month}-{day}"
            return date_str  # Already in YYYY-MM-DD format
        
        start_date_formatted = convert_date_format(start_date_str)
        end_date_formatted = convert_date_format(end_date_str)
        
        start_time = datetime.fromisoformat(f"{start_date_formatted}T{data['start_time'].split('T')[1]}")
        end_time = datetime.fromisoformat(f"{end_date_formatted}T{data['end_time'].split('T')[1]}")
        room_id = data.get('room_id', booking.room_id)
        
        # Handle new visibility system
        visibility_type = data.get('visibility_type', booking.visibility_type or 'all_companies')
        selected_companies = data.get('selected_companies', [])
        
        # Legacy support for is_public
        is_public = data.get('is_public', booking.is_public)
        if 'is_public' in data and 'visibility_type' not in data:
            # Convert legacy boolean to new system
            visibility_type = 'all_companies' if is_public else 'owner_company'

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
        booking.is_public = is_public  # Legacy field
        booking.visibility_type = visibility_type
        booking.visible_companies = json.dumps(selected_companies) if selected_companies else None
        
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

@bp.route('/api/current-user', methods=['GET'])
@company_required
def get_current_user():
    """Get current user information including role"""
    return jsonify({
        'success': True,
        'user': {
            'id': current_user.id,
            'name': current_user.name,
            'email': current_user.email,
            'role': current_user.role,
            'role_display': current_user.get_role_display(),
            'is_admin': current_user.is_admin(),
            'is_manager': current_user.is_manager(),
            'can_invite_users': current_user.can_invite_users(),
            'can_manage_users': current_user.can_manage_users(),
            'can_manage_rooms': current_user.can_manage_rooms()
        }
    })

# Company Management Endpoints
@bp.route('/api/company', methods=['GET'])
@company_required
@admin_required
def get_company():
    """Get current company information"""
    company = Company.query.get(current_user.company_id)
    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404
    
    return jsonify({
        'success': True,
        'company': {
            'id': company.id,
            'name': company.name,
            'domain': company.domain,
            'created_at': company.created_at.isoformat() if company.created_at else None
        }
    })

@bp.route('/api/company', methods=['PUT'])
@company_required
@admin_required
def update_company():
    """Update company information"""
    company = Company.query.get(current_user.company_id)
    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404
    
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        domain = data.get('domain', '').strip()
        
        if not name or len(name) > 120:
            return jsonify({'success': False, 'error': 'Invalid company name provided.'}), 400
        
        if not domain or len(domain) > 120:
            return jsonify({'success': False, 'error': 'Invalid domain provided.'}), 400
        
        # Check if domain contains @ symbol
        if '@' not in domain:
            return jsonify({'success': False, 'error': 'Domain must contain an @ symbol (e.g., @company.com).'}), 400
        
        # Check if domain is already taken by another company
        existing_company = Company.query.filter(
            Company.domain == domain,
            Company.id != company.id
        ).first()
        
        if existing_company:
            return jsonify({'success': False, 'error': 'Domain is already in use by another company.'}), 409
        
        company.name = name
        company.domain = domain
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating company: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred.'}), 500

@bp.route('/api/company/stats', methods=['GET'])
@company_required
@admin_required
def get_company_stats():
    """Get company statistics"""
    company_id = current_user.company_id
    
    # Get counts
    user_count = User.query.filter_by(company_id=company_id).count()
    room_count = Room.query.filter_by(company_id=company_id).count()
    booking_count = Booking.query.filter_by(company_id=company_id).count()
    active_invitation_count = Invitation.query.filter_by(
        company_id=company_id,
        is_used=False
    ).filter(Invitation.expires_at > datetime.utcnow()).count()
    
    # Get recent activity
    recent_bookings = Booking.query.filter_by(company_id=company_id)\
        .order_by(Booking.created_at.desc())\
        .limit(5).all()
    
    recent_users = User.query.filter_by(company_id=company_id)\
        .order_by(User.created_at.desc())\
        .limit(5).all()
    
    return jsonify({
        'success': True,
        'stats': {
            'user_count': user_count,
            'room_count': room_count,
            'booking_count': booking_count,
            'active_invitation_count': active_invitation_count
        },
        'recent_bookings': [{
            'id': booking.id,
            'title': booking.title,
            'start_time': booking.start_time.isoformat(),
            'end_time': booking.end_time.isoformat(),
            'created_at': booking.created_at.isoformat()
        } for booking in recent_bookings],
        'recent_users': [{
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.isoformat()
        } for user in recent_users]
    })

@bp.route('/api/companies/overview', methods=['GET'])
@company_required
@admin_required
def get_companies_overview():
    """Get overview of all companies (admin only sees their own company)"""
    admin_company_id = current_user.company_id
    
    # Get all companies but admin only sees their own company's data
    companies = Company.query.all()
    
    companies_data = []
    for company in companies:
        # Only show detailed stats for admin's own company
        if company.id == admin_company_id:
            # Get detailed stats for admin's company
            user_count = User.query.filter_by(company_id=company.id).count()
            booking_count = Booking.query.filter_by(company_id=company.id).count()
            
            # Get upcoming bookings (next 7 days)
            upcoming_bookings = Booking.query.filter_by(company_id=company.id)\
                .filter(Booking.start_time >= datetime.utcnow())\
                .filter(Booking.start_time <= datetime.utcnow() + timedelta(days=7))\
                .order_by(Booking.start_time.asc())\
                .limit(5).all()
            
            companies_data.append({
                'id': company.id,
                'name': company.name,
                'domain': company.domain,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'user_count': user_count,
                'booking_count': booking_count,
                'upcoming_bookings': [{
                    'id': booking.id,
                    'title': booking.title,
                    'start_time': booking.start_time.isoformat(),
                    'end_time': booking.end_time.isoformat(),
                    'room_name': booking.room.name if booking.room else 'No room assigned'
                } for booking in upcoming_bookings],
                'is_own_company': True
            })
        else:
            # For other companies, only show basic info (no detailed stats)
            companies_data.append({
                'id': company.id,
                'name': company.name,
                'domain': company.domain,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'user_count': None,  # Hidden for other companies
                'booking_count': None,  # Hidden for other companies
                'upcoming_bookings': [],  # Hidden for other companies
                'is_own_company': False
            })
    
    return jsonify({
        'success': True,
        'companies': companies_data
    })

# Company CRUD Operations
@bp.route('/api/companies', methods=['GET'])
@company_required
@admin_required
def get_all_companies():
    """Get all companies (admin only)"""
    companies = Company.query.all()
    
    return jsonify({
        'success': True,
        'companies': [{
            'id': company.id,
            'name': company.name,
            'domain': company.domain,
            'created_at': company.created_at.isoformat() if company.created_at else None
        } for company in companies]
    })

@bp.route('/api/companies', methods=['POST'])
@company_required
@admin_required
def create_company():
    """Create a new company (admin only)"""
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        domain = data.get('domain', '').strip()
        
        if not name or len(name) > 120:
            return jsonify({'success': False, 'error': 'Invalid company name provided.'}), 400
        
        if not domain or len(domain) > 120:
            return jsonify({'success': False, 'error': 'Invalid domain provided.'}), 400
        
        # Check if domain contains @ symbol
        if '@' not in domain:
            return jsonify({'success': False, 'error': 'Domain must contain an @ symbol (e.g., @company.com).'}), 400
        
        # Check if domain is already taken
        existing_company = Company.query.filter_by(domain=domain).first()
        if existing_company:
            return jsonify({'success': False, 'error': 'Domain is already in use by another company.'}), 409
        
        # Create new company
        new_company = Company(name=name, domain=domain)
        db.session.add(new_company)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'company': {
                'id': new_company.id,
                'name': new_company.name,
                'domain': new_company.domain,
                'created_at': new_company.created_at.isoformat() if new_company.created_at else None
            }
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating company: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred.'}), 500

@bp.route('/api/companies/<int:company_id>', methods=['GET'])
@company_required
@admin_required
def get_company_by_id(company_id):
    """Get a specific company by ID (admin only)"""
    company = Company.query.get(company_id)
    
    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404
    
    return jsonify({
        'success': True,
        'company': {
            'id': company.id,
            'name': company.name,
            'domain': company.domain,
            'created_at': company.created_at.isoformat() if company.created_at else None
        }
    })

@bp.route('/api/companies/<int:company_id>', methods=['PUT'])
@company_required
@admin_required
def update_company_by_id(company_id):
    """Update a specific company by ID (admin only)"""
    company = Company.query.get(company_id)
    
    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404
    
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        domain = data.get('domain', '').strip()
        
        if not name or len(name) > 120:
            return jsonify({'success': False, 'error': 'Invalid company name provided.'}), 400
        
        if not domain or len(domain) > 120:
            return jsonify({'success': False, 'error': 'Invalid domain provided.'}), 400
        
        # Check if domain contains @ symbol
        if '@' not in domain:
            return jsonify({'success': False, 'error': 'Domain must contain an @ symbol (e.g., @company.com).'}), 400
        
        # Check if domain is already taken by another company
        existing_company = Company.query.filter(
            Company.domain == domain,
            Company.id != company_id
        ).first()
        
        if existing_company:
            return jsonify({'success': False, 'error': 'Domain is already in use by another company.'}), 409
        
        company.name = name
        company.domain = domain
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating company: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred.'}), 500

@bp.route('/api/companies/list', methods=['GET'])
@company_required
def get_companies_list():
    """Get a simple list of all companies for dropdowns"""
    companies = Company.query.all()
    return jsonify({
        'companies': [{
            'id': company.id,
            'name': company.name,
            'domain': company.domain
        } for company in companies]
    })

@bp.route('/api/companies/<int:company_id>', methods=['DELETE'])
@company_required
@admin_required
def delete_company_by_id(company_id):
    """Delete a specific company by ID (admin only)"""
    company = Company.query.get(company_id)
    
    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404
    
    # Check if this is the admin's own company
    if company.id == current_user.company_id:
        return jsonify({'success': False, 'error': 'Cannot delete your own company.'}), 400
    
    try:
        # Get counts for warning purposes
        user_count = User.query.filter_by(company_id=company_id).count()
        room_count = Room.query.filter_by(company_id=company_id).count()
        booking_count = Booking.query.filter_by(company_id=company_id).count()
        
        # Delete all related data first (cascade delete)
        # Delete bookings
        Booking.query.filter_by(company_id=company_id).delete()
        
        # Delete rooms
        Room.query.filter_by(company_id=company_id).delete()
        
        # Delete invitations
        Invitation.query.filter_by(company_id=company_id).delete()
        
        # Delete users (this will cascade to any other related data)
        User.query.filter_by(company_id=company_id).delete()
        
        # Finally delete the company
        db.session.delete(company)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Company "{company.name}" deleted successfully. Removed {user_count} users, {room_count} rooms, and {booking_count} bookings.'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting company: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred while deleting the company.'}), 500