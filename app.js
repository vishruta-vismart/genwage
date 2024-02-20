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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API endpoint to insert employee details
app.post('/employees', async (req, res) => {
    try {
        const { name, designation, site_working, joining_date, contractor_name, recruitment_type, status } = req.body;

        // Insert employee details into the database
        const query = `
            INSERT INTO employee (name, designation, site_working, joining_date, contractor_name, recruitment_type, status,fixedwage_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        const values = [name, designation, site_working, joining_date, contractor_name, recruitment_type, status,false];
        await pool.query(query, values);

        res.status(201).send('Employee details inserted successfully');
    } catch (error) {
        console.error('Error inserting employee details:', error);
        res.status(500).send('Internal Server Error');
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API endpoint to insert employee fixed wage details
app.post('/employeefixedwage', async (req, res) => {
    try {
        const { employeename, designation, fixed_basic_da, fixed_hra, fixed_food_allowance, fixed_site_allowance, fixed_gross_total } = req.body;

        // Insert employee fixed wage details into the database
        const query = `
            INSERT INTO employeefixedwage (employeename, designation, fixed_basic_da, fixed_hra, fixed_food_allowance, fixed_site_allowance, fixed_gross_total)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [employeename, designation, fixed_basic_da, fixed_hra, fixed_food_allowance, fixed_site_allowance, fixed_gross_total];
        await pool.query(query, values);

        res.status(201).send('Employee fixed wage details inserted successfully');
    } catch (error) {
        console.error('Error inserting employee fixed wage details:', error);
        res.status(500).send('Internal Server Error');
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API endpoint to insert daily attendance details
app.post('/dailyattendance', async (req, res) => {
    try {
        const { employeename, date, day, in_time, out_time, today_ot, salary_advance } = req.body;

        // Insert daily attendance details into the database
        const query = `
            INSERT INTO dailyattendance (employeename, date, day, in_time, out_time, today_ot, salary_advance)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [employeename, date, day, in_time, out_time, today_ot, salary_advance];
        await pool.query(query, values);

        res.status(201).send('Daily attendance details inserted successfully');
    } catch (error) {
        console.error('Error inserting daily attendance details:', error);
        res.status(500).send('Internal Server Error');
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

