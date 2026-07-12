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
        license_expiry=date(2027, 12, 31),
        status=Driver.Status.AVAILABLE,
    )
    print("  [OK] Created Driver profile for Jordan Lee")

# Create a driver with an expired license for warnings demo
driver_user_exp = create_user('driver-expired@transitops.com', 'Taylor', 'Swift', User.Role.DRIVER)
if not Driver.objects.filter(user=driver_user_exp).exists():
    Driver.objects.create(
        user=driver_user_exp,
        license_number='DL-2022-099',
        license_class=Driver.LicenseClass.CLASS_A,
        license_expiry=date(2025, 12, 31), # Expired!
        status=Driver.Status.AVAILABLE,
    )
    print("  [OK] Created Expired Driver profile for Taylor Swift")

# Create Vehicles
from api.models import Vehicle, Trip, MaintenanceLog, FuelLog, ExpenseLog

def create_vehicle(plate, make, model, year, capacity, status, fuel, vin):
    if not Vehicle.objects.filter(license_plate=plate).exists():
        v = Vehicle.objects.create(
            license_plate=plate,
            make=make,
            model=model,
            year=year,
            payload_capacity_kg=capacity,
            status=status,
            fuel_type=fuel,
            odometer=12500.00,
            vin=vin
        )
        print(f"  [OK] Created Vehicle: {plate}")
        return v
    return Vehicle.objects.get(license_plate=plate)

v1 = create_vehicle('MH-12-QW-1234', 'Tata', 'Prima 4025.S', 2022, 25000.00, Vehicle.Status.AVAILABLE, Vehicle.FuelType.DIESEL, 'VIN12345678901234')
v2 = create_vehicle('MH-12-AS-5678', 'Mahindra', 'Blazo X 28', 2023, 20000.00, Vehicle.Status.ON_TRIP, Vehicle.FuelType.DIESEL, 'VIN12345678901235')
v3 = create_vehicle('MH-12-ZX-9012', 'Eicher', 'Pro 3019', 2021, 15000.00, Vehicle.Status.MAINTENANCE, Vehicle.FuelType.CNG, 'VIN12345678901236')
v4 = create_vehicle('MH-12-ER-3456', 'Ashok Leyland', 'Ecomet 1615', 2020, 16000.00, Vehicle.Status.OUT_OF_SERVICE, Vehicle.FuelType.CNG, 'VIN12345678901237')

# Create Trips
drv1 = Driver.objects.get(user=driver_user)
if not Trip.objects.filter(vehicle=v2, driver=drv1).exists():
    t1 = Trip.objects.create(
        vehicle=v2,
        driver=drv1,
        route_origin='Mumbai',
        route_destination='Pune',
        estimated_distance_km=150.00,
        cargo_type='Industrial Goods',
        cargo_weight_kg=8000.00,
        status=Trip.Status.IN_PROGRESS,
        dispatched_at=timezone.now(),
        created_by=admin
    )
    print(f"  [OK] Created active trip {t1.trip_number}")

if not Trip.objects.filter(vehicle=v1, driver=drv1).exists():
    t2 = Trip.objects.create(
        vehicle=v1,
        driver=drv1,
        route_origin='Delhi',
        route_destination='Jaipur',
        estimated_distance_km=270.00,
        actual_distance_km=275.00,
        cargo_type='Automobile Parts',
        cargo_weight_kg=12000.00,
        status=Trip.Status.COMPLETED,
        dispatched_at=timezone.now(),
        completed_at=timezone.now(),
        created_by=admin
    )
    print(f"  [OK] Created completed trip {t2.trip_number}")

# Create Maintenance Log
if not MaintenanceLog.objects.filter(vehicle=v3).exists():
    m1 = MaintenanceLog.objects.create(
        vehicle=v3,
        description='Engine oil change, brake pad replacement and wheel alignment checks',
        cost=4500.00,
        start_date=date(2026, 7, 10),
        status=MaintenanceLog.Status.IN_PROGRESS,
        created_by=maintenance
    )
    print(f"  [OK] Created Maintenance log for {v3.license_plate}")

# Create Fuel Logs
if not FuelLog.objects.filter(vehicle=v1).exists():
    f1 = FuelLog.objects.create(
        vehicle=v1,
        driver=drv1,
        liters=80.00,
        cost_per_liter=95.50,
        odometer_reading=12580.00,
        logged_at=timezone.now()
    )
    print(f"  [OK] Created Fuel log for {v1.license_plate} (Total: Rs.{f1.total_cost})")

# Create Expenses
if Trip.objects.filter(status=Trip.Status.COMPLETED).exists():
    comp_trip = Trip.objects.filter(status=Trip.Status.COMPLETED).first()
    if not ExpenseLog.objects.filter(trip=comp_trip).exists():
        e1 = ExpenseLog.objects.create(
            trip=comp_trip,
            category=ExpenseLog.Category.TOLL,
            amount=750.00,
            date=date(2026, 7, 11),
            notes='NH-48 highway toll receipt',
            created_by=driver_user
        )
        print(f"  [OK] Created Expense log for trip {comp_trip.trip_number} (Amount: Rs.{e1.amount})")

print("\n[DONE] Seed complete! Default credentials (password: TransitOps@2024)")
print("   Admin:       admin@transitops.com")
print("   Dispatcher:  dispatcher@transitops.com")
print("   Maintenance: maintenance@transitops.com")
print("   Driver:      driver@transitops.com")
