#!/usr/bin/env python3
"""
Database migration script to update the role system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

def migrate_roles():
    """Update the role system"""
    app = create_app()
    
    with app.app_context():
        print("Starting role system migration...")
        
        # Add expires_at column to user table
        try:
            db.session.execute(text("ALTER TABLE user ADD COLUMN expires_at DATETIME"))
            print("✓ Added expires_at column to user table")
        except Exception as e:
            print(f"Expires at column might already exist: {e}")
        
        # Add guest_duration_days column to invitation table
        try:
            db.session.execute(text("ALTER TABLE invitation ADD COLUMN guest_duration_days INTEGER"))
            print("✓ Added guest_duration_days column to invitation table")
        except Exception as e:
            print(f"Guest duration days column might already exist: {e}")
        
        # Update existing roles from 'owner' to 'admin'
        try:
            db.session.execute(text("UPDATE user SET role = 'admin' WHERE role = 'owner'"))
            print("✓ Updated 'owner' roles to 'admin'")
        except Exception as e:
            print(f"Role update might have failed: {e}")
        
        # Update existing invitation roles from 'owner' to 'admin'
        try:
            db.session.execute(text("UPDATE invitation SET role = 'admin' WHERE role = 'owner'"))
            print("✓ Updated invitation 'owner' roles to 'admin'")
        except Exception as e:
            print(f"Invitation role update might have failed: {e}")
        
        # Commit all changes
        db.session.commit()
        print("✓ Migration completed successfully!")
        
        # Verify the migration
        result = db.session.execute(text("PRAGMA table_info(user)"))
        user_columns = [row[1] for row in result.fetchall()]
        print(f"\nCurrent user table columns: {user_columns}")
        
        result = db.session.execute(text("PRAGMA table_info(invitation)"))
        invitation_columns = [row[1] for row in result.fetchall()]
        print(f"Current invitation table columns: {invitation_columns}")
        
        # Show current roles
        result = db.session.execute(text("SELECT DISTINCT role FROM user"))
        roles = [row[0] for row in result.fetchall()]
        print(f"Current user roles: {roles}")

if __name__ == '__main__':
    migrate_roles() 