# app/auth.py

from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from flask_login import login_user, logout_user, login_required, current_user
from app.models import User, Company
from app import db
import re

bp = Blueprint('auth', __name__)

def validate_domain(email, company_domain):
    """Validate that user's email domain matches company domain"""
    user_domain = email.split('@')[1].lower()
    return user_domain == company_domain.lower()

@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        
        email = data.get('email', '').lower().strip()
        name = data.get('name', '').strip()
        password = data.get('password', '')
        company_name = data.get('company_name', '').strip()
        company_domain = data.get('company_domain', '').lower().strip()
        
        # Validation
        if not all([email, name, password, company_name, company_domain]):
            return {'success': False, 'error': 'All fields are required'}, 400
        
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return {'success': False, 'error': 'Invalid email format'}, 400
        
        if not validate_domain(email, company_domain):
            return {'success': False, 'error': 'Email domain must match company domain'}, 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return {'success': False, 'error': 'User with this email already exists'}, 400
        
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
            role='admin' if is_admin else 'user'
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


