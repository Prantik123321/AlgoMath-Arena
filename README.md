# 🎮 AlgoMath Arena

**Think Algorithmically, Solve Mathematically!**

A web-based educational game for students aged 11-16 (class 6–10) that combines algorithmic thinking with step-by-step math problem solving. Features single-player practice and real-time multiplayer competitions.

## 🚀 Features

- **🧠 Single Player Mode**: Practice with AI-generated algorithmic problems
- **👥 Multiplayer Mode**: Real-time competitive matches (2-4 players)
- **🎯 Step-by-Step Problems**: Sequential calculations with 4-6 numbers
- **⚡ Real-time Gameplay**: Socket.io for instant multiplayer
- **🏆 Leaderboard**: Track top players and scores
- **📊 Player Stats**: Progress tracking and achievements
- **🎨 Modern UI**: Responsive design with smooth animations

## 📋 Game Rules

1. **Problem Structure**:
   - Each problem has 4-6 random numbers (1-50)
   - 2-4 mathematical operations in specific order
   - Must follow steps sequentially

2. **Operations Used**:
   - Addition (+), Subtraction (-)
   - Multiplication (×), Division (÷)
   - Modulo (%), Exponentiation (^)

3. **Scoring**:
   - Base: 100 points per correct answer
   - Time Bonus: +10 points per second remaining
   - Penalty: -50 points for wrong answers
   - Winning: First to 500 points (Multiplayer)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/algo-math-arena.git
cd algo-math-arena