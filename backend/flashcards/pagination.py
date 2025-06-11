from rest_framework.pagination import CursorPagination

class CardCursorPagination(CursorPagination):
    page_size   = 40
    ordering    = "id"
    cursor_query_param = "cursor"
