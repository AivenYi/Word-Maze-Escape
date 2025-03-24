//# sourceMappingURL=game.js.map

// 添加错误处理和调试支持
const DEBUG = true;

class Game {
    constructor() {
        try {
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }
            
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('Could not get 2D context');
            }
            
            this.cellSize = 40;
            this.maze = [];
            this.player = { x: 0, y: 0 };
            this.exit = { x: 0, y: 0 };
            this.currentWord = null;
            this.score = 0;
            this.timeLeft = 180;
            this.gameLoop = null;
            this.isGameActive = false;
            this.canMove = false;  // 添加移动标志
            
            // 初始化画布大小
            this.resizeCanvas();
            // 设置事件监听
            this.setupEventListeners();
            
            // 隐藏单词提示区域
            document.getElementById('wordPrompt').style.display = 'none';
            
            if (DEBUG) {
                console.log('Game initialized successfully');
            }
        } catch (error) {
            console.error('Error in Game constructor:', error);
            throw error;
        }
    }

    setupEventListeners() {
        try {
            window.addEventListener('resize', () => this.resizeCanvas());
            
            const startBtn = document.getElementById('startBtn');
            const submitBtn = document.getElementById('submitBtn');
            const voiceBtn = document.getElementById('voiceBtn');
            const wordInput = document.getElementById('wordInput');
            
            if (!startBtn || !submitBtn || !voiceBtn || !wordInput) {
                throw new Error('Required DOM elements not found');
            }
            
            startBtn.addEventListener('click', () => this.startGame());
            submitBtn.addEventListener('click', () => this.checkAnswer());
            voiceBtn.addEventListener('click', () => this.startVoiceInput());
            wordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.checkAnswer();
            });

            window.addEventListener('keydown', (e) => {
                if (!this.isGameActive) return;
                
                switch(e.key) {
                    case 'ArrowUp':
                        this.movePlayer(0, -1);
                        break;
                    case 'ArrowDown':
                        this.movePlayer(0, 1);
                        break;
                    case 'ArrowLeft':
                        this.movePlayer(-1, 0);
                        break;
                    case 'ArrowRight':
                        this.movePlayer(1, 0);
                        break;
                }
            });
            
            if (DEBUG) {
                console.log('Event listeners setup completed');
            }
        } catch (error) {
            console.error('Error in setupEventListeners:', error);
            throw error;
        }
    }

    resizeCanvas() {
        const container = document.querySelector('.game-container');
        const containerWidth = container.clientWidth - 40; // 减去内边距
        const containerHeight = Math.min(window.innerHeight * 0.6, 400);
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // 确保网格尺寸合适
        this.cellSize = Math.min(
            Math.floor(containerWidth / 15),
            Math.floor(containerHeight / 10)
        );
        
        this.rows = Math.floor(containerHeight / this.cellSize);
        this.cols = Math.floor(containerWidth / this.cellSize);
        
        // 如果游戏正在运行，重新绘制
        if (this.isGameActive) {
            this.update();
        }
    }

    generateMaze() {
        this.maze = Array(this.rows).fill().map(() => Array(this.cols).fill(1));
        this.player = { x: 0, y: 0 };
        this.exit = { x: this.cols - 1, y: this.rows - 1 };
        
        // Simple maze generation using recursive backtracking
        const stack = [this.player];
        this.maze[this.player.y][this.player.x] = 0;
        
        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current);
            
            if (neighbors.length === 0) {
                stack.pop();
                continue;
            }
            
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            this.maze[Math.floor((current.y + next.y) / 2)][Math.floor((current.x + next.x) / 2)] = 0;
            this.maze[next.y][next.x] = 0;
            stack.push(next);
        }
        
        // Ensure exit is reachable
        this.maze[this.exit.y][this.exit.x] = 0;
    }

    getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -2 },
            { x: 2, y: 0 },
            { x: 0, y: 2 },
            { x: -2, y: 0 }
        ];
        
        for (const dir of directions) {
            const newX = cell.x + dir.x;
            const newY = cell.y + dir.y;
            
            if (newX >= 0 && newX < this.cols && newY >= 0 && newY < this.rows &&
                this.maze[newY][newX] === 1) {
                neighbors.push({ x: newX, y: newY });
            }
        }
        
        return neighbors;
    }

    startGame() {
        try {
            // 重置游戏状态
            this.isGameActive = true;
            this.canMove = false;  // 重置移动标志
            this.score = 0;
            this.timeLeft = 180;
            this.lastTimerUpdate = Date.now();  // 初始化计时器
            
            // 更新显示
            this.updateScore();
            document.getElementById('timer').textContent = `Time: ${this.timeLeft}`;
            
            // 生成迷宫
            this.generateMaze();
            
            // 显示第一个单词
            this.showWordPrompt();
            
            // 开始游戏循环
            if (this.gameLoop) {
                clearInterval(this.gameLoop);
            }
            this.gameLoop = setInterval(() => {
                this.update();
                this.updateTimer();
            }, 1000 / 60);
            
            if (DEBUG) {
                console.log('Game started');
            }
        } catch (error) {
            console.error('Error in startGame:', error);
            this.gameOver();
        }
    }

    update() {
        if (!this.isGameActive) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawMaze();
        this.drawPlayer();
        this.drawExit();
        
        // 如果单词提示是隐藏的，说明玩家正在移动阶段
        if (document.getElementById('wordPrompt').style.display === 'none') {
            this.unlockMovement();
        }
    }

    drawMaze() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 1) {
                    this.ctx.fillStyle = '#4ecca3';
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    drawPlayer() {
        this.ctx.fillStyle = '#e94560';
        this.ctx.beginPath();
        this.ctx.arc(
            this.player.x * this.cellSize + this.cellSize / 2,
            this.player.y * this.cellSize + this.cellSize / 2,
            this.cellSize / 3,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    drawExit() {
        this.ctx.fillStyle = '#4ecca3';
        this.ctx.fillRect(
            this.exit.x * this.cellSize,
            this.exit.y * this.cellSize,
            this.cellSize,
            this.cellSize
        );
    }

    movePlayer(dx, dy) {
        if (!this.isGameActive || !this.canMove) return;
        
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        if (newX >= 0 && newX < this.cols && newY >= 0 && newY < this.rows &&
            this.maze[newY][newX] === 0) {
            this.player.x = newX;
            this.player.y = newY;
            
            // 更新画面
            this.update();
            
            // 重置移动标志
            this.canMove = false;
            
            if (this.player.x === this.exit.x && this.player.y === this.exit.y) {
                this.gameWon();
            } else {
                // 移动后显示新的单词
                this.showWordPrompt();
            }
        }
    }

    showWordPrompt() {
        const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
        this.currentWord = randomWord;
        document.getElementById('currentWord').textContent = randomWord.chinese;
        document.getElementById('wordPrompt').style.display = 'block';
        document.getElementById('wordInput').value = '';
        document.getElementById('wordInput').focus();
    }

    checkAnswer() {
        const input = document.getElementById('wordInput').value.toLowerCase().trim();
        if (input === this.currentWord.english) {
            // 增加分数
            this.score += 10;
            this.updateScore();
            
            // 允许玩家移动
            this.canMove = true;
            
            // 隐藏单词提示，直到玩家移动到新位置
            document.getElementById('wordPrompt').style.display = 'none';
            
            // 显示成功消息
            this.showMessage('回答正确！请使用方向键移动到绿色圆圈位置', '#4ecca3');
            
            // 立即显示移动提示
            this.update();
        } else {
            // 显示错误消息
            this.showMessage('回答错误，请重试', '#e94560');
            
            // 触发陷阱 - 移动墙壁
            this.triggerTrap();
            
            // 清空输入框
            document.getElementById('wordInput').value = '';
            document.getElementById('wordInput').focus();
        }
    }

    showMessage(text, color) {
        const messageDiv = document.createElement('div');
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.backgroundColor = color;
        messageDiv.style.color = 'white';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1000';
        messageDiv.textContent = text;
        
        document.body.appendChild(messageDiv);
        
        // 2秒后移除消息
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 2000);
    }

    triggerTrap() {
        // Move some walls to create a trap
        for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);
            if (this.maze[y][x] === 0) {
                this.maze[y][x] = 1;
            }
        }
    }

    unlockMovement() {
        // 找到可能的移动方向
        const directions = [
            { dx: 0, dy: -1, name: '↑' }, // 上
            { dx: 0, dy: 1, name: '↓' },  // 下
            { dx: -1, dy: 0, name: '←' }, // 左
            { dx: 1, dy: 0, name: '→' }   // 右
        ];

        // 高亮显示可移动的方向
        this.ctx.save();
        this.ctx.globalAlpha = 0.7;  // 增加透明度使提示更明显

        for (const dir of directions) {
            const newX = this.player.x + dir.dx;
            const newY = this.player.y + dir.dy;

            if (newX >= 0 && newX < this.cols && newY >= 0 && newY < this.rows &&
                this.maze[newY][newX] === 0) {
                // 绘制可移动方向的提示
                // 绘制圆形背景
                this.ctx.fillStyle = '#4ecca3';
                this.ctx.beginPath();
                this.ctx.arc(
                    newX * this.cellSize + this.cellSize / 2,
                    newY * this.cellSize + this.cellSize / 2,
                    this.cellSize / 3,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();

                // 绘制方向箭头
                this.ctx.fillStyle = 'white';
                this.ctx.font = `${this.cellSize/2}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    dir.name,
                    newX * this.cellSize + this.cellSize / 2,
                    newY * this.cellSize + this.cellSize / 2
                );
            }
        }
        this.ctx.restore();

        // 添加文字提示到画布底部
        this.ctx.save();
        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            '使用方向键移动到绿色圆圈位置',
            this.canvas.width / 2,
            this.canvas.height - 10
        );
        this.ctx.restore();
    }

    updateScore() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }

    updateTimer() {
        if (!this.isGameActive) return;
        
        if (this.timeLeft <= 0) {
            this.gameOver();
            return;
        }
        
        if (Date.now() - this.lastTimerUpdate >= 1000) {
            this.timeLeft--;
            document.getElementById('timer').textContent = `Time: ${this.timeLeft}`;
            this.lastTimerUpdate = Date.now();
        }
    }

    gameWon() {
        this.isGameActive = false;
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        this.score += Math.floor(this.timeLeft * 0.5); // 剩余时间奖励
        this.updateScore();
        
        document.getElementById('wordPrompt').style.display = 'none';
        alert(`Congratulations! You won!\nFinal Score: ${this.score}`);
    }

    gameOver() {
        this.isGameActive = false;
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        document.getElementById('wordPrompt').style.display = 'none';
        alert(`Game Over! Score: ${this.score}`);
    }

    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Voice input is not supported in your browser');
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const result = event.results[0][0].transcript.toLowerCase().trim();
            document.getElementById('wordInput').value = result;
            this.checkAnswer();
        };

        recognition.start();
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    try {
        if (typeof wordList === 'undefined' || !Array.isArray(wordList)) {
            throw new Error('Word list not loaded properly');
        }
        
        const game = new Game();
        if (DEBUG) {
            console.log('Game instance created successfully');
            console.log('Word list loaded:', wordList.length, 'words');
        }
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Failed to initialize game. Please check the console for details.');
    }
}); 