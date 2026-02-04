const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Problem Generator
const problemGenerator = require('./problemGenerator');

// Game state management
const games = new Map();
const waitingPlayers = [];
const scoresPath = path.join(__dirname, '../data/scores.json');

// Load scores
async function loadScores() {
    try {
        const data = await fs.readFile(scoresPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { players: [] };
    }
}

// Save scores
async function saveScores(scores) {
    await fs.writeFile(scoresPath, JSON.stringify(scores, null, 2));
}

// Routes
app.get('/api/problem', (req, res) => {
    const problem = problemGenerator.generateProblem();
    res.json(problem);
});

app.get('/api/leaderboard', async (req, res) => {
    const scores = await loadScores();
    res.json(scores.players.sort((a, b) => b.score - a.score).slice(0, 50));
});

app.post('/api/score', async (req, res) => {
    const { playerName, score, problemsSolved, time } = req.body;
    const scores = await loadScores();
    
    let player = scores.players.find(p => p.name === playerName);
    if (player) {
        player.score = Math.max(player.score, score);
        player.problemsSolved += problemsSolved;
        if (time < player.bestTime || !player.bestTime) {
            player.bestTime = time;
        }
        player.lastPlayed = new Date().toISOString();
    } else {
        scores.players.push({
            name: playerName,
            score,
            problemsSolved,
            bestTime: time,
            lastPlayed: new Date().toISOString()
        });
    }
    
    await saveScores(scores);
    res.json({ success: true });
});

// Socket.io connections
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('joinMultiplayer', (playerData) => {
        const { playerName } = playerData;
        socket.playerName = playerName;
        
        waitingPlayers.push({
            socketId: socket.id,
            playerName,
            socket: socket
        });
        
        console.log(`${playerName} waiting for match`);
        socket.emit('waiting', { message: 'Waiting for other players...' });
        
        // Try to match players
        tryMatchmaking();
    });
    
    socket.on('submitAnswer', (data) => {
        const { gameId, answer } = data;
        const game = games.get(gameId);
        
        if (!game) return;
        
        const player = game.players.find(p => p.socketId === socket.id);
        if (!player) return;
        
        const isCorrect = Math.abs(answer - game.currentProblem.answer) < 0.01;
        
        if (isCorrect) {
            const timeLeft = game.timer - (Date.now() - game.problemStartTime);
            const points = 100 + Math.floor(timeLeft / 100);
            
            player.score += points;
            player.correctAnswers++;
            
            // Check if player reached winning score
            if (player.score >= 500) {
                endGame(gameId, player.playerName);
                return;
            }
            
            // Broadcast correct answer
            io.to(gameId).emit('answerResult', {
                playerName: player.playerName,
                correct: true,
                points,
                newScore: player.score
            });
            
            // Next problem after delay
            setTimeout(() => {
                if (games.has(gameId)) {
                    sendNextProblem(gameId);
                }
            }, 2000);
        } else {
            player.score = Math.max(0, player.score - 50);
            
            io.to(gameId).emit('answerResult', {
                playerName: player.playerName,
                correct: false,
                points: -50,
                newScore: player.score
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove from waiting players
        const waitingIndex = waitingPlayers.findIndex(p => p.socketId === socket.id);
        if (waitingIndex !== -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }
        
        // Handle disconnection from active games
        for (const [gameId, game] of games.entries()) {
            const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                if (game.players.length <= 2) {
                    // End game if only 2 players and one leaves
                    endGame(gameId, game.players[1 - playerIndex]?.playerName || 'Opponent');
                } else {
                    // Remove player from game
                    game.players.splice(playerIndex, 1);
                    io.to(gameId).emit('playerLeft', {
                        playerName: socket.playerName
                    });
                }
                break;
            }
        }
    });
});

function tryMatchmaking() {
    if (waitingPlayers.length >= 2) {
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const players = waitingPlayers.splice(0, Math.min(4, waitingPlayers.length));
        
        const game = {
            id: gameId,
            players: players.map(p => ({
                socketId: p.socketId,
                playerName: p.playerName,
                score: 0,
                correctAnswers: 0
            })),
            currentProblem: null,
            problemStartTime: null,
            timer: 30000, // 30 seconds per problem
            problemNumber: 0
        };
        
        games.set(gameId, game);
        
        // Join players to game room
        players.forEach(player => {
            player.socket.join(gameId);
        });
        
        // Send game start
        io.to(gameId).emit('gameStart', {
            gameId,
            players: game.players.map(p => ({
                playerName: p.playerName,
                score: p.score
            }))
        });
        
        console.log(`Game ${gameId} started with ${players.length} players`);
        
        // Send first problem after delay
        setTimeout(() => {
            sendNextProblem(gameId);
        }, 3000);
    }
}

function sendNextProblem(gameId) {
    const game = games.get(gameId);
    if (!game) return;
    
    game.problemNumber++;
    game.currentProblem = problemGenerator.generateProblem();
    game.problemStartTime = Date.now();
    
    io.to(gameId).emit('newProblem', {
        problemNumber: game.problemNumber,
        problem: game.currentProblem,
        timeLimit: game.timer
    });
    
    // Timeout for problem
    setTimeout(() => {
        if (games.has(gameId) && game.problemStartTime === game.currentProblem.problemStartTime) {
            io.to(gameId).emit('timeUp', {
                correctAnswer: game.currentProblem.answer
            });
            
            // Next problem after delay
            setTimeout(() => {
                if (games.has(gameId)) {
                    sendNextProblem(gameId);
                }
            }, 2000);
        }
    }, game.timer);
}

function endGame(gameId, winner) {
    const game = games.get(gameId);
    if (!game) return;
    
    // Update scores in database
    game.players.forEach(async player => {
        try {
            const scores = await loadScores();
            let dbPlayer = scores.players.find(p => p.name === player.playerName);
            
            if (dbPlayer) {
                dbPlayer.score = Math.max(dbPlayer.score, player.score);
                dbPlayer.problemsSolved += player.correctAnswers;
            } else {
                scores.players.push({
                    name: player.playerName,
                    score: player.score,
                    problemsSolved: player.correctAnswers,
                    bestTime: null,
                    lastPlayed: new Date().toISOString()
                });
            }
            
            await saveScores(scores);
        } catch (error) {
            console.error('Error saving score:', error);
        }
    });
    
    // Send game end
    io.to(gameId).emit('gameEnd', {
        winner,
        finalScores: game.players.map(p => ({
            playerName: p.playerName,
            score: p.score,
            correctAnswers: p.correctAnswers
        }))
    });
    
    // Clean up
    games.delete(gameId);
    game.players.forEach(player => {
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
            socket.leave(gameId);
        }
    });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});