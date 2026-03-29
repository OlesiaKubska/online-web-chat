from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase


class ChangePasswordViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alice',
            email='alice@example.com',
            password='old-password-123',
        )
        self.url = '/api/auth/change-password/'

    def test_requires_authentication(self):
        response = self.client.post(
            self.url,
            {'old_password': 'old-password-123', 'new_password': 'new-password-123'},
            format='json',
        )

        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_changes_password_and_keeps_session_active(self):
        self.client.force_login(self.user)

        response = self.client.post(
            self.url,
            {'old_password': 'old-password-123', 'new_password': 'new-password-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Password changed successfully')

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('new-password-123'))

        me_response = self.client.get('/api/auth/me/')
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)

    def test_rejects_incorrect_old_password(self):
        self.client.force_login(self.user)

        response = self.client.post(
            self.url,
            {'old_password': 'wrong-password', 'new_password': 'new-password-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['old_password'][0], 'Old password is incorrect.')
