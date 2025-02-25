const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { translate } = require('google-translate-api-x');
const SrtParser2 = require('srt-parser-2').default; // Import correctly

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: ['http://localhost:5173','*']}));
app.use(express.json());

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to parse subtitle file and return formatted subtitles
app.post('/api/parse-subtitle', upload.single('subtitleFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const parser = new SrtParser2(); // Correctly instantiate the parser
        const subtitleContent = req.file.buffer.toString('utf8');
        const parsedSubtitles = parser.fromSrt(subtitleContent);

        const formattedSubtitles = parsedSubtitles.map((sub, index) => ({
            id: index + 1,
            startTime: sub.startTime,
            endTime: sub.endTime,
            originalText: sub.text,
            translatedText: "" // Placeholder for translation
        }));

        res.json({ subtitles: formattedSubtitles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to translate subtitles (one-time API call for all subtitles)
app.post('/api/translate-subtitles', async (req, res) => {
    console.log("translate-subtitles")
    try {
        const { subtitles, targetLang } = req.body;

        if (!subtitles || !Array.isArray(subtitles) || !targetLang) {
            return res.status(400).json({ error: 'Missing or invalid parameters' });
        }

        const textsToTranslate = subtitles.map(sub => sub.originalText);

        // Translate all texts in one API call using Promise.all()
        const translatedResults = await Promise.all(
            textsToTranslate.map(async text => {
                const result = await translate(text, { to: targetLang });
                return result.text;
            })
        );

        // Merge translated text with original subtitle structure
        const translatedSubtitles = subtitles.map((sub, index) => ({
            ...sub,
            translatedText: translatedResults[index]
        }));

        res.json({ subtitles: translatedSubtitles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
