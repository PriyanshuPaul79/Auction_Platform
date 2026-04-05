/**
 * Storage Manager
 * Handles all localStorage persistence with versioning
 */

const Storage = (() => {
    const PREFIX = 'cricket_auction_';
    const VERSION = '1.0';

    const KEYS = {
        VERSION:     PREFIX + 'version',
        CONFIG:      PREFIX + 'config',
        PLAYERS:     PREFIX + 'players',
        TEAMS:       PREFIX + 'teams',
        AUCTION:     PREFIX + 'auction_state',
        HISTORY:     PREFIX + 'history',
        FEED:        PREFIX + 'feed',
    };

    function save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage save error:', e);
            return false;
        }
    }

    function load(key, fallback = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.error('Storage load error:', e);
            return fallback;
        }
    }

    function remove(key) {
        localStorage.removeItem(key);
    }

    function clearAll() {
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    }

    // Config
    function saveConfig(config) { return save(KEYS.CONFIG, config); }
    function loadConfig() { return load(KEYS.CONFIG); }

    // Players
    function savePlayers(players) { return save(KEYS.PLAYERS, players); }
    function loadPlayers() { return load(KEYS.PLAYERS, []); }

    // Teams
    function saveTeams(teams) { return save(KEYS.TEAMS, teams); }
    function loadTeams() { return load(KEYS.TEAMS, []); }

    // Auction State
    function saveAuctionState(state) { return save(KEYS.AUCTION, state); }
    function loadAuctionState() { return load(KEYS.AUCTION); }

    // History
    function saveHistory(history) { return save(KEYS.HISTORY, history); }
    function loadHistory() { return load(KEYS.HISTORY, []); }

    // Feed
    function saveFeed(feed) { return save(KEYS.FEED, feed); }
    function loadFeed() { return load(KEYS.FEED, []); }

    // Check if previous session exists
    function hasExistingSession() {
        return load(KEYS.AUCTION) !== null;
    }

    function getVersion() {
        return load(KEYS.VERSION, null);
    }

    function setVersion() {
        save(KEYS.VERSION, VERSION);
    }

    return {
        KEYS, save, load, remove, clearAll,
        saveConfig, loadConfig,
        savePlayers, loadPlayers,
        saveTeams, loadTeams,
        saveAuctionState, loadAuctionState,
        saveHistory, loadHistory,
        saveFeed, loadFeed,
        hasExistingSession, getVersion, setVersion
    };
})();
