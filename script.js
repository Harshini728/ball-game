// Game Configuration
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 15;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 30;

// Game States
const GAME_STATE = {
    WELCOME: 'welcome',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    LEVEL_COMPLETE: 'levelComplete'
};

// Game Class
class BallGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GAME_STATE.WELCOME;
        
        // Game variables
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.bricksDestroyed = 0;
        
        // Paddle
        this.paddle = {
            x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
            y: CANVAS_HEIGHT - 30,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            dx: 0
        };
        
        // Ball
        this.ball = {
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT - 50,
            dx: 0,
            dy: 0,
            radius: BALL_RADIUS,
            speed: 4
        };
        
        // Bricks
        this.bricks = [];
        this.totalBricks = 0;
        this.createBricks();
        
        // Mouse tracking
        this.mouseX = CANVAS_WIDTH / 2;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        });
        
        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            }
        });
        
        // Buttons
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.reset());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        document.getElementById('startGameBtn').addEventListener('click', () => this.start());
    }
    
    createBricks() {
        this.bricks = [];
        const bricksCols = 8;
        const bricksRows = Math.min(3 + this.level, 6);
        
        for (let row = 0; row < bricksRows; row++) {
            for (let col = 0; col < bricksCols; col++) {
                const x = col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
                const y = row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
                
                this.bricks.push({
                    x: x,
                    y: y,
                    width: BRICK_WIDTH,
                    height: BRICK_HEIGHT,
                    active: true,
                    color: this.getBrickColor(row)
                });
            }
        }
        
        this.totalBricks = this.bricks.length;
        this.bricksDestroyed = 0;
    }
    
    getBrickColor(row) {
        const colors = ['#FF6B6B', '#FFA500', '#FFD93D', '#6BCB77', '#4D96FF', '#9D84B7'];
        return colors[row % colors.length];
    }
    
    start() {
        if (this.state === GAME_STATE.WELCOME) {
            this.hideModal('welcomeScreen');
            this.state = GAME_STATE.PLAYING;
            this.initializeBall();
            this.updateUI();
        }
    }
    
    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
            this.showModal('pauseScreen');
            document.getElementById('pauseBtn').disabled = true;
        } else if (this.state === GAME_STATE.PAUSED) {
            this.hideModal('pauseScreen');
            this.state = GAME_STATE.PLAYING;
            document.getElementById('pauseBtn').disabled = false;
        }
    }
    
    reset() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.hideModal('gameOverScreen');
        this.state = GAME_STATE.WELCOME;
        this.createBricks();
        this.showModal('welcomeScreen');
        this.updateUI();
    }
    
    nextLevel() {
        this.level++;
        this.hideModal('levelCompleteScreen');
        this.createBricks();
        this.initializeBall();
        this.state = GAME_STATE.PLAYING;
        document.getElementById('pauseBtn').disabled = false;
        this.updateUI();
    }
    
    initializeBall() {
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.paddle.y - this.ball.radius - 10;
        
        // Launch at random angle
        const angle = (Math.random() * 60 - 30) * Math.PI / 180;
        this.ball.dx = this.ball.speed * Math.sin(angle);
        this.ball.dy = -this.ball.speed * Math.cos(angle);
    }
    
    update() {
        if (this.state !== GAME_STATE.PLAYING) return;
        
        // Update paddle position (follow mouse)
        this.paddle.x = Math.max(0, Math.min(this.mouseX - this.paddle.width / 2, CANVAS_WIDTH - this.paddle.width));
        
        // Update ball position
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Ball collision with walls
        if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > CANVAS_WIDTH) {
            this.ball.dx = -this.ball.dx;
            this.ball.x = Math.max(this.ball.radius, Math.min(this.ball.x, CANVAS_WIDTH - this.ball.radius));
        }
        
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
            this.ball.y = this.ball.radius;
        }
        
        // Ball collision with paddle
        this.checkPaddleCollision();
        
        // Ball collision with bricks
        this.checkBrickCollision();
        
        // Ball fall (lose life)
        if (this.ball.y - this.ball.radius > CANVAS_HEIGHT) {
            this.lives--;
            this.updateUI();
            
            if (this.lives <= 0) {
                this.endGame();
            } else {
                this.initializeBall();
            }
        }
        
        // Check if all bricks destroyed
        if (this.bricksDestroyed === this.totalBricks && this.totalBricks > 0) {
            this.levelComplete();
        }
    }
    
    checkPaddleCollision() {
        if (this.ball.y + this.ball.radius < this.paddle.y ||
            this.ball.y - this.ball.radius > this.paddle.y + this.paddle.height ||
            this.ball.x < this.paddle.x ||
            this.ball.x > this.paddle.x + this.paddle.width) {
            return;
        }
        
        // Ball hit paddle
        this.ball.dy = -Math.abs(this.ball.dy);
        
        // Add spin based on where ball hits paddle
        const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
        this.ball.dx = (hitPos - 0.5) * this.ball.speed * 2;
        
        // Ensure ball moves away from paddle
        this.ball.y = this.paddle.y - this.ball.radius;
        
        // Increase ball speed slightly
        this.ball.speed = Math.min(this.ball.speed + 0.1, 8);
    }
    
    checkBrickCollision() {
        for (let i = 0; i < this.bricks.length; i++) {
            const brick = this.bricks[i];
            
            if (!brick.active) continue;
            
            // Circle-rectangle collision
            const closestX = Math.max(brick.x, Math.min(this.ball.x, brick.x + brick.width));
            const closestY = Math.max(brick.y, Math.min(this.ball.y, brick.y + brick.height));
            
            const dx = this.ball.x - closestX;
            const dy = this.ball.y - closestY;
            
            if (dx * dx + dy * dy < this.ball.radius * this.ball.radius) {
                brick.active = false;
                this.bricksDestroyed++;
                
                // Add score (more points for harder bricks)
                this.score += Math.floor((this.level * 10) * (1 + this.level * 0.5));
                
                // Bounce ball
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.ball.dx = (dx / distance) * this.ball.speed;
                this.ball.dy = (dy / distance) * this.ball.speed;
                
                this.updateUI();
                break;
            }
        }
    }
    
    levelComplete() {
        this.state = GAME_STATE.LEVEL_COMPLETE;
        this.showModal('levelCompleteScreen');
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('levelScore').textContent = this.score;
        document.getElementById('nextLevel').textContent = this.level + 1;
    }
    
    endGame() {
        this.state = GAME_STATE.GAME_OVER;
        this.showModal('gameOverScreen');
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Draw paddle
        this.ctx.fillStyle = '#667eea';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        this.ctx.shadowColor = 'rgba(102, 126, 234, 0.8)';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#764ba2';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        this.ctx.shadowColor = 'transparent';
        
        // Draw ball
        this.ctx.fillStyle = '#FFD93D';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowColor = 'rgba(255, 217, 61, 0.8)';
        this.ctx.shadowBlur = 15;
        this.ctx.stroke();
        this.ctx.shadowColor = 'transparent';
        
        // Draw bricks
        for (let i = 0; i < this.bricks.length; i++) {
            const brick = this.bricks[i];
            
            if (brick.active) {
                this.ctx.fillStyle = brick.color;
                this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            }
        }
        
        // Draw grid background
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
        
        if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) {
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = false;
        }
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new BallGame();
});
