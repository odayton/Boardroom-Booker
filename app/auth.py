# app/auth.py

from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from flask_login import login_user, logout_user, login_required, current_user
from app.models import User, Company, Invitation
from app import db
import re

bp = Blueprint('auth', __name__)

def validate_domain(email, company_domain):
    """Validate that user's email domain matches company domain"""
    user_domain = email.split('@')[1].lower()
    # Remove @ symbol from company domain if present
    clean_company_domain = company_domain.replace('@', '').lower()
    return user_domain == clean_company_domain

@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        
        # Check if this is an invitation-based registration
        invitation_code = data.get('invitation_code', '').strip()
        
        if invitation_code:
            # Handle invitation-based registration
            from app.models import Invitation
            
            invitation = Invitation.query.filter_by(code=invitation_code).first()
            
            if not invitation:
                return {'success': False, 'error': 'Invalid invitation code'}, 400
            
            if invitation.is_used:
                return {'success': False, 'error': 'Invitation has already been used'}, 400
            
            if invitation.is_expired():
                return {'success': False, 'error': 'Invitation has expired'}, 400
            
            # Validate that the email matches the invitation
            email = data.get('email', '').lower().strip()
            if email != invitation.email:
                return {'success': False, 'error': 'Email does not match invitation'}, 400
            
            name = data.get('name', '').strip()
            password = data.get('password', '')
            
            if not all([name, password]):
                return {'success': False, 'error': 'Name and password are required'}, 400
            
            # Check if user already exists
            if User.query.filter_by(email=email).first():
                return {'success': False, 'error': 'User with this email already exists'}, 400
            
            # Create user
            user = User(
                email=email,
                name=name,
                role=invitation.role,
                company_id=invitation.company_id
            )
            user.set_password(password)
            
            # Mark invitation as used
            invitation.is_used = True
            
            db.session.add(user)
            db.session.commit()
            
            # Auto-login after registration
            login_user(user)
            
            return {'success': True, 'message': 'Registration successful'}, 201
        
        else:
            # Handle company creation registration (first user becomes owner)
            email = data.get('email', '').lower().strip()
            name = data.get('name', '').strip()
            password = data.get('password', '')
            company_name = data.get('company_name', '').strip()
            company_domain = data.get('company_domain', '').lower().strip()
            no_company = data.get('no_company', False)
            
            # Validation
            if not all([email, name, password]):
                return {'success': False, 'error': 'Email, name, and password are required'}, 400
            
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                return {'success': False, 'error': 'Invalid email format'}, 400
            
            # Check if user already exists
            if User.query.filter_by(email=email).first():
                return {'success': False, 'error': 'User with this email already exists'}, 400
            
            company = None
            if not no_company:
                # User wants to create/join a company
                if not all([company_name, company_domain]):
                    return {'success': False, 'error': 'Company name and domain are required'}, 400
                
                if not validate_domain(email, company_domain):
                    return {'success': False, 'error': 'Email domain must match company domain'}, 400
                
                # Check if company exists, create if not
                company = Company.query.filter_by(domain=company_domain).first()
                if not company:
                    company = Company(name=company_name, domain=company_domain)
                    db.session.add(company)
                    db.session.flush()  # Get the company ID
                
                # Create user (first user in company becomes admin)
                is_admin = len(company.users) == 0
                user = User(
                    email=email,
                    name=name,
                    company_id=company.id,
                    role='admin' if is_admin else 'employee'
                )
            else:
                # User doesn't want to associate with a company
                user = User(
                    email=email,
                    name=name,
                    company_id=None,
                    role='employee'
                )
            
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            
            # Auto-login after registration
            login_user(user)
            
            return {'success': True, 'message': 'Registration successful'}, 201
    
    return render_template('auth/register.html')

@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return {'success': False, 'error': 'Email and password are required'}, 400
        
        # First, check if this might be an invitation code
        invitation = Invitation.query.filter_by(code=password).first()
        
        if invitation and invitation.email.lower() == email:
            # This is an invitation code - validate it
            if invitation.is_used:
                return {'success': False, 'error': 'Invitation has already been used'}, 400
            
            if invitation.is_expired():
                return {'success': False, 'error': 'Invitation has expired'}, 400
            
            # Check if user already exists
            user = User.query.filter_by(email=email).first()
            
            if user:
                # User exists but is trying to use invitation code
                return {'success': False, 'error': 'User already exists. Please use your password to login.'}, 400
            
            # This is a valid invitation code for a new user
            # We need to redirect them to complete the registration
            return {
                'success': False, 
                'error': 'Please complete your registration first',
                'invitation_code': password,
                'redirect_to_register': True
            }, 400
        
        # Regular login attempt
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            return {'success': True, 'message': 'Login successful'}, 200
        else:
            return {'success': False, 'error': 'Invalid email or password'}, 401
    
    return render_template('auth/login.html')

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))

@bp.route('/check-domain', methods=['POST'])
def check_domain():
    """Check if a domain is whitelisted for registration"""
    data = request.get_json()
    domain = data.get('domain', '').lower().strip()
    
    if not domain:
        return {'success': False, 'error': 'Domain is required'}, 400
    
    # For now, allow any domain. In production, you might want to whitelist specific domains
    company = Company.query.filter_by(domain=domain).first()
    
    return {
        'success': True,
        'domain_exists': company is not None,
        'company_name': company.name if company else None
    }



