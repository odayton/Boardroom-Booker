#!/usr/bin/env python3
"""Test script to verify database connection and model creation"""

from app import create_app, db
from app.models import Company, User, Room, Booking

def test_database():
    app = create_app()
    
    with app.app_context():
        try:
            # Test database connection
            print("Testing database connection...")
            db.engine.execute("SELECT 1")
            print("✓ Database connection successful")
            
            # Test model creation
            print("\nTesting model creation...")
            
            # Create a test company
            company = Company(
                name="Test Company",
                domain="testcompany.com"
            )
            db.session.add(company)
            db.session.commit()
            print(f"✓ Created company: {company.name}")
            
            # Create a test user
            user = User(
                email="admin@testcompany.com",
                name="Test Admin",
                password_hash="test_hash",
                role="admin",
                company_id=company.id
            )
            db.session.add(user)
            db.session.commit()
            print(f"✓ Created user: {user.name}")
            
            # Create a test room
            room = Room(
                name="Conference Room A",
                company_id=company.id
            )
            db.session.add(room)
            db.session.commit()
            print(f"✓ Created room: {room.name}")
            
            # Clean up test data
            db.session.delete(room)
            db.session.delete(user)
            db.session.delete(company)
            db.session.commit()
            print("✓ Cleaned up test data")
            
            print("\n🎉 All tests passed!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_database() 