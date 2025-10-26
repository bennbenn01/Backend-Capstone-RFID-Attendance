import rateLimit from 'express-rate-limit'

export const userRateLimiter = (req, res, next) => {
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const allowedOrigin = process.env.VAL_ALLOWED_ORIGIN.split(',');
    const actual = origin || referer;

    if(!actual){
        return externalRateLimiter(req, res, next);
    }

    const actualURL = new URL(actual);

    if(!allowedOrigin.includes(actualURL.origin)){
        return res.sendStatus(403);
    }

    return externalRateLimiter(req, res, next);
}

export const authRateLimiter = (req, res, next) => {
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const allowedOrigin = process.env.VAL_ALLOWED_ORIGIN.split(',');
    const actual = origin || referer;

    if(!actual){
        return externalRateLimiter(req, res, next);
    }

    const actualURL = new URL(actual);

    if(!allowedOrigin.includes(actualURL.origin)){
        return res.sendStatus(403);
    }       
    
    return standardRateLimiter(req, res, next);
}

export const apiRateLimiter = (req, res, next) => {
    try {
        const origin = req.get('Origin');
        const referer = req.get('Referer');
        const allowedOrigin = process.env.VAL_ALLOWED_ORIGIN.split(',');
        const actual = origin || referer;

        if(!actual){
            return externalRateLimiter(req, res, next);
        }

        if(!req.cookies.token || !req.cookies['XSRF-TOKEN']){
            return externalRateLimiter(req, res, next);
        }

        const actualURL = new URL(actual);
    
        if(!allowedOrigin.includes(actualURL.origin)){
            return res.sendStatus(403);
        }

        return internalRateLimiter(req, res, next);
    } catch (err) {
        return res.sendStatus(403);
    }
}

// Customized Options

const noTokenOption = rateLimit({
    windowMs: 30 * 60 * 1000,
    limit: 10,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

const emailTokenOption = rateLimit({
    windowMs: 30 * 60 * 1000,
    limit: 10,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

const registerRfidOption = rateLimit({
    windowMs: 35 * 60 * 1000,
    limit: 20,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

const checkStatusOption = rateLimit({
    windowMs: 30 * 60 * 1000,
    limit: 50,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

const timeInOption = rateLimit({
    windowMs: 40 * 60 * 1000,
    limit: 20,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

const requestLogoutOption = rateLimit({
    windowMs: 40 * 60 * 1000,
    limit: 20,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

const searchQueryOption = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

export const customizedRateLimiter = {
    noToken: (req, res, next) => {
        if(!req.cookies['XSRF-TOKEN']){
            return noTokenOption(req, res, next);
        }

        next();
    },
    emailToken: emailTokenOption,
    registerRfid: registerRfidOption,
    checkStatus: checkStatusOption,
    timeIn: timeInOption,
    requestLogout: requestLogoutOption,
    searchQuery: searchQueryOption,
}

// Standard Options

const standardRateLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    limit: 20,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false  
});

const externalRateLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    limit: 15,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false   
}); 

const internalRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    statusCode: 429,
    message: 'Too many request! please try again later.',
    standardHeaders: true,
    legacyHeaders: false 
});