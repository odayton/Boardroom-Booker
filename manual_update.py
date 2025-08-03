# Manual update script - run this in Python console
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    # Replace with your email
    email = "your-email@example.com"
    
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"Current role: {user.role}")
        user.role = 'admin'
        db.session.commit()
        print(f"Updated role to: {user.role}")
    else:
        print("User not found") 