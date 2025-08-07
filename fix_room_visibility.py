#!/usr/bin/env python3
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app, db
from app.models import Room

def fix_room_visibility():
    app = create_app()
    with app.app_context():
        print("=== Fixing Room Visibility ===")
        
        # Find the Boardroom
        room = Room.query.filter_by(name="Boardroom").first()
        if not room:
            print("Boardroom not found!")
            return
        
        print(f"Found room: {room.name} (ID: {room.id}) - Company: {room.company_id}")
        print(f"Current visibility: {room.visibility_type}")
        
        # Make it public so all users can see it
        room.visibility_type = 'public'
        db.session.commit()
        
        print(f"Updated visibility to: {room.visibility_type}")
        print("Room should now be visible in the dropdown for all users!")

if __name__ == '__main__':
    fix_room_visibility() 