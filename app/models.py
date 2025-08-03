# app/models.py

from app import db
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
import secrets
import string
import json

class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    domain = db.Column(db.String(120), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', backref='company', lazy=True)
    rooms = db.relationship('Room', backref='company', lazy=True)
    bookings = db.relationship('Booking', backref='company', lazy=True)
    invitations = db.relationship('Invitation', backref='company', lazy=True)
    
    def __repr__(self):
        return f'<Company {self.name}>'

class Invitation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(16), unique=True, nullable=False)
    email = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin', 'manager', 'employee', 'guest'
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    invited_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    guest_duration_days = db.Column(db.Integer, nullable=True)  # For guest accounts
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    invited_by = db.relationship('User', backref='sent_invitations')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            # Set default expiration based on role
            if self.role == 'guest':
                default_days = self.guest_duration_days or 30  # Default 30 days for guests
            else:
                default_days = 7  # Default 7 days for regular users
            self.expires_at = datetime.utcnow() + timedelta(days=default_days)
    
    @staticmethod
    def generate_code():
        """Generate a unique 8-character invitation code"""
        while True:
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            if not Invitation.query.filter_by(code=code).first():
                return code
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def get_role_display(self):
        """Get human-readable role name"""
        role_map = {
            'admin': 'Admin',
            'manager': 'Manager', 
            'employee': 'Employee',
            'guest': 'Guest'
        }
        return role_map.get(self.role, self.role)
    
    def get_role_description(self):
        """Get role description"""
        descriptions = {
            'admin': 'Full access to all features including room and user management',
            'manager': 'Can manage users and view all company data',
            'employee': 'Can book rooms and view company calendar',
            'guest': 'Temporary access with limited permissions'
        }
        return descriptions.get(self.role, '')
    
    def __repr__(self):
        return f'<Invitation {self.code} for {self.email}>'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255))
    role = db.Column(db.String(20), default='employee')  # 'admin', 'manager', 'employee', 'guest'
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)  # For guest accounts
    
    # Relationships
    bookings = db.relationship('Booking', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_admin(self):
        return self.role == 'admin'
    
    def is_manager(self):
        return self.role == 'manager'
    
    def is_employee(self):
        return self.role == 'employee'
    
    def is_guest(self):
        return self.role == 'guest'
    
    def is_active_user(self):
        """Check if user account is still active (not expired)"""
        if self.role == 'guest' and self.expires_at:
            return datetime.utcnow() < self.expires_at
        return True
    
    def can_manage_rooms(self):
        """Check if user can manage rooms"""
        return self.role in ['admin']
    
    def can_manage_users(self):
        """Check if user can manage users"""
        return self.role in ['admin', 'manager']
    
    def can_invite_users(self):
        """Check if user can invite other users"""
        return self.role in ['admin', 'manager']
    
    def can_manage_company(self):
        """Check if user can manage company settings"""
        return self.role == 'admin'
    
    def can_see_user(self, other_user):
        """Check if user can see another user's information"""
        if self.role == 'admin':
            return other_user.company_id == self.company_id
        elif self.role == 'manager':
            # Managers can see employees and guests, but not other managers or admins
            return (other_user.company_id == self.company_id and 
                   other_user.role in ['employee', 'guest'])
        else:
            return False
    
    def can_edit_user(self, other_user):
        """Check if user can edit another user"""
        if self.role == 'admin':
            return other_user.company_id == self.company_id
        elif self.role == 'manager':
            # Managers can only edit employees and guests
            return (other_user.company_id == self.company_id and 
                   other_user.role in ['employee', 'guest'])
        else:
            return False
    
    def get_role_display(self):
        """Get human-readable role name"""
        role_map = {
            'admin': 'Admin',
            'manager': 'Manager', 
            'employee': 'Employee',
            'guest': 'Guest'
        }
        return role_map.get(self.role, self.role)
    
    def get_role_description(self):
        """Get role description"""
        descriptions = {
            'admin': 'Full access to all features including room and user management',
            'manager': 'Can manage users and view all company data',
            'employee': 'Can book rooms and view company calendar',
            'guest': 'Temporary access with limited permissions'
        }
        return descriptions.get(self.role, '')
    
    def __repr__(self):
        return f'<User {self.email}>'

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    capacity = db.Column(db.Integer, nullable=True)
    room_type = db.Column(db.String(50), nullable=True)  # conference, meeting, huddle, etc.
    location = db.Column(db.String(100), nullable=True)  # floor, building, etc.
    equipment = db.Column(db.Text, nullable=True)  # JSON string of equipment
    status = db.Column(db.String(20), default='available')  # available, maintenance, out_of_service
    access_level = db.Column(db.String(20), default='all')  # all, managers_only, owners_only
    operating_hours_start = db.Column(db.Time, nullable=True)
    operating_hours_end = db.Column(db.Time, nullable=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bookings = db.relationship('Booking', backref='room', lazy=True)
    
    def get_equipment_list(self):
        """Get equipment as a list"""
        if self.equipment:
            try:
                return json.loads(self.equipment)
            except:
                return []
        return []
    
    def set_equipment_list(self, equipment_list):
        """Set equipment from a list"""
        self.equipment = json.dumps(equipment_list) if equipment_list else None
    
    def is_available_for_booking(self, user):
        """Check if room is available for booking by this user"""
        if self.status != 'available':
            return False
        
        if self.access_level == 'owners_only' and not user.is_owner():
            return False
        elif self.access_level == 'managers_only' and not user.is_admin():
            return False
        
        return True
    
    def get_room_type_display(self):
        """Get human-readable room type"""
        type_map = {
            'conference': 'Conference Room',
            'meeting': 'Meeting Room',
            'huddle': 'Huddle Space',
            'training': 'Training Room',
            'boardroom': 'Boardroom',
            'breakout': 'Breakout Room',
            'office': 'Private Office',
            'other': 'Other'
        }
        return type_map.get(self.room_type, self.room_type or 'Not specified')
    
    def get_status_display(self):
        """Get human-readable status"""
        status_map = {
            'available': 'Available',
            'maintenance': 'Under Maintenance',
            'out_of_service': 'Out of Service'
        }
        return status_map.get(self.status, self.status)
    
    def __repr__(self):
        return f'<Room {self.name}>'

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    organizer_name = db.Column(db.String(120), nullable=True)
    is_public = db.Column(db.Boolean, default=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Booking {self.title}>'