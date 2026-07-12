"""
TransitOps - Custom Pagination
Extends DRF's PageNumberPagination to:
  - Allow clients to pass ?page_size=N for dropdown/select fetches (max 200)
  - Return a consistent response envelope: {count, next, previous, results}
"""
from rest_framework.pagination import PageNumberPagination


class StandardResultsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'   # clients may send ?page_size=100
    max_page_size = 200                    # hard cap to avoid massive queries
