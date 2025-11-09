const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const app = express();
const server = http.createServer(app);

// Socket.io with CORS for production (Railway + custom domain)
const io = socketIO(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 8080;

// Solana connection (mainnet-beta for production)
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'https://api.mainnet-beta.solana.com';
const solanaConnection = new Connection(SOLANA_NETWORK, 'confirmed');

// CORS configuration for production
const corsOptions = {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(__dirname));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images and videos are allowed'));
    }
});

// Path to quizzes storage
const QUIZZES_FILE = path.join(__dirname, 'quizzes.json');

// Initialize quizzes file if it doesn't exist
if (!fs.existsSync(QUIZZES_FILE)) {
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify([]));
}

// In-memory game storage
const activeGames = new Map();
const questionTimers = new Map(); // Store timers for each game

// Generate 6-digit game code
function generateGameCode() {
    let code;
    do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (activeGames.has(code));
    return code;
}

// Helper functions
function readQuizzes() {
    const data = fs.readFileSync(QUIZZES_FILE, 'utf8');
    return JSON.parse(data);
}

function writeQuizzes(quizzes) {
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
}

// API Routes

// Get all quizzes
app.get('/api/quizzes', (req, res) => {
    try {
        const quizzes = readQuizzes();
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// Get single quiz by ID
app.get('/api/quizzes/:id', (req, res) => {
    try {
        const quizzes = readQuizzes();
        const quiz = quizzes.find(q => q.id === req.params.id);

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        res.json(quiz);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

// Create new quiz
app.post('/api/quizzes', (req, res) => {
    try {
        const quizzes = readQuizzes();
        const newQuiz = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString(),
            plays: 0
        };

        quizzes.push(newQuiz);
        writeQuizzes(quizzes);

        res.status(201).json(newQuiz);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

// Upload image/video
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = '/uploads/' + req.file.filename;
        res.json({ url: fileUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Increment play count
app.post('/api/quizzes/:id/play', (req, res) => {
    try {
        const quizzes = readQuizzes();
        const quizIndex = quizzes.findIndex(q => q.id === req.params.id);

        if (quizIndex === -1) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        quizzes[quizIndex].plays = (quizzes[quizIndex].plays || 0) + 1;
        writeQuizzes(quizzes);

        res.json({ plays: quizzes[quizIndex].plays });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update play count' });
    }
});

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Live Game API Routes

// Get all active games
app.get('/api/games', (req, res) => {
    try {
        const games = Array.from(activeGames.values()).map(game => ({
            code: game.code,
            quizTitle: game.quiz.title,
            host: game.hostWallet || 'Anonymous',
            prizePool: game.prizePool || 0,
            isFreeGame: game.isFreeGame || false,
            status: game.status,
            players: game.players.length,
            questionCount: game.quiz.questions.length,
            leaderboard: game.leaderboard,
            createdAt: game.createdAt
        }));
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// Create new game
app.post('/api/games/create', (req, res) => {
    try {
        const { quizId, prizePool, hostWallet, isFreeGame } = req.body;

        if (!quizId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate prize games
        if (!isFreeGame) {
            if (!hostWallet) {
                return res.status(400).json({ error: 'Host wallet required for prize games' });
            }
            if (prizePool < 0.001 || prizePool > 1000) {
                return res.status(400).json({ error: 'Prize pool must be between 0.001 and 1000 SOL' });
            }
        }

        const quizzes = readQuizzes();
        const quiz = quizzes.find(q => q.id === quizId);

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const gameCode = generateGameCode();

        const newGame = {
            code: gameCode,
            quiz: quiz,
            hostWallet: hostWallet || null,
            prizePool: prizePool || 0,
            isFreeGame: isFreeGame || false,
            status: 'waiting', // waiting, playing, finished
            players: [],
            answers: {},
            leaderboard: [],
            currentQuestion: 0,
            createdAt: new Date().toISOString()
        };

        activeGames.set(gameCode, newGame);

        // Broadcast new game to all clients
        io.emit('gameCreated', {
            code: gameCode,
            quizTitle: quiz.title,
            host: hostWallet || 'Anonymous',
            prizePool: prizePool || 0,
            isFreeGame: isFreeGame || false,
            status: 'waiting',
            players: 0,
            questionCount: quiz.questions.length
        });

        res.status(201).json({ gameCode, game: newGame });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Update game with escrow details
app.post('/api/games/:code/escrow', (req, res) => {
    try {
        const { code } = req.params;
        const { escrowAddress, transactionSignature } = req.body;

        const game = activeGames.get(code);

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        game.escrowAddress = escrowAddress;
        game.escrowTransaction = transactionSignature;

        console.log(`Game ${code} escrow set: ${escrowAddress}`);

        res.json({ message: 'Escrow updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update escrow' });
    }
});

// Join game
app.post('/api/games/:code/join', (req, res) => {
    try {
        const { code } = req.params;
        const { walletAddress, playerName } = req.body;

        const game = activeGames.get(code);

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Allow joining during 'waiting' OR 'starting' (countdown phase)
        if (game.status !== 'waiting' && game.status !== 'starting') {
            return res.status(400).json({ error: 'Game has already started' });
        }

        // Don't allow host to join as a player
        if (walletAddress === game.hostWallet) {
            return res.status(400).json({ error: 'Host cannot join as a player' });
        }

        if (game.players.find(p => p.address === walletAddress)) {
            return res.json({ message: 'Already joined', game });
        }

        game.players.push({
            address: walletAddress,
            name: playerName || `Player ${game.players.length + 1}`
        });
        game.answers[walletAddress] = [];

        res.json({ message: 'Joined game successfully', game });
    } catch (error) {
        res.status(500).json({ error: 'Failed to join game' });
    }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Player joins game
    socket.on('joinGame', ({ gameCode, walletAddress, playerName }) => {
        const game = activeGames.get(gameCode);
        if (!game) return;

        socket.join(gameCode);

        // For free games, generate a unique player ID if no wallet
        let playerIdentifier = walletAddress;
        if (!playerIdentifier && game.isFreeGame) {
            playerIdentifier = `player_${socket.id}`;
        }

        // DON'T allow host to join as a player
        if (playerIdentifier === game.hostWallet) {
            console.log(`[JOIN GAME] Blocked host from joining as player in game ${gameCode}`);
            socket.emit('gameData', {
                quiz: game.quiz,
                prizePool: game.prizePool,
                players: game.players,
                status: game.status
            });
            return;
        }

        // Allow joining during 'waiting' OR 'starting' phase
        if (playerIdentifier && !game.players.find(p => p.address === playerIdentifier) && (game.status === 'waiting' || game.status === 'starting')) {
            const player = {
                address: playerIdentifier,
                name: playerName || `Player ${game.players.length + 1}`
            };
            game.players.push(player);
            game.answers[playerIdentifier] = [];
            console.log(`[JOIN GAME] Player ${player.name} (${playerIdentifier}) joined game ${gameCode} (status: ${game.status})`);
        }

        // Send game data to player
        socket.emit('gameData', {
            quiz: game.quiz,
            prizePool: game.prizePool,
            players: game.players,
            status: game.status
        });

        // Notify all players about new player
        io.to(gameCode).emit('playerJoined', game.players);
    });

    // Host joins game
    socket.on('joinAsHost', ({ gameCode }) => {
        const game = activeGames.get(gameCode);
        if (!game) return;

        socket.join(gameCode);
        socket.emit('gameData', {
            quiz: game.quiz,
            prizePool: game.prizePool,
            players: game.players,
            status: game.status,
            leaderboard: game.leaderboard
        });
    });

    // Start game
    socket.on('startGame', ({ gameCode }) => {
        console.log(`[START GAME] Request received for game: ${gameCode}`);
        const game = activeGames.get(gameCode);

        if (!game) {
            console.log(`[START GAME] ERROR: Game ${gameCode} not found`);
            return;
        }

        if (game.status !== 'waiting') {
            console.log(`[START GAME] ERROR: Game ${gameCode} status is ${game.status}, not waiting`);
            return;
        }

        // Don't allow starting with 0 players (like Kahoot)
        if (game.players.length === 0) {
            console.log(`[START GAME] ERROR: Cannot start game ${gameCode} with 0 players`);
            socket.emit('startError', { message: 'At least 1 player must join before starting the game' });
            return;
        }

        console.log(`[START GAME] Starting game ${gameCode} with ${game.players.length} players`);

        // Set to 'starting' during countdown (players can still join during this phase)
        game.status = 'starting';

        io.to(gameCode).emit('gameStarting', { countdown: 5 });
        console.log(`[START GAME] Game ${gameCode} countdown started (5 seconds)...`);

        io.emit('gameUpdate', {
            code: gameCode,
            status: 'starting',
            quizTitle: game.quiz.title,
            host: game.hostWallet,
            prizePool: game.prizePool,
            players: game.players.length,
            questionCount: game.quiz.questions.length
        });

        // 5-second countdown, then lock game and start first question
        setTimeout(() => {
            game.status = 'playing';
            io.to(gameCode).emit('gameStarted');

            io.emit('gameUpdate', {
                code: gameCode,
                status: 'playing',
                quizTitle: game.quiz.title,
                host: game.hostWallet,
                prizePool: game.prizePool,
                players: game.players.length,
                questionCount: game.quiz.questions.length
            });

            console.log(`[START GAME] Game ${gameCode} LOCKED - starting first question`);
            // Start first question
            startQuestion(gameCode, 0);
        }, 5000);
    });

    // Submit answer
    socket.on('submitAnswer', ({ gameCode, walletAddress, questionIndex, answerIndex, speedBonus }) => {
        const game = activeGames.get(gameCode);
        if (!game) return;

        const question = game.quiz.questions[questionIndex];
        const correctAnswerIndex = question.answers.indexOf(question.correctAnswer);
        const isCorrect = answerIndex === correctAnswerIndex;

        // Debug logging
        console.log(`[ANSWER DEBUG] Question: "${question.question}"`);
        console.log(`[ANSWER DEBUG] Answers array: ${JSON.stringify(question.answers)}`);
        console.log(`[ANSWER DEBUG] Correct answer text: "${question.correctAnswer}"`);
        console.log(`[ANSWER DEBUG] Correct answer index: ${correctAnswerIndex}`);
        console.log(`[ANSWER DEBUG] Player selected index: ${answerIndex}`);
        console.log(`[ANSWER DEBUG] Player selected text: "${question.answers[answerIndex]}"`);
        console.log(`[ANSWER DEBUG] Is correct? ${isCorrect}`);

        // Calculate score (1000 points for correct + speed bonus)
        const score = isCorrect ? 1000 + Math.floor(speedBonus) : 0;

        // Store answer
        if (!game.answers[walletAddress]) {
            game.answers[walletAddress] = [];
        }
        game.answers[walletAddress][questionIndex] = {
            answerIndex,
            isCorrect,
            score,
            timestamp: Date.now()
        };

        console.log(`[ANSWER] Player ${walletAddress} answered question ${questionIndex + 1} - ${isCorrect ? 'CORRECT' : 'WRONG'} (Score: ${score})`);

        // Check if all players have answered
        if (checkAllPlayersAnswered(gameCode, questionIndex)) {
            // End question immediately when all players answered
            endQuestion(gameCode, questionIndex);
        }
    });

    // Next question (DEPRECATED - now automatic, kept for compatibility)
    socket.on('nextQuestion', ({ gameCode, questionIndex }) => {
        console.log(`[WARNING] Manual nextQuestion called for game ${gameCode} - this is now automatic`);
        // Do nothing - progression is now automatic
    });

    // Finish game
    socket.on('finishGame', ({ gameCode }) => {
        finishGame(gameCode);
    });

    // Pay winner
    socket.on('payWinner', async ({ gameCode }) => {
        const game = activeGames.get(gameCode);
        if (!game || game.leaderboard.length === 0) return;

        const winner = game.leaderboard[0];

        try {
            // In a real implementation, you would:
            // 1. Have the host sign a transaction to send SOL to the winner
            // 2. Use a smart contract escrow to hold funds
            // 3. Automatically transfer on game completion

            // For now, we'll just log it
            console.log(`Prize of ${game.prizePool} SOL should be sent to ${winner.address}`);

            // In production, implement Solana transaction here:
            /*
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(game.hostWallet),
                    toPubkey: new PublicKey(winner.address),
                    lamports: game.prizePool * LAMPORTS_PER_SOL,
                })
            );

            // Transaction would need to be signed by host wallet
            // This requires client-side signing via Phantom
            */

            socket.emit('prizePaid', { winner: winner.address, amount: game.prizePool });
        } catch (error) {
            console.error('Error paying winner:', error);
            socket.emit('error', { message: 'Failed to pay winner' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Helper function to update leaderboard
function updateLeaderboard(game) {
    const leaderboard = game.players.map(player => {
        const playerAnswers = game.answers[player.address] || [];
        const totalScore = playerAnswers.reduce((sum, answer) => sum + (answer?.score || 0), 0);

        return {
            address: player.address,
            name: player.name,
            score: totalScore
        };
    });

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);
    game.leaderboard = leaderboard;
}

// Helper function to start a question with automatic timer
function startQuestion(gameCode, questionIndex) {
    const game = activeGames.get(gameCode);
    if (!game) return;

    console.log(`[QUESTION] Starting question ${questionIndex + 1} for game ${gameCode}`);
    game.currentQuestion = questionIndex;
    game.questionStartTime = Date.now();

    // Emit to all players
    io.to(gameCode).emit('nextQuestion', questionIndex);

    // Clear any existing timer
    if (questionTimers.has(gameCode)) {
        clearTimeout(questionTimers.get(gameCode));
    }

    // Set 7-second auto-end timer
    const timer = setTimeout(() => {
        console.log(`[QUESTION] 7s timer expired for game ${gameCode}, question ${questionIndex}`);
        endQuestion(gameCode, questionIndex);
    }, 7000);

    questionTimers.set(gameCode, timer);
}

// Helper function to end a question and move to next
function endQuestion(gameCode, questionIndex) {
    const game = activeGames.get(gameCode);
    if (!game) return;

    // Clear timer
    if (questionTimers.has(gameCode)) {
        clearTimeout(questionTimers.get(gameCode));
        questionTimers.delete(gameCode);
    }

    console.log(`[QUESTION] Ending question ${questionIndex + 1} for game ${gameCode}`);

    const question = game.quiz.questions[questionIndex];
    const correctAnswerIndex = question.answers.indexOf(question.correctAnswer);

    // Update leaderboard
    updateLeaderboard(game);

    // Send correct answer and leaderboard to all players
    io.to(gameCode).emit('questionEnd', {
        correctAnswer: correctAnswerIndex,
        leaderboard: game.leaderboard
    });

    // Wait 3 seconds to show answer, then move to next question
    setTimeout(() => {
        if (questionIndex + 1 < game.quiz.questions.length) {
            // Start next question
            startQuestion(gameCode, questionIndex + 1);
        } else {
            // Game finished
            console.log(`[GAME] Game ${gameCode} finished`);
            finishGame(gameCode);
        }
    }, 3000);
}

// Helper function to check if all players have answered
function checkAllPlayersAnswered(gameCode, questionIndex) {
    const game = activeGames.get(gameCode);
    if (!game) return false;

    const answersForQuestion = game.players.filter(player => {
        return game.answers[player.address] && game.answers[player.address][questionIndex] !== undefined;
    });

    console.log(`[ANSWERS] ${answersForQuestion.length}/${game.players.length} players answered question ${questionIndex + 1}`);

    if (answersForQuestion.length === game.players.length) {
        console.log(`[ANSWERS] All players answered! Auto-progressing...`);
        return true;
    }

    return false;
}

// Helper function to finish game
function finishGame(gameCode) {
    const game = activeGames.get(gameCode);
    if (!game) return;

    // Clear any remaining timers
    if (questionTimers.has(gameCode)) {
        clearTimeout(questionTimers.get(gameCode));
        questionTimers.delete(gameCode);
    }

    game.status = 'finished';
    updateLeaderboard(game);

    io.to(gameCode).emit('gameFinished', game.leaderboard);
    io.emit('gameUpdate', {
        code: gameCode,
        status: 'finished',
        quizTitle: game.quiz.title,
        host: game.hostWallet,
        prizePool: game.prizePool,
        players: game.players.length,
        questionCount: game.quiz.questions.length,
        leaderboard: game.leaderboard
    });
}

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Solana network: ${SOLANA_NETWORK}`);
});
