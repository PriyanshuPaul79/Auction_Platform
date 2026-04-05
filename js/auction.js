/**
 * Auction Engine
 * Core state machine for running the cricket auction
 */

const Auction = (() => {
    let state = {
        status: 'idle',            // idle, running, paused, completed
        currentPlayerIndex: 0,
        currentBid: 0,
        currentBidder: null,       // team id
        timeRemaining: 10,
        timerMax: 10,
        isAutoBid: false,
        isAutoAuction: false,
        bidCount: 0,
        soldCount: 0,
        unsoldCount: 0,
        auctionOrder: [],          // player IDs in auction order
    };

    let timerInterval = null;
    let aiBidTimeout = null;
    let config = null;
    let players = [];
    let teams = [];
    let history = [];
    let feedLog = [];

    // Callbacks
    let onTick = null;
    let onBid = null;
    let onSold = null;
    let onUnsold = null;
    let onNewPlayer = null;
    let onComplete = null;
    let onFeed = null;
    let onStateChange = null;

    function init(cfg, p, t, callbacks) {
        config = cfg;
        players = p;
        teams = t;
        
        // Set callbacks
        onTick = callbacks.onTick;
        onBid = callbacks.onBid;
        onSold = callbacks.onSold;
        onUnsold = callbacks.onUnsold;
        onNewPlayer = callbacks.onNewPlayer;
        onComplete = callbacks.onComplete;
        onFeed = callbacks.onFeed;
        onStateChange = callbacks.onStateChange;

        // Check for saved state
        const savedState = Storage.loadAuctionState();
        if (savedState && savedState.status !== 'idle') {
            state = savedState;
            history = Storage.loadHistory() || [];
            feedLog = Storage.loadFeed() || [];
            
            // Restore players and teams from storage
            const savedPlayers = Storage.loadPlayers();
            const savedTeams = Storage.loadTeams();
            if (savedPlayers.length > 0) players.splice(0, players.length, ...savedPlayers);
            if (savedTeams.length > 0) teams.splice(0, teams.length, ...savedTeams);
            
            if (onStateChange) onStateChange(state);
            return true; // has existing state
        }

        // Create auction order (already sorted by rating)
        state.auctionOrder = players.map(p => p.id);
        state.timerMax = config.bidTimer;
        state.timeRemaining = config.bidTimer;

        return false;
    }

    function start() {
        if (state.status === 'completed') return;
        state.status = 'running';
        saveState();
        presentNextPlayer();
    }

    function resume() {
        if (state.status !== 'paused') return;
        state.status = 'running';
        addFeed('system', '▶️ Auction resumed');
        startTimer();
        if (onStateChange) onStateChange(state);
        saveState();
    }

    function pause() {
        if (state.status !== 'running') return;
        state.status = 'paused';
        clearTimerInterval();
        clearAITimeout();
        addFeed('system', '⏸️ Auction paused');
        if (onStateChange) onStateChange(state);
        saveState();
    }

    function presentNextPlayer() {
        clearTimerInterval();
        clearAITimeout();

        // Find next available player
        while (state.currentPlayerIndex < state.auctionOrder.length) {
            const playerId = state.auctionOrder[state.currentPlayerIndex];
            const player = getPlayer(playerId);
            if (player && player.status === 'available') {
                break;
            }
            state.currentPlayerIndex++;
        }

        if (state.currentPlayerIndex >= state.auctionOrder.length) {
            completeAuction();
            return;
        }

        const player = getCurrentPlayer();
        if (!player) {
            completeAuction();
            return;
        }

        state.currentBid = player.basePrice;
        state.currentBidder = null;
        state.timeRemaining = state.timerMax;
        state.bidCount = 0;

        addFeed('system', `🏏 ${player.name} (${player.role}) — Base: ₹${player.basePrice} Cr`);
        if (onNewPlayer) onNewPlayer(player, state);

        startTimer();

        // Schedule AI bids
        if (!state.isAutoAuction) {
            scheduleAIBids();
        } else {
            scheduleAutoAuctionBids();
        }

        saveState();
    }

    function getCurrentPlayer() {
        if (state.currentPlayerIndex >= state.auctionOrder.length) return null;
        const playerId = state.auctionOrder[state.currentPlayerIndex];
        return getPlayer(playerId);
    }

    function getPlayer(id) {
        return players.find(p => p.id === id);
    }

    function getTeam(id) {
        return teams.find(t => t.id === id);
    }

    // ====================
    // BIDDING
    // ====================
    
    function placeBid(teamId, amount) {
        if (state.status !== 'running') return false;
        
        const team = getTeam(teamId);
        const player = getCurrentPlayer();
        if (!team || !player) return false;

        // Validate
        if (amount > team.purse) return false;
        if (amount <= state.currentBid && state.currentBidder !== null) return false;
        if (team.squad.length >= config.squadSize) return false;

        // Place bid
        state.currentBid = Math.round(amount * 10) / 10;
        state.currentBidder = teamId;
        state.bidCount++;
        state.timeRemaining = state.timerMax; // Reset timer

        // Track bid history for this player
        player.bidHistory.push({
            teamId,
            teamName: team.name,
            amount: state.currentBid,
            time: Date.now()
        });

        const label = team.isAdmin ? '👤 You' : `🤖 ${team.short}`;
        addFeed('bid', `${label} bid ₹${state.currentBid} Cr for ${player.name}`);

        if (onBid) onBid(team, state.currentBid, player);

        // Restart timer
        clearTimerInterval();
        startTimer();

        // Schedule new AI responses if it was admin bid
        if (team.isAdmin) {
            clearAITimeout();
            scheduleAIBids();
        }

        saveState();
        return true;
    }

    function adminBid() {
        const player = getCurrentPlayer();
        if (!player) return false;
        
        const adminTeam = teams.find(t => t.isAdmin);
        if (!adminTeam) return false;

        const nextAmount = state.currentBidder === null 
            ? player.basePrice 
            : AIEngine.getNextBidAmount(state.currentBid);

        return placeBid(adminTeam.id, nextAmount);
    }

    function adminRaiseBid() {
        const player = getCurrentPlayer();
        if (!player) return false;
        
        const adminTeam = teams.find(t => t.isAdmin);
        if (!adminTeam) return false;

        // Raise by higher increment
        let raiseAmount;
        if (state.currentBid < 2) raiseAmount = 0.5;
        else if (state.currentBid < 5) raiseAmount = 1;
        else if (state.currentBid < 10) raiseAmount = 2;
        else raiseAmount = 3;

        const nextAmount = state.currentBid + raiseAmount;
        return placeBid(adminTeam.id, nextAmount);
    }

    function skipPlayer() {
        const player = getCurrentPlayer();
        if (!player) return;

        clearTimerInterval();
        clearAITimeout();

        // Let AI teams continue bidding among themselves
        addFeed('system', `⏭️ Admin skipped ${player.name} — AI teams continue`);

        // Check if any AI team wants to bid
        const interested = AIEngine.getInterestedTeams(teams, player, state.currentBid, config);
        
        if (interested.length === 0 && state.currentBidder === null) {
            // No one wants this player
            markUnsold(player);
            return;
        }

        if (interested.length > 0 && state.currentBidder === null) {
            // AI takes over bidding from base price
            runAIOnlyBidding(player, interested);
            return;
        }

        // If someone already bid, just let timer run out or AI counter-bids
        scheduleAIBids();
    }

    function runAIOnlyBidding(player, interested) {
        if (interested.length === 0) {
            if (state.currentBidder !== null) {
                markSold(player);
            } else {
                markUnsold(player);
            }
            return;
        }

        // Simulate AI bidding war
        let bidders = [...interested];
        let rounds = 0;
        const maxRounds = 20;

        const doBidRound = () => {
            if (state.status !== 'running' || rounds >= maxRounds || bidders.length === 0) {
                if (state.currentBidder !== null) {
                    markSold(player);
                } else {
                    markUnsold(player);
                }
                return;
            }

            const bidder = bidders[rounds % bidders.length];
            const nextBid = AIEngine.getNextBidAmount(state.currentBid);

            if (nextBid <= bidder.maxBid && nextBid <= bidder.team.purse) {
                placeBid(bidder.team.id, nextBid);
                rounds++;
                
                // Remove bidders who can't afford more
                bidders = bidders.filter(b => {
                    const next = AIEngine.getNextBidAmount(state.currentBid);
                    return next <= b.maxBid && next <= b.team.purse && b.team.id !== bidder.team.id;
                });

                if (bidders.length === 0) {
                    // No one else wants to bid → sold
                    setTimeout(() => markSold(player), 1000);
                    return;
                }

                aiBidTimeout = setTimeout(doBidRound, state.isAutoAuction ? 300 : 1200);
            } else {
                bidders = bidders.filter(b => b.team.id !== bidder.team.id);
                if (bidders.length === 0 && state.currentBidder !== null) {
                    setTimeout(() => markSold(player), 800);
                    return;
                }
                rounds++;
                doBidRound();
            }
        };

        aiBidTimeout = setTimeout(doBidRound, state.isAutoAuction ? 200 : 800);
    }

    // ====================
    // AI BIDDING SCHEDULER
    // ====================

    function scheduleAIBids() {
        clearAITimeout();
        const player = getCurrentPlayer();
        if (!player || state.status !== 'running') return;

        const delay = 1500 + Math.random() * 2000; // 1.5-3.5s delay

        aiBidTimeout = setTimeout(() => {
            if (state.status !== 'running') return;

            const interested = AIEngine.getInterestedTeams(teams, player, state.currentBid, config);
            
            if (interested.length > 0) {
                // Pick one random AI team to bid
                const bidder = interested[0];
                const nextBid = AIEngine.getNextBidAmount(state.currentBid);
                
                if (nextBid <= bidder.maxBid && nextBid <= bidder.team.purse) {
                    placeBid(bidder.team.id, nextBid);
                }
            }
            // If no AI wants to bid, timer will expire naturally
        }, delay);
    }

    function scheduleAutoAuctionBids() {
        clearAITimeout();
        const player = getCurrentPlayer();
        if (!player || state.status !== 'running') return;

        const interested = AIEngine.getInterestedTeams(teams, player, state.currentBid, config);
        
        // In auto auction: also let admin team bid via AI
        const adminTeam = teams.find(t => t.isAdmin);
        if (adminTeam) {
            const adminEval = AIEngine.evaluateBid(adminTeam, player, state.currentBid, config);
            if (adminEval.shouldBid) {
                interested.push({ team: adminTeam, maxBid: adminEval.maxBid });
                interested.sort(() => Math.random() - 0.5);
            }
        }

        if (interested.length === 0) {
            if (state.currentBidder === null) {
                setTimeout(() => markUnsold(player), 500);
            }
            return;
        }

        runAIOnlyBidding(player, interested);
    }

    // ====================
    // TIMER
    // ====================

    function startTimer() {
        clearTimerInterval();
        
        timerInterval = setInterval(() => {
            if (state.status !== 'running') {
                clearTimerInterval();
                return;
            }

            state.timeRemaining = Math.max(0, state.timeRemaining - 0.1);
            state.timeRemaining = Math.round(state.timeRemaining * 10) / 10;

            if (onTick) onTick(state.timeRemaining, state.timerMax);

            if (state.timeRemaining <= 0) {
                clearTimerInterval();
                clearAITimeout();
                timerExpired();
            }
        }, 100);
    }

    function timerExpired() {
        const player = getCurrentPlayer();
        if (!player) return;

        if (state.currentBidder !== null) {
            markSold(player);
        } else {
            markUnsold(player);
        }
    }

    // ====================
    // SOLD / UNSOLD
    // ====================

    function markSold(player) {
        clearTimerInterval();
        clearAITimeout();

        const team = getTeam(state.currentBidder);
        if (!team) return;

        player.status = 'sold';
        player.soldPrice = state.currentBid;
        player.assignedTeam = team.id;
        
        team.squad.push(player.id);
        team.roleCount[player.role] = (team.roleCount[player.role] || 0) + 1;
        team.purse = Math.round((team.purse - state.currentBid) * 10) / 10;

        state.soldCount++;

        history.push({
            playerId: player.id,
            playerName: player.name,
            role: player.role,
            basePrice: player.basePrice,
            soldPrice: state.currentBid,
            teamId: team.id,
            teamName: team.name,
            bidCount: state.bidCount,
            status: 'sold',
            timestamp: Date.now()
        });

        addFeed('sold', `✅ ${player.name} SOLD to ${team.name} for ₹${state.currentBid} Cr`);

        if (onSold) onSold(player, team, state.currentBid);

        saveState();
        Storage.saveHistory(history);

        // Move to next player after delay
        state.currentPlayerIndex++;
        setTimeout(() => {
            if (state.status !== 'idle' && state.status !== 'completed') {
                presentNextPlayer();
            }
        }, state.isAutoAuction ? 800 : 2500);
    }

    function markUnsold(player) {
        clearTimerInterval();
        clearAITimeout();

        player.status = 'unsold';
        state.unsoldCount++;

        history.push({
            playerId: player.id,
            playerName: player.name,
            role: player.role,
            basePrice: player.basePrice,
            soldPrice: null,
            teamId: null,
            teamName: null,
            bidCount: state.bidCount,
            status: 'unsold',
            timestamp: Date.now()
        });

        addFeed('unsold', `❌ ${player.name} goes UNSOLD`);

        if (onUnsold) onUnsold(player);

        saveState();
        Storage.saveHistory(history);

        // Move to next
        state.currentPlayerIndex++;
        setTimeout(() => {
            if (state.status !== 'idle' && state.status !== 'completed') {
                presentNextPlayer();
            }
        }, state.isAutoAuction ? 500 : 2000);
    }

    // ====================
    // AUCTION COMPLETION
    // ====================

    function completeAuction() {
        clearTimerInterval();
        clearAITimeout();

        state.status = 'completed';
        addFeed('system', '🏆 Auction completed!');

        // Auto-complete AI squads
        AIEngine.autoCompleteSquads(teams, players, config);

        saveState();
        Storage.saveHistory(history);

        if (onComplete) onComplete(state, teams, players, history);
    }

    // ====================
    // AUTO MODES
    // ====================

    function quickResolvePlayer() {
        const player = getCurrentPlayer();
        if (!player || state.status !== 'running') return;

        clearTimerInterval();
        clearAITimeout();

        let interested = AIEngine.getInterestedTeams(teams, player, state.currentBid, config);
        
        // Also check if admin team is interested
        const adminTeam = teams.find(t => t.isAdmin);
        if (adminTeam) {
            const adminEval = AIEngine.evaluateBid(adminTeam, player, state.currentBid, config);
            if (adminEval.shouldBid) {
                interested.push({ team: adminTeam, maxBid: adminEval.maxBid });
            }
        }

        if (interested.length === 0) {
            if (state.currentBidder !== null) {
                markSold(player);
            } else {
                markUnsold(player);
            }
            return;
        }

        // Randomly simulate outcome instantly
        const winner = interested[Math.floor(Math.random() * interested.length)];
        let finalBid = Math.max(state.currentBid, player.basePrice);
        finalBid += Math.random() * (winner.maxBid - finalBid);
        finalBid = Math.round(finalBid * 10) / 10;
        if (finalBid > winner.team.purse) finalBid = winner.team.purse;

        state.currentBid = finalBid;
        state.currentBidder = winner.team.id;
        state.bidCount += Math.floor(Math.random() * 5) + 1;

        player.bidHistory.push({
            teamId: winner.team.id,
            teamName: winner.team.name,
            amount: finalBid,
            time: Date.now()
        });

        markSold(player);
    }

    function fastForwardAuction() {
        if (state.status !== 'running' && state.status !== 'paused') return;
        
        clearTimerInterval();
        clearAITimeout();
        state.status = 'running';

        addFeed('system', '⚡ FAST FORWARD: Completing remaining auction instantly...');
        if (onStateChange) onStateChange(state);
        
        while (state.currentPlayerIndex < state.auctionOrder.length) {
            const playerId = state.auctionOrder[state.currentPlayerIndex];
            const player = getPlayer(playerId);
            
            if (player && player.status === 'available') {
                let interested = AIEngine.getInterestedTeams(teams, player, player.basePrice, config);
                const adminTeam = teams.find(t => t.isAdmin);
                if (adminTeam) {
                    const adminEval = AIEngine.evaluateBid(adminTeam, player, player.basePrice, config);
                    if (adminEval.shouldBid) {
                        interested.push({ team: adminTeam, maxBid: adminEval.maxBid });
                    }
                }

                if (interested.length > 0) {
                    const winner = interested[Math.floor(Math.random() * interested.length)];
                    let finalBid = player.basePrice + Math.random() * (winner.maxBid - player.basePrice);
                    finalBid = Math.round(finalBid * 10) / 10;
                    if (finalBid > winner.team.purse) finalBid = winner.team.purse;

                    player.status = 'sold';
                    player.soldPrice = finalBid;
                    player.assignedTeam = winner.team.id;
                    winner.team.squad.push(player.id);
                    winner.team.roleCount[player.role] = (winner.team.roleCount[player.role] || 0) + 1;
                    winner.team.purse = Math.round((winner.team.purse - finalBid) * 10) / 10;
                    state.soldCount++;

                    history.push({
                        playerId: player.id,
                        playerName: player.name,
                        role: player.role,
                        basePrice: player.basePrice,
                        soldPrice: finalBid,
                        teamId: winner.team.id,
                        teamName: winner.team.name,
                        bidCount: Math.floor(Math.random() * 5) + 1,
                        status: 'sold',
                        timestamp: Date.now()
                    });
                } else {
                    player.status = 'unsold';
                    state.unsoldCount++;
                    history.push({
                        playerId: player.id,
                        playerName: player.name,
                        role: player.role,
                        basePrice: player.basePrice,
                        soldPrice: null,
                        teamId: null,
                        teamName: null,
                        bidCount: 0,
                        status: 'unsold',
                        timestamp: Date.now()
                    });
                }
            }
            state.currentPlayerIndex++;
        }

        completeAuction();
    }

    // ====================
    // ADMIN MONEY
    // ====================

    function addMoney(amount) {
        const adminTeam = teams.find(t => t.isAdmin);
        if (adminTeam) {
            adminTeam.purse = Math.round((adminTeam.purse + amount) * 10) / 10;
            addFeed('system', `💰 Added ₹${amount} Cr to your purse (Total: ₹${adminTeam.purse} Cr)`);
            saveState();
        }
    }

    function resetPurse() {
        const adminTeam = teams.find(t => t.isAdmin);
        if (adminTeam) {
            adminTeam.purse = adminTeam.originalPurse;
            addFeed('system', `🔄 Purse reset to ₹${adminTeam.originalPurse} Cr`);
            saveState();
        }
    }

    function unlimitedMoney() {
        const adminTeam = teams.find(t => t.isAdmin);
        if (adminTeam) {
            adminTeam.purse = 9999;
            addFeed('system', '♾️ Unlimited money activated!');
            saveState();
        }
    }

    // ====================
    // HELPERS
    // ====================

    function addFeed(type, message) {
        const entry = {
            type,
            message,
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        feedLog.unshift(entry);
        if (feedLog.length > 200) feedLog.pop();
        Storage.saveFeed(feedLog);
        if (onFeed) onFeed(entry, feedLog);
    }

    function saveState() {
        Storage.saveAuctionState(state);
        Storage.savePlayers(players);
        Storage.saveTeams(teams);
    }

    function clearTimerInterval() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function clearAITimeout() {
        if (aiBidTimeout) {
            clearTimeout(aiBidTimeout);
            aiBidTimeout = null;
        }
    }

    function getState() { return { ...state }; }
    function getHistory() { return history; }
    function getFeed() { return feedLog; }
    function getConfig() { return config; }
    function getPlayers() { return players; }
    function getTeams() { return teams; }

    function destroy() {
        clearTimerInterval();
        clearAITimeout();
        state = {
            status: 'idle', currentPlayerIndex: 0, currentBid: 0,
            currentBidder: null, timeRemaining: 10, timerMax: 10,
            isAutoBid: false, isAutoAuction: false, bidCount: 0,
            soldCount: 0, unsoldCount: 0, auctionOrder: []
        };
        history = [];
        feedLog = [];
    }

    return {
        init, start, resume, pause, destroy,
        adminBid, adminRaiseBid, skipPlayer,
        placeBid, toggleAutoBid: () => {}, toggleAutoAuction: () => {},
        quickResolvePlayer, fastForwardAuction,
        addMoney, resetPurse, unlimitedMoney,
        getCurrentPlayer, getState, getHistory, getFeed,
        getConfig, getPlayers, getTeams, getPlayer, getTeam,
        presentNextPlayer
    };
})();
