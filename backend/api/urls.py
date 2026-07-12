"""
TransitOps API - URL Router
All REST endpoints registered with DRF's DefaultRouter.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, LogoutView, RegisterView, MeView, ChangePasswordView,
    UserViewSet, VehicleViewSet, DriverViewSet, TripViewSet,
    MaintenanceLogViewSet, FuelLogViewSet, ExpenseLogViewSet,
    DashboardAnalyticsView, ReportsAnalyticsView
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'trips', TripViewSet, basename='trip')
router.register(r'maintenance', MaintenanceLogViewSet, basename='maintenance')
router.register(r'fuel-logs', FuelLogViewSet, basename='fuel-log')
router.register(r'expenses', ExpenseLogViewSet, basename='expense')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', LoginView.as_view(), name='token-obtain'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),  # Silent refresh

    # Analytics
    path('analytics/dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('analytics/reports/', ReportsAnalyticsView.as_view(), name='reports-analytics'),

    # All resource endpoints
    path('', include(router.urls)),
]
