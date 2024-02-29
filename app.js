const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const { Client } = require('pg');
const { CommitStats } = require('git');


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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API route to store contractor details
app.post('/contractors', async (req, res) => {
    const {
        name,
        contractor_type,
        working_hours_per_day,
        weekday_ot_type,
        sunday_ot_type
    } = req.body;

    try {
        // Insert the contractor details into the database
        const query = `INSERT INTO contractor (name, contractor_type, workinghoursperday, weekdayottype, sundayorholidayottype)
                       VALUES ($1, $2, $3, $4)`;
        const values =
            [
                name,
                contractor_type,
                working_hours_per_day,
                weekday_ot_type,
                sunday_ot_type
            ];
        await client.query(query, values);

        console.log('Contractor details added successfully');
        res.status(201).json({ message: 'Contractor details added successfully' });
    } catch (err) {
        console.error('Error inserting contractor details:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API endpoint to insert employee details
app.post('/employees', async (req, res) => {
    try {
        const {
            name,
            designation,
            employeetype,
            site_working_name,
            site_workorder_no,
            joining_date,
            contractor_name,
            recruitment_type,
            status
        } = req.body;

        // Insert employee details into the database
        const query = `
            INSERT INTO employee (name, designation,employeetype, site_working_name,site_workorder_no, joining_date, contractor_name, recruitment_type, status,fixedwage_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        const values = [
            name,
            designation,
            employeetype,
            site_working_name,
            site_workorder_no,
            joining_date,
            contractor_name,
            recruitment_type,
            status,
            false
        ];
        await client.query(query, values);

        res.status(201).send('Employee details inserted successfully');
    } catch (error) {
        console.error('Error inserting employee details:', error);
        res.status(500).send('Internal Server Error');
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Route to handle POST requests to create a new fixed wage record
app.post('/employeefixedwage', async (req, res) => {
    try {
        const {
            employeename,
            designation,
            fixed_basic_da,
            fixed_hra,
            fixed_food_allowance,
            fixed_site_allowance,
            fixed_gross_total,
            ot_price_per_hr
        } = req.body;


        // Check if the employee already exists
        const checkQuery = 'SELECT COUNT(*) FROM employeefixedwage WHERE employeename = $1';
        const checkValues = [employeename];
        const { rows } = await client.query(checkQuery, checkValues);
        const employeeCount = parseInt(rows[0].count);

        if (employeeCount == 0) {

            // Insert data into the database
            const query = `INSERT INTO employeefixedwage 
                     (employeename, designation, fixed_basic_da, fixed_hra, fixed_food_allowance, fixed_site_allowance, fixed_gross_total) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`;
            const values = [
                employeename,
                designation,
                fixed_basic_da,
                fixed_hra,
                fixed_food_allowance,
                fixed_site_allowance,
                fixed_gross_total
            ];

            await client.query(query, values);

            const getcontype = `SELECT c.contractor_type FROM contractor c
            JOIN employee e ON c.name = e.contractor_name
            WHERE e.name = $1`;

            const getcontyperesult = await client.query(getcontype, [employeename]);


            if (getcontyperesult.rows[0].contractor_type == 'VENDOR') {
                const otquery = `INSERT INTO vendorotwage(employee_name, ot_price_per_hr) VALUES ($1, $2)`;
                await client.query(otquery, [employeename, ot_price_per_hr]);
            }

            res.status(201).json({ message: 'Fixed wage record created successfully' });
        } else {
            return res.status(400).json({ message: 'Employee already has a fixed wage record' });
        }
    } catch (error) {
        console.error('Error creating fixed wage record', error);
        res.status(500).json({ message: 'Error creating fixed wage record' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API endpoint to store details in the noofdaysinmonth table
app.post('/noofdaysinmonth', async (req, res) => {
    try {
        const { contractor_type, month, year, noofdaysinmonth } = req.body;
        const monthyear = `${month}${year}`;

        // Check if the record already exists
        const checkQuery = 'SELECT * FROM noofdaysinmonth WHERE contractor_type = $1 AND monthyear = $2';
        const checkValues = [contractor_type, monthyear];
        const { rowCount } = await client.query(checkQuery, checkValues);

        // If the record already exists, send a proper message
        if (rowCount > 0) {
            return res.status(400).send('Data already exists for the specified contractor type and month/year.');
        }

        // Insert data into the noofdaysinmonth table
        const insertQuery = 'INSERT INTO noofdaysinmonth (contractor_type, monthyear, noofdaysinmonth) VALUES ($1, $2, $3)';
        const insertValues = [contractor_type, monthyear, noofdaysinmonth];
        await client.query(insertQuery, insertValues);

        res.status(201).send('Details stored successfully');
    } catch (error) {
        console.error('Error storing details:', error);
        res.status(500).send('Internal Server Error');
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//employee daily attendance and working data
app.post('/dailyattendance', async (req, res) => {
    try {
        const {
            employeename,
            date,
            day,
            in_date,
            in_time,
            out_date,
            out_time,
            salary_advance,
            ot_time_break,
            other_deduction,
            fines_damages_loss
        } = req.body;

        // Check if the record already exists in dailyattendance table
        const checkAttendanceQuery = `
         SELECT * FROM dailyattendance
         WHERE employeename = $1 AND in_date = $2
     `;
        const checkAttendanceValues = [employeename, in_date];
        const attendanceResult = await client.query(checkAttendanceQuery, checkAttendanceValues);

        if (attendanceResult.rows.length > 0) {
            res.status(409).send('Attendance already recorded for this date');
            return;
        } else {

            // Convert in_time and out_time to Date objects
            const startTime = new Date(`${in_date}T${in_time}`);
            const endTime = new Date(`${out_date}T${out_time}`);

            // Check if startTime and endTime are valid dates
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                throw new Error('Invalid time format');
            }

            // Calculate the total working hours
            const workingMillis = endTime.getTime() - startTime.getTime();
            if (workingMillis < 0) {
                throw new Error('End time cannot be before start time');
            }
            const workingHours = workingMillis / (1000 * 60 * 60); // Convert milliseconds to hours

            console.log('Total working hours:', workingHours);



            // // Fetch the contractor name for the employee from the employee table
            // const getconstractorname = `SELECT contractor_name FROM employee WHERE name = $1`;
            // const getconstractornameresult = await client.query(getconstractorname, [employeename]);

            // Fetch the working hours, weekday OT type, and Sunday/holiday OT type from the contractor table
            const getottypeworkinghours = `SELECT c.contractor_type, c.workinghoursperday FROM contractor c
            JOIN employee e ON c.name = e.contractor_name
            WHERE e.name = $1`;

            const getottypeworkinghoursresult = await client.query(getottypeworkinghours, [employeename]);
            //console.log("getottypeworkinghoursresult",getottypeworkinghoursresult);

            // Extract the required data from the query results
            const workinghoursperday = getottypeworkinghoursresult.rows[0].workinghoursperday;

            console.log("workinghoursperday", workinghoursperday);
            //const workinghoursperdayresult = await client.query(getWorkingHoursQuery, [employeename]);


            let weekdaytodayOT = 0;
            let sunday_holiday_ot = 0;
            // let noofDaysinmonth = 26;
            let noOfPresentDays = 0;
            let national_festival_holiday = 0;
            let todayot = 0;
            let nagativeot = 0;

            if (day === 'sunday') {
                sunday_holiday_ot = workingHours - ot_time_break;
                todayot = sunday_holiday_ot;
            } else {
                if (workingHours !== 0) { // Ensure workingHours is not 0 before processing
                    if (workingHours >= 4 && workingHours <= 6) {
                        // If the working hours are between 4 and 6 (inclusive), consider half-day work
                        weekdaytodayOT = 0;
                        todayot = weekdaytodayOT;
                        noOfPresentDays = 0.5; // Consider half-day as the employee is present for a part of the day
                    } else {
                        // If the working hours are more than 6, calculate overtime
                        weekdaytodayOT = workingHours - workinghoursperday; // Calculate overtime hours
                        if (weekdaytodayOT > 0) {
                            weekdaytodayOT -= ot_time_break; // Subtract the break time from overtime
                            todayot = weekdaytodayOT;
                        }

                        if (weekdaytodayOT < 0) {
                            // If overtime hours are negative, set them to 0 (no overtime)
                            nagativeot = weekdaytodayOT;
                            weekdaytodayOT = 0;
                        }
                        noOfPresentDays = 1; // Consider the full day as present
                    }
                }

            }
            console.log(employeename);

            // Insert daily attendance details into the database
            const insertQuery = `
                INSERT INTO dailyattendance (employeename, date, day, in_date, in_time, out_date, out_time, today_ot, salary_advance, nagativeot, other_deduction, fines_damages_loss)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            const insertValues = [
                employeename,
                date,
                day,
                in_date,
                in_time,
                out_date,
                out_time,
                todayot,
                salary_advance,
                nagativeot,
                other_deduction,
                fines_damages_loss
            ];
            await client.query(insertQuery, insertValues);

            // Extract the month and year from the date
            const month = new Date(date).getMonth() + 1; // Adding 1 because months are zero-indexed
            const year = new Date(date).getFullYear();

            // Convert month and year to strings and concatenate them
            const monthyear = month.toString() + year.toString();

            console.log("check existing working data", employeename);
            await calculateworkingdata(employeename, monthyear, noOfPresentDays, national_festival_holiday, weekdaytodayOT, salary_advance, sunday_holiday_ot, nagativeot, other_deduction, fines_damages_loss, res);
            console.log("test working data back");

            const getottypeworkinghours1 = `SELECT c.contractor_type, c.workinghoursperday FROM contractor c
            JOIN employee e ON c.name = e.contractor_name
            WHERE e.name = $1`;

            const getottypeworkinghoursresult1 = await client.query(getottypeworkinghours1, [employeename]);
            const contractor_type1 = getottypeworkinghoursresult1.rows[0].contractor_type;

            if (contractor_type1 == 'VENDOR') {
                //console.log("before fuction call");
                await calculatevendorwage(employeename, monthyear, res);
                //console.log("after function call");
            } else {
                await calculateEmployeeWage(employeename, monthyear, res);
                await calculateEmployeeWagestatutory(employeename, monthyear, res);
            }
            //console.log("data success");
            res.status(201).send('Daily attendance details inserted successfully');
            console.log(employeename);

            //console.log(res);

        }
    } catch (error) {
        console.error('Error inserting daily attendance details:', error);
        res.status(500).send('Internal Server Error');
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////// function calling /////////////////////////////////////////////////////////////////////
async function calculateworkingdata(employeeName, MonthYear, NoOfPresentDays, National_festival_holiday, WeekdaytodayOT, Salary_advance, Sunday_holiday_ot, Nagativeot, Other_deduction, Fines_damages_loss, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;
        let noOfPresentDays = NoOfPresentDays;
        let national_festival_holiday = National_festival_holiday;
        let weekdaytodayOT = WeekdaytodayOT;
        let salary_advance = Salary_advance;
        let sunday_holiday_ot = Sunday_holiday_ot;
        let nagativeot = Nagativeot;
        const other_deduction = Other_deduction;
        const fines_damages_loss = Fines_damages_loss;


        const getnoofdaysinmonth = `SELECT d.noofdaysinmonth 
            FROM contractor c
            JOIN employee e ON c.name = e.contractor_name
            JOIN noofdaysinmonth d ON c.contractor_type = d.contractor_type
            WHERE e.name = $1`;

        const getnoofdaysinmonthresult = await client.query(getnoofdaysinmonth, [employeename]);
        let no_of_Days_in_month = getnoofdaysinmonthresult.rows[0].noofdaysinmonth;


        // Check if the employee record exists for the given month
        const employeeQuery = `
                SELECT employeename 
                FROM workingdata 
                WHERE employeename = $1 AND monthyear = $2
            `;
        const employeeValues = [employeename, monthyear];
        const employeeResult = await client.query(employeeQuery, employeeValues);

        console.log("before updating working data", employeename);

        if (employeeResult.rows.length === 0) {

            console.log("inside if working data", employeename);
            //const employeename1 = employeename;
            // Fetch the fixed gross total for the employee from the employeefixedwage table
            const getotprice = `SELECT fixed_gross_total FROM employeefixedwage WHERE employeename = $1`;
            const getotpriceresult = await client.query(getotprice, [employeename]);

            // // Fetch the contractor name for the employee from the employee table
            // const getconstractorname = `SELECT contractor_name FROM employee WHERE name = $1`;
            // const getconstractornameresult = await client.query(getconstractorname, [employeename]);

            // Fetch the working hours, weekday OT type, and Sunday/holiday OT type from the contractor table
            const getottype = `SELECT c.contractor_type, c.workinghoursperday, c.weekdayottype, c.sundayorholidayottype
                FROM contractor c
                JOIN employee e ON c.name = e.contractor_name
                WHERE e.name = $1
                `;
            const getottyperesult = await client.query(getottype, [employeename]);

            // Extract the required data from the query results
            const workinghoursperday = getottyperesult.rows[0].workinghoursperday;
            const weekdayottype = getottyperesult.rows[0].weekdayottype;
            const sundayholidayottype = getottyperesult.rows[0].sundayorholidayottype;
            const contractor_type = getottyperesult.rows[0].contractor_type
            // Calculate OT prices based on the fetched data
            const otpriceperhr = customRound((getotpriceresult.rows[0].fixed_gross_total / no_of_Days_in_month ) / workinghoursperday);

            const weekdayotpriceperhr = customRound( otpriceperhr * weekdayottype );
            const sundayholidayotpriceperhr = customRound(otpriceperhr * sundayholidayottype);

            // If no record exists for the employee and month, insert a new record
            const insertQuery = `
                    INSERT INTO workingdata (
                        employeename, 
                        monthyear, 
                        no_of_days_in_month, 
                        no_of_present_days, 
                        national_festival_holiday,
                        weekday_no_of_hours_overtime, 
                        sunday_holiday_no_of_hours_overtime, 
                        salary_advance, 
                        weekday_ot_price_hr, 
                        sunday_holiday_ot_price_hr,
                        nagativeot,
                        other_deduction,
                        fines_damages_loss)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10, $11, $12,$13)
                `;
            const insertValues = [
                employeename,
                monthyear,
                no_of_Days_in_month,
                noOfPresentDays,
                national_festival_holiday,
                weekdaytodayOT,
                sunday_holiday_ot,
                salary_advance,
                weekdayotpriceperhr,
                sundayholidayotpriceperhr,
                nagativeot,
                other_deduction,
                fines_damages_loss
            ];
            await client.query(insertQuery, insertValues);
            console.log("after inserting working data", employeename);
        } else {
            // If a record exists, update the existing record with new values
            const updateQuery = `
                    UPDATE workingdata
                    SET no_of_present_days = no_of_present_days + $1, 
                        weekday_no_of_hours_overtime = weekday_no_of_hours_overtime + $2, 
                        sunday_holiday_no_of_hours_overtime = sunday_holiday_no_of_hours_overtime + $3,
                        salary_advance = salary_advance + $4,
                        nagativeot = nagativeot + $5,
                        other_deduction = other_deduction + $6,
                        fines_damages_loss = fines_damages_loss + $7
                    WHERE employeename = $8 AND monthyear = $9
                `;
            const updateValues = [
                noOfPresentDays,
                weekdaytodayOT,
                sunday_holiday_ot,
                salary_advance,
                nagativeot,
                other_deduction,
                fines_damages_loss,
                employeename,
                monthyear
            ];
            await client.query(updateQuery, updateValues);

        }

    } catch (error) {
        console.error('Error inserting working data:', error);
        res.status(500).send('Internal Server Error');
    }
}// end of employee working data calculations
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Workmen Reference Wage register calculations
// Define a function to calculate wage and deductions
async function calculateEmployeeWage(employeeName, MonthYear, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;

        // Check if the employee record exists for the given month
        const employeewageQuery = `
             SELECT employeename 
             FROM employeewage 
             WHERE employeename = $1 AND monthyear = $2
         `;
        const employeeValues = [employeename, monthyear];
        const employeeResult = await client.query(employeewageQuery, employeeValues);

        if (employeeResult.rows.length == 0) {

            //employee or workmen working data
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);


            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = customRound( no_of_present_days + national_festival_holiday );
            console.log("no_of_payable_days", no_of_payable_days);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const salary_advance = workingdataResult.rows[0].salary_advance;
            const weekday_ot_price_hr = workingdataResult.rows[0].weekday_ot_price_hr;
            const sunday_holiday_ot_price_hr = workingdataResult.rows[0].sunday_holiday_ot_price_hr;
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;

            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwage where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].fixed_basic_da;
            const fixed_hra = employeefixedwageresult.rows[0].fixed_hra;
            const fixed_food_allowance = employeefixedwageresult.rows[0].fixed_food_allowance;
            const fixed_site_allowance = employeefixedwageresult.rows[0].fixed_site_allowance;
            const fixed_gross_total = employeefixedwageresult.rows[0].fixed_gross_total;

            console.log("fixed_basic_da", fixed_basic_da);
            console.log("fixed_hra", fixed_hra);
            console.log("fixed_food_allowance", fixed_food_allowance);
            console.log("fixed_site_allowance", fixed_site_allowance);
            console.log("fixed_gross_total", fixed_gross_total);

            //employee earned wage data
            const earned_basic_da = customRound((fixed_basic_da / no_of_days_in_month) * no_of_payable_days);
            const earned_hra = customRound((fixed_hra / no_of_days_in_month) * no_of_payable_days);
            const earned_food_allowance = customRound((fixed_food_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_site_allowance = customRound((fixed_site_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_weekday_ot_wage = customRound((weekday_no_of_hours_overtime - nagativeot) * weekday_ot_price_hr);
            const earned_sunday_holiday_ot_wage = customRound(sunday_holiday_no_of_hours_overtime * sunday_holiday_ot_price_hr);
            const earned_ot_wage = customRound(earned_weekday_ot_wage + earned_sunday_holiday_ot_wage);
            const earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + earned_ot_wage);

            //employee deduction wage data
            let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            }

            const deduction_epf = customRound(earned_basic_da * 0.12);
            const deduction_wcp = 0;
            const deduction_incometax = 0;
            const deduction_salary_advance = salary_advance;
            const deduction_fines_damages_loss = fines_damages_loss;
            const deduction_others = other_deduction;
            const deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance + deduction_fines_damages_loss + deduction_others);

            //net payable
            const net_salary = earned_gross_total - deduction_total;

            // get employee designation
            const getDesignationQuery = `
                SELECT designation FROM employee
                WHERE name = $1`;

            const designationResult = await client.query(getDesignationQuery, [employeename]);
            const designation = designationResult.rows[0].designation;

            // Assuming you have calculated all the necessary values for insertion
            const insertQuery = `
            INSERT INTO employeewage (
                employeename,
                designation,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                earned_ot_wage,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                DATE,
                monthyear
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`;

            const insertValues = [
                employeename,
                designation,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                earned_ot_wage,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                new Date(),
                monthyear
            ];

            await client.query(insertQuery, insertValues);
            console.log("Employtee wage data inserted successfully");
        } else {

            //employee or workmen working data
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);


            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = customRound(no_of_present_days + national_festival_holiday);
            console.log("no_of_payable_days", no_of_payable_days);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const salary_advance = workingdataResult.rows[0].salary_advance;
            const weekday_ot_price_hr = workingdataResult.rows[0].weekday_ot_price_hr;
            const sunday_holiday_ot_price_hr = workingdataResult.rows[0].sunday_holiday_ot_price_hr;
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;

            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwage where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].fixed_basic_da;
            const fixed_hra = employeefixedwageresult.rows[0].fixed_hra;
            const fixed_food_allowance = employeefixedwageresult.rows[0].fixed_food_allowance;
            const fixed_site_allowance = employeefixedwageresult.rows[0].fixed_site_allowance;
            const fixed_gross_total = employeefixedwageresult.rows[0].fixed_gross_total;

            console.log("fixed_basic_da", fixed_basic_da);
            console.log("fixed_hra", fixed_hra);
            console.log("fixed_food_allowance", fixed_food_allowance);
            console.log("fixed_site_allowance", fixed_site_allowance);
            console.log("fixed_gross_total", fixed_gross_total);

            //employee earned wage data
            const earned_basic_da = customRound((fixed_basic_da / no_of_days_in_month) * no_of_payable_days);
            const earned_hra = customRound((fixed_hra / no_of_days_in_month) * no_of_payable_days);
            const earned_food_allowance = customRound((fixed_food_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_site_allowance = customRound((fixed_site_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_weekday_ot_wage = customRound((weekday_no_of_hours_overtime - nagativeot) * weekday_ot_price_hr);
            const earned_sunday_holiday_ot_wage = customRound(sunday_holiday_no_of_hours_overtime * sunday_holiday_ot_price_hr);
            const earned_ot_wage = customRound(earned_weekday_ot_wage + earned_sunday_holiday_ot_wage);
            const earned_others = 0;
            const earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + earned_ot_wage + earned_others);

            //employee deduction wage data
            let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            }

            const deduction_epf = customRound(earned_basic_da * 0.12);
            const deduction_wcp = 0;
            const deduction_incometax = 0;
            const deduction_salary_advance = salary_advance;
            const deduction_fines_damages_loss = fines_damages_loss;
            const deduction_others = other_deduction;
            const deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance + deduction_fines_damages_loss + deduction_others);

            //net payable
            const net_salary = customRound(earned_gross_total - deduction_total);

            const updateemployeewage = `UPDATE employeewage
                    SET earned_basic_da = $1,
                    earned_hra = $2,
                    earned_food_allowance = $3,
                    earned_site_allowance = $4,
                    earned_ot_wage = $5,
                    earned_gross_total = $6,
                    deduction_epf = $7,
                    deduction_wcp = $8,
                    deduction_pt = $9,
                    deduction_incometax = $10,
                    deduction_salary_advance = $11,
                    deduction_fines_damages_loss = $12,
                    deduction_others = $13,
                    deduction_total =$14,
                    net_salary = $15,
                    DATE = $16
                    where employeename = $17 and monthyear = $18`;

            const updateValues = [
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                earned_ot_wage,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                new Date(),
                employeename,
                monthyear
            ];

            await client.query(updateemployeewage, updateValues);

            console.log("at employee wage earned_gross_total", earned_gross_total);

            console.log("Employtee wage data updated successfully");
        }//end of updating employee wage

    } catch (error) {// end of try block
        console.error('Error calculating employee wage:', error.message);
        res.status(500).send('Internal Server Error');
        return;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////
//Workmen Statutory Wage register calculations
// Define a function to calculate wage and deductions
async function calculateEmployeeWagestatutory(employeeName, MonthYear, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;

        // Check if the employee record exists for the given month
        const employeewageQuery = `
             SELECT employeename 
             FROM employeewagestatutory 
             WHERE employeename = $1 AND monthyear = $2
         `;
        const employeeValues = [employeename, monthyear];
        const employeeResult = await client.query(employeewageQuery, employeeValues);

        console.log("After checking Employee Existence", employeename);

        if (employeeResult.rows.length == 0) {
            console.log("inside if statement", employeename);
            //employee or workmen working data
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);


            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = no_of_present_days + national_festival_holiday;
            console.log("no_of_payable_days", no_of_payable_days);

            console.log("After reading employee working data", employeename);

            //worker reference wage data 
            const getworkmenrefdata = `
                SELECT 
                    designation,
                    earned_basic_da, 
                    earned_hra, 
                    earned_food_allowance, 
                    earned_site_allowance,
                    earned_gross_total, 
                    deduction_epf,
                    deduction_wcp,
                    deduction_pt,
                    deduction_incometax,
                    deduction_salary_advance,
                    deduction_fines_damages_loss,
                    deduction_others,
                    deduction_total,
                    net_salary
                FROM 
                    employeewage
                WHERE 
                    employeename = $1 
                    AND monthyear = $2
            `;

            console.log("test1");
            const getworkmenrefdataresult = await client.query(getworkmenrefdata, [employeename, monthyear]);

            const designation = getworkmenrefdataresult.rows[0].designation;

            console.log("test2");

            //employee earned wage data
            const earned_basic_da = getworkmenrefdataresult.rows[0].earned_basic_da;
            const workrefgross = getworkmenrefdataresult.rows[0].earned_gross_total;
            console.log("workrefgross",workrefgross);
            const ot_price_hr = customRound((workrefgross / no_of_days_in_month) / 8);
            console.log("ot_price_hr",ot_price_hr);
            const earned_hra = getworkmenrefdataresult.rows[0].earned_hra;
            const earned_food_allowance = getworkmenrefdataresult.rows[0].earned_food_allowance;
            const earned_site_allowance = getworkmenrefdataresult.rows[0].earned_site_allowance;
            const earned_ot_wage = customRound(no_of_payable_days * (ot_price_hr * 2));
            console.log("earned_ot_wage", earned_ot_wage);
            let earned_incentive = 0;
            let earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + earned_ot_wage + earned_incentive + earned_incentive);

            console.log("test3");

            //employee deduction data
            const deduction_epf = getworkmenrefdataresult.rows[0].deduction_epf;
            const deduction_wcp = getworkmenrefdataresult.rows[0].deduction_wcp;
            const deduction_pt = getworkmenrefdataresult.rows[0].deduction_pt;
            const deduction_incometax = getworkmenrefdataresult.rows[0].deduction_incometax;
            const deduction_salary_advance = getworkmenrefdataresult.rows[0].deduction_salary_advance;
            const deduction_fines_damages_loss = getworkmenrefdataresult.rows[0].deduction_fines_damages_loss;
            let deduction_others = getworkmenrefdataresult.rows[0].deduction_others;
            let deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance + deduction_fines_damages_loss + deduction_others);

            console.log("test4");
            //net payable
            const workmen_ref_net_salary = getworkmenrefdataresult.rows[0].net_salary;
            const net_salary = customRound(earned_gross_total - deduction_total);

            console.log("test5");

            if (net_salary > workmen_ref_net_salary) {
                console.log("test6");
                deduction_others = deduction_others + (net_salary - workmen_ref_net_salary);
            } else {
                earned_incentive = workmen_ref_net_salary - net_salary;
            }

            earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + earned_ot_wage + earned_incentive + earned_incentive);
            deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance + deduction_fines_damages_loss + deduction_others);


            const workmen_statutory_net_salary = customRound(earned_gross_total - deduction_total);

            // Assuming you have calculated all the necessary values for insertion
            const insertQuery = `
            INSERT INTO employeewagestatutory (
                employeename,
                designation,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                earned_ot_wage,
                earned_incentive,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                DATE,
                monthyear
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`;

            const insertValues = [
                employeename,
                designation,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                earned_ot_wage,
                earned_incentive,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                workmen_statutory_net_salary,
                new Date(),
                monthyear
            ];

            await client.query(insertQuery, insertValues);

            console.log("Employtee Statutory wage data inserted successfully");
        } else {


            //employee or workmen working data
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);


            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = no_of_present_days + national_festival_holiday;
            console.log("no_of_payable_days", no_of_payable_days);

            //worker reference wage data 
            const getworkmenrfdata = `
                SELECT 
                    earned_basic_da, 
                    earned_hra, 
                    earned_food_allowance, 
                    earned_site_allowance, 
                    earned_gross_total,
                    deduction_epf,
                    deduction_wcp,
                    deduction_pt,
                    deduction_incometax,
                    deduction_salary_advance,
                    deduction_fines_damages_loss,
                    deduction_others,
                    deduction_total,
                    net_salary
                FROM 
                    employeewage
                WHERE 
                    employeename = $1 
                    AND monthyear = $2
            `;


            const getworkmenrfdataresult = await client.query(getworkmenrfdata, [employeename, monthyear]);

            const get_fised_gross_salary = `select fixed_gross_total from employeefixedwage where employeename = $1`;

            const get_fised_gross_salaryresult = await client.query(get_fised_gross_salary, [employeename]);

            const workrefgross = get_fised_gross_salaryresult.rows[0].fixed_gross_total;
            const ot_price_hr = customRound((workrefgross / no_of_days_in_month) / 8);

            //employee earned wage data
            const earned_basic_da = getworkmenrfdataresult.rows[0].earned_basic_da;
            const earned_hra = getworkmenrfdataresult.rows[0].earned_hra;
            const earned_food_allowance = getworkmenrfdataresult.rows[0].earned_food_allowance;
            const earned_site_allowance = getworkmenrfdataresult.rows[0].earned_site_allowance;
            console.log("test ot wage");
            console.log("no_of_payable_days", no_of_payable_days);
            console.log("ot_price_hr", ot_price_hr);
            console.log("ot_price_hr", ot_price_hr * 2);
            const earned_ot_wage = customRound(no_of_payable_days * (ot_price_hr * 2));
            console.log("earned_ot_wage", earned_ot_wage);
            let earned_incentive = 0;
            let earned_gross_total1 = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + earned_ot_wage + earned_incentive);


            const deduction_epf = getworkmenrfdataresult.rows[0].deduction_epf;
            const deduction_wcp = getworkmenrfdataresult.rows[0].deduction_wcp;
            const deduction_pt = getworkmenrfdataresult.rows[0].deduction_pt;
            const deduction_incometax = getworkmenrfdataresult.rows[0].deduction_incometax;
            const deduction_salary_advance = getworkmenrfdataresult.rows[0].deduction_salary_advance;
            const deduction_fines_damages_loss = getworkmenrfdataresult.rows[0].deduction_fines_damages_loss;
            let deduction_others1 = getworkmenrfdataresult.rows[0].deduction_others;
            let deduction_total1 = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance + deduction_fines_damages_loss + deduction_others1);

            //net payable
            const workmen_ref_net_salary = getworkmenrfdataresult.rows[0].net_salary;
            const net_salary = customRound(earned_gross_total1 - deduction_total1);

            console.log("workmen ref netsalary", workmen_ref_net_salary);
            console.log("workmen statutory netsalary", net_salary);

            console.log("before difference", earned_gross_total1);
            console.log("bbefore difference", deduction_total1);

            if (net_salary > workmen_ref_net_salary) {
                console.log("test6");
                deduction_others1 = deduction_others1 + (net_salary - workmen_ref_net_salary);
            } else {
                earned_incentive = workmen_ref_net_salary - net_salary;
            }


            //console.log("differnce ", difference);
            console.log("earned incentive", earned_incentive);

            earned_gross_total1 = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + earned_ot_wage + earned_incentive);
            deduction_total1 = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance + deduction_fines_damages_loss + deduction_others1);

            console.log("After difference earned_gross_total1", earned_gross_total1);
            console.log("After difference deduction_total1", deduction_total1);
            const workmen_statutory_net_salary = customRound(earned_gross_total1 - deduction_total1);


            console.log("Workmen statutory net salary", workmen_statutory_net_salary);

            const updateemployeewage = `UPDATE employeewagestatutory
                    SET earned_basic_da = $1,
                    earned_hra = $2,
                    earned_food_allowance = $3,
                    earned_site_allowance = $4,
                    earned_ot_wage = $5,
                    earned_incentive = $6,
                    earned_gross_total = $7,
                    deduction_epf = $8,
                    deduction_wcp = $9,
                    deduction_pt = $10,
                    deduction_incometax = $11,
                    deduction_salary_advance = $12,
                    deduction_fines_damages_loss = $13,
                    deduction_others = $14,
                    deduction_total =$15,
                    net_salary = $16,
                    DATE = $17
                    where employeename = $18 and monthyear = $19`;

            const updateValues = [
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                earned_ot_wage,
                earned_incentive,
                earned_gross_total1,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance,
                deduction_fines_damages_loss,
                deduction_others1,
                deduction_total1,
                workmen_statutory_net_salary,
                new Date(),
                employeename,
                monthyear
            ];

            await client.query(updateemployeewage, updateValues);

            console.log("Employtee Statutory wage data updated successfully");
        }//end of updating employee wage

    } catch (error) {// end of try block
        console.error('Error calculating employee wage:', error.message);
        res.status(500).send('Internal Server Error');
        return;
    }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////
//Calculating vendor salry wage
async function calculatevendorwage(employeeName, MonthYear, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;

        //check existence
        const checkexist = `select employeename from vendorwagedata where employeename = $1 and monthyear = $2`;
        const checkexistresult = await client.query(checkexist, [employeename, monthyear]);
        console.log("vendor test1");
        if (checkexistresult.rows.length == 0) {
            console.log("vendor test2");
            //employee or workmen working data
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);

            console.log("vendor test3");
            //const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = no_of_present_days + national_festival_holiday;
            //console.log("no_of_payable_days", no_of_payable_days);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const salary_advance = workingdataResult.rows[0].salary_advance;
            console.log("vendor test4");
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;
            console.log("vendor test5");
            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwage where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].fixed_basic_da;
            //const fixed_hra = employeefixedwageresult.rows[0].fixed_hra;
            //const fixed_food_allowance = employeefixedwageresult.rows[0].fixed_food_allowance;
            //const fixed_site_allowance = employeefixedwageresult.rows[0].fixed_site_allowance;
            //const fixed_gross_total = employeefixedwageresult.rows[0].fixed_gross_total;
            console.log("vendor test6");
            // ot price
            const getotprice = `select ot_price_per_hr from vendorotwage where employee_name = $1`;
            const getotpriceresult = await client.query(getotprice, [employeename]);
            const vendor_ot_price_hr = getotpriceresult.rows[0].ot_price_per_hr;
            console.log("vendor test7");
            // Fetch the working hours, weekday OT type, and Sunday/holiday OT type from the contractor table
            const getottype = `SELECT c.weekdayottype, c.sundayorholidayottype
                FROM contractor c
                JOIN employee e ON c.name = e.contractor_name
                WHERE e.name = $1
                `;
            const getottyperesult = await client.query(getottype, [employeename]);

            const weekday_ot_price_hr = vendor_ot_price_hr * getottyperesult.rows[0].weekdayottype;
            const sunday_holiday_ot_price_hr = vendor_ot_price_hr * getottyperesult.rows[0].sundayorholidayottype;
            console.log("vendor test7");
            // earning wage

            let nagativeotfinal = nagativeot;
            if (nagativeotfinal < 0){
                nagativeotfinal = -nagativeotfinal;
            }
        
            const earned_salary = customRound(fixed_basic_da * no_of_payable_days);
            const earned_otwage_weekday = customRound((weekday_no_of_hours_overtime - nagativeotfinal) * weekday_ot_price_hr);
            const earned_otwage_sunday_holiday = customRound(sunday_holiday_no_of_hours_overtime * sunday_holiday_ot_price_hr);
            const earned_otwage = earned_otwage_weekday + earned_otwage_sunday_holiday;
            const gross_total = earned_salary + earned_otwage;
            console.log("vendor test8");
            //deduction wage
            const deduction_total = customRound(salary_advance + other_deduction + fines_damages_loss);

            const net_salary = gross_total - deduction_total;

            const insertquery = `INSERT INTO vendorwagedata ( 
                employeename, 
                earned_salary, 
                earned_otwage, 
                gross_total, 
                salary_advance, 
                fines_damages_loss, 
                other_deduction, 
                deduction_total, 
                net_salary, 
                monthyear, 
                date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

            const currentDate = new Date();
            await client.query(insertquery, [employeename,
                earned_salary,
                earned_otwage,
                gross_total, salary_advance,
                fines_damages_loss,
                other_deduction,
                deduction_total,
                net_salary,
                monthyear,
                currentDate]);

            console.log("Vendor wage details stored successfully");

        } else {
            console.log("updating data");
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);

            console.log("vendor test3");
            //const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = no_of_present_days + national_festival_holiday;
            //console.log("no_of_payable_days", no_of_payable_days);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const salary_advance = workingdataResult.rows[0].salary_advance;
            console.log("vendor test4");
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;
            console.log("vendor test5");
            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwage where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].fixed_basic_da;
            //const fixed_hra = employeefixedwageresult.rows[0].fixed_hra;
            //const fixed_food_allowance = employeefixedwageresult.rows[0].fixed_food_allowance;
            //const fixed_site_allowance = employeefixedwageresult.rows[0].fixed_site_allowance;
            //const fixed_gross_total = employeefixedwageresult.rows[0].fixed_gross_total;
            console.log("vendor test6");
            // ot price
            const getotprice = `select ot_price_per_hr from vendorotwage where employee_name = $1`;
            const getotpriceresult = await client.query(getotprice, [employeename]);
            const vendor_ot_price_hr = getotpriceresult.rows[0].ot_price_per_hr;
            console.log("vendor test7");
            // Fetch the working hours, weekday OT type, and Sunday/holiday OT type from the contractor table
            const getottype = `SELECT c.weekdayottype, c.sundayorholidayottype
                FROM contractor c
                JOIN employee e ON c.name = e.contractor_name
                WHERE e.name = $1
                `;
            const getottyperesult = await client.query(getottype, [employeename]);

            const weekday_ot_price_hr = vendor_ot_price_hr * getottyperesult.rows[0].weekdayottype;
            const sunday_holiday_ot_price_hr = vendor_ot_price_hr * getottyperesult.rows[0].sundayorholidayottype;
            console.log("vendor test7");
            // earning wage
            let nagativeotfinal = nagativeot;
            if (nagativeotfinal < 0){
                nagativeotfinal = -nagativeotfinal;
            }
            console.log("nagativeotfinal",nagativeotfinal);
            
            const earned_salary = customRound(fixed_basic_da * no_of_payable_days);
            const earned_otwage_weekday = customRound((weekday_no_of_hours_overtime - nagativeotfinal) * weekday_ot_price_hr);
            const earned_otwage_sunday_holiday = customRound(sunday_holiday_no_of_hours_overtime * sunday_holiday_ot_price_hr);
            const earned_otwage = earned_otwage_weekday + earned_otwage_sunday_holiday;
            const gross_total = earned_salary + earned_otwage;
            console.log("vendor test8");
            //deduction wage
            const deduction_total = customRound(salary_advance + other_deduction + fines_damages_loss);

            const net_salary = gross_total - deduction_total;

            const updatequery = `UPDATE vendorwagedata SET 
                earned_salary = $1,
                earned_otwage = $2, 
                gross_total = $3, 
                salary_advance = $4, 
                fines_damages_loss = $5, 
                other_deduction = $6, 
                deduction_total = $7, 
                net_salary = $8, 
                monthyear = $9, 
                date = $10`;

            const currentDate = new Date();
            await client.query(updatequery, [
                earned_salary,
                earned_otwage,
                gross_total, 
                salary_advance,
                fines_damages_loss,
                other_deduction,
                deduction_total,
                net_salary,
                monthyear,
                currentDate]);

            console.log("Vendor wage details updated successfully");


        }

    } catch (error) {// end of try block
        console.error('Error calculating employee wage:', error.message);
        res.status(500).send('Internal Server Error');
        return;
    }
}
///////////////////////////////////////////////////////////////////////////////////////
//value round off function
function customRound(num) {
    if (num < 0) {
        return -customRound(-num);
    }
    var intPart = Math.floor(num);
    var fracPart = num - intPart;
    if (fracPart < 0.5) {
        return intPart;
    } else {
        return Math.ceil(num);
    }
}
/////////////////////////////////////////////////////////// get api's///////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET employees name and designation
app.get('/employeesname', async (req, res) => {
    try {
        const { rows } = await client.query(`SELECT e.name, e.designation, c.contractor_type
        FROM employee e
        INNER JOIN contractor c ON e.contractor_name = c.name;
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET cntractor name
app.get('/contractorname', async (req, res) => {
    try {
        const { rows } = await client.query('SELECT name FROM contractor');
        res.json(rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define a GET endpoint to fetch employee workmen refereence wage data
app.get('/employeewage', async (req, res) => {
    try {
        let monthyear = 22024;
        const query = `SELECT
            e.employeename,
            e.designation,
            ef.fixed_basic_da,
            ef.fixed_hra,
            ef.fixed_food_allowance,
            ef.fixed_site_allowance,
            ef.fixed_gross_total,
            w.no_of_days_in_month,
            w.no_of_present_days,
            w.national_festival_holiday,
            w.weekday_no_of_hours_overtime,
            w.sunday_holiday_no_of_hours_overtime,
            e.earned_basic_da,
            e.earned_hra,
            e.earned_food_allowance,
            e.earned_site_allowance,
            e.earned_ot_wage,
            e.earned_gross_total,
            e.deduction_wcp,
            e.deduction_epf,
            e.deduction_pt,
            e.deduction_incometax,
            e.deduction_salary_advance,
            e.deduction_fines_damages_loss,
            e.deduction_others,
            e.deduction_total,
            e.net_salary
            FROM employeewage e 
            INNER JOIN workingdata w ON e.employeename = w.employeename
            INNER JOIN employeefixedwage ef ON ef.employeename = e.employeename
            WHERE w.monthyear = $1
        `;
        const { rows } = await client.query(query, [monthyear]);

        // Iterate over the rows and calculate the sum of no_of_present_days and national_festival_holiday
        rows.forEach(row => {
            // Perform addition operation
            row.no_payable_days = parseFloat(row.no_of_present_days) + parseFloat(row.national_festival_holiday);
            row.total_ot_hrs = parseFloat(row.weekday_no_of_hours_overtime) + parseFloat(row.sunday_holiday_no_of_hours_overtime);
        });

        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define a GET endpoint to fetch employee workmen statutory wage data
app.get('/employeewagestatutory', async (req, res) => {
    try {
        let monthyear = 22024;
        const query = `SELECT
        e.employeename,
        e.designation,
        ef.fixed_basic_da,
        ef.fixed_hra,
        ef.fixed_food_allowance,
        ef.fixed_site_allowance,
        ef.fixed_gross_total,
        w.no_of_days_in_month,
        w.no_of_present_days,
        w.national_festival_holiday,
        w.weekday_no_of_hours_overtime,
        w.sunday_holiday_no_of_hours_overtime,
        e.earned_basic_da,
        e.earned_hra,
        e.earned_food_allowance,
        e.earned_site_allowance,
        e.earned_ot_wage,
        e.earned_incentive,
        e.earned_gross_total,
        e.deduction_wcp,
        e.deduction_epf,
        e.deduction_pt,
        e.deduction_incometax,
        e.deduction_salary_advance,
        e.deduction_fines_damages_loss,
        e.deduction_others,
        e.deduction_total,
        e.net_salary
        FROM employeewagestatutory e 
        INNER JOIN workingdata w ON e.employeename = w.employeename
        INNER JOIN employeefixedwage ef ON ef.employeename = e.employeename
        WHERE w.monthyear = $1
         `;
        const { rows } = await client.query(query, [monthyear]);

        rows.forEach(row => {
            // Perform addition operation
            row.no_payable_days = parseFloat(row.no_of_present_days) + parseFloat(row.national_festival_holiday);
            row.total_ot_hrs = row.no_payable_days;
        });

        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define a GET endpoint to fetch employee working data
app.get('/employeeworkingdata', async (req, res) => {
    try {
        const query = 'SELECT * FROM workingdata';
        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define a GET endpoint to fetch employee wage data
app.get('/employeefixedwage', async (req, res) => {
    try {
        const query = 'SELECT * FROM employeefixedwage';
        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define a GET endpoint to fetch CONTRACTOR TYPE
app.get('/contractortype', async (req, res) => {
    try {
        const query = 'SELECT contractor_type FROM contractor';
        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define a GET endpoint to fetch employee wage data
app.get('/vendorwagedata', async (req, res) => {
    try {
        const query = 'SELECT * FROM vendorwagedata';
        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


