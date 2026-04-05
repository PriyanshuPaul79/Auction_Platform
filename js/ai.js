/**
 * AI Bidding Engine
 * Controls automated bidding logic for AI teams
 */

const AIEngine = (() => {
    /**
     * Determine if an AI team should bid on a player
     * Returns { shouldBid: boolean, maxBid: number }
     */
    function evaluateBid(team, player, currentBid, config) {
        const { squadSize, roleReqs } = config;
        const squadFull = team.squad.length >= squadSize;
        if (squadFull) return { shouldBid: false, maxBid: 0 };

        const slotsRemaining = squadSize - team.squad.length;
        const minMoneyNeeded = slotsRemaining * 0.2; // reserve min base price per remaining slot
        const availableBudget = team.purse - minMoneyNeeded;

        if (availableBudget <= 0.1) return { shouldBid: false, maxBid: 0 };

        // Calculate role need
        const roleNeed = getRoleNeed(team, player.role, config);
        
        // Calculate interest score (0-1)
        let interest = 0;

        // Role priority (0 - 0.4)
        interest += roleNeed * 0.4;

        // Rating attraction (0 - 0.3)
        interest += (player.rating / 100) * 0.3;

        // Budget comfort (0 - 0.2)
        const budgetRatio = availableBudget / team.originalPurse;
        interest += budgetRatio * 0.2;

        // Randomization factor (0 - 0.1)
        interest += Math.random() * 0.1;

        // Probability check → higher interest = more likely to bid
        const bidProbability = Math.min(0.95, interest);
        if (Math.random() > bidProbability) return { shouldBid: false, maxBid: 0 };

        // Calculate max willingness to pay
        let maxBid = calculateMaxBid(player, team, interest, availableBudget);

        // Don't bid more than current bid
        if (maxBid <= currentBid) return { shouldBid: false, maxBid: 0 };

        return { shouldBid: true, maxBid };
    }

    function getRoleNeed(team, role, config) {
        const { roleReqs } = config;
        const current = team.roleCount[role] || 0;
        const required = roleReqs[role] || 0;

        if (current < required) {
            // Desperately need this role
            return 0.8 + (0.2 * (1 - current / required));
        }
        
        // Already have enough, less interest
        return Math.max(0, 0.3 - (current - required) * 0.15);
    }

    function calculateMaxBid(player, team, interest, availableBudget) {
        // Base: player's value based on rating
        let valueFactor;
        if (player.rating >= 90) valueFactor = 14 + Math.random() * 6;      // 14-20 Cr
        else if (player.rating >= 80) valueFactor = 8 + Math.random() * 6;   // 8-14 Cr
        else if (player.rating >= 70) valueFactor = 4 + Math.random() * 5;   // 4-9 Cr
        else if (player.rating >= 60) valueFactor = 2 + Math.random() * 3;   // 2-5 Cr
        else if (player.rating >= 50) valueFactor = 1 + Math.random() * 2;   // 1-3 Cr
        else valueFactor = 0.3 + Math.random() * 1.2;                        // 0.3-1.5 Cr

        // Adjust by interest
        let maxBid = valueFactor * (0.6 + interest * 0.6);

        // Cap at available budget (never spend more than 40% of remaining unless desperate)
        const budgetCap = availableBudget * (interest > 0.7 ? 0.6 : 0.4);
        maxBid = Math.min(maxBid, budgetCap);

        // Round to nearest 0.1
        maxBid = Math.round(maxBid * 10) / 10;

        return Math.max(player.basePrice, maxBid);
    }

    /**
     * Pick which AI teams want to bid on a player, sorted by interest
     */
    function getInterestedTeams(teams, player, currentBid, config) {
        const interested = [];
        
        for (const team of teams) {
            if (team.isAdmin) continue; // Admin bids manually
            const result = evaluateBid(team, player, currentBid, config);
            if (result.shouldBid) {
                interested.push({ team, maxBid: result.maxBid });
            }
        }

        // Shuffle interested teams to add randomness
        interested.sort(() => Math.random() - 0.5);
        return interested;
    }

    /**
     * Determine the next AI bid amount (increment logic)
     */
    function getNextBidAmount(currentBid) {
        if (currentBid < 1)  return currentBid + 0.1;
        if (currentBid < 3)  return currentBid + 0.2;
        if (currentBid < 5)  return currentBid + 0.25;
        if (currentBid < 10) return currentBid + 0.5;
        if (currentBid < 15) return currentBid + 0.75;
        return currentBid + 1;
    }

    /**
     * Auto-complete squads after auction ends
     * Assigns unsold players to teams that need them
     */
    function autoCompleteSquads(teams, players, config) {
        const { squadSize, roleReqs } = config;
        const unsoldPlayers = players.filter(p => p.status === 'available' || p.status === 'unsold');
        
        // Sort unsold by rating (best first)
        unsoldPlayers.sort((a, b) => b.rating - a.rating);

        // For each AI team, fill required roles first
        for (const team of teams) {
            if (team.squad.length >= squadSize) continue;

            // Fill required roles
            for (const role of ['wicketkeeper', 'bowler', 'allrounder', 'batsman']) {
                const required = roleReqs[role] || 0;
                const current = team.roleCount[role] || 0;
                const needed = required - current;
                
                if (needed > 0) {
                    const available = unsoldPlayers.filter(p => 
                        p.role === role && p.status !== 'sold'
                    );
                    
                    for (let i = 0; i < needed && i < available.length && team.squad.length < squadSize; i++) {
                        assignPlayer(available[i], team, available[i].basePrice);
                        available[i].status = 'sold';
                    }
                }
            }
        }

        // Fill remaining slots with best available players
        for (const team of teams) {
            while (team.squad.length < squadSize) {
                const available = unsoldPlayers.find(p => p.status !== 'sold');
                if (!available) break;
                assignPlayer(available, team, available.basePrice);
                available.status = 'sold';
            }
        }

        // Mark truly unsold players
        unsoldPlayers.forEach(p => {
            if (p.status !== 'sold') p.status = 'unsold';
        });
    }

    function assignPlayer(player, team, price) {
        player.status = 'sold';
        player.soldPrice = price;
        player.assignedTeam = team.id;
        team.squad.push(player.id);
        team.roleCount[player.role] = (team.roleCount[player.role] || 0) + 1;
        team.purse = Math.round((team.purse - price) * 10) / 10;
    }

    return {
        evaluateBid,
        getInterestedTeams,
        getNextBidAmount,
        autoCompleteSquads,
        assignPlayer
    };
})();
