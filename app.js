const express = require('express');
const session = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const methodOverride = require('method-override');
const path = require('path');
const prisma = require('./src/config/db');
const routes = require('./src/routes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    secret: process.env.SESSION_SECRET || 'shipshape-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdFunction: undefined,
      dbRecordIdIsSessionId: true,
    }),
  })
);

app.use('/api', routes);

app.get('/status', (req, res) => {
  res.json({ status: 'OK', message: 'ShipShape API is running' });
});

app.get('/admin', (req, res) => {
  res.render('pages/admin_home');
});

app.get('/staf-admin', (req, res) => {
  res.render('pages/staf_admin_home');
});

app.get('/kaprodi', (req, res) => {
  res.render('pages/kaprodi_home');
});

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
