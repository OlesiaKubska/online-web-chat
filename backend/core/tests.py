from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from .models import UserPresence
from .services import update_presence, get_user_presence, cleanup_stale_presence

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
