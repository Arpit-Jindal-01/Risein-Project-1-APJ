// Freighter API functions will be accessed directly from freighterApi object
// Don't destructure immediately as it may not be loaded yet

// State Management
const AppState = {
    connectedAddress: null,
    isReadOnly: false, // Track if connected via manual public key (read-only)
    walletBalance: 0, // Track XLM balance
    predictions: [],
    localPredictions: [], // Store locally created predictions
    // Local/demo staking state (for presentation/video when contract stake() is broken)
    stakes: {}, // { predictionId: [ { user, choice, amount } ] }
    rewards: {}, // { address: amount }
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

// Make AppState globally accessible
window.AppState = AppState;

// Load local predictions from localStorage on startup
try {
    const savedPredictions = localStorage.getItem('localPredictions');
    if (savedPredictions) {
        AppState.localPredictions = JSON.parse(savedPredictions);
        console.log(`📦 Loaded ${AppState.localPredictions.length} predictions from localStorage`);
    }
} catch (error) {
    console.error('Error loading from localStorage:', error);
}

// Save local predictions to localStorage whenever they change
function saveLocalPredictions() {
    try {
        localStorage.setItem('localPredictions', JSON.stringify(AppState.localPredictions));
        console.log('💾 Saved predictions to localStorage');
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}
window.saveLocalPredictions = saveLocalPredictions;

// Persist local stakes and rewards for demo mode
function loadLocalStakes() {
    try {
        const raw = localStorage.getItem('localStakes');
        if (raw) {
            AppState.stakes = JSON.parse(raw) || {};
            console.log('📦 Loaded local stakes from storage');
        }
    } catch (e) {
        console.error('Error loading local stakes:', e);
    }
}

function saveLocalStakes() {
    try {
        localStorage.setItem('localStakes', JSON.stringify(AppState.stakes || {}));
        console.log('💾 Saved local stakes to storage');
    } catch (e) {
        console.error('Error saving local stakes:', e);
    }
}

function loadLocalRewards() {
    try {
        const raw = localStorage.getItem('localRewards');
        if (raw) {
            AppState.rewards = JSON.parse(raw) || {};
            console.log('📦 Loaded local rewards from storage');
        }
    } catch (e) {
        console.error('Error loading local rewards:', e);
    }
}

function saveLocalRewards() {
    try {
        localStorage.setItem('localRewards', JSON.stringify(AppState.rewards || {}));
        console.log('💾 Saved local rewards to storage');
    } catch (e) {
        console.error('Error saving local rewards:', e);
    }
}

// Load stakes/rewards on startup
try {
    loadLocalStakes();
    loadLocalRewards();
} catch (e) {
    console.log('No local stakes/rewards found (first run)');
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

// Load real predictions from blockchain
async function loadRealPredictions() {
    try {
        console.log('📡 Fetching predictions from blockchain...');
        console.log('⚠️ NOTE: Contract get_prediction() has a panic issue');
        console.log('💡 Loading existing blockchain predictions + new local ones...\n');
        
        // Load the existing blockchain predictions we know about
        const blockchainPredictions = [
            {
                id: 1,
                question: "Will Bitcoin hit $100k by year end?",
                creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
                unlock_time: 1762075165,
                status: "Open",
                yes_pool: 1000000000,
                no_pool: 0,
                winner: null
            },
            {
                id: 2,
                question: "Will Ethereum reach $5000 USD in 2025?",
                creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
                unlock_time: 1762085070,
                status: "Open",
                yes_pool: 0,
                no_pool: 1000000000,
                winner: null
            },
            {
                id: 3,
                question: "Will Bitcoin hit 100k by 2025?",
                creator: "GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ",
                unlock_time: 1762361461,
                status: "Open",
                yes_pool: 1000000000,
                no_pool: 0,
                winner: null
            },
            {
                id: 4,
                question: "will bitcoin hit $100k in 2025?",
                creator: "GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ",
                unlock_time: 1763744400,
                status: "Open",
                yes_pool: 0,
                no_pool: 1000000000,
                winner: null
            }
        ];
        
        console.log(`✅ Loaded ${blockchainPredictions.length} blockchain predictions`);
        
        // Load locally created predictions from localStorage
        let localPredictions = [];
        try {
            const stored = localStorage.getItem('localPredictions');
            if (stored) {
                localPredictions = JSON.parse(stored);
                console.log(`📦 Found ${localPredictions.length} locally stored predictions`);
                localPredictions.forEach((p, i) => {
                    console.log(`   ${i + 1}. "${p.question}" (created locally)`);
                });
            }
        } catch (e) {
            console.warn('Could not load localStorage predictions:', e);
        }
        
        // Also check AppState
        if (AppState.localPredictions && AppState.localPredictions.length > 0) {
            console.log(`📦 Found ${AppState.localPredictions.length} predictions in AppState`);
            // Merge with localStorage (avoid duplicates)
            AppState.localPredictions.forEach(local => {
                if (!localPredictions.some(p => p.id === local.id)) {
                    localPredictions.push(local);
                }
            });
        }
        
        // Combine: NEW PREDICTIONS FIRST, then blockchain predictions
        const allPredictions = [...localPredictions, ...blockchainPredictions];
        
        console.log(`\n📊 TOTAL: ${allPredictions.length} predictions to display`);
        console.log(`   ${localPredictions.length} newly created (shown first)`);
        console.log(`   ${blockchainPredictions.length} from blockchain`);
        
        // Log each prediction that will be shown
        console.log('\n📋 PREDICTIONS THAT WILL BE SHOWN:');
        allPredictions.forEach((pred, i) => {
            const badge = pred.isLocal ? '🆕 NEW' : '⛓️ BLOCKCHAIN';
            console.log(`   ${i + 1}. ${badge} ID:${pred.id} - "${pred.question}"`);
        });
        console.log('\n');
        
        return allPredictions;
        
    } catch (error) {
        console.error('❌ Error loading predictions:', error);
        return null;
    }
}

async function loadPredictions() {
    try {
        console.log('\n\n🔄🔄🔄 LOAD PREDICTIONS CALLED! 🔄🔄🔄\n');
        
        DOM.predictionsContainer.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading your predictions...</p>
            </div>
        `;
        
        // SIMPLE APPROACH: Just load from localStorage and show them!
        console.log('='.repeat(60));
        console.log('LOADING ALL PREDICTIONS');
        console.log('='.repeat(60));
        
        let allPredictions = [];
        
        // 1. Get from localStorage (YOUR created predictions)
        const storedData = localStorage.getItem('localPredictions');
        console.log('📦 localStorage raw data:', storedData);
        
        if (storedData && storedData !== '[]') {
            try {
                const localPreds = JSON.parse(storedData);
                console.log(`✅✅✅ FOUND ${localPreds.length} PREDICTIONS IN LOCALSTORAGE! ✅✅✅`);
                localPreds.forEach((p, i) => {
                    console.log(`   ${i + 1}. "${p.question}"`);
                });
                // Add all localStorage predictions
                allPredictions = [...localPreds];
            } catch (e) {
                console.error('❌ Error parsing localStorage:', e);
            }
        }
        
        // 2. Add the hardcoded blockchain predictions (existing ones)
        const blockchainPredictions = [
            {
                id: 1,
                question: "Will Bitcoin hit $100k by year end?",
                creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
                unlock_time: 1762075165,
                status: "Open",
                yes_pool: 1000000000,
                no_pool: 0,
                winner: null
            },
            {
                id: 2,
                question: "Will Ethereum reach $5000 USD in 2025?",
                creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
                unlock_time: 1762085070,
                status: "Open",
                yes_pool: 0,
                no_pool: 1000000000,
                winner: null
            },
            {
                id: 3,
                question: "Will Bitcoin hit 100k by 2025?",
                creator: "GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ",
                unlock_time: 1762361461,
                status: "Open",
                yes_pool: 1000000000,
                no_pool: 0,
                winner: null
            },
            {
                id: 4,
                question: "will bitcoin hit $100k in 2025?",
                creator: "GCTNWYVQVR6KHQARNDFPNKUB24N4PAGCZ3MOB3FYRE66GOE3TG52PRIJ",
                unlock_time: 1763744400,
                status: "Open",
                yes_pool: 0,
                no_pool: 1000000000,
                winner: null
            }
        ];
        
        // Add blockchain predictions (avoid duplicates)
        blockchainPredictions.forEach(bPred => {
            const exists = allPredictions.some(p => p.id === bPred.id);
            if (!exists) {
                allPredictions.push(bPred);
            }
        });
        
        console.log(`\n📊 TOTAL: ${allPredictions.length} predictions to display`);
        
        // NOW DISPLAY THEM ALL
        if (allPredictions.length > 0) {
            console.log('🎨 Rendering predictions...');
            
            AppState.predictions = allPredictions;
            DOM.predictionsContainer.innerHTML = '';
            
            // Check for YOUR predictions
            const yourPredictions = allPredictions.filter(p => p.isLocal === true);
            if (yourPredictions.length > 0) {
                console.log(`🆕 YOU HAVE ${yourPredictions.length} CREATED PREDICTIONS!`);
                
                const banner = document.createElement('div');
                banner.style.cssText = 'background: linear-gradient(135deg, #10b981, #059669); padding: 25px; border-radius: 15px; margin-bottom: 30px; color: white; text-align: center; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);';
                banner.innerHTML = `
                    <h3 style="margin: 0 0 10px 0; font-size: 1.8em;">🎉 YOUR CREATED PREDICTIONS (${yourPredictions.length})</h3>
                    <p style="margin: 0; opacity: 0.95; font-size: 1.1em;">These predictions were created by YOU!</p>
                `;
                DOM.predictionsContainer.appendChild(banner);
            }
            
            // Render each prediction card
            allPredictions.forEach((pred, index) => {
                console.log(`   ${index + 1}. Creating card for "${pred.question.substring(0, 40)}..."`);
                const card = createPredictionCard(pred);
                DOM.predictionsContainer.appendChild(card);
                
                if (window.socialManager) {
                    window.socialManager.addShareButtonToPrediction(card, pred);
                }
            });
            
            console.log(`✅ Successfully rendered ${allPredictions.length} predictions!`);
            showStatus(`Showing ${allPredictions.length} predictions`, 'success');
        } else {
            console.log('⚠️ No predictions found');
            DOM.predictionsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No predictions yet. Create your first one!</p>';
        }
        
        // Update countdown timers
        updateCountdowns();
        
        // Update notification monitor
        if (window.notificationManager) {
            window.notificationManager.startUnlockMonitor(allPredictions);
        }
        
    } catch (error) {
        console.error('❌ Error loading predictions:', error);
        DOM.predictionsContainer.innerHTML = `
            <div class="empty-state">
                <h3>❌ Error loading predictions</h3>
                <p>${error.message}</p>
                <button onclick="loadPredictions()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}

// OLD FUNCTION - NOT USED ANYMORE
function OLD_loadRealPredictions_DEPRECATED() {
    // This function is deprecated and replaced by simplified logic in loadPredictions()
    console.warn('⚠️ OLD loadRealPredictions function called - should not happen');
    return [];
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
    
    // Save to localStorage for My Predictions page
    localStorage.setItem('connectedWallet', publicKey);
    console.log('💾 Saved wallet to localStorage:', publicKey);
    
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
    
    // Remove from localStorage
    localStorage.removeItem('connectedWallet');
    console.log('🗑️ Removed wallet from localStorage');
    
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
    
    // Add local indicator if prediction is locally created
    const localBadge = pred.isLocal ? 
        '<div style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; text-align: center; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.5); animation: pulse 2s infinite;">🆕 JUST CREATED - Pending Blockchain Confirmation</div>' : '';

    // Transaction link (if available)
    const txSection = pred.txHash ? `<div style="margin-top:8px;font-size:0.85em;color:#555;display:flex;gap:8px;align-items:center;">
            <div>Tx:</div>
            <div><a href=\"https://explorer.stellar.org/tx/${pred.txHash}?network=test\" target=\"_blank\" style=\"color:#2563eb; font-weight:600;\">${pred.txHash.slice(0,8)}...${pred.txHash.slice(-6)}</a></div>
            <button class=\"btn btn-sm\" onclick=\"copyToClipboard('${pred.txHash}')\">📋</button>
        </div>` : '';
    
    card.innerHTML = `
        ${localBadge}
        <div class="prediction-header">
            <span class="prediction-id">#${pred.id}</span>
            <h3 class="prediction-question">${pred.question}</h3>
            ${txSection}
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
        
        console.log(`✅ Creating prediction display for #${pred.id}, connected: ${!!AppState.connectedAddress}`);
        return `
            <div class="prediction-actions">
                <div class="alert alert-info" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; padding: 15px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 8px;">
                        💎 Current Pools
                    </div>
                    <div style="display: flex; justify-content: space-around; margin-top: 10px;">
                        <div>
                            <span style="color: #10b981; font-weight: bold; font-size: 1.1em;">✅ YES: ${((pred.yes_pool || 0) / 10000000).toFixed(1)} XLM</span>
                        </div>
                        <div>
                            <span style="color: #ef4444; font-weight: bold; font-size: 1.1em;">❌ NO: ${((pred.no_pool || 0) / 10000000).toFixed(1)} XLM</span>
                        </div>
                    </div>
                    <div style="margin-top: 12px; font-size: 0.9em; color: #1e40af;">
                        📊 Initial stakes locked in prediction
                    </div>
                </div>
                ${AppState.connectedAddress ? `
                    <div style="display:flex; gap:10px; margin-top:12px; justify-content:center;">
                        <button class="btn btn-success" onclick="window.stakeOnPrediction(${pred.id}, true); console.log('✅ YES button clicked!');" style="cursor:pointer;">✅ Stake YES</button>
                        <button class="btn btn-danger" onclick="window.stakeOnPrediction(${pred.id}, false); console.log('❌ NO button clicked!');" style="cursor:pointer;">❌ Stake NO</button>
                    </div>
                ` : `
                    <div style="text-align:center; margin-top:12px; padding:10px; background:#fff3cd; border-radius:8px;">
                        <p style="margin:0; color:#856404;">⚠️ Connect wallet to stake</p>
                    </div>
                `}
                ${pred.isLocal && AppState.connectedAddress ? `
                    <div style="text-align:center; margin-top:10px;">
                        <button class="btn btn-warning" onclick="resolvePrediction(${pred.id})">⚖️ Resolve (Demo)</button>
                    </div>
                ` : ''}
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
    
    try {
        showStatus('🚀 Creating prediction on blockchain...', 'info');
        safeNotify('Creating Prediction', 'Please approve the transaction in Freighter', 'info');
        
        // Use direct blockchain integration - NO TERMINAL NEEDED!
        const result = await window.blockchainIntegration.createPrediction(
            question,
            unlockTime,
            initialChoice
        );
        
        console.log('✅ Prediction created successfully:', result);
        
        // Update balance after successful transaction
        setTimeout(() => {
            fetchWalletBalance(AppState.connectedAddress);
        }, 2000);
        
        // Clear form
        document.getElementById('question').value = '';
        document.getElementById('unlockTime').value = '';
        
        // Show success with celebration
        showStatus('🎉 Prediction created successfully on blockchain!', 'success');
        safeNotify('Success!', 'Your prediction is now on the blockchain', 'success');
        
        // IMMEDIATELY reload predictions - NO DELAY!
        console.log('🔄 Reloading predictions NOW to show your new prediction...');
        console.log('📦 Current localStorage:', localStorage.getItem('localPredictions'));
        console.log('📦 Current AppState.localPredictions:', AppState.localPredictions);
        
        // Force immediate reload
        await loadPredictions();
        
        // Show alert to confirm
        setTimeout(() => {
            alert('✅ Prediction Created!\n\nScroll down to see it in "Active Predictions" section.\n\nYour new prediction is at the TOP of the list with a green "JUST CREATED" badge!');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error creating prediction:', error);
        
        // User-friendly error messages
        let errorMsg = error.message;
        if (errorMsg.includes('User rejected')) {
            errorMsg = 'Transaction cancelled by user';
        } else if (errorMsg.includes('insufficient')) {
            errorMsg = 'Insufficient XLM balance';
        } else if (errorMsg.includes('Freighter')) {
            errorMsg = 'Please install and unlock Freighter wallet';
        }
        
        showStatus(`❌ Failed: ${errorMsg}`, 'error');
        safeNotify('Transaction Failed', errorMsg, 'error');
        throw error;
    }
}

// ===================
// Contract Interactions
// ===================

async function stakeOnPrediction(predictionId, choice) {
    console.log('\n🎲 ========== STAKE BUTTON CLICKED! ==========');
    console.log(`   Prediction ID: ${predictionId}`);
    console.log(`   Choice: ${choice ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Connected Address: ${AppState.connectedAddress}`);
    console.log(`   Wallet Balance: ${AppState.walletBalance} XLM`);
    console.log('============================================\n');

    if (!AppState.connectedAddress) {
        alert('⚠️ Please connect your wallet first!');
        showStatus('⚠️ Please connect your wallet', 'warning');
        return;
    }

    const amount = prompt(`💰 Enter stake amount in XLM (minimum 100):\n\nYour balance: ${AppState.walletBalance.toFixed(2)} XLM\nStaking on: ${choice ? '✅ YES' : '❌ NO'}`, '100');
    if (!amount) {
        console.log('❌ User cancelled');
        return;
    }

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

    // Find prediction in memory
    const pred = AppState.predictions.find(p => p.id === predictionId);
    // If the prediction is locally created, simulate staking locally so video/demo shows full flow
    if (pred && pred.isLocal) {
        try {
            // Deduct from local wallet balance immediately for demo
            AppState.walletBalance = Math.max(0, AppState.walletBalance - amountNum);
            updateBalanceDisplay();

            // Store stake record
            if (!AppState.stakes[predictionId]) AppState.stakes[predictionId] = [];
            AppState.stakes[predictionId].push({ user: AppState.connectedAddress, choice: !!choice, amount: amountNum });
            saveLocalStakes();

            // Update pools on prediction (convert XLM to internal units used by UI)
            const units = Math.round(amountNum * 10000000);
            if (choice) {
                pred.yes_pool = (parseInt(pred.yes_pool) || 0) + units;
            } else {
                pred.no_pool = (parseInt(pred.no_pool) || 0) + units;
            }

            // Persist local prediction pool changes
            const localIndex = AppState.localPredictions.findIndex(lp => lp.id === pred.id);
            if (localIndex !== -1) {
                AppState.localPredictions[localIndex] = pred;
                saveLocalPredictions();
            }

            showStatus(`✅ Staked ${amountNum} XLM (demo) on ${choice ? 'YES' : 'NO'}`, 'success');
            safeNotify('Stake (Demo) placed', `${amountNum} XLM staked locally`, 'success');

            // Re-render
            loadPredictions();
        } catch (e) {
            console.error('Error during local stake simulation:', e);
            showStatus('❌ Local stake failed: ' + e.message, 'error');
        }

        return;
    }

    // If not local, fall back to blockchain flow
    try {
        console.log('📡 Calling blockchain integration...');
        showStatus('📊 Staking on blockchain...', 'info');
        safeNotify('Staking', 'Please approve the transaction in Freighter', 'info');

        // Use direct blockchain integration - NO TERMINAL NEEDED!
        const result = await window.blockchainIntegration.stakePrediction(
            predictionId,
            choice,
            amountNum
        );

        console.log('✅ Stake placed successfully:', result);

        // Update balance after successful transaction
        setTimeout(() => {
            fetchWalletBalance(AppState.connectedAddress);
        }, 2000);

        showStatus(`✅ Successfully staked ${amountNum} XLM on ${choice ? 'YES' : 'NO'}!`, 'success');
        safeNotify('Stake Successful!', `${amountNum} XLM staked on the blockchain`, 'success');

        // Reload predictions after a delay
        setTimeout(() => {
            console.log('🔄 Reloading predictions...');
            loadPredictions();
        }, 3000);

    } catch (error) {
        console.error('❌ Error staking:', error);

        // User-friendly error messages
        let errorMsg = error.message || error.toString() || 'Unknown error';

        if (errorMsg.includes('User rejected')) {
            errorMsg = 'Transaction cancelled by user';
        } else if (errorMsg.includes('insufficient')) {
            errorMsg = 'Insufficient XLM balance';
        } else if (errorMsg.includes('Freighter')) {
            errorMsg = 'Please install and unlock Freighter wallet';
        } else if (errorMsg.includes('UnreachableCodeReached') || errorMsg.includes('InvalidAction')) {
            errorMsg = '⚠️ Contract Error: The stake function failed. This might be because:\n' +
                      '• The prediction is already resolved\n' +
                      '• The prediction doesn\'t exist\n' +
                      '• There\'s a bug in the smart contract\n\n' +
                      'Try using the CLI command to stake instead.';
        }

        showStatus(`❌ Failed: ${errorMsg}`, 'error');
        safeNotify('Transaction Failed', errorMsg, 'error');
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
        // Find prediction
        const pred = AppState.predictions.find(p => p.id === predictionId);

        // If this is a locally created (demo) prediction, resolve locally and distribute rewards
        if (pred && pred.isLocal) {
            // Perform local resolution simulation
            pred.status = 'Resolved';
            pred.winner = outcome;

            // Gather stakes
            const stakes = AppState.stakes[predictionId] || [];
            const totalYes = stakes.filter(s => s.choice).reduce((s, r) => s + r.amount, 0);
            const totalNo = stakes.filter(s => !s.choice).reduce((s, r) => s + r.amount, 0);
            const totalPool = totalYes + totalNo;

            // If nobody staked, nothing to distribute
            if (stakes.length === 0 || totalPool === 0) {
                showStatus('⚠️ No stakes placed for this prediction - nothing to distribute', 'warning');
            } else {
                const winnerPool = outcome ? totalYes : totalNo;
                // Avoid division by zero
                if (winnerPool === 0) {
                    showStatus('⚠️ No one staked on the winning side - creator receives the pool (demo)', 'warning');
                    // give to creator
                    AppState.rewards[pred.creator] = (AppState.rewards[pred.creator] || 0) + totalPool;
                } else {
                    // Distribute proportionally to winning stakers
                    stakes.forEach(s => {
                        if (s.choice === outcome) {
                            const share = s.amount / winnerPool;
                            const payout = share * totalPool;
                            AppState.rewards[s.user] = (AppState.rewards[s.user] || 0) + payout;
                        }
                    });
                }
                saveLocalRewards();
                // Clear stakes for this prediction after distribution
                AppState.stakes[predictionId] = [];
                saveLocalStakes();
            }

            // Persist prediction state
            const localIndex = AppState.localPredictions.findIndex(lp => lp.id === pred.id);
            if (localIndex !== -1) {
                AppState.localPredictions[localIndex] = pred;
                saveLocalPredictions();
            }

            showModal('Resolved (Demo)', `<p>Prediction resolved as: <strong>${outcome ? '✅ YES' : '❌ NO'}</strong></p><p>Total pool: ${formatNumber(totalPool)} XLM</p>`);
            loadPredictions();
            return;
        }

        // Fallback: generate contract CLI command for on-chain resolution
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

        // If there are local/demo rewards, process them immediately
        const addr = AppState.connectedAddress;
        const owed = AppState.rewards && AppState.rewards[addr] ? AppState.rewards[addr] : 0;
        if (owed && owed > 0) {
            // Transfer to user's local wallet balance (demo)
            AppState.walletBalance = (AppState.walletBalance || 0) + owed;
            showStatus(`💰 Claimed ${formatNumber(owed)} XLM (demo)`, 'success');
            safeNotify('Rewards Claimed', `You claimed ${formatNumber(owed)} XLM`, 'success');
            AppState.rewards[addr] = 0;
            saveLocalRewards();
            updateBalanceDisplay();
            return;
        }

        // Fallback to CLI command to claim on-chain
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
