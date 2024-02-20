const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const { Client } = require('pg');


app.use(cors());


const dbConfig = {
  user: 'default',
  host: 'ep-polished-hall-07857143-pooler.us-east-1.postgres.vercel-storage.com',
  database: 'verceldb',
  password: 'iMbCu7NFrWR3',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
};

const client = new Client(dbConfig);
client.connect();

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

app.use(express.json());
