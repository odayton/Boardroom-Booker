#!/usr/bin/env python3
"""Initialize database with sample data for Phase 1 testing"""

import os
import sys
from datetime import datetime, timedelta

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Company, User, Room, Booking
from werkzeug.security import generate_password_hash

def init_database():
    app = create_app()
    
    with app.app_context():
        try:
            print("Creating database tables...")
            db.create_all()
            print("✓ Database tables created")
            
            # Check if sample data already exists
            if Company.query.first():
                print("Sample data already exists, skipping...")
                return
            
            print("\nCreating sample data...")
            
            # Create sample company
            company = Company(
                name="Acme Corporation",
                domain="acme.com"
            )
            db.session.add(company)
            db.session.commit()
            print(f"✓ Created company: {company.name}")
            
            # Create admin user
            admin_user = User(
                email="admin@acme.com",
                name="Admin User",
                password_hash=generate_password_hash("admin123"),
                role="admin",
                company_id=company.id
            )
            db.session.add(admin_user)
            
            # Create regular user
            regular_user = User(
                email="user@acme.com",
                name="Regular User",
                password_hash=generate_password_hash("user123"),
                role="user",
                company_id=company.id
            )
            db.session.add(regular_user)
            db.session.commit()
            print(f"✓ Created users: {admin_user.name}, {regular_user.name}")
            
            # Create sample rooms
            rooms = [
                Room(name="Conference Room A", company_id=company.id),
                Room(name="Conference Room B", company_id=company.id),
                Room(name="Board Room", company_id=company.id),
                Room(name="Meeting Room 1", company_id=company.id),
                Room(name="Meeting Room 2", company_id=company.id)
            ]
            
            for room in rooms:
                db.session.add(room)
            db.session.commit()
            print(f"✓ Created {len(rooms)} rooms")
            
            # Create sample bookings
            now = datetime.now()
            bookings = [
                Booking(
                    title="Team Standup",
                    start_time=now.replace(hour=9, minute=0, second=0, microsecond=0),
                    end_time=now.replace(hour=9, minute=30, second=0, microsecond=0),
                    organizer_name="Admin User",
                    is_public=True,
                    company_id=company.id,
                    room_id=rooms[0].id,
                    user_id=admin_user.id
                ),
                Booking(
                    title="Client Meeting",
                    start_time=now.replace(hour=14, minute=0, second=0, microsecond=0),
                    end_time=now.replace(hour=15, minute=0, second=0, microsecond=0),
                    organizer_name="Regular User",
                    is_public=False,
                    company_id=company.id,
                    room_id=rooms[1].id,
                    user_id=regular_user.id
                ),
                Booking(
                    title="Project Review",
                    start_time=now.replace(hour=16, minute=0, second=0, microsecond=0),
                    end_time=now.replace(hour=17, minute=0, second=0, microsecond=0),
                    organizer_name="Admin User",
                    is_public=True,
                    company_id=company.id,
                    room_id=rooms[2].id,
                    user_id=admin_user.id
                )
            ]
            
            for booking in bookings:
                db.session.add(booking)
            db.session.commit()
            print(f"✓ Created {len(bookings)} sample bookings")
            
            print("\n🎉 Database initialization completed successfully!")
            print("\nSample login credentials:")
            print("Admin: admin@acme.com / admin123")
            print("User: user@acme.com / user123")
            
        except Exception as e:
            print(f"❌ Error during initialization: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    init_database() 