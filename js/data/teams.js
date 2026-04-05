/**
 * AI Team Database
 * Default team configurations for AI-controlled teams
 */

const TeamDB = (() => {
    const AI_TEAMS = [
        { name: 'Mumbai Indians',        short: 'MI',  color: '#004ba0', accent: '#1a6dd4' },
        { name: 'Royal Challengers',     short: 'RCB', color: '#d4213d', accent: '#ff3a57' },
        { name: 'Kolkata Knight Riders',  short: 'KKR', color: '#3a225d', accent: '#6b3fa0' },
        { name: 'Delhi Capitals',        short: 'DC',  color: '#00408b', accent: '#1a6dd4' },
        { name: 'Rajasthan Royals',      short: 'RR',  color: '#ea1a85', accent: '#ff4da6' },
        { name: 'Punjab Kings',          short: 'PBKS',color: '#ed1b24', accent: '#ff4444' },
        { name: 'Sunrisers Hyderabad',   short: 'SRH', color: '#ff822a', accent: '#ffa04d' },
        { name: 'Gujarat Titans',        short: 'GT',  color: '#1c1c2b', accent: '#5b8cbe' },
        { name: 'Lucknow Super Giants',  short: 'LSG', color: '#004b8d', accent: '#0073d4' },
        { name: 'Deccan Chargers',       short: 'DCH', color: '#2a6496', accent: '#4a94c8' },
        { name: 'Rising Pune',           short: 'RPS', color: '#6b3fa0', accent: '#9b69d4' },
    ];

    function createTeams(adminTeam, selectedAITeams, purse) {
        const teams = [];

        // Admin team (always first, id=0)
        teams.push({
            id: 0,
            name: adminTeam.name,
            short: adminTeam.short,
            color: adminTeam.color,
            isAdmin: true,
            purse: purse,
            originalPurse: purse,
            squad: [],
            roleCount: { batsman: 0, bowler: 0, allrounder: 0, wicketkeeper: 0 }
        });

        // AI teams
        for (let i = 0; i < selectedAITeams.length; i++) {
            const teamInfo = AI_TEAMS.find(t => t.short === selectedAITeams[i]);
            if (!teamInfo) continue;
            teams.push({
                id: i + 1,
                name: teamInfo.name,
                short: teamInfo.short,
                color: teamInfo.color,
                isAdmin: false,
                purse: purse,
                originalPurse: purse,
                squad: [],
                roleCount: { batsman: 0, bowler: 0, allrounder: 0, wicketkeeper: 0 }
            });
        }

        return teams;
    }

    return { AI_TEAMS, createTeams };
})();
