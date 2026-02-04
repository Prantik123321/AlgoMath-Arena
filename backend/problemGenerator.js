class ProblemGenerator {
    constructor() {
        this.operationSymbols = {
            '+': 'addition',
            '-': 'subtraction',
            '*': 'multiplication',
            '/': 'division',
            '%': 'modulo',
            '^': 'exponentiation'
        };
        
        this.recentProblems = new Set();
        this.maxHistory = 100;
    }
    
    generateProblem() {
        let problem;
        let attempts = 0;
        
        do {
            problem = this.createRandomProblem();
            attempts++;
        } while (this.isRecentProblem(problem) && attempts < 10);
        
        this.addToRecent(problem);
        return problem;
    }
    
    createRandomProblem() {
        // Random number of numbers (4-6)
        const numCount = Math.floor(Math.random() * 3) + 4;
        
        // Generate random numbers (1-50)
        const numbers = [];
        for (let i = 0; i < numCount; i++) {
            numbers.push(Math.floor(Math.random() * 50) + 1);
        }
        
        // Generate operations (2-4 operations)
        const opCount = Math.min(numCount - 1, Math.floor(Math.random() * 3) + 2);
        const allOps = Object.keys(this.operationSymbols);
        const operations = [];
        
        for (let i = 0; i < opCount; i++) {
            operations.push(allOps[Math.floor(Math.random() * allOps.length)]);
        }
        
        // Generate steps
        const steps = this.generateSteps(numbers, operations);
        
        // Calculate answer
        const answer = this.calculateAnswer(numbers, operations);
        
        return {
            numbers,
            operations,
            steps,
            answer: parseFloat(answer.toFixed(2))
        };
    }
    
    generateSteps(numbers, operations) {
        const steps = [];
        let stepNumbers = [...numbers];
        let stepOps = [...operations];
        
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const num1 = stepNumbers[0];
            const num2 = stepNumbers[1];
            
            let stepText;
            switch (op) {
                case '+':
                    stepText = `Add ${num1} and ${num2}`;
                    break;
                case '-':
                    stepText = `Subtract ${num2} from ${num1}`;
                    break;
                case '*':
                    stepText = `Multiply ${num1} by ${num2}`;
                    break;
                case '/':
                    stepText = `Divide ${num1} by ${num2}`;
                    break;
                case '%':
                    stepText = `Calculate ${num1} modulo ${num2}`;
                    break;
                case '^':
                    stepText = `Raise ${num1} to the power of ${num2}`;
                    break;
            }
            
            steps.push(`${i + 1}. ${stepText}`);
            
            // Calculate result for next step
            const result = this.performOperation(num1, num2, op);
            stepNumbers = [result, ...stepNumbers.slice(2)];
        }
        
        // Final step
        steps.push(`${steps.length + 1}. Round the result to 2 decimal places if necessary`);
        
        return steps;
    }
    
    calculateAnswer(numbers, operations) {
        let result = numbers[0];
        
        for (let i = 0; i < operations.length; i++) {
            const nextNum = numbers[i + 1];
            result = this.performOperation(result, nextNum, operations[i]);
        }
        
        return parseFloat(result.toFixed(2));
    }
    
    performOperation(a, b, op) {
        switch (op) {
            case '+':
                return a + b;
            case '-':
                return a - b;
            case '*':
                return a * b;
            case '/':
                return a / b;
            case '%':
                return a % b;
            case '^':
                return Math.pow(a, b);
            default:
                return 0;
        }
    }
    
    isRecentProblem(problem) {
        const hash = this.hashProblem(problem);
        return this.recentProblems.has(hash);
    }
    
    addToRecent(problem) {
        const hash = this.hashProblem(problem);
        this.recentProblems.add(hash);
        
        // Limit history size
        if (this.recentProblems.size > this.maxHistory) {
            const first = this.recentProblems.values().next().value;
            this.recentProblems.delete(first);
        }
    }
    
    hashProblem(problem) {
        return `${problem.numbers.join(',')}|${problem.operations.join(',')}`;
    }
}

module.exports = new ProblemGenerator();