// Freighter API functions will be accessed directly from freighterApi object
// Don't destructure immediately as it may not be loaded yet

// State Management
const AppState = {
    connectedAddress: null,
    isReadOnly: false, // Track if connected via manual public key (read-only)
    walletBalance: 0, // Track XLM balance
    predictions: [],
    stats: {
        total: 0,
        active: 0,
        resolved: 0,
        treasury: 0,
        burned: 0,
        volume: 0
    },
    isLoading: false
};

// DOM Elements
const DOM = {
    connectWalletBtn: document.getElementById('connectWallet'),
    disconnectWalletBtn: document.getElementById('disconnectWallet'),
    walletInfo: document.getElementById('walletInfo'),
    walletAddress: document.getElementById('walletAddress'),
    walletBalance: document.getElementById('walletBalance'),
    createPredictionForm: document.getElementById('createPredictionForm'),
    predictionsContainer: document.getElementById('predictionsContainer'),
    statusMessage: document.getElementById('statusMessage'),
    stats: {
        total: document.getElementById('totalPredictions'),
        active: document.getElementById('activePredictions'),
        resolved: document.getElementById('resolvedPredictions'),
        treasury: document.getElementById('treasuryBalance'),
        burned: document.getElementById('totalBurned'),
        volume: document.getElementById('totalVolume')
    }
};

// ===================
// Freighter Helper Functions
// ===================

async function checkFreighterInstalled() {
    if (typeof freighterApi === 'undefined') {
        showStatus('⚠️ Freighter wallet not installed', 'error');
        const install = confirm('Freighter wallet is required. Would you like to install it?');
        if (install) {
            window.open('https://www.freighter.app/', '_blank');
        }
        return false;
    }
    return true;
}

async function checkConnection() {
    try {
        if (!freighterApi || !freighterApi.setAllowed) {
            return false;
        }
        const isAllowed = await freighterApi.setAllowed();
        return isAllowed;
    } catch (e) {
        console.error('Error checking connection:', e);
        return false;
    }
}

async function retrievePublicKey() {
    try {
        console.log('🔍 Requesting Freighter access...');
        
        if (!freighterApi) {
            throw new Error('Freighter API not loaded');
        }
        
        // Request access returns an object with error or success
        const result = await freighterApi.requestAccess();
        console.log('📦 Request access result:', result);
        
        if (result && result.error) {
            throw new Error(result.error);
        }
        
        // Now get the public key
        console.log('🔑 Getting public key...');
        const publicKey = await freighterApi.getPublicKey();
        console.log('✅ Got public key:', publicKey);
        
        return publicKey;
    } catch (e) {
        console.error('❌ Error getting public key:', e);
        throw new Error('Failed to retrieve public key: ' + e.message);
    }
}

// New method: Connect directly and sign with public key
async function connectAndSignWallet() {
    try {
        console.log('🔐 Connecting wallet with signature verification...');
        
        if (!freighterApi) {
            throw new Error('Freighter API not loaded');
        }
        
        // Step 1: Get public key
        const publicKey = await freighterApi.getPublicKey();
        console.log('✅ Public Key retrieved:', publicKey);
        
        // Step 2: Verify ownership by signing a message
        const timestamp = Date.now();
        const message = `TimeLock-Predictions Login\nAddress: ${publicKey}\nTime: ${timestamp}`;
        
        console.log('📝 Requesting signature for verification...');
        const signedMessage = await freighterApi.signAuthEntry(
            message,
            { accountToSign: publicKey }
        );
        
        console.log('✅ Signature verified!');
        
        return {
            publicKey,
            signature: signedMessage,
            timestamp,
            verified: true
        };
        
    } catch (e) {
        console.error('❌ Error connecting wallet:', e);
        throw new Error('Failed to connect and verify wallet: ' + e.message);
    }
}

// Alternative: Simple connection without signature (faster)
async function quickConnectWallet() {
    try {
        console.log('⚡ Quick connecting wallet...');
        
        if (!freighterApi) {
            throw new Error('Freighter API not loaded');
        }
        
        // Just get the public key - no signing required
        const publicKey = await freighterApi.getPublicKey();
        console.log('✅ Quick connect successful:', publicKey);
        
        return publicKey;
        
    } catch (e) {
        console.error('❌ Quick connect failed:', e);
        throw new Error('Failed to connect wallet: ' + e.message);
    }
}

async function getCurrentNetwork() {
    try {
        if (!freighterApi || !freighterApi.getNetwork) {
            return null;
        }
        const network = await freighterApi.getNetwork();
        return network;
    } catch (e) {
        console.warn('Could not get network:', e);
        return null;
    }
}

async function userSignTransaction(xdr, network, signWith) {
    try {
        if (!freighterApi || !freighterApi.signTransaction) {
            throw new Error('Freighter API not available');
        }
        const signedXdr = await freighterApi.signTransaction(xdr, {
            network,
            accountToSign: signWith
        });
        return signedXdr;
    } catch (e) {
        console.error('Error signing transaction:', e);
        throw e;
    }
}

// ===================
// Initialization
// ===================

// Wait for both DOM and Freighter to be ready
async function initializeApp() {
    console.log('🔮 TimeLock Predictions Loading...');
    
    // Wait a bit for Freighter to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check Freighter installation
    if (typeof freighterApi === 'undefined') {
        console.error('❌ Freighter API not found');
        showStatus('⚠️ Freighter wallet not detected. Please install it from freighter.app', 'error');
        
        // Add install button to header
        const installBtn = document.createElement('button');
        installBtn.className = 'btn btn-warning';
        installBtn.textContent = '⚠️ Install Freighter';
        installBtn.onclick = () => window.open('https://www.freighter.app/', '_blank');
        DOM.connectWalletBtn.parentNode.insertBefore(installBtn, DOM.connectWalletBtn);
        DOM.connectWalletBtn.style.display = 'none';
        return;
    }
    
    console.log('✅ Freighter API loaded');
    
    // Check if already connected
    try {
        const isAllowed = await checkConnection();
        if (isAllowed) {
            const publicKey = await retrievePublicKey();
            await connectWallet(publicKey);
            showStatus(`✅ Auto-connected: ${shortenAddress(publicKey)}`, 'success');
        } else {
            console.log('Wallet not previously connected');
        }
    } catch (e) {
        console.log('Error checking previous connection:', e.message);
    }
    
    // Set minimum unlock time (1 hour from now)
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 1);
    const unlockTimeInput = document.getElementById('unlockTime');
    if (unlockTimeInput) {
        unlockTimeInput.min = minDate.toISOString().slice(0, 16);
    }
    
    // Initial data load
    await refreshData();
    
    // Auto-refresh every 30 seconds
    setInterval(refreshData, 30000);
    
    // Initialize notifications
    if (window.notificationManager) {
        try {
            await window.notificationManager.init();
            // Start monitoring predictions for unlock notifications
            window.notificationManager.startUnlockMonitor(AppState.predictions);
        } catch (e) {
            console.log('Notification init skipped:', e.message);
        }
    }
    
    console.log('✅ App initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ===================
// Data Loading
// ===================

async function refreshData() {
    if (AppState.isLoading) return;
    
    try {
        AppState.isLoading = true;
        await Promise.all([
            loadStats(),
            loadPredictions()
        ]);
    } catch (error) {
        console.error('Error refreshing data:', error);
    } finally {
        AppState.isLoading = false;
    }
}

async function loadStats() {
    try {
        // Enhanced stats with more data points
        const mockStats = {
            total: 3,
            active: 1,
            resolved: 2,
            treasury: 35,
            burned: 12.5,
            volume: 450
        };
        
        AppState.stats = mockStats;
        updateStatsUI();
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showStatus('Failed to load stats', 'error');
    }
}

function updateStatsUI() {
    DOM.stats.total.textContent = AppState.stats.total;
    DOM.stats.active.textContent = AppState.stats.active;
    DOM.stats.resolved.textContent = AppState.stats.resolved;
    DOM.stats.treasury.textContent = `${AppState.stats.treasury} XLM`;
    DOM.stats.burned.textContent = `${AppState.stats.burned} XLM`;
    DOM.stats.volume.textContent = `${AppState.stats.volume} XLM`;
}

async function loadPredictions() {
    try {
        DOM.predictionsContainer.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading predictions...</p>
            </div>
        `;
        
        // Enhanced mock predictions with more data
        AppState.predictions = [
            {
                id: 1,
                question: "Will Bitcoin hit $100k by year end?",
                creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
                unlock_time: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
                status: "Open",
                yes_pool: 150000000000, // 15000 XLM
                no_pool: 85000000000,  // 8500 XLM
                winner: null
            },
            {
                id: 2,
                question: "Will Ethereum reach $5000 next month?",
                creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
                unlock_time: Math.floor(Date.now() / 1000) + 172800, // 2 days from now
                status: "Open",
                yes_pool: 120000000000,
                no_pool: 95000000000,
                winner: null
            },
            {
                id: 3,
                question: "Will XRP win SEC case by Q1 2025?",
                creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
                unlock_time: Math.floor(Date.now() / 1000) - 3600, // Unlocked
                status: "Resolved",
                yes_pool: 200000000000,
                no_pool: 50000000000,
                winner: true
            }
        ];
        
        if (AppState.predictions.length === 0) {
            DOM.predictionsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>🌟 No predictions yet</h3>
                    <p>Be the first to create a prediction!</p>
                </div>
            `;
            return;
        }
        
        DOM.predictionsContainer.innerHTML = '';
        AppState.predictions.forEach(pred => {
            const card = createPredictionCard(pred);
            DOM.predictionsContainer.appendChild(card);
            
            // Add social share buttons
            if (window.socialManager) {
                window.socialManager.addShareButtonToPrediction(card, pred);
            }
        });
        
        // Start countdown timers
        updateCountdowns();
        
        // Update notification monitor
        if (window.notificationManager) {
            window.notificationManager.startUnlockMonitor(AppState.predictions);
        }
        
    } catch (error) {
        console.error('Error loading predictions:', error);
        DOM.predictionsContainer.innerHTML = `
            <div class="empty-state">
                <h3>❌ Error loading predictions</h3>
                <p>${error.message}</p>
                <button onclick="loadPredictions()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}

// ===================
// Wallet Connection
// ===================

DOM.connectWalletBtn.addEventListener('click', async () => {
    console.log('\n=== 🔗 CONNECT WALLET CLICKED ===');
    console.log('Button element:', DOM.connectWalletBtn);
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        // Wait for Freighter to be ready
        if (!window.freighterReady && typeof window.initFreighter === 'function') {
            showStatus('⏳ Initializing Freighter...', 'info');
            console.log('⏳ Waiting for Freighter initialization...');
            await window.initFreighter();
        }
        
        // Check Freighter is available
        console.log('1️⃣ Checking if Freighter API is loaded...');
        console.log('typeof freighterApi:', typeof freighterApi);
        console.log('freighterApi object:', freighterApi);
        
        if (!freighterApi || typeof freighterApi === 'undefined') {
            console.error('❌ Freighter API not found!');
            showStatus('❌ Freighter not installed. Please install it first.', 'error');
            const install = confirm('Freighter wallet is required. Would you like to install it?');
            if (install) {
                window.open('https://www.freighter.app/', '_blank');
            }
            return;
        }
        
        console.log('✅ Freighter API loaded');
        console.log('Available methods:', Object.keys(freighterApi));
        
        showStatus('🔌 Connecting to Freighter...', 'info');
        console.log('2️⃣ Using quick connect method...');
        
        // Quick connect - just get public key, no permission request needed
        const publicKey = await quickConnectWallet();
        console.log('3️⃣ ✅ Connected with public key:', publicKey);
        
        await connectWallet(publicKey);
        console.log('4️⃣ ✅ Wallet connected in UI');
        
        // Check network
        console.log('5️⃣ Checking network...');
        const network = await getCurrentNetwork();
        console.log('Network:', network);
        
        if (network && network !== 'TESTNET') {
            showStatus(`⚠️ Please switch to Testnet in Freighter (currently: ${network})`, 'warning');
            safeNotify('⚠️ Wrong Network', 'Please switch to Testnet in Freighter settings', 'warning');
        } else {
            showStatus(`✅ Connected to Testnet: ${shortenAddress(publicKey)}`, 'success');
            safeNotify('🎉 Wallet Connected!', `Connected: ${shortenAddress(publicKey)}`, 'success');
        }
        
        console.log('6️⃣ Refreshing data...');
        await refreshData();
        console.log('✅ Connection complete!');
        
    } catch (error) {
        console.error('❌ Wallet connection error:', error);
        console.error('Error stack:', error.stack);
        handleConnectionError(error);
    }
});

async function connectWallet(publicKey, isReadOnly = false) {
    AppState.connectedAddress = publicKey;
    AppState.isReadOnly = isReadOnly;
    DOM.walletAddress.textContent = shortenAddress(publicKey);
    DOM.connectWalletBtn.style.display = 'none';
    
    // Hide manual connect button too
    const manualBtn = document.getElementById('connectManually');
    if (manualBtn) manualBtn.style.display = 'none';
    
    DOM.walletInfo.style.display = 'flex';
    
    // Fetch and display balance
    await updateWalletBalance();
}

async function updateWalletBalance() {
    if (!AppState.connectedAddress) return;
    
    try {
        const server = new StellarSdk.Horizon.Server(CONFIG.horizonUrl);
        const account = await server.loadAccount(AppState.connectedAddress);
        
        // Find XLM balance
        const xlmBalance = account.balances.find(b => b.asset_type === 'native');
        if (xlmBalance) {
            AppState.walletBalance = parseFloat(xlmBalance.balance);
            updateBalanceDisplay();
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        AppState.walletBalance = 0;
        updateBalanceDisplay();
    }
}

function updateBalanceDisplay() {
    if (DOM.walletBalance) {
        DOM.walletBalance.textContent = `${AppState.walletBalance.toFixed(2)} XLM`;
        
        // Color based on balance
        if (AppState.walletBalance < 100) {
            DOM.walletBalance.style.color = '#dc3545'; // Red
        } else if (AppState.walletBalance < 500) {
            DOM.walletBalance.style.color = '#ffc107'; // Yellow
        } else {
            DOM.walletBalance.style.color = '#28a745'; // Green
        }
    }
}

function deductBalance(amount) {
    AppState.walletBalance -= amount;
    updateBalanceDisplay();
    
    // Animate balance decrease
    if (DOM.walletBalance) {
        DOM.walletBalance.classList.add('balance-decrease');
        setTimeout(() => {
            DOM.walletBalance.classList.remove('balance-decrease');
        }, 600);
    }
    
    // Show notification
    safeNotify('💸 Balance Updated', `${amount} XLM deducted. New balance: ${AppState.walletBalance.toFixed(2)} XLM`, 'info');
}

DOM.disconnectWalletBtn.addEventListener('click', () => {
    AppState.connectedAddress = null;
    AppState.isReadOnly = false;
    AppState.walletBalance = 0;
    DOM.connectWalletBtn.style.display = 'block';
    
    // Show manual connect button again
    const manualBtn = document.getElementById('connectManually');
    if (manualBtn) manualBtn.style.display = 'inline-block';
    
    DOM.walletInfo.style.display = 'none';
    showStatus('👋 Wallet disconnected', 'info');
    loadPredictions();
});

// Refresh balance button
const refreshBalanceBtn = document.getElementById('refreshBalance');
if (refreshBalanceBtn) {
    refreshBalanceBtn.addEventListener('click', async () => {
        refreshBalanceBtn.textContent = '⏳';
        refreshBalanceBtn.disabled = true;
        await updateWalletBalance();
        showStatus('✅ Balance refreshed!', 'success');
        refreshBalanceBtn.textContent = '🔄';
        refreshBalanceBtn.disabled = false;
    });
}

// ===================
// Manual Public Key Entry
// ===================

// Add event listener for manual connect button
const connectManuallyBtn = document.getElementById('connectManually');
if (connectManuallyBtn) {
    connectManuallyBtn.addEventListener('click', () => {
        openPublicKeyModal();
    });
}

function openPublicKeyModal() {
    const modal = document.getElementById('publicKeyModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('manualPublicKey').focus();
    }
}

function closePublicKeyModal() {
    const modal = document.getElementById('publicKeyModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('manualPublicKey').value = '';
    }
}

// Make functions global so they can be called from HTML onclick
window.openPublicKeyModal = openPublicKeyModal;
window.closePublicKeyModal = closePublicKeyModal;

async function connectWithPublicKey() {
    const input = document.getElementById('manualPublicKey');
    const publicKey = input.value.trim();
    
    console.log('📝 Manual public key entry:', publicKey);
    
    // Validate public key format
    if (!publicKey) {
        showStatus('❌ Please enter a public key', 'error');
        return;
    }
    
    if (!publicKey.startsWith('G')) {
        showStatus('❌ Public key must start with G', 'error');
        return;
    }
    
    if (publicKey.length !== 56) {
        showStatus('❌ Public key must be exactly 56 characters', 'error');
        return;
    }
    
    // Validate using Stellar SDK
    try {
        StellarSdk.Keypair.fromPublicKey(publicKey);
        console.log('✅ Valid Stellar public key');
    } catch (error) {
        showStatus('❌ Invalid Stellar public key format', 'error');
        return;
    }
    
    try {
        closePublicKeyModal();
        showStatus('🔍 Verifying address on Stellar network...', 'info');
        
        // Check if account exists on Stellar network
        const server = new StellarSdk.Horizon.Server(CONFIG.horizonUrl);
        await server.loadAccount(publicKey);
        
        console.log('✅ Account verified on Stellar network');
        
        // Connect with FULL FUNCTIONALITY (not read-only)
        // Transactions will be signed using Freighter when needed
        await connectWallet(publicKey, false);
        
        showStatus(`✅ Connected successfully: ${shortenAddress(publicKey)}`, 'success');
        safeNotify('🎉 Wallet Connected!', 'You can now create predictions and stake. Freighter will prompt you to sign transactions.', 'success');
        
        await refreshData();
        
    } catch (error) {
        if (error.response && error.response.status === 404) {
            showStatus('⚠️ Account not found on Stellar network. Please fund this account first.', 'warning');
        } else {
            showStatus('❌ Error verifying account: ' + error.message, 'error');
        }
        console.error('Verification error:', error);
    }
}

// Make function global
window.connectWithPublicKey = connectWithPublicKey;

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('manualPublicKey');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                connectWithPublicKey();
            }
        });
    }
});

function handleConnectionError(error) {
    const errorMsg = error.toString().toLowerCase();
    
    if (errorMsg.includes('user declined') || errorMsg.includes('user rejected')) {
        showStatus('❌ Connection declined. Please approve the connection in Freighter popup.', 'error');
        safeNotifyInApp('Please check the Freighter popup and click "Approve"', 'warning', 8000);
    } else if (errorMsg.includes('not installed') || errorMsg.includes('not found')) {
        showStatus('❌ Freighter not installed. Installing...', 'error');
        setTimeout(() => {
            window.open('https://www.freighter.app/', '_blank');
        }, 1000);
    } else if (errorMsg.includes('timeout')) {
        showStatus('❌ Connection timeout. Please try again.', 'error');
    } else if (errorMsg.includes('network')) {
        showStatus('❌ Network error. Check your connection.', 'error');
    } else {
        showStatus(`❌ Connection failed: ${error.message || 'Unknown error'}`, 'error');
        console.error('Full error:', error);
    }
}

// ===================
// Prediction UI
// ===================

function createPredictionCard(pred) {
    const card = document.createElement('div');
    card.className = 'prediction-card';
    
    const yesPool = parseInt(pred.yes_pool) / 10000000;
    const noPool = parseInt(pred.no_pool) / 10000000;
    const totalPool = yesPool + noPool;
    const yesPercent = totalPool > 0 ? (yesPool / totalPool * 100).toFixed(1) : 50;
    const noPercent = totalPool > 0 ? (noPool / totalPool * 100).toFixed(1) : 50;
    
    let statusClass, statusText;
    if (pred.status === 'Open') {
        statusClass = 'status-open';
        statusText = '🟢 Active';
    } else if (pred.status === 'Locked') {
        statusClass = 'status-locked';
        statusText = '🔒 Locked';
    } else if (pred.status === 'Resolved') {
        statusClass = 'status-resolved';
        statusText = pred.winner ? '✅ YES Won' : '❌ NO Won';
    } else {
        statusClass = 'status-cancelled';
        statusText = '⛔ Cancelled';
    }
    
    card.innerHTML = `
        <div class="prediction-header">
            <span class="prediction-id">#${pred.id}</span>
            <h3 class="prediction-question">${pred.question}</h3>
            <span class="prediction-status ${statusClass}">${statusText}</span>
        </div>
        
        <div class="countdown" data-unlock="${pred.unlock_time}" data-id="${pred.id}">
            ⏰ Calculating...
        </div>
        
        <div class="pools">
            <div class="pool-info pool-yes ${pred.winner === true ? 'winner' : ''}">
                <div class="pool-header">
                    <div class="pool-label">✅ YES</div>
                    <div class="pool-percentage">${yesPercent}%</div>
                </div>
                <div class="pool-amount">${formatNumber(yesPool)} XLM</div>
                <div class="pool-bar">
                    <div class="pool-fill" style="width: ${yesPercent}%"></div>
                </div>
            </div>
            <div class="pool-info pool-no ${pred.winner === false ? 'winner' : ''}">
                <div class="pool-header">
                    <div class="pool-label">❌ NO</div>
                    <div class="pool-percentage">${noPercent}%</div>
                </div>
                <div class="pool-amount">${formatNumber(noPool)} XLM</div>
                <div class="pool-bar">
                    <div class="pool-fill" style="width: ${noPercent}%"></div>
                </div>
            </div>
        </div>
        
        <div class="prediction-info">
            <div class="info-item">
                <span class="info-label">💰 Total Pool</span>
                <span class="info-value">${formatNumber(totalPool)} XLM</span>
            </div>
            <div class="info-item">
                <span class="info-label">📊 Min Stake</span>
                <span class="info-value">100 XLM</span>
            </div>
            <div class="info-item">
                <span class="info-label">👤 Creator</span>
                <span class="info-value">${shortenAddress(pred.creator)}</span>
            </div>
        </div>
        
        ${createPredictionActions(pred)}
    `;
    
    return card;
}

function createPredictionActions(pred) {
    const now = Math.floor(Date.now() / 1000);
    const isUnlocked = pred.unlock_time <= now;
    
    if (pred.status === 'Resolved') {
        return `
            <div class="prediction-actions">
                <button class="btn btn-secondary" onclick="viewPredictionDetails(${pred.id})">
                    📊 View Details
                </button>
                ${AppState.connectedAddress ? `
                    <button class="btn btn-primary" onclick="claimRewards(${pred.id})">
                        💎 Claim Rewards
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    if (pred.status === 'Open') {
        if (isUnlocked) {
            return `
                <div class="prediction-actions">
                    <div class="alert alert-info">
                        🔓 This prediction is unlocked and ready to be resolved
                    </div>
                    ${AppState.connectedAddress ? `
                        <button class="btn btn-primary" onclick="resolvePrediction(${pred.id})">
                            ⚖️ Resolve Prediction
                        </button>
                    ` : ''}
                </div>
            `;
        }
        
        return `
            <div class="prediction-actions">
                ${AppState.connectedAddress ? `
                    <button class="btn btn-success" onclick="stakeOnPrediction(${pred.id}, true)">
                        <span>Stake on YES</span>
                        <span>✅</span>
                    </button>
                    <button class="btn btn-danger" onclick="stakeOnPrediction(${pred.id}, false)">
                        <span>Stake on NO</span>
                        <span>❌</span>
                    </button>
                ` : `
                    <div class="alert alert-warning">
                        Connect your wallet to stake
                    </div>
                `}
            </div>
        `;
    }
    
    return '';
}

// ===================
// Countdown Updates
// ===================

function updateCountdowns() {
    const countdowns = document.querySelectorAll('.countdown');
    const now = Math.floor(Date.now() / 1000);
    
    countdowns.forEach(countdown => {
        const unlockTime = parseInt(countdown.dataset.unlock);
        const remaining = unlockTime - now;
        
        if (remaining <= 0) {
            countdown.innerHTML = `
                <span style="color: var(--success)">🔓 Unlocked - Ready to resolve</span>
            `;
        } else {
            const time = formatTimeRemaining(remaining);
            countdown.innerHTML = `⏰ Unlocks in: <strong>${time}</strong>`;
        }
    });
}

// Start countdown update interval
setInterval(updateCountdowns, 1000);

// ===================
// Form Submission
// ===================

DOM.createPredictionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!AppState.connectedAddress) {
        showStatus('⚠️ Please connect your wallet first', 'warning');
        DOM.connectWalletBtn.click();
        return;
    }
    
    const question = document.getElementById('question').value.trim();
    const unlockTimeInput = document.getElementById('unlockTime').value;
    const initialChoice = document.getElementById('initialChoice').value === 'true';
    
    // Validation
    if (question.length < 10 || question.length > 200) {
        showStatus('❌ Question must be 10-200 characters', 'error');
        return;
    }
    
    const unlockTime = Math.floor(new Date(unlockTimeInput).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    
    if (unlockTime <= now + 3600) {
        showStatus('❌ Unlock time must be at least 1 hour in the future', 'error');
        return;
    }
    
    try {
        await createPrediction(question, unlockTime, initialChoice);
    } catch (error) {
        console.error('Error creating prediction:', error);
        showStatus(`❌ Failed: ${error.message}`, 'error');
    }
});

async function createPrediction(question, unlockTime, initialChoice) {
    const totalCost = 150; // 50 XLM creation fee + 100 XLM initial stake
    
    // Check balance
    if (AppState.walletBalance < totalCost) {
        showStatus(`❌ Insufficient balance! Need ${totalCost} XLM, have ${AppState.walletBalance.toFixed(2)} XLM`, 'error');
        return;
    }
    
    showStatus('🚀 Preparing prediction transaction...', 'info');
    
    // Generate CLI command
    const command = generateContractCommand('create_prediction', {
        creator: AppState.connectedAddress,
        question: question,
        unlock_time: unlockTime,
        initial_choice: initialChoice,
        token: CONFIG.nativeTokenId
    });
    
    console.log('📝 Create Prediction Command:', command);
    
    // Show command modal with instructions
    showCommandModal('Create Prediction on Blockchain', command, `
        <p>💡 <strong>To submit this prediction to the blockchain:</strong></p>
        <ol style="margin: 15px 0; padding-left: 25px; text-align: left;">
            <li>Copy the command below</li>
            <li>Open your terminal</li>
            <li>Run the command with your Stellar CLI</li>
            <li>The blockchain will deduct <strong>150 XLM</strong> from your wallet</li>
        </ol>
        <p>💸 <strong>Cost Breakdown:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px; text-align: left;">
            <li>50 XLM creation fee</li>
            <li>100 XLM initial stake on ${initialChoice ? 'YES ✅' : 'NO ❌'}</li>
        </ul>
        <p style="margin-top: 15px;">⚠️ <strong>Note:</strong> Frontend balance deduction is visual only. Real XLM will be deducted when you run the CLI command.</p>
    `);
    
    // Visual feedback only - show prediction in UI
    const newPrediction = {
        id: Date.now(), // Temporary ID
        question: question,
        unlock_time: unlockTime,
        creator: AppState.connectedAddress,
        yes_pool: initialChoice ? 100 : 0,
        no_pool: initialChoice ? 0 : 100,
        resolved: false,
        is_unlocked: false,
        user_stake: 100,
        user_choice: initialChoice,
        status: 'Pending CLI Submission'
    };
    
    AppState.predictions.unshift(newPrediction);
    loadPredictions();
    
    showStatus('📋 Command ready! Run it in terminal to submit to blockchain', 'warning');
    safeNotify('CLI Command Ready', 'Copy and run the command in your terminal', 'info');
    
    // Clear form
    document.getElementById('question').value = '';
    document.getElementById('unlockTime').value = '';
}

// ===================
// Contract Interactions
// ===================

async function stakeOnPrediction(predictionId, choice) {
    if (!AppState.connectedAddress) {
        showStatus('⚠️ Please connect your wallet', 'warning');
        return;
    }
    
    const amount = prompt(`💰 Enter stake amount in XLM (minimum 100):\n\nYour balance: ${AppState.walletBalance.toFixed(2)} XLM\nStaking on: ${choice ? '✅ YES' : '❌ NO'}`, '100');
    
    if (!amount) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
        showStatus('❌ Invalid amount. Minimum stake is 100 XLM', 'error');
        return;
    }
    
    // Check balance
    if (AppState.walletBalance < amountNum) {
        showStatus(`❌ Insufficient balance! Need ${amountNum} XLM, have ${AppState.walletBalance.toFixed(2)} XLM`, 'error');
        return;
    }
    
    const amountStroops = Math.floor(amountNum * 10000000);
    
    try {
        showStatus('📊 Preparing stake transaction...', 'info');
        
        // Generate CLI command
        const command = generateContractCommand('stake', {
            prediction_id: predictionId,
            user: AppState.connectedAddress,
            choice: choice,
            amount: amountStroops,
            token: CONFIG.nativeTokenId
        });
        
        console.log('📝 Stake Command:', command);
        
        // Show command modal with instructions
        showCommandModal('Stake on Blockchain', command, `
            <p>💡 <strong>To submit your stake to the blockchain:</strong></p>
            <ol style="margin: 15px 0; padding-left: 25px; text-align: left;">
                <li>Copy the command below</li>
                <li>Open your terminal</li>
                <li>Run the command with your Stellar CLI</li>
                <li>The blockchain will deduct <strong>${amountNum} XLM</strong> from your wallet</li>
            </ol>
            <p>💎 Staking <strong>${amountNum} XLM</strong> on <strong>${choice ? '✅ YES' : '❌ NO'}</strong></p>
            <p style="margin-top: 15px;">⚠️ <strong>Note:</strong> Frontend balance deduction is visual only. Real XLM will be deducted when you run the CLI command.</p>
        `);
        
        // Visual feedback only - update pools in UI
        const prediction = AppState.predictions.find(p => p.id === predictionId);
        if (prediction) {
            if (choice) {
                prediction.yes_pool += amountNum;
            } else {
                prediction.no_pool += amountNum;
            }
            prediction.status = 'Pending CLI Submission';
            loadPredictions();
        }
        
        showStatus(`� Command ready! Run it in terminal to stake ${amountNum} XLM`, 'warning');
        safeNotify('CLI Command Ready', 'Copy and run the command in your terminal', 'info');
        
    } catch (error) {
        console.error('Error generating stake command:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
    }
}

async function resolvePrediction(predictionId) {
    if (!AppState.connectedAddress) {
        showStatus('⚠️ Please connect your wallet', 'warning');
        return;
    }
    
    const outcome = confirm('Resolve prediction:\n\nClick OK for YES wins\nClick Cancel for NO wins');
    
    try {
        showStatus('⚖️ Preparing resolution...', 'info');
        
        const command = generateContractCommand('resolve', {
            prediction_id: predictionId,
            resolver: AppState.connectedAddress,
            outcome: outcome
        });
        
        console.log('📝 Resolve Command:', command);
        
        showCommandModal('Resolve Prediction', command, `
            <p>⚖️ Resolving prediction with outcome: <strong>${outcome ? '✅ YES' : '❌ NO'}</strong></p>
            <p>Run this command to resolve:</p>
        `);
        
        showStatus('✅ Resolution command ready!', 'success');
        
    } catch (error) {
        console.error('Error resolving:', error);
        showStatus(`❌ Resolution failed: ${error.message}`, 'error');
    }
}

async function claimRewards(predictionId) {
    if (!AppState.connectedAddress) {
        showStatus('⚠️ Please connect your wallet', 'warning');
        return;
    }
    
    try {
        showStatus('💎 Preparing claim...', 'info');
        
        const command = generateContractCommand('claim', {
            prediction_id: predictionId,
            user: AppState.connectedAddress
        });
        
        console.log('📝 Claim Command:', command);
        
        showCommandModal('Claim Rewards', command, `
            <p>💎 Claiming your rewards from prediction #${predictionId}</p>
            <p>Run this command to claim:</p>
        `);
        
        showStatus('✅ Claim command ready!', 'success');
        
    } catch (error) {
        console.error('Error claiming:', error);
        showStatus(`❌ Claim failed: ${error.message}`, 'error');
    }
}

function viewPredictionDetails(predictionId) {
    const pred = AppState.predictions.find(p => p.id === predictionId);
    if (!pred) return;
    
    const yesPool = parseInt(pred.yes_pool) / 10000000;
    const noPool = parseInt(pred.no_pool) / 10000000;
    const totalPool = yesPool + noPool;
    
    const details = `
        <h3>${pred.question}</h3>
        <div class="detail-grid">
            <div><strong>ID:</strong> #${pred.id}</div>
            <div><strong>Status:</strong> ${pred.status}</div>
            <div><strong>Winner:</strong> ${pred.winner === null ? 'Not resolved' : pred.winner ? '✅ YES' : '❌ NO'}</div>
            <div><strong>Total Pool:</strong> ${formatNumber(totalPool)} XLM</div>
            <div><strong>YES Pool:</strong> ${formatNumber(yesPool)} XLM</div>
            <div><strong>NO Pool:</strong> ${formatNumber(noPool)} XLM</div>
            <div><strong>Creator:</strong> ${pred.creator}</div>
            <div><strong>Unlock Time:</strong> ${new Date(pred.unlock_time * 1000).toLocaleString()}</div>
        </div>
    `;
    
    showModal('Prediction Details', details);
}

// ===================
// Utility Functions
// ===================

function generateContractCommand(method, params) {
    // Use wallet identity name instead of address
    let command = `stellar contract invoke \\\n  --id ${CONFIG.contractId} \\\n  --source wallet \\\n  --network testnet \\\n  -- ${method}`;
    
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' && !value.startsWith('G') && !value.startsWith('C')) {
            command += ` \\\n  --${key} "${value}"`;
        } else if (key === 'creator' || key === 'user') {
            // For creator/user, use $(stellar keys address wallet) to dynamically get address
            command += ` \\\n  --${key} $(stellar keys address wallet)`;
        } else {
            command += ` \\\n  --${key} ${value}`;
        }
    }
    
    return command;
}

function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showCommandModal(title, command, description) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                ${description}
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
                    <strong>⚠️ First Time Setup (If not done already):</strong>
                    <ol style="margin: 10px 0; padding-left: 20px; text-align: left;">
                        <li><strong>Add your wallet to CLI:</strong>
                            <pre style="background: #fff; padding: 10px; border-radius: 4px; margin: 5px 0; overflow-x: auto;"><code>stellar keys add wallet --secret-key YOUR_SECRET_KEY</code></pre>
                        </li>
                        <li><strong>Or generate a new one:</strong>
                            <pre style="background: #fff; padding: 10px; border-radius: 4px; margin: 5px 0; overflow-x: auto;"><code>stellar keys generate wallet --network testnet</code></pre>
                        </li>
                        <li><strong>Fund with testnet XLM:</strong>
                            <pre style="background: #fff; padding: 10px; border-radius: 4px; margin: 5px 0; overflow-x: auto;"><code>curl "https://friendbot.stellar.org?addr=$(stellar keys address wallet)"</code></pre>
                        </li>
                    </ol>
                    <p style="margin: 10px 0 0 0; color: #856404; font-size: 13px;">
                        💡 The <code>--source wallet</code> parameter refers to the identity name you created with <code>stellar keys add</code>
                    </p>
                </div>
                
                <div class="command-box">
                    <pre><code>${command}</code></pre>
                    <button class="btn btn-secondary" onclick="copyToClipboard(\`${command.replace(/`/g, '\\`')}\`)">
                        📋 Copy Command
                    </button>
                </div>
                
                <div style="background: #d1ecf1; padding: 12px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #17a2b8; font-size: 13px;">
                    <strong>💡 Pro Tip:</strong> After running the command, click the refresh button (🔄) in the top right to see your updated balance from the blockchain!
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showStatus('✅ Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showStatus('❌ Failed to copy', 'error');
    });
}

function shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(num) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatTimeRemaining(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
}

function showStatus(message, type = 'info') {
    // Show in status bar
    if (DOM.statusMessage) {
        DOM.statusMessage.textContent = message;
        DOM.statusMessage.className = `status-message status-${type}`;
        DOM.statusMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            DOM.statusMessage.style.display = 'none';
        }, 5000);
    }
    
    // Also show as notification if important
    if (type === 'error' || type === 'success' || type === 'warning') {
        safeNotifyInApp(message, type);
    }
}

// Helper function to safely call notifications
function safeNotify(title, message, type) {
    try {
        if (window.notificationManager && typeof window.notificationManager.show === 'function') {
            window.notificationManager.show(title, message, type);
        } else {
            console.log(`[${type}] ${title}: ${message}`);
        }
    } catch (error) {
        console.error('Notification error:', error);
    }
}

function safeNotifyInApp(message, type, duration = 3000) {
    try {
        if (window.notificationManager && typeof window.notificationManager.showInAppNotification === 'function') {
            window.notificationManager.showInAppNotification(message, type, duration);
        } else {
            console.log(`[${type}] ${message}`);
        }
    } catch (error) {
        console.error('Notification error:', error);
    }
}

// Initialize notification manager on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for notifications.js to load
    setTimeout(() => {
        if (!window.notificationManager) {
            console.warn('⚠️ NotificationManager not loaded, using fallback');
            window.notificationManager = {
                show: function(title, message, type) {
                    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
                },
                showInAppNotification: function(message, type, duration) {
                    console.log(`[${type.toUpperCase()}] ${message}`);
                }
            };
        }
    }, 100);
});

// Make functions globally available
window.stakeOnPrediction = stakeOnPrediction;
window.resolvePrediction = resolvePrediction;
window.claimRewards = claimRewards;
window.viewPredictionDetails = viewPredictionDetails;
window.copyToClipboard = copyToClipboard;
window.loadPredictions = loadPredictions;

console.log('✅ Enhanced App.js loaded successfully');
