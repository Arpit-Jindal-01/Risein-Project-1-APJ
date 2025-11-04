// Social Features for TimeLock Predictions
// Share predictions, social media integration, and viral features

class SocialManager {
    constructor() {
        this.baseUrl = window.location.origin + window.location.pathname;
    }

    // Share prediction on social media
    sharePrediction(prediction, platform) {
        const text = `🔮 ${prediction.question}\n\nVote YES or NO on TimeLock Predictions!`;
        const url = `${this.baseUrl}#prediction-${prediction.id}`;
        const hashtags = 'TimeLockPredictions,Stellar,Soroban,DeFi';

        switch(platform) {
            case 'twitter':
                this.shareOnTwitter(text, url, hashtags);
                break;
            case 'telegram':
                this.shareOnTelegram(text, url);
                break;
            case 'whatsapp':
                this.shareOnWhatsApp(text, url);
                break;
            case 'copy':
                this.copyLink(url);
                break;
            case 'native':
                this.nativeShare(text, url);
                break;
        }
    }

    // Share on Twitter/X
    shareOnTwitter(text, url, hashtags) {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    }

    // Share on Telegram
    shareOnTelegram(text, url) {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(telegramUrl, '_blank');
    }

    // Share on WhatsApp
    shareOnWhatsApp(text, url) {
        const message = `${text}\n\n${url}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Copy link to clipboard
    copyLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            if (window.notificationManager) {
                window.notificationManager.showInAppNotification('✅ Link copied to clipboard!', 'success');
            } else {
                alert('Link copied to clipboard!');
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback
            this.fallbackCopy(url);
        });
    }

    // Fallback copy method
    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            alert('Link copied to clipboard!');
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textarea);
    }

    // Native share API (mobile)
    async nativeShare(text, url) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'TimeLock Predictions',
                    text: text,
                    url: url
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Native share failed:', err);
                }
            }
        } else {
            // Fallback to copy
            this.copyLink(url);
        }
    }

    // Create share buttons for a prediction card
    createShareButtons(prediction) {
        const container = document.createElement('div');
        container.className = 'social-share-buttons';
        container.innerHTML = `
            <button class="share-btn share-twitter" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'twitter')" title="Share on X/Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            </button>
            <button class="share-btn share-telegram" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'telegram')" title="Share on Telegram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.98 1.26-5.58 3.7-.53.37-.99.55-1.39.54-.46-.01-1.34-.26-1.99-.47-.8-.26-1.44-.4-1.38-.85.03-.23.38-.47 1.04-.72 4.15-1.8 6.92-2.99 8.31-3.56 3.95-1.65 4.77-1.94 5.31-1.94.12 0 .38.03.55.17.14.12.18.28.2.44.02.12.03.28.01.43z"/>
                </svg>
            </button>
            <button class="share-btn share-whatsapp" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'whatsapp')" title="Share on WhatsApp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
            </button>
            <button class="share-btn share-copy" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'copy')" title="Copy Link">
                📋
            </button>
        `;
        return container;
    }

    // Add share button to prediction card
    addShareButtonToPrediction(predictionElement, prediction) {
        const shareButtons = this.createShareButtons(prediction);
        
        // Find a good place to insert (before actions or at the end)
        const actionsDiv = predictionElement.querySelector('.prediction-actions');
        if (actionsDiv) {
            actionsDiv.parentNode.insertBefore(shareButtons, actionsDiv);
        } else {
            predictionElement.appendChild(shareButtons);
        }
    }

    // Share user's achievement
    shareAchievement(achievement, stats) {
        const text = `🏆 I just unlocked "${achievement.title}" on TimeLock Predictions!\n\n${stats.wins} wins out of ${stats.total} predictions!\n\nJoin me in predicting the future on Stellar blockchain! 🔮`;
        const url = this.baseUrl;
        
        if (navigator.share) {
            this.nativeShare(text, url);
        } else {
            this.shareOnTwitter(text, url, 'Achievement,TimeLockPredictions');
        }
    }

    // Generate referral link
    generateReferralLink(userAddress) {
        const shortAddress = userAddress.slice(0, 8);
        return `${this.baseUrl}?ref=${shortAddress}`;
    }

    // Share referral link
    shareReferral(userAddress) {
        const referralLink = this.generateReferralLink(userAddress);
        const text = `🔮 Join me on TimeLock Predictions!\n\nMake predictions, stake XLM, and win rewards on Stellar blockchain!\n\nUse my referral link:`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Join TimeLock Predictions',
                text: `${text}\n${referralLink}`
            });
        } else {
            this.copyLink(referralLink);
        }
    }

    // Create social share modal
    showShareModal(prediction) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay share-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📤 Share Prediction</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="share-preview">
                        <h3>${prediction.question}</h3>
                        <p>Share this prediction with your network!</p>
                    </div>
                    <div class="share-options">
                        <button class="share-option-btn" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'twitter')">
                            <span class="share-icon">𝕏</span>
                            <span>Share on X</span>
                        </button>
                        <button class="share-option-btn" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'telegram')">
                            <span class="share-icon">✈️</span>
                            <span>Share on Telegram</span>
                        </button>
                        <button class="share-option-btn" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'whatsapp')">
                            <span class="share-icon">💬</span>
                            <span>Share on WhatsApp</span>
                        </button>
                        <button class="share-option-btn" onclick="socialManager.sharePrediction(${JSON.stringify(prediction).replace(/"/g, '&quot;')}, 'copy')">
                            <span class="share-icon">📋</span>
                            <span>Copy Link</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Create global social manager instance
window.socialManager = new SocialManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialManager;
}
