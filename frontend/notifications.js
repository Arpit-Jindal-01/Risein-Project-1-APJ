// Notification System for TimeLock Predictions
// Handles browser notifications and in-app alerts

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.notifications = [];
        this.checkInterval = null;
        this.initialized = false;
    }

    // Initialize notification system
    async init() {
        if (this.initialized) return;
        
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications');
            return false;
        }

        // Request permission
        if (Notification.permission === 'default') {
            this.permission = await Notification.requestPermission();
        } else {
            this.permission = Notification.permission;
        }

        this.initialized = true;
        console.log('✅ Notification system initialized. Permission:', this.permission);
        
        return this.permission === 'granted';
    }

    // Request notification permission
    async requestPermission() {
        if (!('Notification' in window)) {
            this.showInAppNotification('❌ Your browser does not support notifications', 'error');
            return false;
        }

        const permission = await Notification.requestPermission();
        this.permission = permission;

        if (permission === 'granted') {
            this.showInAppNotification('✅ Notifications enabled!', 'success');
            this.sendTestNotification();
            return true;
        } else if (permission === 'denied') {
            this.showInAppNotification('❌ Notifications blocked. Enable them in browser settings.', 'error');
            return false;
        }

        return false;
    }

    // Send browser notification
    sendNotification(title, options = {}) {
        if (this.permission !== 'granted') {
            console.log('Notification permission not granted');
            return null;
        }

        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            tag: 'timelock-prediction',
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            
            notification.onclick = () => {
                window.focus();
                if (options.onClick) {
                    options.onClick();
                }
                notification.close();
            };

            this.notifications.push(notification);
            return notification;
        } catch (error) {
            console.error('Error sending notification:', error);
            return null;
        }
    }

    // Send test notification
    sendTestNotification() {
        this.sendNotification('🔮 TimeLock Predictions', {
            body: 'Notifications are now enabled! You\'ll be alerted when predictions unlock.',
            icon: '🔮',
            tag: 'test-notification'
        });
    }

    // Show in-app notification banner
    showInAppNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `in-app-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
        `;

        container.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);

        return notification;
    }

    // Create notification container if it doesn't exist
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    // Get icon for notification type
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            unlock: '🔓',
            resolve: '⚖️',
            stake: '💰',
            claim: '💎'
        };
        return icons[type] || 'ℹ️';
    }

    // Check predictions for unlock notifications
    startUnlockMonitor(predictions) {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(() => {
            this.checkUnlocks(predictions);
        }, 30000); // Check every 30 seconds

        // Initial check
        this.checkUnlocks(predictions);
    }

    // Check if any predictions have unlocked
    checkUnlocks(predictions) {
        if (!predictions || predictions.length === 0) return;

        const now = Math.floor(Date.now() / 1000);

        predictions.forEach(pred => {
            if (pred.status === 'Open' && pred.unlock_time <= now) {
                const notificationId = `unlock-${pred.id}`;
                
                // Check if we already notified about this
                if (!this.hasNotified(notificationId)) {
                    this.notifyUnlock(pred);
                    this.markAsNotified(notificationId);
                }
            }
        });
    }

    // Notify about prediction unlock
    notifyUnlock(prediction) {
        const title = '🔓 Prediction Unlocked!';
        const body = `"${prediction.question}" is now ready to be resolved!`;

        this.sendNotification(title, {
            body: body,
            tag: `unlock-${prediction.id}`,
            onClick: () => {
                window.location.hash = `#prediction-${prediction.id}`;
            }
        });

        this.showInAppNotification(`🔓 Prediction #${prediction.id} is now unlocked and ready to resolve!`, 'unlock');
    }

    // Notify about stake
    notifyStake(predictionId, choice, amount) {
        const title = '💰 Stake Placed!';
        const body = `You staked ${amount} XLM on ${choice ? 'YES' : 'NO'} for prediction #${predictionId}`;

        this.sendNotification(title, { body, tag: `stake-${predictionId}` });
        this.showInAppNotification(body, 'stake');
    }

    // Notify about resolution
    notifyResolution(prediction, outcome) {
        const title = '⚖️ Prediction Resolved!';
        const body = `"${prediction.question}" resolved: ${outcome ? 'YES' : 'NO'} wins!`;

        this.sendNotification(title, { body, tag: `resolve-${prediction.id}` });
        this.showInAppNotification(body, 'resolve');
    }

    // Notify about claim
    notifyClaim(amount) {
        const title = '💎 Rewards Claimed!';
        const body = `You claimed ${amount} XLM in rewards!`;

        this.sendNotification(title, { body, tag: 'claim' });
        this.showInAppNotification(body, 'claim');
    }

    // Track notified predictions
    markAsNotified(id) {
        const notified = JSON.parse(localStorage.getItem('notified_predictions') || '[]');
        if (!notified.includes(id)) {
            notified.push(id);
            localStorage.setItem('notified_predictions', JSON.stringify(notified));
        }
    }

    hasNotified(id) {
        const notified = JSON.parse(localStorage.getItem('notified_predictions') || '[]');
        return notified.includes(id);
    }

    // Stop monitoring
    stopMonitor() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    // Clear all notifications
    clearAll() {
        this.notifications.forEach(n => n.close());
        this.notifications = [];
        
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Create global notification manager instance
window.notificationManager = new NotificationManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.notificationManager.init();
    });
} else {
    window.notificationManager.init();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
