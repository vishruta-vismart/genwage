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
        const values = [name, designation, site_working, joining_date, contractor_name, recruitment_type, status, false];
        await client.query(query, values);

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
        await client.query(query, values);

        res.status(201).send('Employee fixed wage details inserted successfully');
    } catch (error) {
        console.error('Error inserting employee fixed wage details:', error);
        res.status(500).send('Internal Server Error');
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/dailyattendance', async (req, res) => {
    try {
        const { employeename, date, day, in_time, out_time, today_ot, salary_advance, national_festival_holiday } = req.body;

        // Insert daily attendance details into the database
        const query = `
            INSERT INTO dailyattendance (employeename, date, day, in_time, out_time, today_ot, salary_advance)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [employeename, date, day, in_time, out_time, today_ot, salary_advance];
        await client.query(query, values);

        res.status(201).send('Daily attendance details inserted successfully');

        // Extract the month from the date
        const month = new Date(date).getMonth() + 1; // Adding 1 because months are zero-indexed

        // Check if the employee record exists for the given month
        const employeeQuery = `
            SELECT employeename 
            FROM workingdata 
            WHERE employeename = $1 AND month = $2
        `;
        const employeeValues = [employeename, month];
        const employeeResult = await client.query(employeeQuery, employeeValues);

        if (employeeResult.rows.length === 0) {
            // If no record exists for the employee and month, insert a new record
            const insertQuery = `
                INSERT INTO workingdata (employeename, month, no_of_present_days, national_festival_holiday, no_of_hours_overtime)
                VALUES ($1, $2, 1, $3, $4)
            `;
            const insertValues = [employeename, month, national_festival_holiday, today_ot];
            await client.query(insertQuery, insertValues);
        } else {
            // If a record exists, update the existing record with new values
            const updateQuery = `
                UPDATE workingdata
                SET no_of_present_days = no_of_present_days + 1, 
                    national_festival_holiday = national_festival_holiday + $1,
                    no_of_hours_overtime = no_of_hours_overtime + $2
                WHERE employeename = $3 AND month = $4
            `;
            const updateValues = [national_festival_holiday, today_ot, employeename, month];
            await client.query(updateQuery, updateValues);
        }

    } catch (error) {
        console.error('Error inserting daily attendance details:', error);
        res.status(500).send('Internal Server Error');
    }
});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

