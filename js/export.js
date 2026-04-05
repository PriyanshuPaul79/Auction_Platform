/**
 * Export Manager
 * CSV and PDF export functionality
 */

const ExportManager = (() => {

    function getSquadData(teams, players) {
        return teams.map(team => {
            const squadPlayers = team.squad
                .map(id => players.find(p => p.id === id))
                .filter(Boolean);
            const roles = { batsman: 0, bowler: 0, allrounder: 0, wicketkeeper: 0 };
            squadPlayers.forEach(p => roles[p.role]++);
            const totalSpent = squadPlayers.reduce((s, p) => s + (p.soldPrice || 0), 0);
            return { team, squadPlayers, roles, totalSpent };
        });
    }

    // ==================== CSV ====================
    function exportCSV(teams, players) {
        const data = getSquadData(teams, players);
        let csv = 'Team,Short Code,Player Name,Country,Role,Rating,Base Price (Cr),Sold Price (Cr)\n';

        data.forEach(({ team, squadPlayers }) => {
            if (squadPlayers.length === 0) {
                csv += `"${team.name}","${team.short}","No players","","","","",""\n`;
                return;
            }
            squadPlayers.forEach(p => {
                csv += `"${team.name}","${team.short}","${p.name}","${p.country}","${p.role}",${p.rating},${p.basePrice},${p.soldPrice || ''}\n`;
            });
        });

        // Add unsold players
        csv += '\n\nUnsold Players\n';
        csv += 'Player Name,Country,Role,Rating,Base Price (Cr)\n';
        players.filter(p => p.status === 'unsold' || p.status === 'available').forEach(p => {
            csv += `"${p.name}","${p.country}","${p.role}",${p.rating},${p.basePrice}\n`;
        });

        downloadFile(csv, 'cricket_auction_squads.csv', 'text/csv');
    }

    // ==================== PDF ====================
    function exportPDF(teams, players) {
        const data = getSquadData(teams, players);
        
        // Build HTML for PDF
        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cricket Auction - Team Sheets</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 30px; }
        h1 { text-align: center; font-size: 24px; margin-bottom: 5px; color: #6366f1; }
        .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 12px; }
        .team-section { margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .team-header { padding: 12px 20px; color: white; font-size: 16px; font-weight: 700; }
        .team-meta { padding: 8px 20px; background: #f8f9fa; font-size: 11px; color: #666; display: flex; gap: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f3f5; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 2px solid #dee2e6; }
        td { padding: 8px 12px; border-bottom: 1px solid #f1f3f5; font-size: 12px; }
        tr:hover td { background: #f8f9ff; }
        .role-bat { color: #3b82f6; } .role-bowl { color: #ef4444; }
        .role-ar { color: #8b5cf6; } .role-wk { color: #10b981; }
        .price { font-weight: 700; color: #10b981; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 10px; }
        @media print { .team-section { break-inside: avoid; } }
    </style>
</head>
<body>
    <h1>🏏 Cricket Auction - Team Sheets</h1>
    <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
`;

        data.forEach(({ team, squadPlayers, roles, totalSpent }) => {
            html += `
    <div class="team-section">
        <div class="team-header" style="background: ${team.color}">${team.name} (${team.short}) ${team.isAdmin ? '— Admin' : '— AI'}</div>
        <div class="team-meta">
            <span>Squad: ${squadPlayers.length}</span>
            <span>BAT: ${roles.batsman} | BOWL: ${roles.bowler} | AR: ${roles.allrounder} | WK: ${roles.wicketkeeper}</span>
            <span>Total Spent: ₹${(Math.round(totalSpent * 10) / 10)} Cr</span>
            <span>Remaining: ₹${team.purse} Cr</span>
        </div>
        <table>
            <thead><tr><th>#</th><th>Player</th><th>Country</th><th>Role</th><th>Rating</th><th>Price</th></tr></thead>
            <tbody>
`;
            squadPlayers.forEach((p, i) => {
                html += `<tr>
                    <td>${i + 1}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.countryFlag || ''} ${p.country}</td>
                    <td class="role-${p.role === 'batsman' ? 'bat' : p.role === 'bowler' ? 'bowl' : p.role === 'allrounder' ? 'ar' : 'wk'}">${p.role}</td>
                    <td>${p.rating}</td>
                    <td class="price">₹${p.soldPrice} Cr</td>
                </tr>`;
            });

            html += `</tbody></table></div>`;
        });

        html += `<p class="footer">Cricket Auction Simulator — All rights reserved</p></body></html>`;

        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    }

    // ==================== DOWNLOAD HELPER ====================
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return { exportCSV, exportPDF };
})();
