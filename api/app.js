const express = require('express');
const cors = require('cors')
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const CONSTANT = require('./utils/constans')
//middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: CONSTANT.RATE_LIMIT.MAX_REQUESTS // Limit each IP to 100 requests per windowMs
});

app.use(limiter);

