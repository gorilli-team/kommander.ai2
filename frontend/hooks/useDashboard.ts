import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface DashboardStats {
  aiStatus: 'online' | 'offline' | 'maintenance';
  conversationsThisWeek: number;
  totalConversations: number;
  knowledgeBaseCompleteness: number;
  documentsCount: number;
  faqCount: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: Date;
    color: string;
  }>;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  createdAt: Date;
  read: boolean;
}

export interface UserPreferences {
  dashboardLayout: {
    showStatistics: boolean;
    showNotifications: boolean;
    showRecentActivities: boolean;
    showQuickActions: boolean;
    statisticsOrder: string[];
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    performanceAlerts: boolean;
    teamUpdates: boolean;
    systemUpdates: boolean;
  };
  theme: {
    preferredTheme: 'light' | 'dark' | 'system';
    compactMode: boolean;
  };
}

export const useDashboard = () => {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/dashboard/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Fetch user preferences
  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/dashboard/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/dashboard/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId, read: true }),
      });
      
      if (!response.ok) throw new Error('Failed to mark notification as read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch('/api/dashboard/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      });
      
      if (!response.ok) throw new Error('Failed to mark all notifications as read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Update user preferences
  const updatePreferences = async (newPreferences: UserPreferences) => {
    try {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });
      
      if (!response.ok) throw new Error('Failed to update preferences');
      
      setPreferences(newPreferences);
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchStats(),
        fetchNotifications(),
        fetchPreferences()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session]);

  // Auto-refresh stats every 5 minutes
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(fetchNotifications, 30 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return {
    stats,
    notifications,
    preferences,
    loading,
    error,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updatePreferences,
    refreshData
  };
};
