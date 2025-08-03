#!/usr/bin/env python3
"""Simple test script to verify basic application functionality"""

import os
import sys

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def test_imports():
    """Test if all required modules can be imported"""
    try:
        print("Testing imports...")
        
        # Test basic Flask imports
        from flask import Flask
        print("✓ Flask imported successfully")
        
        # Test app creation
        from app import create_app
        print("✓ App factory imported successfully")
        
        # Test models
        from app.models import Company, User, Room, Booking
        print("✓ Models imported successfully")
        
        # Test database
        from app import db
        print("✓ Database imported successfully")
        
        # Test auth
        from app.auth import bp as auth_bp
        print("✓ Auth blueprint imported successfully")
        
        # Test routes
        from app.routes import bp as main_bp
        print("✓ Main routes imported successfully")
        
        print("\n🎉 All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_app_creation():
    """Test if the Flask app can be created"""
    try:
        print("\nTesting app creation...")
        from app import create_app
        
        app = create_app()
        print("✓ Flask app created successfully")
        
        # Test app context
        with app.app_context():
            print("✓ App context works")
            
            # Test database connection
            from app import db
            db.engine.execute("SELECT 1")
            print("✓ Database connection works")
        
        return True
        
    except Exception as e:
        print(f"❌ App creation error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=== BoardRoom-Booker Phase 1 Test ===\n")
    
    # Test imports
    if not test_imports():
        print("\n❌ Import test failed. Please check your dependencies.")
        sys.exit(1)
    
    # Test app creation
    if not test_app_creation():
        print("\n❌ App creation test failed. Please check your configuration.")
        sys.exit(1)
    
    print("\n🎉 All tests passed! The application is ready to run.")
    print("\nNext steps:")
    print("1. Run: python init_db.py (to initialize the database)")
    print("2. Run: python run.py (to start the application)")
    print("3. Visit: http://localhost:5000") 