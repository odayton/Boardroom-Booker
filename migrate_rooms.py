#!/usr/bin/env python3
"""
Database migration script to add new fields to the Room table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

def migrate_rooms():
    """Add new fields to the Room table"""
    app = create_app()
    
    with app.app_context():
        print("Starting room table migration...")
        
        # Add new columns to the room table
        try:
            # Add description column
            db.session.execute(text("ALTER TABLE room ADD COLUMN description TEXT"))
            print("✓ Added description column")
        except Exception as e:
            print(f"Description column might already exist: {e}")
        
        try:
            # Add capacity column
            db.session.execute(text("ALTER TABLE room ADD COLUMN capacity INTEGER"))
            print("✓ Added capacity column")
        except Exception as e:
            print(f"Capacity column might already exist: {e}")
        
        try:
            # Add room_type column
            db.session.execute(text("ALTER TABLE room ADD COLUMN room_type VARCHAR(50)"))
            print("✓ Added room_type column")
        except Exception as e:
            print(f"Room type column might already exist: {e}")
        
        try:
            # Add location column
            db.session.execute(text("ALTER TABLE room ADD COLUMN location VARCHAR(100)"))
            print("✓ Added location column")
        except Exception as e:
            print(f"Location column might already exist: {e}")
        
        try:
            # Add equipment column
            db.session.execute(text("ALTER TABLE room ADD COLUMN equipment TEXT"))
            print("✓ Added equipment column")
        except Exception as e:
            print(f"Equipment column might already exist: {e}")
        
        try:
            # Add status column
            db.session.execute(text("ALTER TABLE room ADD COLUMN status VARCHAR(20) DEFAULT 'available'"))
            print("✓ Added status column")
        except Exception as e:
            print(f"Status column might already exist: {e}")
        
        try:
            # Add access_level column
            db.session.execute(text("ALTER TABLE room ADD COLUMN access_level VARCHAR(20) DEFAULT 'all'"))
            print("✓ Added access_level column")
        except Exception as e:
            print(f"Access level column might already exist: {e}")
        
        try:
            # Add operating_hours_start column
            db.session.execute(text("ALTER TABLE room ADD COLUMN operating_hours_start TIME"))
            print("✓ Added operating_hours_start column")
        except Exception as e:
            print(f"Operating hours start column might already exist: {e}")
        
        try:
            # Add operating_hours_end column
            db.session.execute(text("ALTER TABLE room ADD COLUMN operating_hours_end TIME"))
            print("✓ Added operating_hours_end column")
        except Exception as e:
            print(f"Operating hours end column might already exist: {e}")
        
        try:
            # Add updated_at column (without default for SQLite compatibility)
            db.session.execute(text("ALTER TABLE room ADD COLUMN updated_at DATETIME"))
            print("✓ Added updated_at column")
        except Exception as e:
            print(f"Updated at column might already exist: {e}")
        
        # Commit all changes
        db.session.commit()
        print("✓ Migration completed successfully!")
        
        # Verify the migration
        result = db.session.execute(text("PRAGMA table_info(room)"))
        columns = [row[1] for row in result.fetchall()]
        print(f"\nCurrent room table columns: {columns}")

if __name__ == '__main__':
    migrate_rooms() 