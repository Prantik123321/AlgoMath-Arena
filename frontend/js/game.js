class Game {
    constructor() {
        this.mode = this.getGameMode();
        this.problems = [];
        this.currentProblemIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.streak = 0;
        this.multiplier = 1;
        this.timeLeft = 60;
        this.timer = null;
        this.problemStartTime = null;
        this.maxTime = 60;
        this.totalProblems = 10;
        this.gameActive = false;
        
        // Socket for multiplayer
        this.socket = null;
        this.gameId = null;
        this.players = [];
        this.isMultiplayer = this.mode === 'multi';
        
        this.init();
    }
    
    init() {
        // DOM Elements
        this.elements = {
            gameMode: document.getElementById('gameMode'),
            gameTimer: document.getElementById('gameTimer'),
            gameScore: document.getElementById('gameScore'),
            backToMenu: document.getElementById('backToMenu'),
            numbersGrid: document.getElementById('numbersGrid'),
            operationsList: document.getElementById('operationsList'),
            stepsList: document.getElementById('stepsList'),
            problemNumber: document.getElementById('problemNumber'),
            answerInput: document.getElementById('answerInput'),
            submitAnswer: document.getElementById('submitAnswer'),
            nextProblem: document.getElementById('nextProblem'),
            resultDisplay: document.getElementById('resultDisplay'),
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            resultPoints: document.getElementById('resultPoints'),
            correctCount: document.getElementById('correctCount'),
            streakCount: document.getElementById('streakCount'),
            multiplier: document.getElementById('multiplier'),
            progressFill: document.getElementById('progressFill'),
            calcDisplay: document.getElementById('calcDisplay'),
            playersContainer: document.getElementById('multiplayerPlayers'),
            playersList: document.getElementById('playersList')
        };
        
        // Setup calculator
        this.setupCalculator();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize based on mode
        if (this.isMultiplayer) {
            this.initMultiplayer();
            this.elements.gameMode.textContent = 'Multiplayer';
        } else {
            this.startSinglePlayer();
            this.elements.gameMode.textContent = 'Single Player';
        }
    }
    
    getGameMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mode') || 'single';
    }
    
    setupEventListeners() {
        // Back to menu
        this.elements.backToMenu.addEventListener('click', () => {
            if (confirm('Are you sure you want to leave the game?')) {
                window.location.href = 'index.html';
            }
        });
        
        // Submit answer
        this.elements.submitAnswer.addEventListener('click', () => this.submitAnswer());
        this.elements.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitAnswer();
        });
        
        // Next problem
        this.elements.nextProblem.addEventListener('click', () => this.loadNextProblem());
    }
    
    setupCalculator() {
        const calcButtons = document.querySelectorAll('.calc-btn');
        
        calcButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                const operation = e.target.dataset.operation;
                
                if (value) {
                    this.elements.calcDisplay.value += value;
                } else if (operation) {
                    // Convert symbols for display
                    const displayOp = this.getOperationSymbol(operation);
                    this.elements.calcDisplay.value += ` ${displayOp} `;
                }
            });
        });
        
        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.elements.calcDisplay.value = '';
        });
        
        // Backspace button
        document.getElementById('backspaceBtn').addEventListener('click', () => {
            this.elements.calcDisplay.value = this.elements.calcDisplay.value.slice(0, -1);
        });
        
        // Equals button
        document.getElementById('equalsBtn').addEventListener('click', () => {
            try {
                const expression = this.elements.calcDisplay.value
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/\^/g, '**');
                
                const result = eval(expression);
                this.elements.answerInput.value = parseFloat(result.toFixed(2));
            } catch (error) {
                console.error('Calculation error:', error);
            }
        });
    }
    
    getOperationSymbol(op) {
        const symbols = {
            '+': '+',
            '-': '-',
            '*': '×',
            '/': '÷',
            '%': '%',
            '^': '^'
        };
        return symbols[op] || op;
    }
    
    initMultiplayer() {
        this.socket = io();
        const playerName = localStorage.getItem('playerName') || 'Player';
        
        // Show multiplayer players display
        this.elements.playersContainer.classList.remove('hidden');
        
        // Socket event listeners
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('joinMultiplayer', { playerName });
        });
        
        this.socket.on('waiting', (data) => {
            this.showMessage('Waiting for other players...', 'info');
        });
        
        this.socket.on('gameStart', (data) => {
            this.gameId = data.gameId;
            this.players = data.players;
            this.updatePlayersDisplay();
            this.showMessage('Game starting!', 'success');
            this.startGame();
        });
        
        this.socket.on('newProblem', (data) => {
            this.loadProblem(data.problem);
            this.elements.problemNumber.textContent = data.problemNumber;
            this.startTimer(data.timeLimit / 1000);
        });
        
        this.socket.on('answerResult', (data) => {
            this.showResult(data.correct, data.points, data.playerName);
            this.updatePlayersDisplay();
        });
        
        this.socket.on('timeUp', (data) => {
            this.showMessage('Time\'s up!', 'warning');
            setTimeout(() => {
                if (this.gameActive) {
                    this.loadNextProblem();
                }
            }, 2000);
        });
        
        this.socket.on('gameEnd', (data) => {
            this.endGame(data.winner, data.finalScores);
        });
        
        this.socket.on('playerLeft', (data) => {
            this.showMessage(`${data.playerName} left the game`, 'warning');
            this.updatePlayersDisplay();
        });
    }
    
    startSinglePlayer() {
        // Fetch first problem
        this.fetchProblem();
        this.startGame();
    }
    
    startGame() {
        this.gameActive = true;
        this.updateStats();
        this.startTimer(this.maxTime);
    }
    
    async fetchProblem() {
        try {
            const response = await fetch('/api/problem');
            const problem = await response.json();
            this.problems.push(problem);
            this.loadProblem(problem);
        } catch (error) {
            console.error('Error fetching problem:', error);
            // Fallback problem
            this.loadProblem({
                numbers: [15, 4, 22, 9, 13, 6],
                operations: ['%', '^', '/', '+', '-'],
                steps: [
                    "1. Calculate the modulo of the first number by the second number",
                    "2. Raise the third number to the power of the result from step 1",
                    "3. Divide the result from step 2 by the fourth number",
                    "4. Add the fifth number to the result from step 3",
                    "5. Subtract the sixth number from the result of step 4"
                ],
                answer: 24.44
            });
        }
    }
    
    loadProblem(problem) {
        this.currentProblem = problem;
        this.problemStartTime = Date.now();
        this.timeLeft = this.maxTime;
        
        // Display numbers
        this.elements.numbersGrid.innerHTML = '';
        problem.numbers.forEach(num => {
            const numElement = document.createElement('div');
            numElement.className = 'number-item';
            numElement.textContent = num;
            this.elements.numbersGrid.appendChild(numElement);
        });
        
        // Display operations
        this.elements.operationsList.innerHTML = '';
        problem.operations.forEach(op => {
            const opElement = document.createElement('div');
            opElement.className = 'operation-item';
            opElement.textContent = this.getOperationSymbol(op);
            this.elements.operationsList.appendChild(opElement);
        });
        
        // Display steps
        this.elements.stepsList.innerHTML = '';
        problem.steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.textContent = step;
            this.elements.stepsList.appendChild(li);
        });
        
        // Reset UI
        this.elements.answerInput.value = '';
        this.elements.calcDisplay.value = '';
        this.elements.resultDisplay.classList.add('hidden');
        this.elements.answerInput.disabled = false;
        this.elements.submitAnswer.disabled = false;
        
        // Focus on input
        this.elements.answerInput.focus();
    }
    
    submitAnswer() {
        if (!this.gameActive) return;
        
        const userAnswer = parseFloat(this.elements.answerInput.value);
        if (isNaN(userAnswer)) {
            alert('Please enter a valid number');
            return;
        }
        
        const correctAnswer = this.currentProblem.answer;
        const tolerance = 0.01; // For floating point comparison
        
        const isCorrect = Math.abs(userAnswer - correctAnswer) < tolerance;
        
        if (this.isMultiplayer) {
            // Send answer to server for multiplayer
            this.socket.emit('submitAnswer', {
                gameId: this.gameId,
                answer: userAnswer
            });
        } else {
            // Calculate points for single player
            const timeTaken = (Date.now() - this.problemStartTime) / 1000;
            const timeBonus = Math.max(0, Math.floor((this.maxTime - timeTaken) * 10));
            const basePoints = 100;
            const points = basePoints + timeBonus;
            
            if (isCorrect) {
                this.score += points * this.multiplier;
                this.correctAnswers++;
                this.streak++;
                this.multiplier = Math.min(3, 1 + Math.floor(this.streak / 3) * 0.5);
                
                this.showResult(true, points);
                this.updateStats();
                
                // Update progress
                const progress = ((this.currentProblemIndex + 1) / this.totalProblems) * 100;
                this.elements.progressFill.style.width = `${progress}%`;
                
                // Save score to local storage
                this.saveStats();
            } else {
                this.streak = 0;
                this.multiplier = 1;
                this.showResult(false, -50);
            }
            
            // Disable input
            this.elements.answerInput.disabled = true;
            this.elements.submitAnswer.disabled = true;
            
            // Show next problem button after delay
            setTimeout(() => {
                this.elements.nextProblem.classList.remove('hidden');
            }, 1500);
        }
    }
    
    showResult(isCorrect, points, playerName = null) {
        this.elements.resultDisplay.classList.remove('hidden');
        
        if (isCorrect) {
            this.elements.resultTitle.textContent = playerName 
                ? `${playerName} got it right! ✅` 
                : 'Correct! ✅';
            this.elements.resultTitle.style.color = '#7bff7b';
            this.elements.resultDisplay.classList.add('correct-animation');
            
            this.elements.resultMessage.textContent = playerName 
                ? 'Well done!' 
                : 'Great job!';
            
            this.elements.resultPoints.textContent = playerName
                ? `+${points} points`
                : `+${points} points (×${this.multiplier.toFixed(1)})`;
            
            // Play sound if available
            this.playSound('correct');
        } else {
            this.elements.resultTitle.textContent = playerName 
                ? `${playerName} was wrong ❌` 
                : 'Incorrect ❌';
            this.elements.resultTitle.style.color = '#ff6b6b';
            this.elements.resultDisplay.classList.add('wrong-animation');
            
            this.elements.resultMessage.textContent = playerName
                ? 'Better luck next time!'
                : `Correct answer was ${this.currentProblem.answer}`;
            
            this.elements.resultPoints.textContent = playerName
                ? `${points} points`
                : `${points} points`;
            
            // Play sound if available
            this.playSound('wrong');
        }
    }
    
    loadNextProblem() {
        this.currentProblemIndex++;
        
        if (this.isMultiplayer) {
            // In multiplayer, wait for server to send next problem
            this.elements.resultDisplay.classList.add('hidden');
            this.elements.nextProblem.classList.add('hidden');
            return;
        }
        
        if (this.currentProblemIndex < this.totalProblems) {
            this.elements.problemNumber.textContent = this.currentProblemIndex + 1;
            this.elements.resultDisplay.classList.add('hidden');
            this.elements.nextProblem.classList.add('hidden');
            
            if (this.currentProblemIndex >= this.problems.length) {
                this.fetchProblem();
            } else {
                this.loadProblem(this.problems[this.currentProblemIndex]);
            }
        } else {
            this.endGame();
        }
    }
    
    startTimer(seconds) {
        clearInterval(this.timer);
        this.timeLeft = seconds;
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.elements.gameTimer.textContent = `Time: ${this.timeLeft}s`;
            
            if (this.timeLeft <= 10) {
                this.elements.gameTimer.style.color = '#ff6b6b';
                this.elements.gameTimer.style.animation = 'pulse 0.5s infinite';
                
                // Play tick sound if available
                if (this.timeLeft <= 5) {
                    this.playSound('timer');
                }
            }
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.timeUp();
            }
        }, 1000);
    }
    
    timeUp() {
        if (this.isMultiplayer) {
            // Server handles time up in multiplayer
            return;
        }
        
        this.showResult(false, 0);
        this.streak = 0;
        this.multiplier = 1;
        
        setTimeout(() => {
            if (this.gameActive) {
                this.loadNextProblem();
            }
        }, 2000);
    }
    
    updateStats() {
        this.elements.gameScore.textContent = `Score: ${this.score}`;
        this.elements.correctCount.textContent = this.correctAnswers;
        this.elements.streakCount.textContent = this.streak;
        this.elements.multiplier.textContent = `${this.multiplier.toFixed(1)}x`;
    }
    
    updatePlayersDisplay() {
        if (!this.players || this.players.length === 0) return;
        
        this.elements.playersList.innerHTML = '';
        this.players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            
            if (player.playerName === localStorage.getItem('playerName')) {
                playerCard.classList.add('current-player');
            }
            
            playerCard.innerHTML = `
                <div class="name">${player.playerName}</div>
                <div class="score">${player.score || 0}</div>
                <div class="status">${player.status || 'Playing'}</div>
            `;
            
            this.elements.playersList.appendChild(playerCard);
        });
    }
    
    endGame(winner = null, finalScores = null) {
        this.gameActive = false;
        clearInterval(this.timer);
        
        if (this.isMultiplayer) {
            let message = winner === localStorage.getItem('playerName')
                ? '🎉 You won the game! 🎉'
                : `🏆 ${winner} won the game!`;
            
            let scoresHTML = '<h3>Final Scores:</h3>';
            finalScores.forEach(player => {
                scoresHTML += `<p>${player.playerName}: ${player.score} points</p>`;
            });
            
            this.showMessage(message + '<br>' + scoresHTML, 'success');
            
            // Save score to server
            this.saveScoreToServer();
        } else {
            // Single player end
            const finalScore = this.score;
            const timeTaken = this.maxTime * this.totalProblems;
            const accuracy = (this.correctAnswers / this.totalProblems) * 100;
            
            const message = `
                <h2>Game Complete! 🎮</h2>
                <p>Final Score: <strong>${finalScore}</strong></p>
                <p>Problems Correct: ${this.correctAnswers}/${this.totalProblems}</p>
                <p>Accuracy: ${accuracy.toFixed(1)}%</p>
                <p>Best Streak: ${this.streak}</p>
            `;
            
            this.showMessage(message, 'success');
            
            // Save high score
            this.saveStats();
            this.saveScoreToServer();
        }
        
        // Show return to menu button
        setTimeout(() => {
            if (confirm('Return to main menu?')) {
                window.location.href = 'index.html';
            }
        }, 3000);
    }
    
    saveStats() {
        const stats = JSON.parse(localStorage.getItem('playerStats')) || {
            problemsSolved: 0,
            bestTime: null,
            wins: 0,
            totalGames: 0
        };
        
        stats.problemsSolved += this.correctAnswers;
        stats.totalGames++;
        
        if (this.isMultiplayer && this.score > 0) {
            stats.wins++;
        }
        
        localStorage.setItem('playerStats', JSON.stringify(stats));
    }
    
    async saveScoreToServer() {
        const playerName = localStorage.getItem('playerName');
        if (!playerName) return;
        
        try {
            const response = await fetch('/api/score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName,
                    score: this.score,
                    problemsSolved: this.correctAnswers,
                    time: this.timeLeft
                })
            });
            
            console.log('Score saved to server');
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }
    
    showMessage(text, type = 'info') {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = text;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 25px;
            background: ${type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 
                         type === 'warning' ? 'rgba(255, 165, 0, 0.2)' : 
                         'rgba(0, 219, 222, 0.2)'};
            border: 2px solid ${type === 'success' ? '#7bff7b' : 
                              type === 'warning' ? '#ffa500' : 
                              '#00dbde'};
            color: white;
            border-radius: 10px;
            z-index: 1000;
            text-align: center;
            animation: slideIn 0.5s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
    
    playSound(type) {
        // Placeholder for sound effects
        // In a real implementation, you would load and play audio files
        console.log(`Play ${type} sound`);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});