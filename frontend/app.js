// Import Freighter API functions
const { requestAccess, signTransaction, setAllowed } = freighterApi;

// State
let connectedAddress = null;
let predictions = [];

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const disconnectWalletBtn = document.getElementById('disconnectWallet');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const createPredictionForm = document.getElementById('createPredictionForm');
const predictionsContainer = document.getElementById('predictionsContainer');
const statusMessage = document.getElementById('statusMessage');

// Freighter Helper Functions
async function checkConnection() {
    try {
        const isAllowed = await setAllowed();
        return isAllowed;
    } catch (e) {
        console.error('Error checking connection:', e);
        return false;
    }
}

async function retrievePublicKey() {
    let publicKey = "";
    let error = "";
    try {
        publicKey = await requestAccess();
    } catch (e) {
        error = e;
    }
    if (error) {
        throw error;
    }
    return publicKey;
}

async function userSignTransaction(xdr, network, signWith) {
    let signedTransaction = "";
    let error = "";
    
    try {
        signedTransaction = await signTransaction(xdr, {
            network,
            accountToSign: signWith,
        });
    } catch (e) {
        error = e;
    }
    
    if (error) {
        throw error;
    }
    
    return signedTransaction;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔮 TimeLock Predictions Initialized');
    
    // Check if Freighter is installed
    if (typeof freighterApi === 'undefined') {
        showStatus('⚠️ Freighter wallet not found. Please install it from freighter.app', 'error');
        console.error('Freighter API not loaded');
    } else {
        console.log('✅ Freighter API loaded successfully');
        
        // Check if already connected
        const isAllowed = await checkConnection();
        if (isAllowed) {
            try {
                const publicKey = await retrievePublicKey();
                connectedAddress = publicKey;
                walletAddress.textContent = shortenAddress(publicKey);
                connectWalletBtn.style.display = 'none';
                walletInfo.style.display = 'flex';
                showStatus(`✅ Already connected: ${shortenAddress(publicKey)}`, 'success');
            } catch (e) {
                console.log('Not previously connected');
            }
        }
    }
    
    // Set minimum unlock time (1 hour from now)
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 1);
    document.getElementById('unlockTime').min = minDate.toISOString().slice(0, 16);
    
    // Load initial data
    await loadStats();
    await loadPredictions();
    
    // Auto-refresh every 30 seconds
    setInterval(async () => {
        await loadStats();
        await loadPredictions();
    }, 30000);
});

// Wallet Connection
connectWalletBtn.addEventListener('click', async () => {
    try {
        // Check if Freighter is installed
        if (typeof freighterApi === 'undefined') {
            showStatus('Please install Freighter wallet from freighter.app', 'error');
            window.open('https://www.freighter.app/', '_blank');
            return;
        }
        
        showStatus('Requesting wallet access...', 'info');
        console.log('Requesting access to Freighter...');
        
        // Request access (this triggers the Freighter popup)
        const publicKey = await retrievePublicKey();
        console.log('✅ Public key received:', publicKey);
        
        connectedAddress = publicKey;
        
        // Update UI
        walletAddress.textContent = shortenAddress(publicKey);
        connectWalletBtn.style.display = 'none';
        walletInfo.style.display = 'flex';
        
        showStatus(`✅ Connected: ${shortenAddress(publicKey)}`, 'success');
        
        // Reload predictions with user context
        await loadPredictions();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (error.toString().includes('User declined')) {
            showStatus('❌ Connection declined. Please approve in Freighter popup.', 'error');
        } else if (error.toString().includes('not installed')) {
            showStatus('❌ Freighter not installed. Please install it first.', 'error');
            window.open('https://www.freighter.app/', '_blank');
        } else {
            showStatus(`❌ Connection failed: ${error.toString()}`, 'error');
        }
    }
});

disconnectWalletBtn.addEventListener('click', () => {
    connectedAddress = null;
    connectWalletBtn.style.display = 'block';
    walletInfo.style.display = 'none';
    showStatus('Wallet disconnected', 'info');
    loadPredictions();
});

// Load Stats
async function loadStats() {
    try {
        // For now, we'll use mock data since reading from contract requires proper setup
        document.getElementById('totalPredictions').textContent = '1';
        document.getElementById('activePredictions').textContent = '1';
        document.getElementById('treasuryBalance').textContent = '35 XLM';
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Predictions
async function loadPredictions() {
    try {
        predictionsContainer.innerHTML = '<div class="loading">Loading predictions...</div>';
        
        // For demo, we'll show the prediction we created
        predictions = [{
            id: 1,
            question: "Will Bitcoin hit $100k by year end?",
            creator: "GC42P553VMNAS6SIRGJDIFTHF2B6NVZ5C7OOXFV5WTXGLV3FRC4CAGNB",
            unlock_time: 1762075165,
            status: "Open",
            yes_pool: "1000000000",
            no_pool: "0",
            winner: null
        }];
        
        if (predictions.length === 0) {
            predictionsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No predictions yet</h3>
                    <p>Create the first prediction!</p>
                </div>
            `;
            return;
        }
        
        predictionsContainer.innerHTML = '';
        predictions.forEach(pred => {
            const card = createPredictionCard(pred);
            predictionsContainer.appendChild(card);
        });
        
        // Start countdown timers
        updateCountdowns();
        setInterval(updateCountdowns, 1000);
        
    } catch (error) {
        console.error('Error loading predictions:', error);
        predictionsContainer.innerHTML = `
            <div class="empty-state">
                <h3>Error loading predictions</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Create Prediction Card
function createPredictionCard(pred) {
    const card = document.createElement('div');
    card.className = 'prediction-card';
    
    const yesPool = parseInt(pred.yes_pool) / 10000000;
    const noPool = parseInt(pred.no_pool) / 10000000;
    const totalPool = yesPool + noPool;
    const yesPercent = totalPool > 0 ? (yesPool / totalPool * 100).toFixed(0) : 0;
    const noPercent = totalPool > 0 ? (noPool / totalPool * 100).toFixed(0) : 0;
    
    const statusClass = pred.status === 'Open' ? 'status-open' : 'status-resolved';
    
    card.innerHTML = `
        <div class="prediction-header">
            <span class="prediction-id">ID #${pred.id}</span>
            <h3 class="prediction-question">${pred.question}</h3>
            <span class="prediction-status ${statusClass}">${pred.status}</span>
        </div>
        
        <div class="countdown" data-unlock="${pred.unlock_time}">
            ⏰ Calculating...
        </div>
        
        <div class="pools">
            <div class="pool-info pool-yes">
                <div>
                    <div class="pool-label">✅ YES</div>
                    <div class="pool-percentage">${yesPercent}%</div>
                </div>
                <div class="pool-amount">${yesPool.toFixed(2)} XLM</div>
            </div>
            <div class="pool-info pool-no">
                <div>
                    <div class="pool-label">❌ NO</div>
                    <div class="pool-percentage">${noPercent}%</div>
                </div>
                <div class="pool-amount">${noPool.toFixed(2)} XLM</div>
            </div>
        </div>
        
        <div class="info-box">
            <p><strong>Total Pool:</strong> ${totalPool.toFixed(2)} XLM</p>
            <p><strong>Min Stake:</strong> 100 XLM</p>
        </div>
        
        ${pred.status === 'Open' ? `
            <div class="stake-actions">
                <button class="btn btn-success" onclick="stakeOnPrediction(${pred.id}, true)">
                    Stake on YES
                </button>
                <button class="btn btn-danger" onclick="stakeOnPrediction(${pred.id}, false)">
                    Stake on NO
                </button>
            </div>
        ` : ''}
    `;
    
    return card;
}

// Update Countdowns
function updateCountdowns() {
    const countdowns = document.querySelectorAll('.countdown');
    countdowns.forEach(countdown => {
        const unlockTime = parseInt(countdown.dataset.unlock);
        const now = Math.floor(Date.now() / 1000);
        const remaining = unlockTime - now;
        
        if (remaining <= 0) {
            countdown.textContent = '🔓 Unlocked - Ready to resolve';
            countdown.style.color = '#28a745';
        } else {
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;
            countdown.textContent = `⏰ Unlocks in: ${hours}h ${minutes}m ${seconds}s`;
        }
    });
}

// Create Prediction
createPredictionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!connectedAddress) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    const question = document.getElementById('question').value;
    const unlockTimeInput = document.getElementById('unlockTime').value;
    const initialChoice = document.getElementById('initialChoice').value === 'true';
    
    // Convert datetime to unix timestamp
    const unlockTime = Math.floor(new Date(unlockTimeInput).getTime() / 1000);
    
    try {
        showStatus('Creating prediction... This may take a moment', 'info');
        
        // For demo purposes, we'll show the command they need to run
        const command = `stellar contract invoke \\
  --id ${CONFIG.contractId} \\
  --source admin \\
  --network testnet \\
  -- create_prediction \\
  --creator ${connectedAddress} \\
  --question "${question}" \\
  --unlock_time ${unlockTime} \\
  --initial_choice ${initialChoice} \\
  --token ${CONFIG.nativeTokenId}`;
        
        console.log('Command to run:', command);
        
        showStatus('⚠️ Demo Mode: In production, this would invoke the contract. For now, run this command in your terminal:', 'info');
        console.log(command);
        
        // Show instructions
        alert(`To create this prediction, run this command in your terminal:\n\n${command}`);
        
    } catch (error) {
        console.error('Error creating prediction:', error);
        showStatus(`Failed to create prediction: ${error.message}`, 'error');
    }
});

// Stake on Prediction
async function stakeOnPrediction(predictionId, choice) {
    if (!connectedAddress) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    const amount = prompt('Enter stake amount in XLM (minimum 100):', '100');
    if (!amount || isNaN(amount) || parseFloat(amount) < 100) {
        showStatus('Invalid amount. Minimum stake is 100 XLM', 'error');
        return;
    }
    
    const amountStroops = Math.floor(parseFloat(amount) * 10000000);
    
    try {
        showStatus('Staking... This may take a moment', 'info');
        
        // For demo, show the command
        const command = `stellar contract invoke \\
  --id ${CONFIG.contractId} \\
  --source ${connectedAddress} \\
  --network testnet \\
  -- stake \\
  --prediction_id ${predictionId} \\
  --user ${connectedAddress} \\
  --choice ${choice} \\
  --amount ${amountStroops} \\
  --token ${CONFIG.nativeTokenId}`;
        
        console.log('Stake command:', command);
        
        showStatus('⚠️ Demo Mode: Run this command to stake:', 'info');
        alert(`To stake, run this command:\n\n${command}`);
        
    } catch (error) {
        console.error('Error staking:', error);
        showStatus(`Failed to stake: ${error.message}`, 'error');
    }
}

// Utility Functions
function shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Make functions globally available
window.stakeOnPrediction = stakeOnPrediction;
