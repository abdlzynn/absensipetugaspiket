// Handle notifications
document.addEventListener('DOMContentLoaded', function() {
    // Get notification elements
    const notificationsList = document.getElementById('notificationsList');
    const unreadNotificationsBadge = document.getElementById('unreadNotificationsBadge');
    const unreadCount = document.getElementById('unreadCount');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    
    // Function to fetch notifications
    function fetchNotifications() {
        axios.get('/notifications')
            .then(response => {
                const notifications = response.data.notifications;
                updateNotificationsList(notifications);
                updateUnreadBadge(notifications.length);
            })
            .catch(error => {
                console.error('Error fetching notifications:', error);
                notificationsList.innerHTML = '<li><a class="dropdown-item text-danger" href="#">Gagal memuat notifikasi</a></li>';
            });
    }
    
    // Update notification list in the dropdown
    function updateNotificationsList(notifications) {
        // Clear current list
        notificationsList.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationsList.innerHTML = '<li><a class="dropdown-item text-center text-muted" href="#">Tidak ada notifikasi baru</a></li>';
            return;
        }
        
        // Add notifications to list
        notifications.forEach(notification => {
            const notificationTime = new Date(notification.waktu);
            const timeStr = notificationTime.toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(/\//g, '/').replace(',', '');
            
            const item = document.createElement('li');
            item.innerHTML = `
                <a class="dropdown-item" href="#">
                    <div class="d-flex align-items-center">
                        <div class="flex-grow-1">
                            <div class="small text-muted">${timeStr}</div>
                            <div>${notification.message}</div>
                        </div>
                    </div>
                </a>
            `;
            notificationsList.appendChild(item);
        });
        
        // Add mark as read link
        const markReadItem = document.createElement('li');
        markReadItem.innerHTML = '<hr class="dropdown-divider">';
        notificationsList.appendChild(markReadItem);
        
        const markAllRead = document.createElement('li');
        markAllRead.innerHTML = '<a class="dropdown-item text-center" href="#" id="markAllReadBtn">Tandai semua telah dibaca</a>';
        notificationsList.appendChild(markAllRead);
        
        // Add event listener to mark all as read
        document.getElementById('markAllReadBtn').addEventListener('click', function(e) {
            e.preventDefault();
            markAllAsRead();
        });
    }
    
    // Update the unread badge counter
    function updateUnreadBadge(count) {
        if (count > 0) {
            unreadCount.textContent = count > 99 ? '99+' : count;
            unreadNotificationsBadge.classList.remove('d-none');
        } else {
            unreadNotificationsBadge.classList.add('d-none');
        }
    }
    
    // Mark all notifications as read
    function markAllAsRead() {
        axios.post('/notifications/mark-read')
            .then(response => {
                if (response.data.success) {
                    fetchNotifications(); // Refresh notifications
                }
            })
            .catch(error => {
                console.error('Error marking notifications as read:', error);
            });
    }
    
    // Initial fetch of notifications
    fetchNotifications();
    
    // Show the dropdown message when clicked
    notificationsDropdown.addEventListener('click', function() {
        fetchNotifications(); // Refresh notifications when dropdown is opened
    });
    
    // Set up interval to check for new notifications every 30 seconds
    setInterval(fetchNotifications, 30000);
});