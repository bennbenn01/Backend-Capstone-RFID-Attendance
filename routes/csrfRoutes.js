import express from 'express'
import csurf from 'csurf'
import rateLimit from 'express-rate-limit'
import { URL } from 'url'

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';

export const csrfProtection = csurf({
  cookie: {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    domain: isProd ? '.blumantoda-attendance.com' : null,
    path: '/',
    maxAge: 15 * 60 * 1000
  }
});

const isValidOriginAndTokenPresent = (req, res, next) => {
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const allowedOrigin = process.env.VAL_ALLOWED_ORIGIN.split(',');  
  const actual = origin || referer;

  if(!actual){
    return csrfTokenRateLimter(req, res, next); 
  }

  if(!req.cookies?.token || !req.cookies['XSRF-TOKEN']){
    return csrfTokenRateLimter(req, res, next); 
  }

  const actualURL = new URL(actual);

  if(!allowedOrigin.includes(actualURL.origin)){
    return res.sendStatus(403);
  }

  next();
}

const csrfTokenRateLimter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 5,
  statusCode: 429,
  message: 'Too many request! please try again later.',
  standardHeaders: true,
  legacyHeaders: false    
});

router.get('/csrf-token', isValidOriginAndTokenPresent, csrfProtection, (req, res) => {
  const token = req.csrfToken();

  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, 
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax', 
    domain: isProd ? '.blumantoda-attendance.com' : null,
    path: '/',
    maxAge: 15 * 60 * 1000
  });

  res.status(200).json({ csrfToken: token });
});

const csrfBypassPaths = [
  '/login',
  '/sign-up',
  '/google-sign-up',
  '/forget-password',
  '/change-pass',
  '/confirmed-change-pass',
  '/verify-email',
  '/register-rfid',
  '/check-status',
  '/time-in',
  '/request-logout'
];


router.use((req, res, next) => {
  if (req.get('X-Skip-CSRF-Check') === 'true' || csrfBypassPaths.some(path => req.path.includes(path))) {
    return next();
  }

  isValidOriginAndTokenPresent(req, res, () => {
    csrfProtection(req, res, next);
  })
});

export default router;