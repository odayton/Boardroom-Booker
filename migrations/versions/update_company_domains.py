"""Update company domains to include @ symbol

Revision ID: update_company_domains
Revises: d93cbff2d5df
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'update_company_domains'
down_revision = 'd93cbff2d5df'
branch_labels = None
depends_on = None


def upgrade():
    """Update existing company domains to include @ symbol if missing"""
    # Get connection
    connection = op.get_bind()
    
    # Get all companies
    companies = connection.execute(sa.text("SELECT id, name, domain FROM company")).fetchall()
    
    print(f"🔍 Found {len(companies)} companies to check...")
    
    updated_count = 0
    skipped_count = 0
    
    for company in companies:
        company_id, company_name, domain = company
        
        print(f"🏢 Checking company: {company_name} (ID: {company_id})")
        print(f"   Current domain: {domain}")
        
        # Check if domain already has @ symbol
        if '@' in domain:
            print(f"   ✅ Domain already has @ symbol - skipping")
            skipped_count += 1
            continue
        
        # Add @ symbol to the beginning
        new_domain = f"@{domain}" if not domain.startswith('@') else domain
        
        # Check if the new domain would conflict with existing companies
        existing = connection.execute(
            sa.text("SELECT id, name FROM company WHERE domain = :domain AND id != :company_id"),
            {"domain": new_domain, "company_id": company_id}
        ).fetchone()
        
        if existing:
            print(f"   ❌ ERROR: New domain '{new_domain}' would conflict with company '{existing[1]}' (ID: {existing[0]})")
            print(f"   ⚠️  Please manually resolve this conflict")
            continue
        
        # Update the domain
        try:
            connection.execute(
                sa.text("UPDATE company SET domain = :new_domain WHERE id = :company_id"),
                {"new_domain": new_domain, "company_id": company_id}
            )
            print(f"   ✅ Updated domain: {domain} → {new_domain}")
            updated_count += 1
        except Exception as e:
            print(f"   ❌ ERROR updating domain: {e}")
    
    print(f"\n📈 SUMMARY:")
    print(f"   Total companies: {len(companies)}")
    print(f"   Updated domains: {updated_count}")
    print(f"   Skipped (already had @): {skipped_count}")
    print(f"   Errors: {len(companies) - updated_count - skipped_count}")
    
    if updated_count > 0:
        print(f"\n✅ Successfully updated {updated_count} company domains!")
    else:
        print(f"\n✅ No updates needed - all domains already have @ symbol!")


def downgrade():
    """Remove @ symbol from company domains (if needed)"""
    # Get connection
    connection = op.get_bind()
    
    # Get all companies with @ symbol
    companies = connection.execute(sa.text("SELECT id, name, domain FROM company WHERE domain LIKE '@%'")).fetchall()
    
    print(f"🔍 Found {len(companies)} companies with @ symbol to potentially remove...")
    
    for company in companies:
        company_id, company_name, domain = company
        
        # Remove @ symbol from the beginning
        new_domain = domain[1:] if domain.startswith('@') else domain
        
        # Check if the new domain would conflict with existing companies
        existing = connection.execute(
            sa.text("SELECT id, name FROM company WHERE domain = :domain AND id != :company_id"),
            {"domain": new_domain, "company_id": company_id}
        ).fetchone()
        
        if existing:
            print(f"   ⚠️  Cannot remove @ from '{domain}' - would conflict with company '{existing[1]}'")
            continue
        
        # Update the domain
        try:
            connection.execute(
                sa.text("UPDATE company SET domain = :new_domain WHERE id = :company_id"),
                {"new_domain": new_domain, "company_id": company_id}
            )
            print(f"   ✅ Removed @ from domain: {domain} → {new_domain}")
        except Exception as e:
            print(f"   ❌ ERROR updating domain: {e}")
    
    print("⚠️  Note: This downgrade removes @ symbols from domains. Consider if this is desired.") 