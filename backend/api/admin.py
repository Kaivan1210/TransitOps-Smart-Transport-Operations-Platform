from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, ExpenseLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('TransitOps', {'fields': ('role', 'phone')}),
    )


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['license_plate', 'make', 'model', 'year', 'status', 'fuel_type', 'odometer', 'is_active']
    list_filter = ['status', 'fuel_type', 'is_active']
    search_fields = ['license_plate', 'make', 'model', 'vin']


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['user', 'license_number', 'license_class', 'license_expiry', 'status', 'is_active']
    list_filter = ['status', 'license_class', 'is_active']
    search_fields = ['license_number', 'user__email', 'user__first_name']


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['trip_number', 'vehicle', 'driver', 'status', 'route_origin', 'route_destination', 'created_at']
    list_filter = ['status']
    search_fields = ['trip_number', 'route_origin', 'route_destination']


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'status', 'start_date', 'end_date', 'cost']
    list_filter = ['status']


@admin.register(FuelLog)
class FuelLogAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'driver', 'liters', 'total_cost', 'odometer_reading', 'logged_at']


@admin.register(ExpenseLog)
class ExpenseLogAdmin(admin.ModelAdmin):
    list_display = ['trip', 'category', 'amount', 'date']
    list_filter = ['category']
