const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
