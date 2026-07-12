"""
TransitOps API - Permissions
Granular permission classes for RBAC enforcement.
"""
from rest_framework.permissions import BasePermission
from .models import User


class IsAdmin(BasePermission):
    """Only Administrators."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsAdminOrDispatcher(BasePermission):
    """Administrators and Dispatchers."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Role.ADMIN, User.Role.DISPATCHER
        ]


class IsAdminOrMaintenance(BasePermission):
    """Administrators and Maintenance Managers."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Role.ADMIN, User.Role.MAINTENANCE
        ]


class IsDriver(BasePermission):
    """Only Drivers."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.DRIVER


class IsAdminOrDispatcherOrDriver(BasePermission):
    """Admins, Dispatchers, and Drivers (for trip viewing)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Role.ADMIN, User.Role.DISPATCHER, User.Role.DRIVER
        ]


class ReadOnly(BasePermission):
    """Allow GET/HEAD/OPTIONS only."""
    def has_permission(self, request, view):
        return request.method in ('GET', 'HEAD', 'OPTIONS')
