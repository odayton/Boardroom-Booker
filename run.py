import argparse
import os
import sys
from app import create_app, db
from app.models import User, Company

def create_dev_user():
    """Create a development user if it doesn't exist"""
    with app.app_context():
        # Check if dev user already exists
        dev_user = User.query.filter_by(email='dev@test.com').first()
        if not dev_user:
            # Create test company if it doesn't exist
            company = Company.query.filter_by(domain='test.com').first()
            if not company:
                company = Company(name='Test Company', domain='test.com')
                db.session.add(company)
                db.session.flush()
            
            # Create dev user
            dev_user = User(
                email='dev@test.com',
                name='Development User',
                role='admin',
                company_id=company.id
            )
            dev_user.set_password('dev123')
            db.session.add(dev_user)
            db.session.commit()
            print("✅ Created development user: dev@test.com / dev123")

def show_menu():
    """Display the interactive menu"""
    print("\n" + "="*50)
    print("🚀 BoardRoom-Booker - Choose Run Mode")
    print("="*50)
    print("1. Development Mode (Auto-login)")
    print("   - Auto-login as dev@test.com / dev123")
    print("   - Create development user if needed")
    print("   - Debug mode enabled")
    print()
    print("2. User Mode (Normal Authentication)")
    print("   - Requires manual login/registration")
    print("   - Production-like settings")
    print("   - Debug mode enabled")
    print()
    print("3. Custom Mode (Command line options)")
    print("   - Use command line arguments")
    print()
    print("0. Exit")
    print("="*50)

def get_user_choice():
    """Get user choice from terminal"""
    while True:
        try:
            choice = input("\nEnter your choice (0-3): ").strip()
            if choice in ['0', '1', '2', '3']:
                return choice
            else:
                print("❌ Invalid choice. Please enter 0, 1, 2, or 3.")
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            sys.exit(0)

def run_dev_mode():
    """Run the application in development mode"""
    print("\n🚀 Starting in DEVELOPMENT mode...")
    print("📝 Dev credentials: dev@test.com / dev123")
    
    # Set environment variables
    os.environ['FLASK_ENV'] = 'development'
    os.environ['DEV_MODE'] = 'true'
    
    # Create Flask app
    global app
    app = create_app()
    
    # Setup dev user
    create_dev_user()
    
    print("🌐 Server starting on http://127.0.0.1:5000")
    print("Press CTRL+C to quit")
    
    # Run the application
    app.run(host='127.0.0.1', port=5000, debug=True)

def run_user_mode():
    """Run the application in user mode"""
    print("\n👤 Starting in USER mode...")
    print("🔐 Normal authentication required")
    
    # Set environment variables
    os.environ['FLASK_ENV'] = 'production'
    os.environ['DEV_MODE'] = 'false'
    
    # Create Flask app
    global app
    app = create_app()
    
    print("🌐 Server starting on http://127.0.0.1:5000")
    print("Press CTRL+C to quit")
    
    # Run the application
    app.run(host='127.0.0.1', port=5000, debug=True)

def main():
    # Check if command line arguments are provided
    if len(sys.argv) > 1:
        # Use command line mode
        parser = argparse.ArgumentParser(description='BoardRoom-Booker Application')
        parser.add_argument('--mode', choices=['user', 'dev'], default='user',
                           help='Run mode: user (normal) or dev (auto-login)')
        parser.add_argument('--host', default='127.0.0.1',
                           help='Host to run the server on (default: 127.0.0.1)')
        parser.add_argument('--port', type=int, default=5000,
                           help='Port to run the server on (default: 5000)')
        parser.add_argument('--debug', action='store_true', default=True,
                           help='Run in debug mode (default: True)')
        
        args = parser.parse_args()
        
        # Set environment variable for dev mode
        if args.mode == 'dev':
            os.environ['FLASK_ENV'] = 'development'
            os.environ['DEV_MODE'] = 'true'
            print("🚀 Starting in DEVELOPMENT mode (auto-login enabled)")
            print("📝 Dev credentials: dev@test.com / dev123")
        else:
            os.environ['FLASK_ENV'] = 'production'
            os.environ['DEV_MODE'] = 'false'
            print("👤 Starting in USER mode (normal authentication)")
        
        # Create Flask app
        global app
        app = create_app()
        
        # Setup dev user if in dev mode
        if args.mode == 'dev':
            create_dev_user()
        
        print(f"🌐 Server starting on http://{args.host}:{args.port}")
        print("Press CTRL+C to quit")
        
        # Run the application
        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug
        )
    else:
        # Use interactive mode
        while True:
            show_menu()
            choice = get_user_choice()
            
            if choice == '0':
                print("👋 Goodbye!")
                sys.exit(0)
            elif choice == '1':
                run_dev_mode()
                break
            elif choice == '2':
                run_user_mode()
                break
            elif choice == '3':
                print("\n💡 Use command line arguments:")
                print("   python run.py --mode dev    # Development mode")
                print("   python run.py --mode user   # User mode")
                print("   python run.py --help        # Show all options")
                sys.exit(0)

if __name__ == '__main__':
    main()