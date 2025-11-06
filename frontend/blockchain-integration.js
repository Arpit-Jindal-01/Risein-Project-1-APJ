// Direct Blockchain Integration - No Terminal Needed!
// This allows users to interact with the smart contract directly from the website

class BlockchainIntegration {
    constructor() {
        this.contractId = 'CC2OBONLPDUPDMWJ34E77F2YKECLCWC5XS26EZG2KVV5OAS3LW4ZP2MD';
        this.networkPassphrase = 'Test SDF Network ; September 2015';
        this.rpcUrl = 'https://soroban-testnet.stellar.org';
        this.horizonUrl = 'https://horizon-testnet.stellar.org';
        this.nativeTokenId = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
        this.server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    }

    // Create prediction directly from browser
    async createPrediction(question, unlockTime, initialChoice) {
        try {
            console.log('🚀 Creating prediction on blockchain...');
            
            // Get user's public key from Freighter
            const publicKey = await this.getPublicKey();
            if (!publicKey) {
                throw new Error('Please connect your Freighter wallet first');
            }

            // Show loading
            showStatus('Creating prediction on blockchain...', 'info');

            // Load account
            const account = await this.server.getAccount(publicKey);
            
            // Build the contract transaction
            const contract = new StellarSdk.Contract(this.contractId);
            
            // Create prediction parameters
            const params = [
                new StellarSdk.Address(publicKey).toScVal(), // creator
                StellarSdk.nativeToScVal(question, { type: 'string' }), // question
                StellarSdk.nativeToScVal(unlockTime, { type: 'u64' }), // unlock_time
                StellarSdk.nativeToScVal(initialChoice, { type: 'bool' }), // initial_choice
                new StellarSdk.Address(this.nativeTokenId).toScVal() // token
            ];

            // Build transaction
            const builtTransaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: this.networkPassphrase,
            })
                .addOperation(contract.call('create_prediction', ...params))
                .setTimeout(300)
                .build();

            // Prepare transaction for Soroban
            const preparedTransaction = await this.server.prepareTransaction(builtTransaction);

            // Convert to XDR for Freighter
            const xdr = preparedTransaction.toXDR();

            console.log('📝 Transaction prepared, requesting signature from Freighter...');
            showStatus('Please approve the transaction in Freighter...', 'info');

            // Sign with Freighter
            const signedXdr = await this.signWithFreighter(xdr);

            console.log('✍️ Transaction signed, submitting to blockchain...');
            showStatus('Submitting to blockchain...', 'info');

            // Submit transaction
            const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
            const response = await this.server.sendTransaction(transactionToSubmit);

            console.log('📡 Transaction submitted, waiting for confirmation...');
            showStatus('Waiting for blockchain confirmation...', 'info');

            // Persist a local prediction record immediately when we have a tx hash so the UI can show it
            try {
                const txHashImmediate = response && (response.hash || response.transactionHash || response.result?.hash);
                if (txHashImmediate) {
                    const publicKeyNow = await this.getPublicKey();
                    const immediatePrediction = {
                        id: Date.now(),
                        question: question,
                        creator: publicKeyNow,
                        unlock_time: unlockTime,
                        status: 'Open',
                        yes_pool: initialChoice ? 1000000000 : 0,
                        no_pool: initialChoice ? 0 : 1000000000,
                        winner: null,
                        isLocal: true,
                        txHash: txHashImmediate,
                        createdAt: new Date().toISOString()
                    };

                    if (window.AppState) {
                        window.AppState.localPredictions = window.AppState.localPredictions || [];
                        // Avoid duplicate by txHash
                        const exists = window.AppState.localPredictions.some(p => p.txHash === txHashImmediate || p.question === question && p.creator === publicKeyNow);
                        if (!exists) {
                            window.AppState.localPredictions.unshift(immediatePrediction);
                            if (window.saveLocalPredictions) window.saveLocalPredictions();
                            console.log('📌 Saved immediate prediction with txHash to localStorage:', txHashImmediate);
                        }
                    }

                    // Show quick modal/toast with txHash for video recording
                    try {
                        if (window.showModal) {
                            const explorerLink = `https://explorer.stellar.org/tx/${txHashImmediate}?network=test`;
                            const content = `\n                                <p>🎉 Prediction transaction submitted!</p>\n                                <p>Tx Hash: <a href="${explorerLink}" target="_blank">${txHashImmediate}</a></p>\n                                <p><button class=\"btn btn-secondary\" onclick=\"copyToClipboard('${txHashImmediate}')\">📋 Copy TX Hash</button></p>\n                                <p style=\"font-size:0.9em; color:#666; margin-top:8px;\">Click the link to view details on Stellar Explorer (Testnet).</p>\n                            `;
                            window.showModal('Transaction Submitted', content);
                        }
                    } catch (e) {
                        console.warn('Could not show immediate tx modal:', e);
                    }
                }
            } catch (e) {
                console.warn('Error while saving immediate txHash prediction:', e);
            }

            // Wait for confirmation
            if (response.status === 'PENDING') {
                let result = await this.pollTransactionStatus(response.hash);
                
                if (result.status === 'SUCCESS') {
                    console.log('✅ Prediction created successfully!');
                    showStatus('🎉 Prediction created on blockchain!', 'success');
                    
                    // Store prediction locally immediately
                    const publicKey = await this.getPublicKey();
                    const newPrediction = {
                        id: Date.now(), // Temporary ID based on timestamp
                        question: question,
                        creator: publicKey,
                        unlock_time: unlockTime,
                        status: 'Open',
                        yes_pool: initialChoice ? 1000000000 : 0, // 100 XLM = 1000000000 stroops
                        no_pool: initialChoice ? 0 : 1000000000,
                        winner: null,
                        isLocal: true, // Mark as locally created
                        txHash: response.hash,
                        createdAt: new Date().toISOString() // Add timestamp
                    };
                    
                    console.log('🎯 NEW PREDICTION OBJECT:', JSON.stringify(newPrediction, null, 2));
                    
                    // Add to local predictions in AppState
                    console.log('🔍 Checking AppState:', !!window.AppState);
                    if (window.AppState) {
                        if (!window.AppState.localPredictions) {
                            window.AppState.localPredictions = [];
                            console.log('✨ Initialized localPredictions array');
                        }
                        window.AppState.localPredictions.unshift(newPrediction); // Add to beginning
                        console.log('📌 Saved prediction locally:', newPrediction);
                        console.log(`📊 Total local predictions: ${window.AppState.localPredictions.length}`);
                        
                        // Save to localStorage for persistence
                        if (window.saveLocalPredictions) {
                            window.saveLocalPredictions();
                            console.log('💾 Saved to localStorage');
                        } else {
                            console.warn('⚠️ saveLocalPredictions function not found!');
                        }
                    } else {
                        console.error('❌ AppState not found on window!');
                    }
                    
                    // Trigger celebration
                    if (window.triggerCelebration) {
                        const form = document.getElementById('createPredictionForm');
                        if (form) triggerCelebration(form);
                    }
                    
                    // Immediately refresh predictions to show the new one
                    console.log('🔄 About to refresh predictions...');
                    console.log('🔍 loadPredictions function exists:', !!window.loadPredictions);
                    
                    if (window.loadPredictions) {
                        console.log('✅ Calling loadPredictions NOW...');
                        await loadPredictions();
                        console.log('✅ loadPredictions completed!');
                    } else {
                        console.error('❌ loadPredictions function not found on window!');
                    }
                    
                    // Show transaction hash modal / link for easy viewing in video
                    try {
                        if (window.showModal) {
                            const txHash = response.hash;
                            const explorerLink = `https://explorer.stellar.org/tx/${txHash}?network=test`;
                            const content = `
                                <p>🎉 Prediction transaction submitted!</p>
                                <p>Tx Hash: <a href="${explorerLink}" target="_blank">${txHash}</a></p>
                                <p><button class="btn btn-secondary" onclick="copyToClipboard('${txHash}')">📋 Copy TX Hash</button></p>
                                <p style="font-size:0.9em; color:#666; margin-top:8px;">Click the link to view details on Stellar Explorer (Testnet).</p>
                            `;
                            window.showModal('Transaction Submitted', content);
                        }
                    } catch (e) {
                        console.warn('Could not show tx modal:', e);
                    }

                    // Also try to refresh again after 3 seconds to get blockchain data
                    setTimeout(() => {
                        console.log('🔄 Second refresh to sync with blockchain...');
                        if (window.loadPredictions) {
                            loadPredictions();
                            showStatus('Predictions synced with blockchain!', 'success');
                        }
                    }, 3000);
                    
                    return result;
                } else {
                    throw new Error('Transaction failed: ' + result.status);
                }
            } else if (response.status === 'ERROR') {
                throw new Error('Transaction error: ' + JSON.stringify(response));
            }

            return response;

        } catch (error) {
            console.error('❌ Error creating prediction:', error);
            showStatus('Error: ' + error.message, 'error');
            throw error;
        }
    }

    // Stake on a prediction
    async stakePrediction(predictionId, choice, amount) {
        try {
            console.log('🎲 Staking on prediction...');
            console.log(`   Prediction ID: ${predictionId}`);
            console.log(`   Choice: ${choice ? 'YES' : 'NO'}`);
            console.log(`   Amount: ${amount} XLM`);
            
            const publicKey = await this.getPublicKey();
            if (!publicKey) {
                throw new Error('Please connect your Freighter wallet first');
            }

            showStatus('Preparing stake transaction...', 'info');

            const account = await this.server.getAccount(publicKey);
            const contract = new StellarSdk.Contract(this.contractId);
            
            // Convert amount from XLM to stroops (1 XLM = 10,000,000 stroops)
            const stroopsAmount = Math.floor(amount * 10000000);
            console.log(`   Amount in stroops: ${stroopsAmount}`);
            
            // Build parameters - CORRECT ORDER from CLI help: user, token, prediction_id, choice, amount
            // The deployed contract signature is: stake(user, token, prediction_id, choice, amount)
            const params = [
                new StellarSdk.Address(publicKey).toScVal(),  // user
                new StellarSdk.Address(this.nativeTokenId).toScVal(), // token (native XLM)
                StellarSdk.nativeToScVal(predictionId, { type: 'u64' }), // prediction_id as u64
                StellarSdk.nativeToScVal(choice, { type: 'bool' }), // choice
                StellarSdk.nativeToScVal(stroopsAmount, { type: 'i128' }) // amount
            ];
            
            console.log('📦 Built transaction parameters (user, token, prediction_id, choice, amount)');
            console.log(`   User: ${publicKey}`);
            console.log(`   Token: ${this.nativeTokenId}`);
            console.log(`   Prediction ID: ${predictionId} (u64)`);
            console.log(`   Choice: ${choice}`);
            console.log(`   Amount: ${stroopsAmount} stroops (${amount} XLM)`);

            const builtTransaction = new StellarSdk.TransactionBuilder(account, {
                fee: '100000', // Increase fee for complex operation
                networkPassphrase: this.networkPassphrase,
            })
                .addOperation(contract.call('stake', ...params))
                .setTimeout(300)
                .build();

            console.log('🔄 Preparing transaction (this will simulate and get auth)...');
            const preparedTransaction = await this.server.prepareTransaction(builtTransaction);
            const xdr = preparedTransaction.toXDR();

            showStatus('Please approve the stake in Freighter...', 'info');
            const signedXdr = await this.signWithFreighter(xdr);

            showStatus('Submitting stake to blockchain...', 'info');
            const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
            const response = await this.server.sendTransaction(transactionToSubmit);

            if (response.status === 'PENDING') {
                let result = await this.pollTransactionStatus(response.hash);
                
                if (result.status === 'SUCCESS') {
                    showStatus('🎉 Stake placed successfully!', 'success');
                    
                    // Refresh predictions after blockchain confirmation
                    console.log('🔄 Refreshing predictions list...');
                    setTimeout(() => {
                        if (window.loadPredictions) {
                            loadPredictions();
                            showStatus('Predictions updated with your stake!', 'success');
                        }
                    }, 3000); // Wait 3 seconds for blockchain to settle
                    
                    return result;
                } else {
                    throw new Error('Stake failed: ' + result.status);
                }
            }

            return response;

        } catch (error) {
            console.error('❌ Error staking:', error);
            showStatus('Error: ' + error.message, 'error');
            throw error;
        }
    }

    // Get public key from Freighter
    async getPublicKey() {
        try {
            if (!window.freighterApi) {
                throw new Error('Freighter wallet not found. Please install Freighter extension.');
            }

            const publicKey = await window.freighterApi.getPublicKey();
            return publicKey;
        } catch (error) {
            console.error('Error getting public key:', error);
            return null;
        }
    }

    // Sign transaction with Freighter
    async signWithFreighter(xdr) {
        try {
            if (!window.freighterApi) {
                throw new Error('Freighter wallet not found');
            }

            const signedXdr = await window.freighterApi.signTransaction(xdr, {
                network: 'TESTNET',
                networkPassphrase: this.networkPassphrase
            });

            return signedXdr;
        } catch (error) {
            console.error('Error signing transaction:', error);
            throw new Error('User rejected the transaction or Freighter error: ' + error.message);
        }
    }

    // Poll transaction status
    async pollTransactionStatus(hash, maxAttempts = 30) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const response = await this.server.getTransaction(hash);
                
                if (response.status === 'SUCCESS' || response.status === 'FAILED') {
                    return response;
                }
                
                // Wait 1 second before next attempt
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                
            } catch (error) {
                if (error.message.includes('404')) {
                    // Transaction not found yet, keep polling
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                } else {
                    throw error;
                }
            }
        }
        
        throw new Error('Transaction confirmation timeout');
    }

    // Get a specific prediction from the blockchain
    async getPrediction(predictionId) {
        try {
            console.log(`🔍 Fetching prediction ${predictionId} from blockchain...`);
            
            const contract = new StellarSdk.Contract(this.contractId);
            
            // Build the get_prediction call - try u32 first (based on CLI test)
            const params = [
                StellarSdk.nativeToScVal(predictionId, { type: 'u32' })
            ];
            
            console.log(`📦 Calling get_prediction with ID ${predictionId} (u32 type)`);

            // Create a temporary account for simulation (we don't need real account for read operations)
            const keypair = StellarSdk.Keypair.random();
            const account = new StellarSdk.Account(keypair.publicKey(), '0');
            
            const builtTransaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: this.networkPassphrase,
            })
                .addOperation(contract.call('get_prediction', ...params))
                .setTimeout(30)
                .build();

            // Simulate the transaction (read-only, no signature needed)
            const simulatedTx = await this.server.simulateTransaction(builtTransaction);
            
            console.log('🔍 Full simulation response:', JSON.stringify(simulatedTx, null, 2));
            console.log('🔍 Results array:', simulatedTx.results);
            console.log('🔍 Results length:', simulatedTx.results?.length);
            console.log('🔍 Error field:', simulatedTx.error);
            
            // Check for error first
            if (simulatedTx.error) {
                console.log(`⚠️ Simulation error for prediction ${predictionId}:`, simulatedTx.error);
                return null;
            }
            
            if (simulatedTx.results && simulatedTx.results.length > 0) {
                const result = simulatedTx.results[0];
                console.log('🔍 First result:', result);
                console.log('🔍 Result retval:', result.retval);
                
                if (!result.retval) {
                    console.log('No return value for prediction', predictionId);
                    return null;
                }
                
                // Parse the prediction data from the contract
                let predictionData;
                try {
                    predictionData = StellarSdk.scValToNative(result.retval);
                    console.log('Raw prediction data:', JSON.stringify(predictionData, null, 2));
                } catch (parseError) {
                    console.error('Error parsing prediction data:', parseError);
                    return null;
                }
                
                // Handle different possible data structures
                let prediction;
                
                // If predictionData is a struct/object
                if (typeof predictionData === 'object' && predictionData !== null) {
                    prediction = {
                        id: predictionId,
                        question: predictionData.question || predictionData.q || `Prediction #${predictionId}`,
                        creator: predictionData.creator || predictionData.c || 'Unknown',
                        unlock_time: this.parseNumber(predictionData.unlock_time || predictionData.unlock || predictionData.time),
                        status: 'Open',
                        yes_pool: this.parseNumber(predictionData.yes_pool || predictionData.yes || predictionData.y || 0),
                        no_pool: this.parseNumber(predictionData.no_pool || predictionData.no || predictionData.n || 0),
                        winner: predictionData.winner !== undefined ? predictionData.winner : null
                    };
                    
                    // Update status based on unlock time
                    if (prediction.unlock_time && prediction.unlock_time < Date.now() / 1000) {
                        prediction.status = 'Resolved';
                    }
                } else {
                    console.error('Unexpected prediction data format:', predictionData);
                    return null;
                }
                
                console.log('✅ Successfully parsed prediction:', prediction);
                return prediction;
            } else {
                console.log(`⚠️ No results array in simulation response for prediction ${predictionId}`);
                console.log('   Response keys:', Object.keys(simulatedTx));
            }
            
            return null;
            
        } catch (error) {
            console.error(`Error fetching prediction ${predictionId}:`, error);
            // Don't throw, just return null so we can continue trying other predictions
            return null;
        }
    }
    
    // Safe version that doesn't throw on missing predictions
    async getPredictionSafe(predictionId) {
        try {
            const result = await this.getPrediction(predictionId);
            return result;
        } catch (error) {
            // Silently catch the panic error
            if (error.message && error.message.includes('UnreachableCodeReached')) {
                console.log(`   Prediction ${predictionId} doesn't exist (contract panic)`);
                return null;
            }
            throw error;
        }
    }

    // Helper to parse numbers that might be BigInt or string
    parseNumber(value) {
        if (!value) return 0;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseInt(value, 10) || 0;
        return 0;
    }

    // Check if Freighter is installed
    static async checkFreighter() {
        try {
            // Wait for Freighter to load
            for (let i = 0; i < 10; i++) {
                if (window.freighterApi) {
                    return true;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}

// Create global instance
window.blockchainIntegration = new BlockchainIntegration();

// Helper function to show status messages
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

console.log('✅ Blockchain Integration loaded - No terminal needed!');
