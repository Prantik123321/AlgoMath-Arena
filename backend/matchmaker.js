// Auto-matchmaking system for multiplayer games

class Matchmaker {
    constructor() {
        this.waitingPlayers = [];
        this.matchmakingInterval = null;
        this.matchmakingDelay = 5000; // 5 seconds
        this.minPlayers = 2;
        this.maxPlayers = 4;
        this.maxWaitTime = 60000; // 1 minute
        
        this.startMatchmaking();
    }
    
    startMatchmaking() {
        if (this.matchmakingInterval) {
            clearInterval(this.matchmakingInterval);
        }
        
        this.matchmakingInterval = setInterval(() => {
            this.findMatches();
            this.cleanupOldPlayers();
        }, this.matchmakingDelay);
    }
    
    addPlayer(player) {
        // Remove if already in queue
        this.removePlayer(player.socketId);
        
        player.joinedAt = Date.now();
        player.rating = this.calculatePlayerRating(player);
        
        this.waitingPlayers.push(player);
        
        console.log(`Player ${player.playerName} added to matchmaking queue`);
        return this.waitingPlayers.length;
    }
    
    removePlayer(socketId) {
        const index = this.waitingPlayers.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            this.waitingPlayers.splice(index, 1);
            return true;
        }
        return false;
    }
    
    calculatePlayerRating(player) {
        // Simple rating system based on player stats
        // In a real implementation, this would use ELO or similar
        const baseRating = 1000;
        const winBonus = (player.wins || 0) * 10;
        const gameBonus = Math.min((player.totalGames || 0) * 5, 100);
        
        return baseRating + winBonus + gameBonus;
    }
    
    findMatches() {
        if (this.waitingPlayers.length < this.minPlayers) {
            return [];
        }
        
        const matches = [];
        const usedPlayers = new Set();
        
        // Sort by rating for fair matches
        this.waitingPlayers.sort((a, b) => Math.abs(a.rating - b.rating));
        
        // Try to create matches of maxPlayers first
        for (let i = 0; i <= this.waitingPlayers.length - this.maxPlayers; i++) {
            const potentialMatch = this.waitingPlayers.slice(i, i + this.maxPlayers);
            
            // Check if all players are available
            if (potentialMatch.every(p => !usedPlayers.has(p.socketId))) {
                // Check rating difference for fair match
                const ratingDiff = Math.abs(
                    potentialMatch[0].rating - potentialMatch[potentialMatch.length - 1].rating
                );
                
                // Allow matches with rating difference up to 200
                if (ratingDiff <= 200 || 
                    potentialMatch.some(p => Date.now() - p.joinedAt > this.maxWaitTime / 2)) {
                    
                    matches.push(potentialMatch);
                    potentialMatch.forEach(p => usedPlayers.add(p.socketId));
                    i += this.maxPlayers - 1; // Skip used players
                }
            }
        }
        
        // Try to create matches with minPlayers for remaining players
        for (let i = 0; i <= this.waitingPlayers.length - this.minPlayers; i++) {
            if (usedPlayers.size >= this.waitingPlayers.length - this.minPlayers + 1) {
                break;
            }
            
            const player = this.waitingPlayers[i];
            if (usedPlayers.has(player.socketId)) continue;
            
            // Find closest rated players
            const availablePlayers = this.waitingPlayers
                .filter(p => !usedPlayers.has(p.socketId) && p.socketId !== player.socketId)
                .sort((a, b) => Math.abs(a.rating - player.rating) - Math.abs(b.rating - player.rating));
            
            if (availablePlayers.length >= this.minPlayers - 1) {
                const match = [player, ...availablePlayers.slice(0, this.minPlayers - 1)];
                matches.push(match);
                match.forEach(p => usedPlayers.add(p.socketId));
            }
        }
        
        // Remove matched players from waiting list
        this.waitingPlayers = this.waitingPlayers.filter(p => !usedPlayers.has(p.socketId));
        
        return matches;
    }
    
    cleanupOldPlayers() {
        const now = Date.now();
        const oldPlayers = this.waitingPlayers.filter(p => now - p.joinedAt > this.maxWaitTime);
        
        if (oldPlayers.length > 0) {
            console.log(`Cleaning up ${oldPlayers.length} old players from matchmaking`);
            this.waitingPlayers = this.waitingPlayers.filter(p => now - p.joinedAt <= this.maxWaitTime);
        }
    }
    
    getQueueStatus() {
        return {
            waiting: this.waitingPlayers.length,
            estimatedWait: this.estimateWaitTime(),
            players: this.waitingPlayers.map(p => ({
                playerName: p.playerName,
                waitingTime: Date.now() - p.joinedAt
            }))
        };
    }
    
    estimateWaitTime() {
        if (this.waitingPlayers.length < this.minPlayers) {
            return null; // Not enough players
        }
        
        // Simple estimation based on player count
        const neededPlayers = this.maxPlayers - (this.waitingPlayers.length % this.maxPlayers);
        const avgWaitPerPlayer = 15000; // 15 seconds average
        
        return Math.max(0, neededPlayers * avgWaitPerPlayer);
    }
    
    stopMatchmaking() {
        if (this.matchmakingInterval) {
            clearInterval(this.matchmakingInterval);
            this.matchmakingInterval = null;
        }
    }
}

module.exports = new Matchmaker();