class Leaderboard {
    constructor() {
        this.leaderboardData = [];
        this.currentPage = 1;
        this.pageSize = 20;
        
        this.init();
    }
    
    init() {
        // DOM Elements
        this.elements = {
            leaderboardTable: document.getElementById('leaderboardTable'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            backToMenu: document.getElementById('backToMenu'),
            playerRank: document.getElementById('playerRank'),
            playerScore: document.getElementById('playerScore'),
            playerProblems: document.getElementById('playerProblems'),
            playerTime: document.getElementById('playerTime')
        };
        
        // Event Listeners
        this.elements.backToMenu.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Load leaderboard
        this.loadLeaderboard();
        
        // Load player stats
        this.loadPlayerStats();
    }
    
    async loadLeaderboard() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/leaderboard');
            this.leaderboardData = await response.json();
            
            this.renderLeaderboard();
            this.showLoading(false);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showError('Failed to load leaderboard. Please try again.');
        }
    }
    
    renderLeaderboard() {
        if (!this.leaderboardData || this.leaderboardData.length === 0) {
            this.elements.leaderboardTable.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">No players yet. Be the first!</td>
                </tr>
            `;
            return;
        }
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.leaderboardData.slice(startIndex, endIndex);
        
        let html = '';
        
        pageData.forEach((player, index) => {
            const rank = startIndex + index + 1;
            const isCurrentPlayer = player.name === localStorage.getItem('playerName');
            
            html += `
                <tr class="${isCurrentPlayer ? 'current-player' : ''}">
                    <td class="rank">${rank}</td>
                    <td class="player-name">
                        ${this.getRankIcon(rank)} ${player.name}
                        ${isCurrentPlayer ? ' (You)' : ''}
                    </td>
                    <td class="score">${player.score.toLocaleString()}</td>
                    <td class="problems">${player.problemsSolved}</td>
                    <td class="time">${player.bestTime ? this.formatTime(player.bestTime) : '--:--'}</td>
                    <td class="last-played">${this.formatDate(player.lastPlayed)}</td>
                </tr>
            `;
        });
        
        this.elements.leaderboardTable.innerHTML = html;
        this.renderPagination();
    }
    
    renderPagination() {
        const totalPages = Math.ceil(this.leaderboardData.length / this.pageSize);
        
        if (totalPages <= 1) return;
        
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        
        // Previous button
        if (this.currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '← Previous';
            prevBtn.className = 'page-btn';
            prevBtn.addEventListener('click', () => {
                this.currentPage--;
                this.renderLeaderboard();
            });
            paginationContainer.appendChild(prevBtn);
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.renderLeaderboard();
            });
            paginationContainer.appendChild(pageBtn);
        }
        
        // Next button
        if (this.currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next →';
            nextBtn.className = 'page-btn';
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderLeaderboard();
            });
            paginationContainer.appendChild(nextBtn);
        }
        
        // Clear existing pagination and add new
        const existingPagination = document.querySelector('.pagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        this.elements.leaderboardTable.parentNode.appendChild(paginationContainer);
    }
    
    loadPlayerStats() {
        const playerName = localStorage.getItem('playerName');
        if (!playerName) return;
        
        const stats = JSON.parse(localStorage.getItem('playerStats')) || {
            problemsSolved: 0,
            bestTime: null,
            wins: 0,
            totalGames: 0
        };
        
        // Update player stats display
        this.elements.playerScore.textContent = stats.problemsSolved * 100;
        this.elements.playerProblems.textContent = stats.problemsSolved;
        
        if (stats.bestTime) {
            this.elements.playerTime.textContent = this.formatTime(stats.bestTime);
        }
        
        // Find player rank
        if (this.leaderboardData.length > 0) {
            const playerIndex = this.leaderboardData.findIndex(p => p.name === playerName);
            if (playerIndex !== -1) {
                this.elements.playerRank.textContent = playerIndex + 1;
            }
        }
    }
    
    getRankIcon(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        if (rank <= 10) return '⭐';
        return '';
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // Less than a day
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            if (hours === 0) return 'Just now';
            if (hours === 1) return '1 hour ago';
            return `${hours} hours ago`;
        }
        
        // Less than a week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
        
        // Format date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
    }
    
    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.style.display = 'block';
        this.elements.loading.style.display = 'none';
    }
}

// Initialize leaderboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Leaderboard();
});