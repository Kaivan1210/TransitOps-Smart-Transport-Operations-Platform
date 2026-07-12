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
    """Admin-only user registration serializer."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'role', 'phone', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Use email as username
        validated_data['username'] = validated_data['email']
        user = User(**validated_data)
        user.set_password(password)
        user.save()
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


class VehicleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    class Meta:
        model = Vehicle
        fields = ['id', 'make', 'model', 'year', 'license_plate', 'status', 'fuel_type', 'odometer']


# ─── Driver Serializers ───────────────────────────────────────────────────────

class DriverSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    license_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Driver
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'license_expired']


class DriverListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    license_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Driver
        fields = ['id', 'user_name', 'license_number', 'license_class', 'license_expiry', 'status', 'license_expired']


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

    class Meta:
        model = MaintenanceLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


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

    class Meta:
        model = ExpenseLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
