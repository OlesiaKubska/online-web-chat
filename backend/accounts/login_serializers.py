from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user_by_email = User.objects.filter(email__iexact=email).first()
        if not user_by_email:
            raise serializers.ValidationError("Invalid email or password.")

        user = authenticate(username=user_by_email.username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        attrs["user"] = user
        return attrs