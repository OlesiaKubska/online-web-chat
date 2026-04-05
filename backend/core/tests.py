from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserPresence
from .services import (
    RECENT_PRESENCE_SECONDS,
    cleanup_stale_presence,
    get_user_presence,
    update_presence,
)

User = get_user_model()


class PresenceServiceTestCase(TestCase):
    def test_single_online_tab(self):
        """Test that a single online tab results in ONLINE status."""
        user = User.objects.create_user(username='testuser', password='pass')
        
        update_presence(user, 'session1', 'tab1', UserPresence.Status.ONLINE)
        
        status = get_user_presence(user)
        self.assertEqual(status, UserPresence.Status.ONLINE)

    def test_all_tabs_afk(self):
        """Test that all AFK tabs result in AFK status."""
        user = User.objects.create_user(username='testuser', password='pass')
        
        update_presence(user, 'session1', 'tab1', UserPresence.Status.AFK)
        update_presence(user, 'session1', 'tab2', UserPresence.Status.AFK)
        
        status = get_user_presence(user)
        self.assertEqual(status, UserPresence.Status.AFK)

    def test_mixed_tabs_online_takes_precedence(self):
        """Test that if any tab is online, status is ONLINE."""
        user = User.objects.create_user(username='testuser', password='pass')
        
        update_presence(user, 'session1', 'tab1', UserPresence.Status.ONLINE)
        update_presence(user, 'session1', 'tab2', UserPresence.Status.AFK)
        
        status = get_user_presence(user)
        self.assertEqual(status, UserPresence.Status.ONLINE)

    def test_no_recent_presence_offline(self):
        """Test that no recent presence results in OFFLINE status."""
        user = User.objects.create_user(username='testuser', password='pass')
        
        # Create presence record
        update_presence(user, 'session1', 'tab1', UserPresence.Status.ONLINE)
        
        # Make it old by updating last_seen
        old_time = timezone.now() - timedelta(seconds=120)
        UserPresence.objects.filter(user=user).update(last_seen=old_time)
        
        status = get_user_presence(user)
        self.assertEqual(status, 'offline')

    def test_cleanup_stale_presence(self):
        """Test that cleanup removes old presence records."""
        user = User.objects.create_user(username='testuser', password='pass')

        # Create presence
        update_presence(user, 'session1', 'tab1', UserPresence.Status.ONLINE)

        # Make it stale
        stale_time = timezone.now() - timedelta(minutes=10)
        UserPresence.objects.filter(user=user).update(last_seen=stale_time)

        # Cleanup should remove it
        deleted_count = cleanup_stale_presence()
        self.assertEqual(deleted_count, 1)

        # Should be no presence records left
        self.assertEqual(UserPresence.objects.filter(user=user).count(), 0)

    def test_latest_status_per_session_is_used_for_aggregation(self):
        """Test that we aggregate across all tabs, using latest per tab."""
        user = User.objects.create_user(username='session-user', password='pass')

        # Two tabs in same session:
        # tab-old: ONLINE but with stale heartbeat (>60sec)
        update_presence(user, 'session1', 'tab-old', UserPresence.Status.ONLINE)
        old_time = timezone.now() - timedelta(seconds=90)  # Older than 60sec threshold
        UserPresence.objects.filter(user=user, session_id='session1', tab_id='tab-old').update(last_seen=old_time)

        # tab-new: AFK with fresh heartbeat
        update_presence(user, 'session1', 'tab-new', UserPresence.Status.AFK)

        # Result: only tab-new is recent, so we get AFK
        status = get_user_presence(user)
        self.assertEqual(status, UserPresence.Status.AFK)

    def test_online_to_afk_to_offline_transition(self):
        user = User.objects.create_user(username='transition-user', password='pass')

        update_presence(user, 'session1', 'tab1', UserPresence.Status.ONLINE)
        self.assertEqual(get_user_presence(user), UserPresence.Status.ONLINE)

        update_presence(user, 'session1', 'tab1', UserPresence.Status.AFK)
        self.assertEqual(get_user_presence(user), UserPresence.Status.AFK)

        old_time = timezone.now() - timedelta(seconds=RECENT_PRESENCE_SECONDS + 1)
        UserPresence.objects.filter(user=user).update(last_seen=old_time)
        self.assertEqual(get_user_presence(user), 'offline')


class PresenceApiLatencyTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            username='presence-alice',
            email='presence-alice@example.com',
            password='pass12345',
        )
        self.client.force_login(self.alice)

    def test_presence_users_reflects_latest_heartbeat_immediately(self):
        afk = self.client.post(
            '/api/presence/heartbeat/',
            {'session_id': 's1', 'tab_id': 't1', 'status': 'afk'},
            format='json',
        )
        self.assertEqual(afk.status_code, status.HTTP_200_OK)

        users_afk = self.client.get(f'/api/presence/users/?ids={self.alice.id}')
        self.assertEqual(users_afk.status_code, status.HTTP_200_OK)
        self.assertEqual(users_afk.data[0]['status'], 'afk')

        online = self.client.post(
            '/api/presence/heartbeat/',
            {'session_id': 's1', 'tab_id': 't1', 'status': 'online'},
            format='json',
        )
        self.assertEqual(online.status_code, status.HTTP_200_OK)

        users_online = self.client.get(f'/api/presence/users/?ids={self.alice.id}')
        self.assertEqual(users_online.status_code, status.HTTP_200_OK)
        self.assertEqual(users_online.data[0]['status'], 'online')

    def test_logout_clears_current_tab_presence_when_ids_are_provided(self):
        heartbeat = self.client.post(
            '/api/presence/heartbeat/',
            {'session_id': 'logout-session', 'tab_id': 'logout-tab', 'status': 'online'},
            format='json',
        )
        self.assertEqual(heartbeat.status_code, status.HTTP_200_OK)
        self.assertTrue(
            UserPresence.objects.filter(
                user=self.alice,
                session_id='logout-session',
                tab_id='logout-tab',
            ).exists()
        )

        logout_response = self.client.post(
            '/api/auth/logout/',
            {'session_id': 'logout-session', 'tab_id': 'logout-tab'},
            format='json',
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            UserPresence.objects.filter(
                user=self.alice,
                session_id='logout-session',
                tab_id='logout-tab',
            ).exists()
        )
