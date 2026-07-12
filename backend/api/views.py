"""
TransitOps API - Views
Full CRUD views with business rule enforcement.
Business rules enforced:
 - Trip dispatch validates vehicle/driver availability & cargo weight
 - Trip completion updates odometers and resets statuses
 - Maintenance state changes auto-update vehicle status
 - Fuel log validates odometer sequence
"""
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, ExpenseLog
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer,
    ChangePasswordSerializer, VehicleSerializer, VehicleListSerializer,
    DriverSerializer, DriverListSerializer, TripSerializer,
    MaintenanceLogSerializer, FuelLogSerializer, ExpenseLogSerializer
)
from .permissions import (
    IsAdmin, IsAdminOrDispatcher, IsAdminOrMaintenance,
    IsDriver, IsAdminOrDispatcherOrDriver
)


# ─── Auth Views ───────────────────────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    """Custom JWT login returning user profile alongside tokens."""
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    """Blacklist the refresh token to invalidate session."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    """Admin-only: create new user accounts."""
    serializer_class = UserCreateSerializer
    permission_classes = [IsAdmin]


class MeView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the currently authenticated user's profile."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """Allow authenticated users to change their password."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})


# ─── User Management (Admin) ──────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'role']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


# ─── Vehicle ViewSet ──────────────────────────────────────────────────────────

class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'fuel_type']
    search_fields = ['make', 'model', 'license_plate', 'vin']
    ordering_fields = ['created_at', 'make', 'year', 'odometer']
    ordering = ['-created_at']  # default ordering

    def get_queryset(self):
        return Vehicle.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        return VehicleSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_status']:
            return [IsAdminOrDispatcher()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """Soft delete: set is_active=False."""
        vehicle = self.get_object()
        if vehicle.status == Vehicle.Status.ON_TRIP:
            return Response(
                {'detail': 'Cannot archive a vehicle currently on an active trip.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        vehicle.is_active = False
        vehicle.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='set-status')
    def set_status(self, request, pk=None):
        """Quick status change endpoint. Prevents manual ON_TRIP setting."""
        vehicle = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in Vehicle.Status.choices]
        if new_status not in valid:
            return Response({'detail': f"Invalid status. Choose from: {', '.join(valid)}."},
                            status=status.HTTP_400_BAD_REQUEST)
        if new_status == Vehicle.Status.ON_TRIP:
            return Response(
                {'detail': 'Status ON_TRIP is managed automatically by trip dispatch.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        vehicle.status = new_status
        vehicle.save(update_fields=['status', 'updated_at'])
        return Response({'id': str(vehicle.id), 'status': vehicle.status})


# ─── Driver ViewSet ───────────────────────────────────────────────────────────

class DriverViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'license_class']
    search_fields = ['license_number', 'user__first_name', 'user__last_name', 'user__email']
    ordering_fields = ['created_at', 'license_expiry']
    ordering = ['-created_at']

    def get_queryset(self):
        return Driver.objects.filter(is_active=True).select_related('user')

    def get_serializer_class(self):
        if self.action == 'list':
            return DriverListSerializer
        return DriverSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_status']:
            return [IsAdminOrDispatcher()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """Soft delete."""
        driver = self.get_object()
        if driver.status == Driver.Status.ON_TRIP:
            return Response(
                {'detail': 'Cannot archive a driver currently on an active trip.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        driver.is_active = False
        driver.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='set-status')
    def set_status(self, request, pk=None):
        """Quick status change. Blocks ON_TRIP (auto-managed by trip dispatch)."""
        driver = self.get_object()
        new_status = request.data.get('status')
        allowed = [Driver.Status.AVAILABLE, Driver.Status.SUSPENDED]
        if new_status not in [c[0] for c in Driver.Status.choices]:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
        if new_status == Driver.Status.ON_TRIP:
            return Response(
                {'detail': 'ON_TRIP status is managed automatically by trip dispatch.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        driver.status = new_status
        driver.save(update_fields=['status', 'updated_at'])
        return Response({'id': str(driver.id), 'status': driver.status})


# ─── Trip ViewSet ─────────────────────────────────────────────────────────────

class TripViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'vehicle', 'driver']
    search_fields = ['trip_number', 'route_origin', 'route_destination', 'cargo_type']
    ordering_fields = ['created_at', 'dispatched_at', 'completed_at']
    serializer_class = TripSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Trip.objects.select_related('vehicle', 'driver', 'driver__user', 'created_by')
        # Drivers only see their own trips
        if user.role == User.Role.DRIVER:
            try:
                qs = qs.filter(driver=user.driver_profile)
            except Driver.DoesNotExist:
                return Trip.objects.none()
        return qs

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdminOrDispatcher()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAdminOrDispatcher()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Validate business rules before creating trip."""
        vehicle = serializer.validated_data['vehicle']
        driver = serializer.validated_data['driver']
        cargo_weight = serializer.validated_data['cargo_weight_kg']

        # Business Rule: Vehicle must be available
        if vehicle.status != Vehicle.Status.AVAILABLE:
            raise serializers.ValidationError(
                {'vehicle': f'Vehicle is currently {vehicle.get_status_display()}.'}
            )
        # Business Rule: Driver must be available
        if driver.status != Driver.Status.AVAILABLE:
            raise serializers.ValidationError(
                {'driver': f'Driver is currently {driver.get_status_display()}.'}
            )
        # Business Rule: Driver license must not be expired
        if driver.license_expired:
            raise serializers.ValidationError(
                {'driver': 'Driver license has expired.'}
            )
        # Business Rule: Cargo weight must not exceed vehicle capacity
        if cargo_weight > vehicle.payload_capacity_kg:
            raise serializers.ValidationError(
                {'cargo_weight_kg': f'Cargo weight {cargo_weight}kg exceeds vehicle capacity {vehicle.payload_capacity_kg}kg.'}
            )

        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """
        Handle trip status transitions with automatic state updates.
        Allowed transitions:
          SCHEDULED → IN_PROGRESS (dispatch)
          IN_PROGRESS → COMPLETED
          SCHEDULED/IN_PROGRESS → CANCELLED
        """
        trip = self.get_object()
        new_status = request.data.get('status')
        actual_distance = request.data.get('actual_distance_km')

        valid_transitions = {
            Trip.Status.SCHEDULED: [Trip.Status.IN_PROGRESS, Trip.Status.CANCELLED],
            Trip.Status.IN_PROGRESS: [Trip.Status.COMPLETED, Trip.Status.CANCELLED],
        }

        if trip.status not in valid_transitions:
            return Response(
                {'detail': f'Cannot transition trip from {trip.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status not in valid_transitions[trip.status]:
            return Response(
                {'detail': f'Invalid transition: {trip.status} → {new_status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Dispatch ──
        if new_status == Trip.Status.IN_PROGRESS:
            trip.vehicle.status = Vehicle.Status.ON_TRIP
            trip.vehicle.save()
            trip.driver.status = Driver.Status.ON_TRIP
            trip.driver.save()
            trip.dispatched_at = timezone.now()

        # ── Complete ──
        elif new_status == Trip.Status.COMPLETED:
            if not actual_distance:
                return Response(
                    {'detail': 'actual_distance_km is required to complete a trip.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            trip.actual_distance_km = actual_distance
            # Update vehicle odometer
            trip.vehicle.odometer += trip.actual_distance_km
            trip.vehicle.status = Vehicle.Status.AVAILABLE
            trip.vehicle.save()
            trip.driver.status = Driver.Status.AVAILABLE
            trip.driver.save()
            trip.completed_at = timezone.now()

        # ── Cancel ──
        elif new_status == Trip.Status.CANCELLED:
            if trip.status == Trip.Status.IN_PROGRESS:
                trip.vehicle.status = Vehicle.Status.AVAILABLE
                trip.vehicle.save()
                trip.driver.status = Driver.Status.AVAILABLE
                trip.driver.save()

        trip.status = new_status
        trip.save()
        return Response(TripSerializer(trip).data)


# ─── Maintenance ViewSet ──────────────────────────────────────────────────────

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrMaintenance]
    serializer_class = MaintenanceLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'vehicle']
    search_fields = ['description', 'vehicle__license_plate']
    ordering_fields = ['created_at', 'start_date', 'cost']
    queryset = MaintenanceLog.objects.select_related('vehicle', 'created_by').all()

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        # Auto-transition vehicle to maintenance if status is IN_PROGRESS
        if instance.status == MaintenanceLog.Status.IN_PROGRESS:
            instance.vehicle.status = Vehicle.Status.MAINTENANCE
            instance.vehicle.save()

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()
        # Transition vehicle status based on maintenance status change
        if instance.status == MaintenanceLog.Status.IN_PROGRESS and old_status != instance.status:
            instance.vehicle.status = Vehicle.Status.MAINTENANCE
            instance.vehicle.save()
        elif instance.status == MaintenanceLog.Status.COMPLETED and old_status != instance.status:
            instance.vehicle.status = Vehicle.Status.AVAILABLE
            instance.vehicle.save()


# ─── Fuel Log ViewSet ─────────────────────────────────────────────────────────

class FuelLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FuelLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['vehicle', 'driver']
    search_fields = ['vehicle__license_plate']
    ordering_fields = ['logged_at', 'total_cost']

    def get_queryset(self):
        return FuelLog.objects.select_related('vehicle', 'driver', 'driver__user').all()

    def perform_create(self, serializer):
        vehicle = serializer.validated_data['vehicle']
        new_odometer = serializer.validated_data['odometer_reading']

        # Business Rule: Odometer must be strictly increasing
        if new_odometer <= vehicle.odometer:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'odometer_reading': f'Odometer reading must be greater than current vehicle odometer ({vehicle.odometer} km).'}
            )

        serializer.save()
        # Update vehicle odometer
        vehicle.odometer = new_odometer
        vehicle.save()


# ─── Expense Log ViewSet ──────────────────────────────────────────────────────

class ExpenseLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'trip']
    ordering_fields = ['date', 'amount']

    def get_queryset(self):
        return ExpenseLog.objects.select_related('trip', 'created_by').all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ─── Dashboard Analytics ──────────────────────────────────────────────────────

class DashboardAnalyticsView(APIView):
    """Returns KPI summary cards and recent activity for the dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count

        active_trips = Trip.objects.filter(status=Trip.Status.IN_PROGRESS).count()
        available_vehicles = Vehicle.objects.filter(
            status=Vehicle.Status.AVAILABLE, is_active=True
        ).count()
        under_maintenance = Vehicle.objects.filter(
            status=Vehicle.Status.MAINTENANCE, is_active=True
        ).count()
        total_vehicles = Vehicle.objects.filter(is_active=True).count()
        total_drivers = Driver.objects.filter(is_active=True).count()
        available_drivers = Driver.objects.filter(
            status=Driver.Status.AVAILABLE, is_active=True
        ).count()

        # Recent trips (last 5)
        recent_trips = TripSerializer(
            Trip.objects.select_related('vehicle', 'driver', 'driver__user')
                        .order_by('-created_at')[:5],
            many=True
        ).data

        # Vehicle fleet status breakdown
        from django.db.models import Count as CNT
        fleet_status_breakdown = list(
            Vehicle.objects.filter(is_active=True)
                           .values('status')
                           .annotate(count=CNT('id'))
                           .order_by('status')
        )

        # Licenses expiring within 30 days
        from datetime import timedelta
        thirty_days_later = timezone.now().date() + timedelta(days=30)
        expiring_licenses_30d = Driver.objects.filter(
            is_active=True,
            license_expiry__gte=timezone.now().date(),
            license_expiry__lte=thirty_days_later
        ).count()

        # Monthly trip counts (last 6 months)
        from django.db.models.functions import TruncMonth
        from datetime import timedelta
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_trips = (
            Trip.objects.filter(created_at__gte=six_months_ago)
                        .annotate(month=TruncMonth('created_at'))
                        .values('month')
                        .annotate(count=Count('id'))
                        .order_by('month')
        )

        # Cost aggregations
        total_maintenance_cost = MaintenanceLog.objects.aggregate(total=Sum('cost'))['total'] or 0
        # FuelLog calculates total_cost in save method, so it is stored in database
        total_fuel_cost = FuelLog.objects.aggregate(total=Sum('total_cost'))['total'] or 0
        total_expenses_cost = ExpenseLog.objects.aggregate(total=Sum('amount'))['total'] or 0

        # System alerts
        active_alerts = []
        
        # Expired licenses
        expired_drivers = Driver.objects.filter(license_expiry__lt=timezone.now().date(), is_active=True).select_related('user')
        for d in expired_drivers:
            active_alerts.append({
                'id': f"driver-{d.id}",
                'type': 'LICENSE_EXPIRED',
                'severity': 'DANGER',
                'title': 'Driver License Expired',
                'message': f"Driver {d.user.full_name}'s license expired on {d.license_expiry.strftime('%Y-%m-%d')}.",
            })

        # Scheduled/In Progress Maintenance
        active_maint = MaintenanceLog.objects.filter(status__in=[MaintenanceLog.Status.SCHEDULED, MaintenanceLog.Status.IN_PROGRESS]).select_related('vehicle')
        for m in active_maint:
            active_alerts.append({
                'id': f"maint-{m.id}",
                'type': 'MAINTENANCE_REQUIRED',
                'severity': 'WARNING',
                'title': 'Maintenance Required',
                'message': f"Vehicle {m.vehicle.license_plate} has maintenance scheduled/active: {m.description[:40]}...",
            })

        # Out of Service Vehicles
        oos_vehicles = Vehicle.objects.filter(status=Vehicle.Status.OUT_OF_SERVICE, is_active=True)
        for v in oos_vehicles:
            active_alerts.append({
                'id': f"vehicle-oos-{v.id}",
                'type': 'VEHICLE_OOS',
                'severity': 'DANGER',
                'title': 'Vehicle Out of Service',
                'message': f"Vehicle {v.make} {v.model} ({v.license_plate}) is marked Out of Service.",
            })

        return Response({
            'kpis': {
                'active_trips': active_trips,
                'available_vehicles': available_vehicles,
                'under_maintenance': under_maintenance,
                'total_vehicles': total_vehicles,
                'total_drivers': total_drivers,
                'available_drivers': available_drivers,
                'expiring_licenses_30d': expiring_licenses_30d,
                'fleet_utilization_pct': round(
                    (active_trips / total_vehicles * 100) if total_vehicles else 0, 1
                ),
            },
            'recent_trips': recent_trips,
            'monthly_trips': list(monthly_trips),
            'fleet_status_breakdown': fleet_status_breakdown,
            'cost_breakdown': {
                'maintenance': float(total_maintenance_cost),
                'fuel': float(total_fuel_cost),
                'expenses': float(total_expenses_cost),
                'total': float(total_maintenance_cost + total_fuel_cost + total_expenses_cost)
            },
            'active_alerts': active_alerts[:5],
        })


# ─── Reports Analytics View ───────────────────────────────────────────────────

class ReportsAnalyticsView(APIView):
    """Returns detailed vehicle-by-vehicle reports including costs, distance and ROI."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum

        vehicles = Vehicle.objects.filter(is_active=True)
        report_data = []

        fuel_map = {
            res['vehicle_id']: res
            for res in FuelLog.objects.values('vehicle_id').annotate(
                total_cost=Sum('total_cost'),
                total_liters=Sum('liters')
            )
        }

        maint_map = {
            res['vehicle_id']: res['total']
            for res in MaintenanceLog.objects.values('vehicle_id').annotate(
                total=Sum('cost')
            )
        }

        trip_map = {
            res['vehicle_id']: res['total']
            for res in Trip.objects.filter(status=Trip.Status.COMPLETED).values('vehicle_id').annotate(
                total=Sum('actual_distance_km')
            )
        }

        expense_map = {
            res['trip__vehicle_id']: res['total']
            for res in ExpenseLog.objects.values('trip__vehicle_id').annotate(
                total=Sum('amount')
            )
        }

        for v in vehicles:
            v_id = v.id
            fuel_cost = float(fuel_map.get(v_id, {}).get('total_cost') or 0)
            fuel_liters = float(fuel_map.get(v_id, {}).get('total_liters') or 0)
            maint_cost = float(maint_map.get(v_id) or 0)
            distance = float(trip_map.get(v_id) or 0)
            expense_cost = float(expense_map.get(v_id) or 0)

            efficiency = round(distance / fuel_liters, 2) if fuel_liters > 0 else 0
            total_cost = fuel_cost + maint_cost + expense_cost
            cost_per_km = round(total_cost / distance, 2) if distance > 0 else 0

            report_data.append({
                'id': str(v.id),
                'vehicle_name': f"{v.year} {v.make} {v.model}",
                'license_plate': v.license_plate,
                'fuel_type': v.fuel_type,
                'fuel_cost': fuel_cost,
                'fuel_liters': fuel_liters,
                'maintenance_cost': maint_cost,
                'distance_km': distance,
                'expenses_cost': expense_cost,
                'fuel_efficiency': efficiency,
                'total_cost': total_cost,
                'cost_per_km': cost_per_km,
            })

        return Response({
            'fleet_roi_reports': report_data
        })

