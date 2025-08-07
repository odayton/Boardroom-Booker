#!/usr/bin/env python3
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app, db
from app.models import Room, Company, User

def check_rooms():
    app = create_app()
    with app.app_context():
        print("=== Database Room Check ===")
        
        # Check companies
        companies = Company.query.all()
        print(f"Companies found: {len(companies)}")
        for company in companies:
            print(f"  - {company.name} (ID: {company.id})")
        
        # Check users
        users = User.query.all()
        print(f"Users found: {len(users)}")
        for user in users:
            print(f"  - {user.name} ({user.email}) - Company: {user.company_id}")
        
        # Check rooms
        rooms = Room.query.all()
        print(f"Rooms found: {len(rooms)}")
        for room in rooms:
            print(f"  - {room.name} (ID: {room.id}) - Company: {room.company_id}")
            print(f"    Description: {room.description}")
            print(f"    Status: {room.status}")
            print(f"    Visibility: {room.visibility_type}")
        
        if not rooms:
            print("\nNo rooms found! You need to create some rooms first.")
            print("You can create rooms through the room management interface.")
        else:
            print(f"\nFound {len(rooms)} rooms in the database.")

if __name__ == '__main__':
    check_rooms() 