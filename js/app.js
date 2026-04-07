/**
 * Main Application Entry Point
 * Wires together all modules, handles events, orchestrates the auction
 */

(function() {
    'use strict';

    let players = [];
    let teams = [];
    let config = null;
    let isInitialized = false;

    // =============================================
    // INITIALIZATION
    // =============================================

    window.addEventListener('DOMContentLoaded', async () => {
        // Animate splash
        UI.updateSplash(10, 'Loading modules...');

        await delay(300);
        UI.updateSplash(30, 'Checking saved session...');

        await delay(300);

        // Check for existing session
        const savedConfig = Storage.loadConfig();
        const savedPlayers = Storage.loadPlayers();
        const savedTeams = Storage.loadTeams();
        const savedAuction = Storage.loadAuctionState();

        if (savedConfig && savedPlayers.length > 0 && savedTeams.length > 0) {
            UI.updateSplash(50, 'Restoring previous session...');
            config = savedConfig;
            players = savedPlayers;
            teams = savedTeams;

            await delay(400);
            UI.updateSplash(80, 'Preparing interface...');
            await delay(300);
            UI.updateSplash(100, 'Ready!');
            await delay(400);

            UI.hideSplash();
            initWithExistingData(savedAuction);
            return;
        }

        UI.updateSplash(60, 'Preparing setup...');
        await delay(300);
        UI.updateSplash(100, 'Ready!');
        await delay(400);

        UI.hideSplash();
        initFresh();
    });

    function renderAITeamsCheckboxes(selectAll = false) {
        const container = UI.$('ai-teams-checkboxes');
        if (!container) return;
        container.innerHTML = TeamDB.AI_TEAMS.map((team, idx) => `
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">
                <input type="checkbox" class="ai-team-cb" value="${team.short}" ${selectAll || team.checkedByDefault || idx < 7 ? 'checked' : ''}>
                <span style="color: ${team.color}; font-weight: 600;">${team.name}</span>
            </label>
        `).join('');
    }

    function initFresh() {
        isInitialized = true;
        renderAITeamsCheckboxes();
        bindSetupEvents();
        bindNavEvents();
        bindGlobalEvents();
        UI.switchView('setup');
    }

    function initWithExistingData(savedAuction) {
        isInitialized = true;
        bindSetupEvents();
        bindNavEvents();
        bindGlobalEvents();

        UI.updatePoolStats(players);

        // Populate setup form with saved config
        const $ = UI.$;
        $('admin-team-name').value = config.adminTeam.name;
        $('admin-team-short').value = config.adminTeam.short;
        $('admin-team-color').value = config.adminTeam.color;
        renderAITeamsCheckboxes();
        if (config.selectedAITeams) {
            UI.$$('.ai-team-cb').forEach(cb => {
                cb.checked = config.selectedAITeams.includes(cb.value);
            });
        }
        $('team-purse').value = config.purse;
        $('squad-size').value = config.squadSize;
        $('bid-timer').value = config.bidTimer;
        $('min-bat').value = config.roleReqs.batsman;
        $('min-bowl').value = config.roleReqs.bowler;
        $('min-ar').value = config.roleReqs.allrounder;
        $('min-wk').value = config.roleReqs.wicketkeeper;

        if (savedAuction && savedAuction.status !== 'idle') {
            // Resume auction
            initAuction();
            
            if (savedAuction.status === 'completed') {
                UI.switchView('squads');
                updateSquadsView();
                updateHistoryView();
            } else {
                UI.switchView('auction');
            }
        } else {
            UI.switchView('setup');
        }
    }

    // =============================================
    // SETUP EVENTS
    // =============================================

    function bindSetupEvents() {
        const $ = UI.$;

        // Generate Players
        function doGeneratePlayers(count) {
            const newPlayers = PlayerDB.generatePlayers(count);
            let maxId = players.length > 0 ? Math.max(...players.map(p => p.id)) : 0;
            newPlayers.forEach(p => p.id = ++maxId);
            
            players = [...players, ...newPlayers];
            players.sort((a, b) => {
                if (a.isCustom && !b.isCustom) return -1;
                if (!a.isCustom && b.isCustom) return 1;
                return b.rating - a.rating;
            });
            Storage.savePlayers(players);
            UI.updatePoolStats(players);
            UI.toast(`✅ Generated ${newPlayers.length} players!`, 'success');
        }

        $('btn-gen-100')?.addEventListener('click', () => doGeneratePlayers(100));
        $('btn-gen-200')?.addEventListener('click', () => doGeneratePlayers(200));
        $('btn-gen-500')?.addEventListener('click', () => doGeneratePlayers(500));
        // Custom Players
        const btnAddCustom = $('btn-add-custom-players');
        if (btnAddCustom) {
            btnAddCustom.addEventListener('click', () => {
                const text = $('custom-players-input').value.trim();
                if (!text) {
                    UI.toast('Please enter custom players', 'warning');
                    return;
                }
                
                const lines = text.split('\n');
                let added = 0;

                lines.forEach(line => {
                    const parts = line.split(',').map(s => s.trim());
                    if (parts.length >= 5) {
                        const [name, country, role, ratingStr, basePriceStr] = parts;
                        const nextId = players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1;
                        
                        players.unshift({
                            id: nextId,
                            name: name,
                            country: country,
                            countryFlag: PlayerDB.COUNTRY_FLAGS ? (PlayerDB.COUNTRY_FLAGS[country] || '🌍') : '🌍',
                            role: role.toLowerCase(),
                            rating: parseInt(ratingStr) || 80,
                            basePrice: parseFloat(basePriceStr) || 1.0,
                            status: 'available',
                            soldPrice: null,
                            assignedTeam: null,
                            bidHistory: [],
                            isCustom: true
                        });
                        added++;
                    }
                });

                if (added > 0) {
                    players.sort((a, b) => {
                        if (a.isCustom && !b.isCustom) return -1;
                        if (!a.isCustom && b.isCustom) return 1;
                        return b.rating - a.rating;
                    });
                    Storage.savePlayers(players);
                    UI.updatePoolStats(players);
                    UI.toast(`✅ Added ${added} custom players!`, 'success');
                    $('custom-players-input').value = '';
                } else {
                    UI.toast('Invalid format. Use: Name, Country, Role, Rating, BasePrice', 'error');
                }
            });
        }

        // Custom AI Teams
        const btnAddCustomTeams = $('btn-add-custom-teams');
        if (btnAddCustomTeams) {
            btnAddCustomTeams.addEventListener('click', () => {
                const text = $('custom-teams-input').value.trim();
                if (!text) {
                    UI.toast('Please enter custom teams', 'warning');
                    return;
                }
                
                const lines = text.split('\n');
                let added = 0;

                lines.forEach(line => {
                    const parts = line.split(',').map(s => s.trim());
                    if (parts.length >= 2) { // At least Name and ShortCode
                        const name = parts[0];
                        const short = parts[1];
                        const color = parts[2] || '#cccccc';
                        
                        // Push to TeamDB.AI_TEAMS
                        TeamDB.AI_TEAMS.push({
                            name: name,
                            short: short,
                            color: color,
                            accent: color,
                            checkedByDefault: true
                        });
                        added++;
                    }
                });

                if (added > 0) {
                    renderAITeamsCheckboxes();
                    UI.toast(`✅ Added ${added} custom teams!`, 'success');
                    $('custom-teams-input').value = '';
                } else {
                    UI.toast('Invalid format. Use: Name, ShortCode, HexColor', 'error');
                }
            });
        }

        const btnSelectAllTeams = $('btn-select-all-teams');
        if (btnSelectAllTeams) {
            btnSelectAllTeams.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('.ai-team-cb');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                checkboxes.forEach(cb => cb.checked = !allChecked);
                btnSelectAllTeams.textContent = allChecked ? 'Select All' : 'Deselect All';
            });
        }

        // Clear Players
        $('btn-clear-players').addEventListener('click', async () => {
            const ok = await UI.showConfirm('Clear Players', 'Remove all players?');
            if (ok) {
                players = [];
                Storage.savePlayers(players);
                UI.updatePoolStats(players);
                UI.toast('Players cleared', 'warning');
            }
        });

        // Start Auction
        $('btn-start-auction').addEventListener('click', async () => {
            if (players.length === 0) {
                UI.toast('Add or generate players first!', 'error');
                return;
            }

            buildConfig();
            
            if (!config.selectedAITeams || config.selectedAITeams.length === 0) {
                UI.toast('Please select at least 1 AI team!', 'error');
                return;
            }

            const ok = await UI.showConfirm('Start Auction', 
                `Begin auction with ${players.length} players and ${config.selectedAITeams.length + 1} teams?`);
            if (!ok) return;

            teams = TeamDB.createTeams(config.adminTeam, config.selectedAITeams, config.purse);
            Storage.saveConfig(config);
            Storage.saveTeams(teams);
            Storage.savePlayers(players);

            initAuction();
            Auction.start();
            UI.switchView('auction');
            UI.toast('🏏 Auction has begun!', 'success', 4000);
        });
    }

    function buildConfig() {
        const $ = UI.$;
        config = {
            adminTeam: {
                name: $('admin-team-name').value || 'Super Kings',
                short: $('admin-team-short').value || 'CSK',
                color: $('admin-team-color').value || '#f9cd05'
            },
            selectedAITeams: Array.from(document.querySelectorAll('.ai-team-cb:checked')).map(cb => cb.value),
            purse: parseInt($('team-purse').value) || 100,
            squadSize: parseInt($('squad-size').value) || 11,
            bidTimer: parseInt($('bid-timer').value) || 10,
            roleReqs: {
                batsman: parseInt($('min-bat').value) || 3,
                bowler: parseInt($('min-bowl').value) || 3,
                allrounder: parseInt($('min-ar').value) || 2,
                wicketkeeper: parseInt($('min-wk').value) || 1
            }
        };
    }

    // =============================================
    // AUCTION INITIALIZATION
    // =============================================

    function initAuction() {
        const hasState = Auction.init(config, players, teams, {
            onTick: handleTick,
            onBid: handleBid,
            onSold: handleSold,
            onUnsold: handleUnsold,
            onNewPlayer: handleNewPlayer,
            onComplete: handleComplete,
            onFeed: handleFeed,
            onStateChange: handleStateChange
        });

        // Get potentially restored data
        players = Auction.getPlayers();
        teams = Auction.getTeams();

        bindAuctionEvents();

        // Render initial state
        const state = Auction.getState();
        UI.renderTeamsSidebar(teams, state.currentBidder);
        UI.updateStatusBanner(state.status);
        UI.updateProgress(state, players.length);
        UI.updateControls(state);
        UI.renderFeed(Auction.getFeed());

        // If resuming, show current player
        if (hasState) {
            const currentPlayer = Auction.getCurrentPlayer();
            if (currentPlayer) {
                UI.updatePlayerCard(currentPlayer);
                UI.updateBidInfo(state.currentBid, state.currentBidder !== null ? Auction.getTeam(state.currentBidder) : null);
                UI.updateTimer(state.timeRemaining, state.timerMax);
            }
            
            // Resume the auction if it was running
            if (state.status === 'running') {
                Auction.resume();
            }
        }
    }

    // =============================================
    // AUCTION EVENTS
    // =============================================

    function bindAuctionEvents() {
        const $ = UI.$;

        // Place Bid
        $('btn-place-bid').onclick = () => {
            const state = Auction.getState();
            if (state.status !== 'running') {
                UI.toast('Auction is not running', 'warning');
                return;
            }
            const success = Auction.adminBid();
            if (!success) {
                UI.toast('Cannot place bid — check your purse or squad size', 'error');
            }
        };

        // Raise Bid
        $('btn-increase-bid').onclick = () => {
            const state = Auction.getState();
            if (state.status !== 'running') return;
            const success = Auction.adminRaiseBid();
            if (!success) {
                UI.toast('Cannot raise bid', 'error');
            }
        };

        // Skip Player
        $('btn-skip').onclick = () => {
            const state = Auction.getState();
            if (state.status !== 'running') return;
            Auction.skipPlayer();
        };

        // Quick Resolve
        $('btn-auto-bid').onclick = () => {
            if (Auction.getState().status !== 'running') return;
            Auction.quickResolvePlayer();
            UI.toast('⚡ Player instantly resolved', 'info');
        };

        // Pause
        $('btn-pause').onclick = () => {
            Auction.pause();
            UI.updateControls(Auction.getState());
        };

        // Resume
        $('btn-resume').onclick = () => {
            Auction.resume();
            UI.updateControls(Auction.getState());
        };

        // Fast Forward All
        $('btn-auto-auction').onclick = async () => {
            const ok = await UI.showConfirm('Fast Forward All', 
                'Instantly complete the rest of the auction? This assigns remaining players randomly.');
            if (!ok) return;
            
            Auction.fastForwardAuction();
            UI.toast('🎬 Auction instantly completed!', 'success');
        };

        // Next Player (shown after sold/unsold)
        $('btn-next-player').onclick = () => {
            const state = Auction.getState();
            if (state.status === 'completed') {
                UI.switchView('squads');
                updateSquadsView();
            }
        };

        // Money Controls
        $('btn-add-money').onclick = () => {
            Auction.addMoney(10);
            UI.renderTeamsSidebar(teams, Auction.getState().currentBidder);
            UI.toast('💰 Added ₹10 Cr', 'success');
        };

        $('btn-reset-purse').onclick = async () => {
            const ok = await UI.showConfirm('Reset Purse', 'Reset your purse to the original amount?');
            if (ok) {
                Auction.resetPurse();
                UI.renderTeamsSidebar(teams, Auction.getState().currentBidder);
                UI.toast('🔄 Purse reset', 'info');
            }
        };

        $('btn-unlimited-money').onclick = () => {
            Auction.unlimitedMoney();
            UI.renderTeamsSidebar(teams, Auction.getState().currentBidder);
            UI.toast('♾️ Unlimited money!', 'success');
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const state = Auction.getState();
            if (state.status !== 'running') return;

            // Only if auction view is active
            const auctionView = document.getElementById('view-auction');
            if (!auctionView || !auctionView.classList.contains('active')) return;

            switch (e.key.toLowerCase()) {
                case 'b': // Bid
                    e.preventDefault();
                    $('btn-place-bid').click();
                    break;
                case 'r': // Raise
                    e.preventDefault();
                    $('btn-increase-bid').click();
                    break;
                case 's': // Skip
                    e.preventDefault();
                    $('btn-skip').click();
                    break;
                case ' ': // Pause/Resume
                    e.preventDefault();
                    if (state.status === 'paused') {
                        $('btn-resume').click();
                    } else {
                        $('btn-pause').click();
                    }
                    break;
            }
        });
    }

    // =============================================
    // AUCTION CALLBACKS
    // =============================================

    function handleTick(timeRemaining, timerMax) {
        UI.updateTimer(timeRemaining, timerMax);
    }

    function handleBid(team, amount, player) {
        UI.updateBidInfo(amount, team);
        UI.renderTeamsSidebar(teams, team.id);
        UI.updateTimer(Auction.getState().timeRemaining, Auction.getState().timerMax);

        // Auto-bid for admin if enabled
        const state = Auction.getState();
        if (state.isAutoBid && !team.isAdmin) {
            const adminTeam = teams.find(t => t.isAdmin);
            if (adminTeam) {
                const eval_ = AIEngine.evaluateBid(adminTeam, player, amount, config);
                if (eval_.shouldBid) {
                    setTimeout(() => {
                        if (Auction.getState().status === 'running') {
                            Auction.adminBid();
                        }
                    }, 800 + Math.random() * 1200);
                }
            }
        }
    }

    function handleSold(player, team, price) {
        UI.showSoldOverlay(player, team, price);
        UI.renderTeamsSidebar(teams, null);
        UI.updateProgress(Auction.getState(), players.length);
        
        if (!Auction.getState().isAutoAuction) {
            UI.toast(`✅ ${player.name} sold to ${team.name} for ${UI.formatCr(price)}`, 'success', 4000);
        }
    }

    function handleUnsold(player) {
        UI.showUnsoldOverlay(player);
        UI.renderTeamsSidebar(teams, null);
        UI.updateProgress(Auction.getState(), players.length);
    }

    function handleNewPlayer(player, state) {
        UI.updatePlayerCard(player);
        UI.updateBidInfo(state.currentBid, null);
        UI.updateStatusBanner('running');
        UI.updateControls(state);
        UI.renderTeamsSidebar(teams, null);
    }

    function handleComplete(state, teams, players, history) {
        UI.updateStatusBanner('completed');
        UI.updateControls(state);
        UI.updateProgress(state, players.length);
        UI.showAuctionComplete(state, teams, players, history);

        updateSquadsView();
        updateHistoryView();
    }

    function handleFeed(entry, feedLog) {
        UI.addFeedEntry(entry);
    }

    function handleStateChange(state) {
        UI.updateStatusBanner(state.status);
        UI.updateControls(state);
    }

    // =============================================
    // NAVIGATION
    // =============================================

    function bindNavEvents() {
        UI.$$('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const view = link.dataset.view;
                UI.switchView(view);

                if (view === 'squads') updateSquadsView();
                if (view === 'history') updateHistoryView();
            });
        });
    }

    // =============================================
    // GLOBAL EVENTS
    // =============================================

    function bindGlobalEvents() {
        const $ = UI.$;

        // Reset All
        $('btn-reset-all').addEventListener('click', async () => {
            const ok = await UI.showConfirm('Reset Everything', 
                'This will delete ALL data including auction progress, players, and teams. Continue?');
            if (ok) {
                Auction.destroy();
                Storage.clearAll();
                players = [];
                teams = [];
                config = null;
                UI.updatePoolStats([]);
                UI.switchView('setup');
                UI.toast('🔄 Everything reset', 'warning');
                location.reload();
            }
        });

        // Export CSV
        $('btn-export-csv').addEventListener('click', () => {
            if (teams.length === 0) {
                UI.toast('No data to export', 'warning');
                return;
            }
            ExportManager.exportCSV(teams, players);
            UI.toast('📄 CSV downloaded!', 'success');
        });

        // Export PDF
        $('btn-export-pdf').addEventListener('click', () => {
            if (teams.length === 0) {
                UI.toast('No data to export', 'warning');
                return;
            }
            ExportManager.exportPDF(teams, players);
            UI.toast('📑 PDF generated!', 'success');
        });

        // Tournament Sheet
        $('btn-tournament-sheet').addEventListener('click', () => {
            if (teams.length === 0) {
                UI.toast('No data available', 'warning');
                return;
            }
            UI.renderTournamentSheet(teams, players);
            UI.toast('🏆 Tournament sheet generated!', 'success');
        });

        // View Squads from complete modal
        $('btn-view-squads').addEventListener('click', () => {
            UI.hideAuctionComplete();
            UI.switchView('squads');
            updateSquadsView();
        });

        $('btn-close-complete').addEventListener('click', () => {
            UI.hideAuctionComplete();
        });

        // History filters
        UI.$$('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                UI.$$('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                UI.renderHistory(Auction.getHistory ? Auction.getHistory() : Storage.loadHistory(), filter);
            });
        });
    }

    // =============================================
    // VIEW UPDATERS
    // =============================================

    function updateSquadsView() {
        const t = teams.length > 0 ? teams : Storage.loadTeams();
        const p = players.length > 0 ? players : Storage.loadPlayers();
        UI.renderSquads(t, p);
    }

    function updateHistoryView() {
        const h = Auction.getHistory ? Auction.getHistory() : Storage.loadHistory();
        UI.renderHistory(h, 'all');
    }

    // =============================================
    // HELPERS
    // =============================================

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
