/**
 * UI Manager
 * Handles all DOM rendering and user interface updates
 */

const UI = (() => {
    // DOM cache
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Format currency
    function formatCr(val) {
        if (val === null || val === undefined) return '—';
        if (val >= 100) return `₹${val} Cr`;
        return `₹${parseFloat(val).toFixed(1)} Cr`;
    }

    // Get role emoji
    function roleEmoji(role) {
        switch (role) {
            case 'batsman': return '🏏';
            case 'bowler': return '🎯';
            case 'allrounder': return '⚡';
            case 'wicketkeeper': return '🧤';
            default: return '🏏';
        }
    }

    // Get star rating HTML
    function starsHTML(rating) {
        const fullStars = Math.floor(rating / 20);
        const halfStar = (rating % 20) >= 10 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
    }

    // ====================
    // SPLASH SCREEN
    // ====================

    function updateSplash(progress, statusText) {
        const bar = document.querySelector('.loader-bar');
        const status = $('splash-status');
        if (bar) bar.style.width = `${progress}%`;
        if (status) status.textContent = statusText;
    }

    function hideSplash() {
        const splash = $('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
                $('app').classList.remove('hidden');
            }, 600);
        }
    }

    // ====================
    // NAVIGATION
    // ====================

    function switchView(viewName) {
        $$('.view').forEach(v => v.classList.remove('active'));
        $$('.nav-link').forEach(n => n.classList.remove('active'));

        const view = $(`view-${viewName}`);
        const nav = $(`nav-${viewName}`);
        if (view) view.classList.add('active');
        if (nav) nav.classList.add('active');
    }

    // ====================
    // SETUP VIEW
    // ====================

    function updatePoolStats(players) {
        const roles = { batsman: 0, bowler: 0, allrounder: 0, wicketkeeper: 0 };
        players.forEach(p => roles[p.role]++);

        $('pool-total').textContent = players.length;
        $('pool-bat').textContent = roles.batsman;
        $('pool-bowl').textContent = roles.bowler;
        $('pool-ar').textContent = roles.allrounder;
        $('pool-wk').textContent = roles.wicketkeeper;

        // Enable start button if we have enough players
        const startBtn = $('btn-start-auction');
        if (startBtn) {
            startBtn.disabled = players.length < 50;
        }
    }

    // ====================
    // TEAMS SIDEBAR
    // ====================

    function renderTeamsSidebar(teams, currentBidderId) {
        const container = $('teams-list');
        if (!container) return;

        container.innerHTML = teams.map(team => {
            const isBidding = team.id === currentBidderId;
            const adminClass = team.isAdmin ? 'is-admin' : '';
            const biddingClass = isBidding ? 'is-bidding' : '';
            
            return `
                <div class="team-item ${adminClass} ${biddingClass}" 
                     style="--team-color: ${team.color}" data-team-id="${team.id}">
                    <div class="team-badge" style="background: ${team.color}">${team.short}</div>
                    <div class="team-details">
                        <div class="team-name">${team.name} ${team.isAdmin ? '👤' : '🤖'}</div>
                        <div class="team-purse">${formatCr(team.purse)}</div>
                        <div class="team-squad-count">${team.squad.length} players</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ====================
    // PLAYER CARD
    // ====================

    function updatePlayerCard(player) {
        if (!player) {
            $('player-name').textContent = '—';
            $('player-country').textContent = '—';
            $('player-role').textContent = '—';
            $('player-role').className = 'player-role-badge';
            $('base-price').textContent = '—';
            $('current-bid').textContent = '—';
            $('highest-bidder').textContent = '—';
            const ratingEl = $('player-rating');
            if (ratingEl) {
                ratingEl.querySelector('.stars').textContent = '';
                ratingEl.querySelector('.rating-value').textContent = '';
            }
            return;
        }

        $('player-name').textContent = player.name;
        $('player-country').innerHTML = `${player.countryFlag || '🌍'} ${player.country}`;
        
        const roleEl = $('player-role');
        roleEl.textContent = `${roleEmoji(player.role)} ${player.role.toUpperCase()}`;
        roleEl.className = `player-role-badge ${player.role}`;

        $('base-price').textContent = formatCr(player.basePrice);

        const ratingEl = $('player-rating');
        if (ratingEl) {
            ratingEl.querySelector('.stars').textContent = starsHTML(player.rating);
            ratingEl.querySelector('.rating-value').textContent = player.rating;
        }

        // Animate card entrance
        const card = $('current-player-card');
        if (card) {
            card.classList.remove('new-player');
            void card.offsetWidth; // force reflow
            card.classList.add('new-player');
        }

        // Update avatar with role icon
        const avatar = $('player-avatar');
        if (avatar) {
            avatar.innerHTML = `<div class="avatar-placeholder">${roleEmoji(player.role)}</div>`;
        }
    }

    function updateBidInfo(currentBid, bidderTeam) {
        $('current-bid').textContent = currentBid ? formatCr(currentBid) : '—';
        $('highest-bidder').textContent = bidderTeam ? `${bidderTeam.name}` : '—';
        
        if (bidderTeam) {
            $('highest-bidder').style.color = bidderTeam.color;
        } else {
            $('highest-bidder').style.color = '';
        }
    }

    // ====================
    // TIMER
    // ====================

    function updateTimer(timeRemaining, timerMax) {
        const circle = $('timer-circle');
        const text = $('timer-text');
        
        if (!circle || !text) return;

        const circumference = 2 * Math.PI * 54; // r=54
        const progress = timeRemaining / timerMax;
        const offset = circumference * (1 - progress);
        
        circle.style.strokeDashoffset = offset;

        text.textContent = Math.ceil(timeRemaining);

        // Color changes
        circle.classList.remove('warning', 'danger');
        text.classList.remove('warning', 'danger');
        
        if (timeRemaining <= 3) {
            circle.classList.add('danger');
            text.classList.add('danger');
        } else if (timeRemaining <= 5) {
            circle.classList.add('warning');
            text.classList.add('warning');
        }
    }

    // ====================
    // STATUS BANNER
    // ====================

    function updateStatusBanner(status) {
        const banner = $('auction-status-banner');
        const text = $('auction-status-text');
        if (!banner || !text) return;

        banner.classList.remove('live', 'paused');

        switch (status) {
            case 'running':
                text.textContent = '🔴 LIVE — Bidding in progress';
                banner.classList.add('live');
                break;
            case 'paused':
                text.textContent = '⏸️ PAUSED';
                banner.classList.add('paused');
                break;
            case 'completed':
                text.textContent = '🏆 AUCTION COMPLETE';
                break;
            default:
                text.textContent = 'Ready to start';
        }
    }

    // ====================
    // AUCTION PROGRESS
    // ====================

    function updateProgress(state, totalPlayers) {
        $('players-remaining').textContent = totalPlayers - state.soldCount - state.unsoldCount;
        $('players-sold').textContent = state.soldCount;
        $('players-unsold').textContent = state.unsoldCount;

        const completed = state.soldCount + state.unsoldCount;
        const pct = totalPlayers > 0 ? (completed / totalPlayers * 100) : 0;
        $('auction-progress-bar').style.width = `${pct}%`;
    }

    // ====================
    // CONTROLS
    // ====================

    function updateControls(state) {
        const btnPause = $('btn-pause');
        const btnResume = $('btn-resume');
        const btnAutoBid = $('btn-auto-bid');
        const btnAutoAuction = $('btn-auto-auction');
        const btnNextPlayer = $('btn-next-player');

        if (state.status === 'paused') {
            btnPause.classList.add('hidden');
            btnResume.classList.remove('hidden');
        } else {
            btnPause.classList.remove('hidden');
            btnResume.classList.add('hidden');
        }

        if (state.isAutoBid) {
            btnAutoBid.classList.add('auto-active');
            btnAutoBid.innerHTML = '<span>🤖</span> Auto ON';
        } else {
            btnAutoBid.classList.remove('auto-active');
            btnAutoBid.innerHTML = '<span>🤖</span> Auto Bid';
        }

        if (state.isAutoAuction) {
            btnAutoAuction.classList.add('auto-active');
            btnAutoAuction.innerHTML = '<span>🎬</span> Auto ON';
        } else {
            btnAutoAuction.classList.remove('auto-active');
            btnAutoAuction.innerHTML = '<span>🎬</span> Auto Auction';
        }

        if (state.status === 'completed') {
            btnNextPlayer.classList.remove('hidden');
            btnNextPlayer.textContent = '🏆 View Results';
        }
    }

    // ====================
    // LIVE FEED
    // ====================

    function addFeedEntry(entry) {
        const container = $('feed-entries');
        if (!container) return;

        const el = document.createElement('div');
        el.className = `feed-entry ${entry.type}`;
        el.innerHTML = `
            <span class="feed-time">${entry.time}</span>
            <span class="feed-msg">${entry.message}</span>
        `;
        container.prepend(el);

        // Keep max 50 entries in DOM
        while (container.children.length > 50) {
            container.removeChild(container.lastChild);
        }
    }

    function renderFeed(feedLog) {
        const container = $('feed-entries');
        if (!container) return;
        container.innerHTML = '';
        const recent = feedLog.slice(0, 50);
        recent.forEach(entry => {
            const el = document.createElement('div');
            el.className = `feed-entry ${entry.type}`;
            el.innerHTML = `
                <span class="feed-time">${entry.time}</span>
                <span class="feed-msg">${entry.message}</span>
            `;
            container.appendChild(el);
        });
    }

    // ====================
    // SOLD / UNSOLD OVERLAY
    // ====================

    function showSoldOverlay(player, team, price) {
        const overlay = $('sold-overlay');
        const details = $('sold-details');
        if (!overlay) return;

        details.textContent = `${player.name} → ${team.name} for ${formatCr(price)}`;
        overlay.classList.remove('hidden');

        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 2200);
    }

    function showUnsoldOverlay(player) {
        const overlay = $('unsold-overlay');
        if (!overlay) return;

        overlay.classList.remove('hidden');

        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 1800);
    }

    // ====================
    // TOAST NOTIFICATIONS
    // ====================

    function toast(message, type = 'info', duration = 3000) {
        const container = $('toast-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        container.appendChild(el);

        setTimeout(() => {
            el.classList.add('fade-out');
            setTimeout(() => el.remove(), 300);
        }, duration);
    }

    // ====================
    // SQUADS VIEW
    // ====================

    function renderSquads(teams, players) {
        const container = $('squads-container');
        if (!container) return;

        container.innerHTML = teams.map(team => {
            const squadPlayers = team.squad
                .map(id => players.find(p => p.id === id))
                .filter(Boolean);

            const roles = { batsman: 0, bowler: 0, allrounder: 0, wicketkeeper: 0 };
            squadPlayers.forEach(p => roles[p.role]++);

            const totalSpent = squadPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);

            return `
                <div class="squad-card" style="--team-color: ${team.color}">
                    <div class="squad-header" style="background: linear-gradient(135deg, ${team.color}22, transparent)">
                        <div class="squad-team-name" style="color: ${team.color}">
                            ${team.name} ${team.isAdmin ? '👤' : '🤖'}
                        </div>
                        <div class="squad-team-meta">
                            <span class="squad-meta-item">Players: <span class="squad-meta-value">${squadPlayers.length}</span></span>
                            <span class="squad-meta-item">Spent: <span class="squad-meta-value">${formatCr(Math.round(totalSpent * 10) / 10)}</span></span>
                            <span class="squad-meta-item">Remaining: <span class="squad-meta-value">${formatCr(team.purse)}</span></span>
                        </div>
                    </div>
                    <div class="squad-roles">
                        <span class="squad-role-pill bat">BAT ${roles.batsman}</span>
                        <span class="squad-role-pill bowl">BOWL ${roles.bowler}</span>
                        <span class="squad-role-pill ar">AR ${roles.allrounder}</span>
                        <span class="squad-role-pill wk">WK ${roles.wicketkeeper}</span>
                    </div>
                    <div class="squad-players">
                        ${squadPlayers.length === 0 
                            ? '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px;">No players yet</p>'
                            : squadPlayers.map((p, i) => `
                                <div class="squad-player-item">
                                    <span class="sq-player-name">
                                        <span style="color: var(--text-muted); font-size: 0.75rem;">${i + 1}.</span>
                                        ${p.name}
                                    </span>
                                    <span class="sq-player-role squad-role-pill ${p.role}">${p.role.substring(0, 3).toUpperCase()}</span>
                                    <span class="sq-player-price">${formatCr(p.soldPrice)}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    // ====================
    // HISTORY VIEW
    // ====================

    function renderHistory(history, filter = 'all') {
        const tbody = $('history-tbody');
        if (!tbody) return;

        let filtered = history;
        if (filter === 'sold') filtered = history.filter(h => h.status === 'sold');
        if (filter === 'unsold') filtered = history.filter(h => h.status === 'unsold');

        tbody.innerHTML = filtered.map((h, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${h.playerName}</strong></td>
                <td><span class="squad-role-pill ${h.role}">${h.role.substring(0, 3).toUpperCase()}</span></td>
                <td>${formatCr(h.basePrice)}</td>
                <td>${h.soldPrice ? formatCr(h.soldPrice) : '—'}</td>
                <td>${h.teamName || '—'}</td>
                <td>${h.bidCount}</td>
                <td class="${h.status === 'sold' ? 'status-sold' : 'status-unsold'}">${h.status.toUpperCase()}</td>
            </tr>
        `).join('');
    }

    // ====================
    // AUCTION COMPLETE MODAL
    // ====================

    function showAuctionComplete(state, teams, players, history) {
        const modal = $('auction-complete-modal');
        const summary = $('auction-summary');
        if (!modal || !summary) return;

        const soldEntries = history.filter(h => h.status === 'sold');
        const totalSpent = soldEntries.reduce((s, h) => s + (h.soldPrice || 0), 0);
        const maxEntry = soldEntries.reduce((max, h) => (h.soldPrice > (max?.soldPrice || 0)) ? h : max, null);

        summary.innerHTML = `
            <div class="summary-stat">
                <span class="label">Players Sold</span>
                <span class="value">${state.soldCount}</span>
            </div>
            <div class="summary-stat">
                <span class="label">Players Unsold</span>
                <span class="value">${state.unsoldCount}</span>
            </div>
            <div class="summary-stat">
                <span class="label">Total Money Spent</span>
                <span class="value">${formatCr(Math.round(totalSpent * 10) / 10)}</span>
            </div>
            <div class="summary-stat">
                <span class="label">Teams</span>
                <span class="value">${teams.length}</span>
            </div>
            ${maxEntry ? `
                <div class="summary-most-expensive">
                    <h4>💰 Most Expensive Player</h4>
                    <div class="summary-stat">
                        <span class="label">${maxEntry.playerName}</span>
                        <span class="value">${formatCr(maxEntry.soldPrice)} → ${maxEntry.teamName}</span>
                    </div>
                </div>
            ` : ''}
        `;

        // Confetti
        spawnConfetti();

        modal.classList.remove('hidden');
    }

    function hideAuctionComplete() {
        const modal = $('auction-complete-modal');
        if (modal) modal.classList.add('hidden');
    }

    function spawnConfetti() {
        const container = $('confetti-container');
        if (!container) return;
        container.innerHTML = '';
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        for (let i = 0; i < 60; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = `${Math.random() * 2}s`;
            piece.style.animationDuration = `${2 + Math.random() * 2}s`;
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.width = `${6 + Math.random() * 8}px`;
            piece.style.height = `${6 + Math.random() * 8}px`;
            container.appendChild(piece);
        }
    }

    // ====================
    // CONFIRM MODAL
    // ====================

    function showConfirm(title, message) {
        return new Promise((resolve) => {
            const modal = $('confirm-modal');
            $('modal-title').textContent = title;
            $('modal-message').textContent = message;
            modal.classList.remove('hidden');

            const confirmBtn = $('modal-confirm');
            const cancelBtn = $('modal-cancel');

            const cleanup = () => {
                modal.classList.add('hidden');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
            };

            const onConfirm = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    // ====================
    // TOURNAMENT SHEET
    // ====================

    function renderTournamentSheet(teams, players) {
        const container = $('tournament-sheet-display');
        if (!container) return;

        container.classList.remove('hidden');

        container.innerHTML = `
            <h2>🏆 Tournament Team Sheets</h2>
            ${teams.map(team => {
                const squadPlayers = team.squad
                    .map(id => players.find(p => p.id === id))
                    .filter(Boolean);
                const roles = { batsman: 0, bowler: 0, allrounder: 0, wicketkeeper: 0 };
                squadPlayers.forEach(p => roles[p.role]++);
                const totalSpent = squadPlayers.reduce((s, p) => s + (p.soldPrice || 0), 0);

                return `
                    <div class="tournament-team" style="--team-color: ${team.color}; border-left-color: ${team.color}">
                        <h3 style="color: ${team.color}">${team.name} (${team.short}) ${team.isAdmin ? '👤' : '🤖'}</h3>
                        <div class="tournament-team-meta">
                            <span>Squad: ${squadPlayers.length} players</span>
                            <span>BAT: ${roles.batsman} | BOWL: ${roles.bowler} | AR: ${roles.allrounder} | WK: ${roles.wicketkeeper}</span>
                            <span>Spent: ${formatCr(Math.round(totalSpent * 10) / 10)}</span>
                            <span>Remaining: ${formatCr(team.purse)}</span>
                        </div>
                        <div class="tournament-players-list">
                            ${squadPlayers.map(p => `
                                <div class="tournament-player">
                                    <span>${roleEmoji(p.role)} ${p.name}</span>
                                    <span style="color: var(--accent-success)">${formatCr(p.soldPrice)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    return {
        $, $$, formatCr, roleEmoji,
        updateSplash, hideSplash,
        switchView,
        updatePoolStats,
        renderTeamsSidebar,
        updatePlayerCard, updateBidInfo,
        updateTimer,
        updateStatusBanner,
        updateProgress, updateControls,
        addFeedEntry, renderFeed,
        showSoldOverlay, showUnsoldOverlay,
        toast,
        renderSquads, renderHistory,
        showAuctionComplete, hideAuctionComplete,
        showConfirm,
        renderTournamentSheet
    };
})();
