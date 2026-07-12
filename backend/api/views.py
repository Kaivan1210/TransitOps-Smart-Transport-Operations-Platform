"""
TransitOps API - Views
Full CRUD ViewSets with business-rule enforcement.

Business rules enforced:
  - Trip dispatch validates vehicle/driver availability & cargo weight
  - Trip completion updates odometers and resets statuses (Decimal-safe)
  - Maintenance state changes auto-update vehicle status
  - Fuel log validates strictly-increasing odometer sequence
  - Drivers only see their own trips (RBAC)
"""
from decimal import Decimal
from datetime import timedelta

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework import viewsets, status, generics, serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

from .models import User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, ExpenseLog
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer, UserCreateSerializer, ChangePasswordSerializer,
    VehicleSerializer, VehicleListSerializer,
    DriverSerializer, DriverListSerializer,
    TripSerializer,
    MaintenanceLogSerializer,
    FuelLogSerializer,
    ExpenseLogSerializer,
)
from .permissions import (
    IsAdmin, IsAdminOrDispatcher, IsAdminOrMaintenance,
    IsDriver, IsAdminOrDispatcherOrDriver,
)


# ─── Auth Views ───────────────────────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    """Custom JWT login — injects user profile alongside tokens."""
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    """Blacklist the refresh token to fully invalidate the session."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    """Create a new user account."""
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]



class MeView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the currently authenticated user's own profile."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """Allow authenticated users to change their own password."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        request.user.set_password(ser.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})


# ─── User Management (Admin only) ────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    """Admin-only CRUD for user accounts."""
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['date_joined', 'role', 'email']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


# ─── Vehicle ViewSet ──────────────────────────────────────────────────────────

class VehicleViewSet(viewsets.ModelViewSet):
    """Full vehicle registry CRUD with soft-delete and status management."""
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'fuel_type']
    search_fields = ['make', 'model', 'license_plate', 'vin']
    ordering_fields = ['created_at', 'make', 'year', 'odometer']
    ordering = ['-created_at']

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
        """Soft delete: mark is_active=False instead of hard delete."""
        vehicle = self.get_object()
        if vehicle.status == Vehicle.Status.ON_TRIP:
            return Response(
                {'detail': 'Cannot archive a vehicle that is currently on an active trip.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        vehicle.is_active = False
        vehicle.save(update_fields=['is_active', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='set-status',
            permission_classes=[IsAdminOrDispatcher])
    def set_status(self, request, pk=None):
        """Quick status transition endpoint. ON_TRIP is auto-managed by trip dispatch."""
        vehicle = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in Vehicle.Status.choices]
        if new_status not in valid:
            return Response(
                {'detail': f"Invalid status. Valid choices: {', '.join(valid)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status == Vehicle.Status.ON_TRIP:
            return Response(
                {'detail': 'ON_TRIP is managed automatically by trip dispatch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        vehicle.status = new_status
        vehicle.save(update_fields=['status', 'updated_at'])
        return Response({'id': str(vehicle.id), 'status': vehicle.status})


# ─── Driver ViewSet ───────────────────────────────────────────────────────────

class DriverViewSet(viewsets.ModelViewSet):
    """Full driver registry CRUD with soft-delete and status management."""
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
        """Soft delete: mark is_active=False."""
        driver = self.get_object()
        if driver.status == Driver.Status.ON_TRIP:
            return Response(
                {'detail': 'Cannot archive a driver who is currently on an active trip.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        driver.is_active = False
        driver.save(update_fields=['is_active', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='set-status',
            permission_classes=[IsAdminOrDispatcher])
    def set_status(self, request, pk=None):
        """Quick status change. ON_TRIP is auto-managed by trip dispatch."""
        driver = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in Driver.Status.choices]
        if new_status not in valid:
            return Response(
                {'detail': f"Invalid status. Valid choices: {', '.join(valid)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status == Driver.Status.ON_TRIP:
            return Response(
                {'detail': 'ON_TRIP is managed automatically by trip dispatch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        driver.status = new_status
        driver.save(update_fields=['status', 'updated_at'])
        return Response({'id': str(driver.id), 'status': driver.status})


# ─── Trip ViewSet ─────────────────────────────────────────────────────────────

class TripViewSet(viewsets.ModelViewSet):
    """
    Trip dispatch CRUD with full lifecycle management.
    Drivers only see their own trips.
    """
    serializer_class = TripSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'vehicle', 'driver']
    search_fields = ['trip_number', 'route_origin', 'route_destination', 'cargo_type']
    ordering_fields = ['created_at', 'dispatched_at', 'completed_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Trip.objects.select_related('vehicle', 'driver', 'driver__user', 'created_by')
        if user.role == User.Role.DRIVER:
            try:
                qs = qs.filter(driver=user.driver_profile)
            except Driver.DoesNotExist:
                return Trip.objects.none()
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'update_status']:
            return [IsAdminOrDispatcher()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Enforce business rules before dispatching a trip."""
        vehicle = serializer.validated_data['vehicle']
        driver = serializer.validated_data['driver']
        cargo_weight = serializer.validated_data['cargo_weight_kg']

        if vehicle.status != Vehicle.Status.AVAILABLE:
            raise ValidationError(
                {'vehicle': f'Vehicle is currently {vehicle.get_status_display()} and not available.'}
            )
        if driver.status != Driver.Status.AVAILABLE:
            raise ValidationError(
                {'driver': f'Driver is currently {driver.get_status_display()} and not available.'}
            )
        if driver.license_expired:
            raise ValidationError(
                {'driver': 'Driver license has expired. Renew before dispatching.'}
            )
        if cargo_weight > vehicle.payload_capacity_kg:
            raise ValidationError({
                'cargo_weight_kg': (
                    f'Cargo weight ({cargo_weight} kg) exceeds vehicle capacity '
                    f'({vehicle.payload_capacity_kg} kg).'
                )
            })

        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['patch'], url_path='status',
            permission_classes=[IsAdminOrDispatcher])
    def update_status(self, request, pk=None):
        """
        Manage trip lifecycle transitions:
          SCHEDULED    → IN_PROGRESS  (dispatches vehicle & driver)
          IN_PROGRESS  → COMPLETED    (requires actual_distance_km, updates odometer)
          SCHEDULED    → CANCELLED
          IN_PROGRESS  → CANCELLED    (releases vehicle & driver)
        """
        trip = self.get_object()
        new_status = request.data.get('status')
        actual_distance = request.data.get('actual_distance_km')

        valid_transitions = {
            Trip.Status.SCHEDULED:   [Trip.Status.IN_PROGRESS, Trip.Status.CANCELLED],
            Trip.Status.IN_PROGRESS: [Trip.Status.COMPLETED,   Trip.Status.CANCELLED],
        }

        if trip.status not in valid_transitions:
            return Response(
                {'detail': f'Trip is already {trip.get_status_display()} and cannot be transitioned.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status not in valid_transitions[trip.status]:
            return Response(
                {'detail': f'Cannot transition from {trip.get_status_display()} to {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── DISPATCH ──────────────────────────────────────────────────────────
        if new_status == Trip.Status.IN_PROGRESS:
            trip.vehicle.status = Vehicle.Status.ON_TRIP
            trip.vehicle.save(update_fields=['status', 'updated_at'])
            trip.driver.status = Driver.Status.ON_TRIP
            trip.driver.save(update_fields=['status', 'updated_at'])
            trip.dispatched_at = timezone.now()

        # ── COMPLETE ──────────────────────────────────────────────────────────
        elif new_status == Trip.Status.COMPLETED:
            if not actual_distance:
                return Response(
                    {'detail': 'actual_distance_km is required to complete a trip.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Use Decimal arithmetic to avoid float precision errors
            trip.actual_distance_km = Decimal(str(actual_distance))
            trip.vehicle.odometer = trip.vehicle.odometer + trip.actual_distance_km
            trip.vehicle.status = Vehicle.Status.AVAILABLE
            trip.vehicle.save(update_fields=['odometer', 'status', 'updated_at'])
            trip.driver.status = Driver.Status.AVAILABLE
            trip.driver.save(update_fields=['status', 'updated_at'])
            trip.completed_at = timezone.now()

        # ── CANCEL ────────────────────────────────────────────────────────────
        elif new_status == Trip.Status.CANCELLED:
            if trip.status == Trip.Status.IN_PROGRESS:
                trip.vehicle.status = Vehicle.Status.AVAILABLE
                trip.vehicle.save(update_fields=['status', 'updated_at'])
                trip.driver.status = Driver.Status.AVAILABLE
                trip.driver.save(update_fields=['status', 'updated_at'])

        trip.status = new_status
        trip.save()
        return Response(TripSerializer(trip, context={'request': request}).data)


# ─── Maintenance ViewSet ──────────────────────────────────────────────────────

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    """
    Maintenance log CRUD.
    Auto-transitions vehicle status when log status changes:
      IN_PROGRESS → vehicle becomes MAINTENANCE
      COMPLETED   → vehicle returns to AVAILABLE
    """
    permission_classes = [IsAdminOrMaintenance]
    serializer_class = MaintenanceLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'vehicle']
    search_fields = ['description', 'vehicle__license_plate', 'vehicle__make']
    ordering_fields = ['created_at', 'start_date', 'cost']
    ordering = ['-created_at']

    def get_queryset(self):
        return MaintenanceLog.objects.select_related('vehicle', 'created_by').all()

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        # Auto-set vehicle to MAINTENANCE when a log is created IN_PROGRESS
        if instance.status == MaintenanceLog.Status.IN_PROGRESS:
            instance.vehicle.status = Vehicle.Status.MAINTENANCE
            instance.vehicle.save(update_fields=['status', 'updated_at'])

    def perform_update(self, serializer):
        # Capture old status from the serializer instance (pre-save) to detect changes
        old_status = serializer.instance.status
        instance = serializer.save()
        # Auto-transition vehicle based on the new maintenance status
        if instance.status == MaintenanceLog.Status.IN_PROGRESS and old_status != instance.status:
            instance.vehicle.status = Vehicle.Status.MAINTENANCE
            instance.vehicle.save(update_fields=['status', 'updated_at'])
        elif instance.status == MaintenanceLog.Status.COMPLETED and old_status != instance.status:
            instance.vehicle.status = Vehicle.Status.AVAILABLE
            instance.vehicle.save(update_fields=['status', 'updated_at'])


# ─── Fuel Log ViewSet ─────────────────────────────────────────────────────────

class FuelLogViewSet(viewsets.ModelViewSet):
    """
    Fuel log CRUD.
    Enforces strictly-increasing odometer readings per vehicle.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = FuelLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['vehicle', 'driver']
    search_fields = ['vehicle__license_plate', 'driver__user__first_name']
    ordering_fields = ['logged_at', 'total_cost', 'liters']
    ordering = ['-logged_at']

    def get_queryset(self):
        return FuelLog.objects.select_related('vehicle', 'driver', 'driver__user').all()

    def perform_create(self, serializer):
        vehicle = serializer.validated_data['vehicle']
        new_odometer = serializer.validated_data['odometer_reading']

        # Business Rule: odometer must be strictly increasing
        if new_odometer <= vehicle.odometer:
            raise ValidationError({
                'odometer_reading': (
                    f'Odometer reading ({new_odometer} km) must be greater than the '
                    f'vehicle\'s current odometer ({vehicle.odometer} km).'
                )
            })

        serializer.save()
        # Update vehicle odometer to the new reading
        vehicle.odometer = new_odometer
        vehicle.save(update_fields=['odometer', 'updated_at'])


# ─── Expense Log ViewSet ──────────────────────────────────────────────────────

class ExpenseLogViewSet(viewsets.ModelViewSet):
    """Expense log CRUD — auto-assigns created_by from the authenticated user."""
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'trip']
    search_fields = ['notes', 'trip__trip_number']
    ordering_fields = ['date', 'amount']
    ordering = ['-date']

    def get_queryset(self):
        return ExpenseLog.objects.select_related('trip', 'created_by').all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ─── Dashboard Analytics ──────────────────────────────────────────────────────

class DashboardAnalyticsView(APIView):
    """Returns KPI cards, chart data, and system alerts for the dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        thirty_days_later = today + timedelta(days=30)
        six_months_ago = now - timedelta(days=180)

        # ── KPI counters ──────────────────────────────────────────────────────
        active_trips       = Trip.objects.filter(status=Trip.Status.IN_PROGRESS).count()
        total_vehicles     = Vehicle.objects.filter(is_active=True).count()
        available_vehicles = Vehicle.objects.filter(status=Vehicle.Status.AVAILABLE, is_active=True).count()
        under_maintenance  = Vehicle.objects.filter(status=Vehicle.Status.MAINTENANCE, is_active=True).count()
        total_drivers      = Driver.objects.filter(is_active=True).count()
        available_drivers  = Driver.objects.filter(status=Driver.Status.AVAILABLE, is_active=True).count()

        expiring_licenses_30d = Driver.objects.filter(
            is_active=True,
            license_expiry__gte=today,
            license_expiry__lte=thirty_days_later,
        ).count()

        fleet_utilization_pct = round(
            (active_trips / total_vehicles * 100) if total_vehicles else 0, 1
        )

        # ── Recent trips (last 5) ─────────────────────────────────────────────
        recent_trips = TripSerializer(
            Trip.objects.select_related('vehicle', 'driver', 'driver__user', 'created_by')
                        .order_by('-created_at')[:5],
            many=True,
            context={'request': request},
        ).data

        # ── Fleet status breakdown (donut chart) ──────────────────────────────
        fleet_status_breakdown = list(
            Vehicle.objects.filter(is_active=True)
                           .values('status')
                           .annotate(count=Count('id'))
                           .order_by('status')
        )

        # ── Monthly trip counts (area chart) ─────────────────────────────────
        monthly_trips = list(
            Trip.objects.filter(created_at__gte=six_months_ago)
                        .annotate(month=TruncMonth('created_at'))
                        .values('month')
                        .annotate(count=Count('id'))
                        .order_by('month')
        )

        # ── Cost aggregations ─────────────────────────────────────────────────
        total_maintenance_cost = MaintenanceLog.objects.aggregate(t=Sum('cost'))['t'] or Decimal('0')
        total_fuel_cost        = FuelLog.objects.aggregate(t=Sum('total_cost'))['t'] or Decimal('0')
        total_expenses_cost    = ExpenseLog.objects.aggregate(t=Sum('amount'))['t'] or Decimal('0')

        # ── System alerts ─────────────────────────────────────────────────────
        alerts = []

        # Expired driver licenses
        for d in Driver.objects.filter(license_expiry__lt=today, is_active=True).select_related('user'):
            alerts.append({
                'id': f'driver-{d.id}',
                'type': 'LICENSE_EXPIRED',
                'severity': 'DANGER',
                'title': 'Driver License Expired',
                'message': f"{d.user.full_name}'s license expired on {d.license_expiry.strftime('%d %b %Y')}.",
            })

        # Active/scheduled maintenance records
        for m in MaintenanceLog.objects.filter(
            status__in=[MaintenanceLog.Status.SCHEDULED, MaintenanceLog.Status.IN_PROGRESS]
        ).select_related('vehicle'):
            desc_preview = m.description[:50] + ('…' if len(m.description) > 50 else '')
            alerts.append({
                'id': f'maint-{m.id}',
                'type': 'MAINTENANCE_REQUIRED',
                'severity': 'WARNING',
                'title': 'Maintenance Required',
                'message': f"Vehicle {m.vehicle.license_plate} — {desc_preview}",
            })

        # Out-of-service vehicles
        for v in Vehicle.objects.filter(status=Vehicle.Status.OUT_OF_SERVICE, is_active=True):
            alerts.append({
                'id': f'vehicle-oos-{v.id}',
                'type': 'VEHICLE_OOS',
                'severity': 'DANGER',
                'title': 'Vehicle Out of Service',
                'message': f"{v.year} {v.make} {v.model} ({v.license_plate}) is Out of Service.",
            })

        return Response({
            'kpis': {
                'active_trips':           active_trips,
                'available_vehicles':     available_vehicles,
                'under_maintenance':      under_maintenance,
                'total_vehicles':         total_vehicles,
                'total_drivers':          total_drivers,
                'available_drivers':      available_drivers,
                'expiring_licenses_30d':  expiring_licenses_30d,
                'fleet_utilization_pct':  fleet_utilization_pct,
            },
            'recent_trips':          recent_trips,
            'monthly_trips':         monthly_trips,
            'fleet_status_breakdown': fleet_status_breakdown,
            'cost_breakdown': {
                'maintenance': float(total_maintenance_cost),
                'fuel':        float(total_fuel_cost),
                'expenses':    float(total_expenses_cost),
                'total':       float(total_maintenance_cost + total_fuel_cost + total_expenses_cost),
            },
            'active_alerts': alerts[:8],  # Cap at 8 alerts for dashboard card
        })


# ─── Reports Analytics View ───────────────────────────────────────────────────

class ReportsAnalyticsView(APIView):
    """Returns per-vehicle fleet ROI report: cost, distance, efficiency."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vehicles = Vehicle.objects.filter(is_active=True)

        # Build lookup maps with a single query each (N+1 safe)
        fuel_map = {
            r['vehicle_id']: r
            for r in FuelLog.objects.values('vehicle_id').annotate(
                total_cost=Sum('total_cost'),
                total_liters=Sum('liters'),
            )
        }
        maint_map = {
            r['vehicle_id']: r['total']
            for r in MaintenanceLog.objects.values('vehicle_id').annotate(total=Sum('cost'))
        }
        trip_map = {
            r['vehicle_id']: r['total']
            for r in Trip.objects.filter(status=Trip.Status.COMPLETED)
                                 .values('vehicle_id')
                                 .annotate(total=Sum('actual_distance_km'))
        }
        expense_map = {
            r['trip__vehicle_id']: r['total']
            for r in ExpenseLog.objects.values('trip__vehicle_id').annotate(total=Sum('amount'))
        }

        report_data = []
        for v in vehicles:
            vid = v.id
            fuel_cost   = float(fuel_map.get(vid, {}).get('total_cost')   or 0)
            fuel_liters = float(fuel_map.get(vid, {}).get('total_liters') or 0)
            maint_cost  = float(maint_map.get(vid)   or 0)
            distance    = float(trip_map.get(vid)    or 0)
            exp_cost    = float(expense_map.get(vid) or 0)

            efficiency   = round(distance / fuel_liters, 2) if fuel_liters > 0 else 0
            total_cost   = fuel_cost + maint_cost + exp_cost
            cost_per_km  = round(total_cost / distance, 2)  if distance > 0    else 0

            report_data.append({
                'id':               str(vid),
                'vehicle_name':     f"{v.year} {v.make} {v.model}",
                'license_plate':    v.license_plate,
                'fuel_type':        v.fuel_type,
                'status':           v.status,
                'fuel_cost':        fuel_cost,
                'fuel_liters':      fuel_liters,
                'maintenance_cost': maint_cost,
                'distance_km':      distance,
                'expenses_cost':    exp_cost,
                'fuel_efficiency':  efficiency,
                'total_cost':       total_cost,
                'cost_per_km':      cost_per_km,
            })

        # Sort by total cost descending by default
        report_data.sort(key=lambda x: x['total_cost'], reverse=True)

        return Response({'fleet_roi_reports': report_data})


# ─── AI Copilot Assistant View ───────────────────────────────────────────────

def get_fleet_summary():
    """Compiles a quick local summary of the fleet state for the AI Assistant's context."""
    from .models import Vehicle, Driver, Trip, MaintenanceLog
    
    active_trips = Trip.objects.filter(status=Trip.Status.IN_PROGRESS).count()
    available_vehicles = Vehicle.objects.filter(status=Vehicle.Status.AVAILABLE, is_active=True).count()
    total_vehicles = Vehicle.objects.filter(is_active=True).count()
    available_drivers = Driver.objects.filter(status=Driver.Status.AVAILABLE, is_active=True).count()
    total_drivers = Driver.objects.filter(is_active=True).count()
    
    maint_scheduled = MaintenanceLog.objects.filter(status=MaintenanceLog.Status.SCHEDULED).count()
    maint_active = MaintenanceLog.objects.filter(status=MaintenanceLog.Status.IN_PROGRESS).count()

    return (
        f"Fleet Snapshot:\n"
        f"- Active trips: {active_trips}\n"
        f"- Vehicles: {available_vehicles} available of {total_vehicles} total\n"
        f"- Drivers: {available_drivers} available of {total_drivers} total\n"
        f"- Maintenance: {maint_active} active repairs, {maint_scheduled} scheduled"
    )


def get_local_fallback_reply(message):
    try:
        from .models import Vehicle, Driver, Trip, MaintenanceLog
        
        total_vehicles = Vehicle.objects.filter(is_active=True).count()
        avail_vehicles = Vehicle.objects.filter(is_active=True, status='AVAILABLE').count()
        trip_vehicles = Vehicle.objects.filter(is_active=True, status='ON_TRIP').count()
        maint_vehicles = Vehicle.objects.filter(is_active=True, status='MAINTENANCE').count()
        
        total_drivers = Driver.objects.filter(is_active=True).count()
        avail_drivers = Driver.objects.filter(is_active=True, status='AVAILABLE').count()
        trip_drivers = Driver.objects.filter(is_active=True, status='ON_TRIP').count()
        
        active_trips = Trip.objects.filter(is_active=True, status='IN_PROGRESS').count()
        pending_trips = Trip.objects.filter(is_active=True, status='SCHEDULED').count()
        
        active_maint = MaintenanceLog.objects.filter(status='IN_PROGRESS').count()
        
        msg = message.lower()
        
        if "utilization" in msg or "summary" in msg or "fleet" in msg or "snapshot" in msg:
            util_pct = round((trip_vehicles / total_vehicles * 100)) if total_vehicles > 0 else 0
            return (
                f"### 📊 Fleet Operations Summary (Local Fallback)\n\n"
                f"Your Gemini API key has exceeded its billing cap, but you can continue querying local database stats:\n\n"
                f"- **Fleet Utilization:** **{util_pct}%** ({trip_vehicles} of {total_vehicles} vehicles active on roads).\n"
                f"- **Active Trips:** **{active_trips} in progress**, with {pending_trips} scheduled dispatches pending.\n"
                f"- **Workforce Roster:** **{avail_drivers} available drivers** out of a total staff of {total_drivers}.\n"
                f"- **Maintenance Logs:** **{active_maint} active repair tasks** currently in the workshop.\n\n"
                f"*To restore full AI conversational capabilities, please adjust your project spend cap at [ai.studio/spend](https://ai.studio/spend).*"
            )
        elif "vehicle" in msg or "truck" in msg:
            return (
                f"### 🚛 Fleet Vehicles Status (Local Fallback)\n\n"
                f"- **Total Registry:** {total_vehicles} registered assets.\n"
                f"- **Available for Dispatch:** {avail_vehicles} vehicles.\n"
                f"- **Active on Routes:** {trip_vehicles} vehicles.\n"
                f"- **Undergoing Servicing:** {maint_vehicles} vehicles.\n\n"
                f"To dispatch a new route or update vehicle states, navigate to the **Fleet Registry** page."
            )
        elif "driver" in msg or "staff" in msg:
            return (
                f"### 🪪 Drivers Roster Status (Local Fallback)\n\n"
                f"- **Total Drivers:** {total_drivers} registered operators.\n"
                f"- **Available for Assignment:** {avail_drivers} drivers.\n"
                f"- **On Active Trips:** {trip_drivers} drivers.\n\n"
                f"Please verify driver license expiration states inside the **Driver Roster** console before scheduling new runs."
            )
        elif "maintenance" in msg or "repair" in msg or "workshop" in msg:
            return (
                f"### 🔧 Fleet Maintenance Summary (Local Fallback)\n\n"
                f"- **Active Repair Logs:** {active_maint} vehicles currently in workshop status.\n"
                f"- **OOS (Out of Service) Assets:** {Vehicle.objects.filter(is_active=True, status='OUT_OF_SERVICE').count()} vehicles.\n\n"
                f"To release a vehicle back to service, complete its log entries inside the **Fleet Workshop** portal."
            )
        else:
            return (
                f"### 👋 TransitOps Copilot (Local Fallback Mode)\n\n"
                f"TransitOps Copilot is currently operating in **Local Database Mode** because your Gemini API key has hit its Monthly Spending Limit.\n\n"
                f"**Current Database Counts:**\n"
                f"- Active Trips: **{active_trips}**\n"
                f"- Available Vehicles: **{avail_vehicles}** of {total_vehicles} total\n"
                f"- Available Drivers: **{avail_drivers}** of {total_drivers} total\n"
                f"- Workshop Repairs: **{active_maint} active**\n\n"
                f"You can ask about *'summary'*, *'vehicles'*, *'drivers'*, or *'maintenance'* to retrieve local stats instantly."
            )
    except Exception as inner_e:
        return f"⚠️ Copilot Offline: Database queries failed ({str(inner_e)})"


class AIAssistantView(APIView):
    """
    POST /api/ai/chat/
    Queries the Gemini model with a smart system prompt containing real-time fleet context.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_message = request.data.get('message')
        if not user_message:
            return Response({'detail': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from google import genai
            from django.conf import settings as django_settings
            api_key = getattr(django_settings, 'GEMINI_API_KEY', None)

            if not api_key:
                raise ValueError("GEMINI_API_KEY is not set in settings.")

            client = genai.Client(api_key=api_key)
            fleet_summary = get_fleet_summary()

            system_instruction = (
                "You are TransitOps Copilot, a highly intelligent transport operations assistant. "
                "You help dispatchers, maintenance managers, admins, and drivers coordinate fleet operations. "
                "Be extremely brief, professional, and action-oriented. Provide helpful advice or answers. "
                "Base your operational count answers on this real-time fleet state when relevant:\n"
                f"{fleet_summary}"
            )

            full_input = f"{system_instruction}\n\nUser Question: {user_message}"

            # google-genai SDK v2 — interactions API
            interaction = client.interactions.create(
                model="gemini-2.5-flash",
                input=full_input
            )

            return Response({'reply': interaction.output_text}, status=status.HTTP_200_OK)

        except Exception as e:
            fallback_text = get_local_fallback_reply(user_message)
            return Response({'reply': fallback_text}, status=status.HTTP_200_OK)




