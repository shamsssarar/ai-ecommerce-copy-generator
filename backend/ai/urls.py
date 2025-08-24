# ai/urls.py
from django.urls import path
from .views import generate, generate_copy

urlpatterns = [
    path("ai/generate/", generate),
    path("ai/generate-copy/", generate_copy),
]
