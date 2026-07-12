"""
TransitOps API - Django Admin
Registers all models with full-featured admin panels.
Custom UserAdmin is aligned with the email-based login model.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, ExpenseLog


# ─── Custom User Admin ────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin for the custom User model. Uses email as the primary identifier.
    Overrides fieldsets to replace the 'username' field with TransitOps-specific
    fields (role, phone), and fixes add_fieldsets for user creation.
    """
    list_display = ['email', 'first_name', 'last_name', 'role', 'phone', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']
    readonly_fields = ['id', 'date_joined', 'last_login']

    # Override fieldsets to work with email-based User model
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('TransitOps Role', {'fields': ('role',)}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Timestamps', {'fields': ('date_joined', 'last_login')}),
    )

    # fieldsets used when CREATING a new user in the admin
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'first_name', 'last_name',
                'role', 'phone',
                'password1', 'password2',
                'is_active', 'is_staff',
            ),
        }),
    )

    def save_model(self, request, obj, form, change):
        """
        Auto-sync username = email so AbstractUser's unique constraint
        on username is satisfied (username field is hidden in our UI).
        """
        obj.username = obj.email
        super().save_model(request, obj, form, change)


# ─── Vehicle Admin ────────────────────────────────────────────────────────────

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = [
        'license_plate', 'make', 'model', 'year',
        'colored_status', 'fuel_type', 'odometer_display',
        'payload_capacity_kg', 'is_active',
    ]
    list_filter = ['status', 'fuel_type', 'is_active']
    search_fields = ['license_plate', 'make', 'model', 'vin']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_per_page = 25

    @admin.display(description='Odometer')
    def odometer_display(self, obj):
        return f"{float(obj.odometer):,.1f} km"

    @admin.display(description='Status')
    def colored_status(self, obj):
        colors = {
            'AVAILABLE':     '#10b981',
            'ON_TRIP':       '#3b82f6',
            'MAINTENANCE':   '#f59e0b',
            'OUT_OF_SERVICE': '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )

    fieldsets = (
        ('Identity', {'fields': ('id', 'make', 'model', 'year', 'license_plate', 'vin')}),
        ('Operational', {'fields': ('status', 'fuel_type', 'odometer', 'payload_capacity_kg')}),
        ('Flags', {'fields': ('is_active',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


# ─── Driver Admin ─────────────────────────────────────────────────────────────

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = [
        'get_full_name', 'get_email', 'license_number',
        'license_class', 'license_expiry', 'colored_status',
        'license_expired_badge', 'is_active',
    ]
    list_filter = ['status', 'license_class', 'is_active']
    search_fields = ['license_number', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'license_expired_badge']
    list_per_page = 25

    @admin.display(description='Full Name', ordering='user__last_name')
    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    @admin.display(description='Email')
    def get_email(self, obj):
        return obj.user.email

    @admin.display(description='Status')
    def colored_status(self, obj):
        colors = {
            'AVAILABLE':  '#10b981',
            'ON_TRIP':    '#3b82f6',
            'SUSPENDED':  '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )

    @admin.display(description='Expired?', boolean=True)
    def license_expired_badge(self, obj):
        return obj.license_expired

    fieldsets = (
        ('User Account', {'fields': ('id', 'user')}),
        ('License', {'fields': ('license_number', 'license_class', 'license_expiry')}),
        ('Operational', {'fields': ('status', 'is_active')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


# ─── Expense Inline for Trip ──────────────────────────────────────────────────

class ExpenseLogInline(admin.TabularInline):
    model = ExpenseLog
    extra = 0
    fields = ['category', 'amount', 'date', 'notes']
    readonly_fields = ['created_at']


# ─── Trip Admin ───────────────────────────────────────────────────────────────

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = [
        'trip_number', 'vehicle', 'driver', 'colored_status',
        'route_origin', 'route_destination', 'cargo_type',
        'cargo_weight_kg', 'dispatched_at', 'created_at',
    ]
    list_filter = ['status']
    search_fields = ['trip_number', 'route_origin', 'route_destination', 'cargo_type']
    readonly_fields = ['id', 'trip_number', 'dispatched_at', 'completed_at', 'created_at', 'updated_at']
    inlines = [ExpenseLogInline]
    list_per_page = 25

    @admin.display(description='Status')
    def colored_status(self, obj):
        colors = {
            'SCHEDULED':   '#f59e0b',
            'IN_PROGRESS': '#3b82f6',
            'COMPLETED':   '#10b981',
            'CANCELLED':   '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )

    fieldsets = (
        ('Identity', {'fields': ('id', 'trip_number', 'created_by')}),
        ('Dispatch', {'fields': ('vehicle', 'driver')}),
        ('Route & Cargo', {
            'fields': ('route_origin', 'route_destination', 'estimated_distance_km',
                       'actual_distance_km', 'cargo_type', 'cargo_weight_kg')
        }),
        ('Status', {'fields': ('status', 'notes')}),
        ('Timestamps', {'fields': ('dispatched_at', 'completed_at', 'created_at', 'updated_at')}),
    )


# ─── Maintenance Log Admin ────────────────────────────────────────────────────

@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'colored_status', 'start_date', 'end_date', 'cost_display', 'created_by']
    list_filter = ['status']
    search_fields = ['vehicle__license_plate', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'created_by']
    list_per_page = 25

    @admin.display(description='Cost')
    def cost_display(self, obj):
        return f"Rs. {float(obj.cost):,.2f}"

    @admin.display(description='Status')
    def colored_status(self, obj):
        colors = {
            'SCHEDULED':   '#f59e0b',
            'IN_PROGRESS': '#3b82f6',
            'COMPLETED':   '#10b981',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )

    fieldsets = (
        ('Vehicle & Work', {'fields': ('id', 'vehicle', 'description')}),
        ('Status & Cost', {'fields': ('status', 'cost', 'start_date', 'end_date')}),
        ('Meta', {'fields': ('created_by', 'created_at', 'updated_at')}),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


# ─── Fuel Log Admin ───────────────────────────────────────────────────────────

@admin.register(FuelLog)
class FuelLogAdmin(admin.ModelAdmin):
    list_display = [
        'vehicle', 'driver', 'liters_display', 'cost_per_liter',
        'total_cost_display', 'odometer_reading', 'logged_at',
    ]
    list_filter = ['vehicle__fuel_type']
    search_fields = ['vehicle__license_plate', 'driver__user__email']
    readonly_fields = ['id', 'total_cost', 'created_at']
    list_per_page = 25

    @admin.display(description='Liters')
    def liters_display(self, obj):
        return f"{float(obj.liters):,.2f} L"

    @admin.display(description='Total Cost')
    def total_cost_display(self, obj):
        return f"Rs. {float(obj.total_cost):,.2f}"

    fieldsets = (
        ('Vehicle & Driver', {'fields': ('id', 'vehicle', 'driver')}),
        ('Fuel Details', {'fields': ('liters', 'cost_per_liter', 'total_cost', 'odometer_reading')}),
        ('Timestamps', {'fields': ('logged_at', 'created_at')}),
    )


# ─── Expense Log Admin ────────────────────────────────────────────────────────

@admin.register(ExpenseLog)
class ExpenseLogAdmin(admin.ModelAdmin):
    list_display = ['trip', 'category', 'amount_display', 'date', 'created_by']
    list_filter = ['category']
    search_fields = ['trip__trip_number', 'notes']
    readonly_fields = ['id', 'created_at', 'created_by']
    list_per_page = 25

    @admin.display(description='Amount')
    def amount_display(self, obj):
        return f"Rs. {float(obj.amount):,.2f}"

    fieldsets = (
        ('Trip & Category', {'fields': ('id', 'trip', 'category')}),
        ('Amount & Date', {'fields': ('amount', 'date', 'receipt_image')}),
        ('Notes', {'fields': ('notes',)}),
        ('Meta', {'fields': ('created_by', 'created_at')}),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
