fetch('http://localhost:3000/employeesname')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const designation = {};
        const getvendor = {};
        data.forEach(item => {
            designation[item.name] = item.designation;
            getvendor[item.name] = item.contractor_type;
        });

        const getdesignation = designation["RAJESH"];
        const getvendorOfRamu = getvendor["RAJESH"];

        console.log("Designation of RAMU:", getdesignation);
        console.log("Contractor type of RAMU:", getvendorOfRamu);
    })
    .catch(error => {
        console.error('Error fetching or processing data:', error);
    });
const a = 0.5;
let b = -0.5;

if (b < 0) {
    b = -b; // remove the negative sign and store the absolute value
}

console.log(a - b);

