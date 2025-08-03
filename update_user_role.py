#!/usr/bin/env python3
"""
Script to update a user's role from 'owner' to 'admin'
"""

import os
import sys
from app import create_app, db
from app.models import User

def update_user_role(email, new_role='admin'):
    """Update a user's role"""
    app = create_app()
    
    with app.app_context():
        # Find the user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False
        
        old_role = user.role
        user.role = new_role
        db.session.commit()
        
        print(f"✅ Successfully updated user '{user.name}' ({user.email})")
        print(f"   Role changed from '{old_role}' to '{new_role}'")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_user_role.py <email> [new_role]")
        print("Example: python update_user_role.py user@example.com admin")
        sys.exit(1)
    
    email = sys.argv[1]
    new_role = sys.argv[2] if len(sys.argv) > 2 else 'admin'
    
    update_user_role(email, new_role) 