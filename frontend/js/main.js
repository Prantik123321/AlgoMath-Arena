class MainMenu {
    constructor() {
        this.playerName = localStorage.getItem('playerName') || '';
        this.stats = JSON.parse(localStorage.getItem('playerStats')) || {
            problemsSolved: 0,
            bestTime: null,
            wins: 0,
            totalGames: 0
        };
        
        this.init();
    }
    
    init() {
        // DOM Elements
        this.nameInput = document.getElementById('playerName');
        this.singlePlayerBtn = document.getElementById('singlePlayerBtn');
        this.multiplayerBtn = document.getElementById('multiplayerBtn');
        this.leaderboardBtn = document.getElementById('leaderboardBtn');
        this.howToPlayBtn = document.getElementById('howToPlayBtn');
        
        // Initialize values
        if (this.playerName) {
            this.nameInput.value = this.playerName;
        }
        
        this.updateStatsDisplay();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Player name input
        this.nameInput.addEventListener('input', (e) => {
            this.playerName = e.target.value.trim();
            localStorage.setItem('playerName', this.playerName);
            this.updateLevel();
        });
        
        // Single Player
        this.singlePlayerBtn.addEventListener('click', () => {
            if (!this.validatePlayerName()) return;
            window.location.href = 'game.html?mode=single';
        });
        
        // Multiplayer
        this.multiplayerBtn.addEventListener('click', () => {
            if (!this.validatePlayerName()) return;
            window.location.href = 'game.html?mode=multi';
        });
        
        // Leaderboard
        this.leaderboardBtn.addEventListener('click', () => {
            window.location.href = 'leaderboard.html';
        });
        
        // How to Play
        this.howToPlayBtn.addEventListener('click', () => {
            this.showHowToPlay();
        });
    }
    
    validatePlayerName() {
        if (!this.playerName) {
            alert('Please enter your name to continue!');
            this.nameInput.focus();
            return false;
        }
        if (this.playerName.length < 2) {
            alert('Name must be at least 2 characters long!');
            return false;
        }
        return true;
    }
    
    updateLevel() {
        const levelElement = document.getElementById('playerLevel');
        const solved = this.stats.problemsSolved;
        
        if (solved < 10) levelElement.textContent = 'Level: Beginner';
        else if (solved < 30) levelElement.textContent = 'Level: Intermediate';
        else if (solved < 60) levelElement.textContent = 'Level: Advanced';
        else levelElement.textContent = 'Level: Master';
        
        levelElement.style.color = this.getLevelColor(solved);
    }
    
    getLevelColor(solved) {
        if (solved < 10) return '#00dbde';
        if (solved < 30) return '#667eea';
        if (solved < 60) return '#fc00ff';
        return '#ffd700';
    }
    
    updateStatsDisplay() {
        document.getElementById('problemsSolved').textContent = this.stats.problemsSolved;
        
        // Best time
        const bestTimeElement = document.getElementById('bestTime');
        if (this.stats.bestTime) {
            const minutes = Math.floor(this.stats.bestTime / 60);
            const seconds = this.stats.bestTime % 60;
            bestTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Win rate
        const winRateElement = document.getElementById('winRate');
        if (this.stats.totalGames > 0) {
            const winRate = Math.round((this.stats.wins / this.stats.totalGames) * 100);
            winRateElement.textContent = `${winRate}%`;
        }
        
        this.updateLevel();
    }
    
    showHowToPlay() {
        const instructions = `
            🎮 HOW TO PLAY ALGOMATH ARENA 🎮

            1. CHOOSE A MODE:
               • Single Player: Practice with AI-generated problems
               • Multiplayer: Compete with 2-4 players in real-time

            2. SOLVE PROBLEMS:
               • You'll see 4-6 numbers and step-by-step instructions
               • Use operations (+, -, ×, ÷, %, ^) in the given order
               • Perform calculations sequentially as per steps

            3. RULES:
               • Each problem must be solved step-by-step
               • Use calculator for accuracy
               • Round to 2 decimals if needed
               • Faster correct answers = more points!

            4. SCORING:
               • Base points: 100 per problem
               • Time bonus: +10 points per second remaining
               • Multiplier: Correct streak increases multiplier
               • Penalty: -50 for wrong answers

            5. WIN CONDITIONS:
               • Single: Solve 10 problems in fastest time
               • Multi: First to 500 points wins the match

            🧠 Tip: Read instructions carefully before calculating!
        `;
        
        alert(instructions);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MainMenu();
});