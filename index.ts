import 'dotenv/config';
import express, { Request, Response } from 'express';
// import { registerRoutes } from './routes/routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Register all routes
// registerRoutes(app);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
