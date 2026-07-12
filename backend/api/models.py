"""
TransitOps API - Database Models
Defines all entities: User (RBAC), Vehicle, Driver, Trip,
MaintenanceLog, FuelLog, ExpenseLog.
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# ─── User / RBAC ─────────────────────────────────────────────────────────────

class User(AbstractUser):
    """Custom user model with role-based access control."""

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        DISPATCHER = 'DISPATCHER', 'Dispatcher'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance Manager'
        DRIVER = 'DRIVER', 'Driver'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.DISPATCHER
    )
    phone = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def full_name(self):
        return self.get_full_name() or self.email


# ─── Vehicle ─────────────────────────────────────────────────────────────────

class Vehicle(models.Model):
    """Fleet vehicle registry."""

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        ON_TRIP = 'ON_TRIP', 'On Trip'
        MAINTENANCE = 'MAINTENANCE', 'Under Maintenance'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'Out of Service'

    class FuelType(models.TextChoices):
        DIESEL = 'DIESEL', 'Diesel'
        PETROL = 'PETROL', 'Petrol'
        ELECTRIC = 'ELECTRIC', 'Electric'
        CNG = 'CNG', 'CNG'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    license_plate = models.CharField(max_length=20, unique=True, db_index=True)
    vin = models.CharField(max_length=17, unique=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.AVAILABLE
    )
    payload_capacity_kg = models.DecimalField(max_digits=8, decimal_places=2)
    fuel_type = models.CharField(max_length=10, choices=FuelType.choices)
    odometer = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)  # Soft delete flag
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.year} {self.make} {self.model} ({self.license_plate})"


# ─── Driver ──────────────────────────────────────────────────────────────────

class Driver(models.Model):
    """Driver profile linked to a user account."""

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        ON_TRIP = 'ON_TRIP', 'On Trip'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    class LicenseClass(models.TextChoices):
        CLASS_A = 'CLASS_A', 'Class A'
        CLASS_B = 'CLASS_B', 'Class B'
        CLASS_C = 'CLASS_C', 'Class C'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='driver_profile',
        limit_choices_to={'role': User.Role.DRIVER}
    )
    license_number = models.CharField(max_length=50, unique=True)
    license_class = models.CharField(max_length=10, choices=LicenseClass.choices)
    license_expiry = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.AVAILABLE
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} – {self.license_number}"

    @property
    def license_expired(self):
        return self.license_expiry < timezone.now().date()


# ─── Trip ────────────────────────────────────────────────────────────────────

class Trip(models.Model):
    """A dispatch trip linking a vehicle and driver."""

    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_number = models.CharField(max_length=30, unique=True, blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='trips')
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name='trips')
    route_origin = models.CharField(max_length=255)
    route_destination = models.CharField(max_length=255)
    estimated_distance_km = models.DecimalField(max_digits=8, decimal_places=2)
    actual_distance_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    cargo_type = models.CharField(max_length=100)
    cargo_weight_kg = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED
    )
    notes = models.TextField(blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_trips'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-generate trip number on creation
        if not self.trip_number:
            today = timezone.now().strftime('%Y%m%d')
            count = Trip.objects.filter(
                created_at__date=timezone.now().date()
            ).count() + 1
            self.trip_number = f"TRP-{today}-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.trip_number}: {self.route_origin} → {self.route_destination}"


# ─── Maintenance Log ─────────────────────────────────────────────────────────

class MaintenanceLog(models.Model):
    """Vehicle maintenance records."""

    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenance_logs')
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Maintenance: {self.vehicle} ({self.status})"


# ─── Fuel Log ────────────────────────────────────────────────────────────────

class FuelLog(models.Model):
    """Fuel purchase records per vehicle."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_logs')
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name='fuel_logs')
    liters = models.DecimalField(max_digits=8, decimal_places=2)
    cost_per_liter = models.DecimalField(max_digits=6, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    odometer_reading = models.DecimalField(max_digits=10, decimal_places=2)
    logged_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-logged_at']

    def save(self, *args, **kwargs):
        # Auto-calculate total cost
        self.total_cost = self.liters * self.cost_per_liter
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Fuel: {self.vehicle.license_plate} – {self.liters}L"


# ─── Expense Log ─────────────────────────────────────────────────────────────

class ExpenseLog(models.Model):
    """Trip-related expenses submitted by drivers."""

    class Category(models.TextChoices):
        TOLL = 'TOLL', 'Toll'
        FOOD = 'FOOD', 'Food'
        LODGING = 'LODGING', 'Lodging'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'
        FUEL = 'FUEL', 'Fuel'
        MISCELLANEOUS = 'MISCELLANEOUS', 'Miscellaneous'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='expenses')
    category = models.CharField(max_length=20, choices=Category.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    receipt_image = models.ImageField(upload_to='receipts/', null=True, blank=True)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.category}: ₹{self.amount} ({self.trip.trip_number})"
