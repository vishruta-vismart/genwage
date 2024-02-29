// index.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 4000;

const serverConfig = require('./app');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Employeedetails.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ppc.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
// public/index.js

