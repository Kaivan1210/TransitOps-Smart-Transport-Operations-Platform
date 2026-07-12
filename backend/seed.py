"""
TransitOps - Seed Script
Creates demo users for all roles for development/testing.
Run: python manage.py shell < seed.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transitops_backend.settings')
django.setup()

from api.models import User, Driver
from django.utils import timezone
from datetime import date

def create_user(email, first, last, role, password='TransitOps@2024'):
    if not User.objects.filter(email=email).exists():
        u = User.objects.create_user(
            username=email,
            email=email,
            first_name=first,
            last_name=last,
            password=password,
            role=role,
            phone='+91 98765 43210',
        )
        if role == User.Role.ADMIN:
            u.is_staff = True
            u.is_superuser = True
            u.save()
        print("  [OK] Created " + role + ": " + email)
        return u
    else:
        print("  -> Skipped (exists): " + email)
        return User.objects.get(email=email)

print("\n[SEED] Seeding TransitOps database...\n")

admin = create_user('admin@transitops.com', 'Super', 'Admin', User.Role.ADMIN)
dispatcher = create_user('dispatcher@transitops.com', 'Alex', 'Carter', User.Role.DISPATCHER)
maintenance = create_user('maintenance@transitops.com', 'Sam', 'Rivera', User.Role.MAINTENANCE)
driver_user = create_user('driver@transitops.com', 'Jordan', 'Lee', User.Role.DRIVER)

# Create driver profile
if not Driver.objects.filter(user=driver_user).exists():
    Driver.objects.create(
        user=driver_user,
        license_number='DL-2024-001',
        license_class=Driver.LicenseClass.CLASS_B,
        license_expiry=date(2026, 12, 31),
        status=Driver.Status.AVAILABLE,
    )
    print("  [OK] Created Driver profile for Jordan Lee")

print("\n[DONE] Seed complete! Default credentials (password: TransitOps@2024)")
print("   Admin:       admin@transitops.com")
print("   Dispatcher:  dispatcher@transitops.com")
print("   Maintenance: maintenance@transitops.com")
print("   Driver:      driver@transitops.com")
