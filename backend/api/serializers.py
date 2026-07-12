"""
TransitOps API - Serializers
Custom JWT token serializer injects user profile into auth response.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Vehicle, Driver, Trip, MaintenanceLog, FuelLog, ExpenseLog

User = get_user_model()


# ─── Auth Serializers ─────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extends JWT login response with user profile data."""

    def validate(self, attrs):
        data = super().validate(attrs)
        # Inject user profile into token response
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'phone': self.user.phone,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    """Read-only user representation."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.full_name


class UserCreateSerializer(serializers.ModelSerializer):
    """User registration serializer supporting all roles (including Driver profile)."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    # Driver profile fields (optional depending on role)
    license_number = serializers.CharField(required=False, write_only=True)
    license_class = serializers.ChoiceField(choices=Driver.LicenseClass.choices, required=False, write_only=True)
    license_expiry = serializers.DateField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'role', 'phone', 
            'password', 'password_confirm', 
            'license_number', 'license_class', 'license_expiry'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        
        role = attrs.get('role')
        if role == User.Role.DRIVER:
            license_number = attrs.get('license_number')
            license_class = attrs.get('license_class')
            license_expiry = attrs.get('license_expiry')

            if not license_number:
                raise serializers.ValidationError({'license_number': 'License number is required for drivers.'})
            if not license_class:
                raise serializers.ValidationError({'license_class': 'License class is required for drivers.'})
            if not license_expiry:
                raise serializers.ValidationError({'license_expiry': 'License expiry date is required for drivers.'})

            # Uniqueness check on driver license
            if Driver.objects.filter(license_number=license_number, is_active=True).exists():
                raise serializers.ValidationError({'license_number': 'A driver with this license number already exists.'})
                
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        license_number = validated_data.pop('license_number', None)
        license_class = validated_data.pop('license_class', None)
        license_expiry = validated_data.pop('license_expiry', None)

        validated_data['username'] = validated_data['email']
        user = User(**validated_data)
        user.set_password(password)
        
        if user.role == User.Role.ADMIN:
            user.is_staff = True
            user.is_superuser = True

        user.save()

        if user.role == User.Role.DRIVER:
            Driver.objects.create(
                user=user,
                license_number=license_number.upper().strip(),
                license_class=license_class,
                license_expiry=license_expiry,
                status=Driver.Status.AVAILABLE
            )

        return user



class ChangePasswordSerializer(serializers.Serializer):
    """Allow authenticated users to change their password."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Incorrect current password.')
        return value


# ─── Vehicle Serializers ──────────────────────────────────────────────────────

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_license_plate(self, value):
        """Enforce unique license plate, excluding current instance on update."""
        qs = Vehicle.objects.filter(license_plate=value, is_active=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"A vehicle with license plate '{value}' is already registered."
            )
        return value.upper().strip()

    def validate_vin(self, value):
        """Enforce VIN uniqueness (17-char alphanumeric) if provided."""
        if not value:
            return value
        value = value.upper().strip()
        if len(value) != 17:
            raise serializers.ValidationError('VIN must be exactly 17 characters.')
        qs = Vehicle.objects.filter(vin=value, is_active=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"A vehicle with VIN '{value}' is already registered."
            )
        return value

    def validate(self, attrs):
        """Cross-field: odometer cannot decrease on update."""
        if self.instance and 'odometer' in attrs:
            from decimal import Decimal
            if attrs['odometer'] < self.instance.odometer:
                raise serializers.ValidationError(
                    {'odometer': 'Odometer reading cannot decrease.'}
                )
        return attrs



class VehicleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — includes fields required by card UI."""

    class Meta:
        model = Vehicle
        fields = ['id', 'make', 'model', 'year', 'license_plate', 'vin',
                  'status', 'fuel_type', 'odometer', 'payload_capacity_kg']


# ─── Driver Serializers ───────────────────────────────────────────────────────

class DriverSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_detail = UserSerializer(source='user', read_only=True)
    license_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Driver
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'license_expired']

    def validate_license_number(self, value):
        """Enforce unique license number, excluding current instance on update."""
        qs = Driver.objects.filter(license_number=value, is_active=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"License number '{value}' is already registered."
            )
        return value.upper().strip()

    def validate_license_expiry(self, value):
        """Warn but allow registration of expired licenses (business may backfill)."""
        # Only block future dispatch via trip validation, not registration
        return value


class DriverListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    license_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Driver
        fields = ['id', 'user', 'user_name', 'user_email', 'license_number',
                  'license_class', 'license_expiry', 'status', 'license_expired']


# ─── Trip Serializers ─────────────────────────────────────────────────────────

class TripSerializer(serializers.ModelSerializer):
    vehicle_detail = VehicleListSerializer(source='vehicle', read_only=True)
    driver_detail = DriverListSerializer(source='driver', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Trip
        fields = '__all__'
        read_only_fields = ['id', 'trip_number', 'dispatched_at', 'completed_at', 'created_at', 'updated_at']


# ─── Maintenance Serializers ──────────────────────────────────────────────────

class MaintenanceLogSerializer(serializers.ModelSerializer):
    vehicle_detail = VehicleListSerializer(source='vehicle', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = MaintenanceLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


# ─── Fuel Log Serializers ─────────────────────────────────────────────────────

class FuelLogSerializer(serializers.ModelSerializer):
    vehicle_license = serializers.CharField(source='vehicle.license_plate', read_only=True)
    driver_name = serializers.CharField(source='driver.user.full_name', read_only=True)

    class Meta:
        model = FuelLog
        fields = '__all__'
        read_only_fields = ['id', 'total_cost', 'created_at']


# ─── Expense Log Serializers ──────────────────────────────────────────────────

class ExpenseLogSerializer(serializers.ModelSerializer):
    trip_number = serializers.CharField(source='trip.trip_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = ExpenseLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by']
