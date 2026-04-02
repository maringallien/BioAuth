import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { sessionMiddleware } from './middleware/session.js';
import { generalLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import registrationRoutes from './routes/registration.routes.js';
import authenticationRoutes from './routes/authentication.routes.js';
import userRoutes from './routes/user.routes.js';

// Initialize DB 
import './db/schema.js';

const app = express();

// Only trust the first proxy hop in production (prevents IP spoofing of rate limiter in dev)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Allows browser to make requests from frontend (lcoalhost:5173) to backend (localhost:3001)
app.use(
  cors({
    origin: config.rpOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(generalLimiter);
app.use(sessionMiddleware);

app.use('/api/registration', registrationRoutes);
app.use('/api/authentication', authenticationRoutes);
app.use('/api/user', userRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`RP ID: ${config.rpId}`);
  console.log(`RP Origin: ${config.rpOrigin}`);
});

export { app };
