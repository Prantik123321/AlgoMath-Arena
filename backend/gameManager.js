// Game state management for multiplayer games

class GameManager {
    constructor() {
        this.games = new Map();
        this.playerToGame = new Map();
    }
    
    createGame(players, gameId = null) {
        const id = gameId || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const game = {
            id,
            players: players.map(player => ({
                socketId: player.socketId,
                playerName: player.playerName,
                score: 0,
                correctAnswers: 0,
                connected: true
            })),
            currentProblem: null,
            problemStartTime: null,
            timer: 30000, // 30 seconds
            problemNumber: 0,
            status: 'waiting', // waiting, active, finished
            winner: null,
            createdAt: Date.now()
        };
        
        this.games.set(id, game);
        
        // Track player to game mapping
        players.forEach(player => {
            this.playerToGame.set(player.socketId, id);
        });
        
        return game;
    }
    
    getGame(gameId) {
        return this.games.get(gameId);
    }
    
    getPlayerGame(socketId) {
        const gameId = this.playerToGame.get(socketId);
        return gameId ? this.games.get(gameId) : null;
    }
    
    addPlayerToGame(gameId, player) {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'waiting') return false;
        
        if (game.players.length >= 4) return false;
        
        game.players.push({
            socketId: player.socketId,
            playerName: player.playerName,
            score: 0,
            correctAnswers: 0,
            connected: true
        });
        
        this.playerToGame.set(player.socketId, gameId);
        return true;
    }
    
    removePlayer(socketId) {
        const gameId = this.playerToGame.get(socketId);
        if (!gameId) return null;
        
        const game = this.games.get(gameId);
        if (!game) return null;
        
        const playerIndex = game.players.findIndex(p => p.socketId === socketId);
        if (playerIndex === -1) return null;
        
        const removedPlayer = game.players[playerIndex];
        game.players.splice(playerIndex, 1);
        
        this.playerToGame.delete(socketId);
        
        // Update game status if needed
        if (game.players.length < 2 && game.status === 'active') {
            game.status = 'finished';
            if (game.players.length === 1) {
                game.winner = game.players[0].playerName;
            }
        }
        
        return { gameId, player: removedPlayer };
    }
    
    updatePlayerScore(gameId, socketId, points, isCorrect = true) {
        const game = this.games.get(gameId);
        if (!game) return null;
        
        const player = game.players.find(p => p.socketId === socketId);
        if (!player) return null;
        
        player.score = Math.max(0, player.score + points);
        if (isCorrect) {
            player.correctAnswers++;
        }
        
        // Check for winner
        if (player.score >= 500 && game.status === 'active') {
            game.status = 'finished';
            game.winner = player.playerName;
        }
        
        return player.score;
    }
    
    setCurrentProblem(gameId, problem) {
        const game = this.games.get(gameId);
        if (!game) return false;
        
        game.currentProblem = problem;
        game.problemStartTime = Date.now();
        game.problemNumber++;
        
        return true;
    }
    
    getGameStatus(gameId) {
        const game = this.games.get(gameId);
        if (!game) return null;
        
        return {
            id: game.id,
            status: game.status,
            players: game.players.map(p => ({
                playerName: p.playerName,
                score: p.score,
                correctAnswers: p.correctAnswers
            })),
            problemNumber: game.problemNumber,
            winner: game.winner
        };
    }
    
    cleanupOldGames(maxAge = 3600000) { // 1 hour
        const now = Date.now();
        const toDelete = [];
        
        for (const [gameId, game] of this.games.entries()) {
            if (game.status === 'finished' || (now - game.createdAt > maxAge)) {
                // Remove player mappings
                game.players.forEach(player => {
                    this.playerToGame.delete(player.socketId);
                });
                toDelete.push(gameId);
            }
        }
        
        toDelete.forEach(gameId => {
            this.games.delete(gameId);
        });
        
        return toDelete.length;
    }
}

module.exports = new GameManager();