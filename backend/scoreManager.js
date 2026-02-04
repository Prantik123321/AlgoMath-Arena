// Score management and leaderboard system

const fs = require('fs').promises;
const path = require('path');

class ScoreManager {
    constructor() {
        this.scoresFile = path.join(__dirname, '../data/scores.json');
        this.scores = null;
        this.cacheDuration = 60000; // 1 minute
        this.lastLoad = 0;
    }
    
    async loadScores() {
        const now = Date.now();
        
        // Use cache if recent
        if (this.scores && now - this.lastLoad < this.cacheDuration) {
            return this.scores;
        }
        
        try {
            const data = await fs.readFile(this.scoresFile, 'utf8');
            this.scores = JSON.parse(data);
            this.lastLoad = now;
            
            // Ensure structure
            if (!this.scores.players) {
                this.scores.players = [];
            }
            
            return this.scores;
        } catch (error) {
            // Create new scores file if doesn't exist
            if (error.code === 'ENOENT') {
                this.scores = { players: [] };
                await this.saveScores();
                return this.scores;
            }
            throw error;
        }
    }
    
    async saveScores() {
        try {
            await fs.writeFile(this.scoresFile, JSON.stringify(this.scores, null, 2));
            this.lastLoad = Date.now();
        } catch (error) {
            console.error('Error saving scores:', error);
            throw error;
        }
    }
    
    async updateScore(playerData) {
        await this.loadScores();
        
        const { name, score, problemsSolved, bestTime } = playerData;
        
        let player = this.scores.players.find(p => p.name === name);
        
        if (player) {
            // Update existing player
            player.score = Math.max(player.score || 0, score || 0);
            player.problemsSolved = (player.problemsSolved || 0) + (problemsSolved || 0);
            
            if (bestTime && (!player.bestTime || bestTime < player.bestTime)) {
                player.bestTime = bestTime;
            }
            
            player.lastPlayed = new Date().toISOString();
            player.gamesPlayed = (player.gamesPlayed || 0) + 1;
        } else {
            // Add new player
            player = {
                name,
                score: score || 0,
                problemsSolved: problemsSolved || 0,
                bestTime: bestTime || null,
                lastPlayed: new Date().toISOString(),
                gamesPlayed: 1,
                joined: new Date().toISOString()
            };
            
            this.scores.players.push(player);
        }
        
        await this.saveScores();
        return player;
    }
    
    async getLeaderboard(limit = 50, offset = 0) {
        await this.loadScores();
        
        // Sort by score descending
        const sortedPlayers = [...this.scores.players].sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            
            // Tie-breaker: more problems solved
            if (b.problemsSolved !== a.problemsSolved) {
                return b.problemsSolved - a.problemsSolved;
            }
            
            // Tie-breaker: better time
            if (a.bestTime && b.bestTime) {
                return a.bestTime - b.bestTime;
            }
            
            return 0;
        });
        
        return {
            players: sortedPlayers.slice(offset, offset + limit),
            total: sortedPlayers.length,
            limit,
            offset
        };
    }
    
    async getPlayerRank(playerName) {
        await this.loadScores();
        
        const leaderboard = await this.getLeaderboard(this.scores.players.length, 0);
        const playerIndex = leaderboard.players.findIndex(p => p.name === playerName);
        
        if (playerIndex === -1) {
            return null;
        }
        
        return {
            rank: playerIndex + 1,
            player: leaderboard.players[playerIndex],
            totalPlayers: leaderboard.total
        };
    }
    
    async getTopStats() {
        await this.loadScores();
        
        if (this.scores.players.length === 0) {
            return {
                topScore: 0,
                mostProblems: 0,
                bestTime: null,
                totalPlayers: 0,
                totalProblemsSolved: 0
            };
        }
        
        const topScore = Math.max(...this.scores.players.map(p => p.score));
        const mostProblems = Math.max(...this.scores.players.map(p => p.problemsSolved));
        const bestTime = Math.min(...this.scores.players.filter(p => p.bestTime).map(p => p.bestTime));
        const totalProblemsSolved = this.scores.players.reduce((sum, p) => sum + p.problemsSolved, 0);
        
        return {
            topScore,
            mostProblems,
            bestTime: bestTime !== Infinity ? bestTime : null,
            totalPlayers: this.scores.players.length,
            totalProblemsSolved
        };
    }
    
    async getPlayerStats(playerName) {
        await this.loadScores();
        
        const player = this.scores.players.find(p => p.name === playerName);
        if (!player) {
            return null;
        }
        
        const rankInfo = await this.getPlayerRank(playerName);
        const topStats = await this.getTopStats();
        
        return {
            ...player,
            rank: rankInfo?.rank,
            percentile: rankInfo ? ((rankInfo.rank / rankInfo.totalPlayers) * 100).toFixed(1) : null,
            ...topStats
        };
    }
    
    async resetScores() {
        this.scores = { players: [] };
        await this.saveScores();
        return true;
    }
    
    async cleanupInactivePlayers(daysInactive = 90) {
        await this.loadScores();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
        
        const activePlayers = this.scores.players.filter(player => {
            if (!player.lastPlayed) return true;
            return new Date(player.lastPlayed) > cutoffDate;
        });
        
        const removedCount = this.scores.players.length - activePlayers.length;
        
        if (removedCount > 0) {
            this.scores.players = activePlayers;
            await this.saveScores();
        }
        
        return removedCount;
    }
}

module.exports = new ScoreManager();