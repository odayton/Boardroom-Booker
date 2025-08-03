#!/usr/bin/env python3
"""
Script to invite users from other companies with proper data isolation
"""

from app import create_app, db
from app.models import User, Company, Invitation
from datetime import datetime, timedelta

def invite_external_company_user(host_company_id, external_email, external_name, role='manager'):
    """
    Invite a user from another company to access your company's calendar
    
    Args:
        host_company_id: The ID of your company (the one doing the inviting)
        external_email: Email of the person you're inviting
        external_name: Name of the person you're inviting
        role: Role to assign ('manager' recommended for external company admins)
    """
    app = create_app()
    
    with app.app_context():
        # Check if host company exists
        host_company = Company.query.get(host_company_id)
        if not host_company:
            print(f"❌ Host company with ID {host_company_id} not found")
            return False
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=external_email).first()
        if existing_user:
            print(f"⚠️  User {external_email} already exists")
            print(f"   Current company: {existing_user.company.name if existing_user.company else 'None'}")
            print(f"   Current role: {existing_user.role}")
            
            # Ask if they want to update the user's access
            response = input("Do you want to grant this user access to your company? (y/n): ")
            if response.lower() != 'y':
                return False
            
            # Update existing user to have external access
            existing_user.external_company_access = host_company_id
            existing_user.role = role
            db.session.commit()
            
            print(f"✅ Updated user {external_name} ({external_email})")
            print(f"   Granted {role} access to {host_company.name}")
            return True
        
        # Create invitation for new user
        invitation = Invitation(
            email=external_email,
            name=external_name,
            role=role,
            company_id=host_company_id,
            invited_by_id=1,  # You'll need to set this to the actual admin user ID
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        db.session.add(invitation)
        db.session.commit()
        
        print(f"✅ Created invitation for {external_name} ({external_email})")
        print(f"   Invitation code: {invitation.code}")
        print(f"   Role: {role}")
        print(f"   Expires: {invitation.expires_at.strftime('%Y-%m-%d %H:%M')}")
        print(f"   Company: {host_company.name}")
        
        return True

def list_companies():
    """List all companies in the system"""
    app = create_app()
    
    with app.app_context():
        companies = Company.query.all()
        print("\n📋 Available Companies:")
        for company in companies:
            print(f"   ID: {company.id} | Name: {company.name} | Domain: {company.domain}")

if __name__ == "__main__":
    print("🔗 External Company Invitation System")
    print("=" * 50)
    
    # List available companies
    list_companies()
    
    print("\n📝 To invite an external company user:")
    print("1. Note your company ID from the list above")
    print("2. Run: python invite_external_company.py")
    print("3. Or use the function directly in your code")
    
    # Example usage
    print("\n💡 Example:")
    print("invite_external_company_user(")
    print("    host_company_id=1,")
    print("    external_email='admin@partnercompany.com',")
    print("    external_name='John Doe',")
    print("    role='manager'")
    print(")") 