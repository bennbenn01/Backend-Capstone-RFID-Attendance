import fs from 'fs'
import http from 'http'
import https from 'https'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import { Server } from 'socket.io'
import { constants } from 'crypto'

import authRoutes from './routes/authRoutes.js'
import csrfRoutes from './routes/csrfRoutes.js'
import userRoutes from './routes/userRoutes.js'
import driverRoutes from './routes/driverRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import dataAnalyticsRoutes from './routes/dataAnalyticsRoutes.js'
import searchRoutes from './routes/searchRoutes.js'

dotenv.config({
  path: process.env.NODE_ENV === 'dev' ? '.env.development' : '.env.production'
})

const NODE_ENV = process.env.NODE_ENV;
const HTTP_PORT = process.env.HTTP_PORT;
const HTTPS_PORT = process.env.HTTPS_PORT;
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL;

if (NODE_ENV !== 'production') {
  console.log("Backend env:", process.env);
}

let certOptions;

if (process.env.NODE_ENV === 'production') {
  certOptions = {
    key: fs.readFileSync('/app/ssl/api_key.pem'),
    cert: fs.readFileSync('/app/ssl/api_cert.pem'),
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    secureOptions: constants.SSL_OP_NO_TLSv1 || constants.SSL_OP_NO_TLSv1_1
  };
} else {
  certOptions = {
    key: fs.readFileSync('./ssl/api_key.pem'),
    cert: fs.readFileSync('./ssl/api_cert.pem'),
  };
}

let cookieSecret;

const dockerSecretPath = '/run/secrets/COOKIE_SECRET';
const localSecretPath = './secrets/COOKIE_SECRET';

if (fs.existsSync(dockerSecretPath)) {
  cookieSecret = fs.readFileSync(dockerSecretPath, 'utf8');
} else if (fs.existsSync(localSecretPath)) {
  cookieSecret = fs.readFileSync(localSecretPath, 'utf-8');
}

const clientOrigin = CLIENT_BASE_URL.split(',');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (clientOrigin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }    
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Skip-CSRF-Check'],
  exposedHeaders: ['X-CSRF-Token']
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(helmet.contentSecurityPolicy({
  directives: {
    "default-src": ["'self'"],
    "connectSrc": ["'self'", ...clientOrigin, "https://api.blumantoda-attendance.com"],
    "script-src": ["'self'"],
    "base-uri": ["'self'"],
    "font-src": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    "img-src": ["'self'", "data:"],
    "object-src": ["'none'"],
    "script-src-attr": ["'none'"],
    "style-src": ["'self'", "'unsafe-inline'", "https:"],
    "upgrade-insecure-requests": []
  }
}));
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser(cookieSecret));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.removeHeader('Server');
  res.removeHeader('X-Version');
  res.removeHeader('X-Powered-By');
  next();
});

// Healthcheck
app.get('/health', (_, res) => {
  console.log('Health Check Log');
  res.sendStatus(200)
});

// CSRF token path
app.use('/token', csrfRoutes);

// API request path
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/analytics', dataAnalyticsRoutes);
app.use('/api/v1/search', searchRoutes);

app.use((err, req, res, next) => {
  console.error('Global error handler: ', err);
  if (!res.headersSent) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
})

if (NODE_ENV === 'dev') {
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST','PUT', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      console.log(`Socket disconnected`);
    });
  });

  app.set('io', io);

  httpServer.listen(HTTP_PORT, () => {
    console.log(`Server running on ${HTTP_PORT}`)
  });
} else {
  const httpsServer = https.createServer(certOptions, app);

  const io = new Server(httpsServer, {
    path: '/socket.io',
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST','PUT', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      console.log(`Socket disconnected`);
    });
  });

  app.set('io', io);

  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`Server running on ${HTTPS_PORT}`)
  });
}