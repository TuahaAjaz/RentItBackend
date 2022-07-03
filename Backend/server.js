const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const res = require('express/lib/response');
const cors = require('cors');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const app = express();
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'nividiaamd',
    database: 'rentit_db'
})

app.use(bodyParser.json({ limit: '50mb' }));

app.use(cors());

app.listen(3001, () => {
    console.log("Local host running at port 3001");
});

const saltRounds = 10;

var soundex = function(str) {
    let str1 = str.replace(/-/g, '');
    let str2 = str1.replace(/\s/g, '');
    let s = str2.replace(/_/g, '');
    var a = s.toLowerCase().split(''),
        f = a.shift(),
        r = '',
        codes = { a: '', e: '', i: '', o: '', u: '', b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };

    r = f +
        a
        .map(function(v, i, a) {
            return codes[v]
        })
        .filter(function(v, i, a) {
            return ((i === 0) ? v !== codes[f] : v !== a[i - 1]);
        })
        .join('');

    return (r + '000').slice(0, 4).toUpperCase();
};

function signin (sqlQuery1, sqlQuery2, email, password, res) {
    db.query(sqlQuery1, [email], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length > 0){
                bcrypt.compare(password, Data[0].Hash, function(error, result) {
                    if(result) {
                        db.query(sqlQuery2, [email], (error, Data1) => {
                            if(error) {
                                throw error;
                            }
                            res.status(200).json(Data1[0]);
                        })
                    }
                    else {
                        res.json({});
                    }
                })
            }
            else {
                throw error;
            }
        }
        catch {
            res.json({});
            console.error(error);
        }
    })
}

//CUSTOMER APIS//

app.post('/customers/signup', (req, res) => {
    const fname = req.body.FirstName;
    const lname = req.body.LastName;
    const email = req.body.CEmail;
    const contact = req.body.Contact;
    const password = req.body.password;
    const sqlQuery1 = "INSERT INTO rentit_db.customers (FirstName, LastName, CEmail, Contact) VALUES (?, ?, ?, ?)";
    const sqlQuery2 = "INSERT INTO rentit_db.cussignin (CEmail, Hash) VALUES (?, ?)";
    const sqlQuery3 = "SELECT * FROM rentit_db.cussignin WHERE CEmail = ?";
    try {
        db.query(sqlQuery3, [email], (error, Data) => {
            if(error) {
                throw error;
            }
            else if(Data.length > 0) {
                res.status(200).json({
                    statusCode: false,
                    message: "Email already exists!!"
                })
            }
            else {
                bcrypt.hash(password, saltRounds, async function(error, hash) {
                    if(error) {
                        throw error;
                    }
                    try {
                        db.beginTransaction((error) => {
                            if(error) {
                                console.log(error);
                                console.log("Bad Request");
                            }
                            try {
                                db.query(sqlQuery2,[email, hash] ,(error, Data) => {
                                    if(error) {
                                        db.rollback(() => {
                                            throw error;
                                        })
                                    }
                                    console.log("Insert1 Successfull");     
                                })}
                            
                                catch {
                                    console.log("Insert Unsuccessful");
                                    console.log(error);
                                    res.status(404).json({
                                        statusCode: false,
                                        message: "Email already exists!!"
                                    })
                                }
                                db.query(sqlQuery1,[fname, lname, email, contact] ,(error) => {
                                    try {
                                        if(error) {
                                            db.rollback(() => {
                                                throw error;
                                            })
                                        }
                                        console.log("Insert2 Successfull");
                                    }
                                    catch {
                                        console.log("Insert Unsuccessful");
                                        console.log(error);
                                    }
                                    db.commit((error) => {
                                        if(error) {
                                            db.rollback(() => {
                                                console.log(error);
                                                console.log("Bad Request");
                                            })
                                        }
                                        console.log("Success");
                                        console.log("Successful!");
                                        res.status(200).json({
                                            statusCode: true,
                                            message: "Success"
                                        });
                                    })
                                })    
                            })
                        }
                        catch {
                            console.error(error);
                        }
                    })
                }
            })
        }
    catch {
        console.error(error);
    }     
})

app.get('/customers/signin', (req, res) => {
    const password = req.query.password;
    const email = req.query.email;
    console.log(password);
    //sqlQuery1 = "SELECT rentit_db.customers.customerID, rentit_db.customers.FirstName, rentit_db.customers.LastName, rentit_db.customers.CEmail, rentit_db.customers.Contact FROM rentit_db.customers, rentit_db.cussignin whererentit_db.customers.CEmail = rentit_db.cussignin.CEmailAND rentit_db.cussignin.CEmail = ? AND rentit_db.cussignin.Hash = ?";
    sqlQuery1 = "SELECT * FROM rentit_db.cussignin WHERE CEmail = ?";
    sqlQuery2 = "SELECT * FROM rentit_db.customers WHERE CEmail = ?";
    signin(sqlQuery1, sqlQuery2, email, password, res);
})

app.get('/customers/searchResults', (req, res) => {
    const city = req.query.City;
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    sqlQuery = "select * from rentit_db.apartments where rentit_db.apartments.apartmentID NOT IN  (SELECT rentit_db.booking.apartmentID FROM rentit_db.booking WHERE (? >= fromDate AND ? <= toDate) OR (? < fromDate AND ? >= fromDate) OR (? > fromDate AND ? <= toDate)) AND rentit_db.apartments.City = ?";
    db.query(sqlQuery, [startDate, endDate, startDate, endDate, startDate, startDate, city], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length <= 0) {
                res.status(200).json({
                    statusCode: false,
                    message: "No apartments as of yet!!"
                });
            }
            else {
                res.status(200).json(Data);
            }
        }
        catch {
            console.error(error);
            res.status(400).json("Error in query!!");
        }
    })
})

app.get('/customers/apartDetails', (req, res) => {
    const id = req.query.id;
    const query = 'select rentit_db.apartments.City, rentit_db.hosts.HostID, FirstName, LastName, Title, rentit_db.details.address, PlaceType, rooms, priceperday, img, img1, img2, img3 from rentit_db.apartments, rentit_db.details, rentit_db.hosts where rentit_db.apartments.apartmentID = rentit_db.details.apartmentID AND rentit_db.apartments.HostID = rentit_db.hosts.HostID AND rentit_db.apartments.apartmentID = ?';
    db.query(query, [id], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            res.status(200).json(Data);
        }
        catch {
            console.log(error);
        }
    })
})

app.get('/customers/bookedapartments', (req, res) => {
    const id = req.query.customerID;
    sqlQuery = "select * from rentit_db.apartments where rentit_db.apartments.apartmentID IN  (SELECT rentit_db.booking.apartmentID FROM rentit_db.booking WHERE fromDate >= sysdate() AND rentit_db.booking.customerID = ?);";
    db.query(sqlQuery, [id], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length <= 0) {
                res.status(200).json({
                    statusCode: false,
                    message: "No apartments as of yet!!"
                });
            }
            else {
                res.status(200).json(Data);
            }
        }
        catch {
            console.error(error);
            res.status(400).json("Error in query!!");
        }
    })
})

app.post('/customers/book', (req, res) => {
    const apartmentID = req.body.apartmentID;
    const HostID = req.body.HostID;
    const customerID = req.body.customerID;
    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    const query = "INSERT INTO rentit_db.booking (apartmentID, HostID, customerID, fromDate, toDate) VALUE (?, ?, ?, ?, ?)";
    db.query(query, [apartmentID, HostID, customerID, start, end], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            res.status(200).json("Success");        
        }
        catch {
            console.error(error);
        }
    })
})

app.get('/customers/bookingInfo', (req, res) => {
    apartmentID = req.query.apartmentID;
    customerID = req.query.customerID;
    console.log(apartmentID);
    console.log(customerID);
    query = 'SELECT * from rentit_db.booking where apartmentID = ? AND customerID = ? AND fromDate >= sysdate()';
    try {
        db.query(query, [apartmentID, customerID], (error, Data) => {
            if(error) {
                throw error;
            }
            res.status(200).json(Data);
        })
    }
    catch {
        console.error(error);
    }
})

app.post('/k', (req, res) => {
    d = new Date();
    sqlQ = "insert into rentit_db.tareekh values (?)";
    db.query(sqlQ, [d], (error, Data) => {
        res.status(200).json("Success");
    })
})

/* Customer's Functionalities:
1) signup => POST && /customer  *DONE*
2) login => GET && /customer    *DONE*
3) Searching => GET && /apartments    *NEXT*
4) Detail of apartments => GET && /apartmentDetails      //Some info will come from frontend of course
5) Book apartment => POST && /bookings          //isme frontend se customer + apartments + host k pas se info aegi.
*/

//HOST APISS//

app.post('/hosts/signup', (req, res) => {
    const fname = req.body.FirstName;
    const lname = req.body.LastName;
    const email = req.body.TEmail;
    const contact = req.body.Contact;
    const password = req.body.password;
    const address = req.body.address;
    const city = req.body.city;
    console.log(password);
    const sqlQuery1 = "INSERT INTO rentit_db.hosts (FirstName, LastName, TEmail, Contact, address, city) VALUES (?, ?, ?, ?, ?, ?)";
    const sqlQuery2 = "INSERT INTO rentit_db.hostsignin (TEmail, Hash) VALUES (?, ?)";
    const sqlQuery3 = "SELECT * FROM rentit_db.hostsignin WHERE TEmail = ?";

    try {
        db.query(sqlQuery3, [email], (error, Data) => {
            if(error) {
                throw error;
            }
            else if(Data.length > 0) {
                res.status(200).json({
                    statusCode: false,
                    message: "Email already exists!!"
                })
            }
            else {
                bcrypt.hash(password, saltRounds, function(error, hash) {
                    if(error) {
                        throw error;
                    }
                    db.beginTransaction((error) => {
                        if(error) {
                            console.log(error);
                            console.log("Bad Request");
                        }
                        db.query(sqlQuery2,[email, hash] ,(error, Data) => {
                            try {
                                if(error) {
                                    db.rollback(() => {
                                        throw error;
                                    })
                                }
                                console.log("Insert1 Successfull");
                            }
                            catch {
                                if(error.errno == 1062) {
                                    res.status(404).json({
                                        statusCode: false,
                                        message: "Email already exists!!"
                                    })
                                }
                            }
                            db.query(sqlQuery1,[fname, lname, email, contact, address, city] ,(error) => {
                                try {
                                    if(error) {
                                        db.rollback(() => {
                                            throw error;
                                        })
                                    }
                                    console.log("Insert2 Successfull");
                                }
                                catch {
                                    console.log("Insert Unsuccessful");
                                    console.log(error);
                                }
                                db.commit((error) => {
                                    if(error) {
                                        db.rollback(() => {
                                            console.log(error);
                                            console.log("Bad Request");
                                        })
                                    }
                                    console.log("Success");
                                    console.log("Successful!");
                                    res.status(200).json({
                                        statusCode: true,
                                        message: "Success"
                                    });
                                })
                            })    
                        })
                    })
                });
            }
        })
    }
    catch {
        console.error(error);
    }
})

app.get('/hosts/signin', (req, res) => {
    const email = req.query.TEmail;
    const password = req.query.password;
    //sqlQuery1 = "SELECT rentit_db.customers.customerID, rentit_db.customers.FirstName, rentit_db.customers.LastName, rentit_db.customers.CEmail, rentit_db.customers.Contact FROM rentit_db.customers, rentit_db.cussignin whererentit_db.customers.CEmail = rentit_db.cussignin.CEmailAND rentit_db.cussignin.CEmail = ? AND rentit_db.cussignin.Hash = ?";
    sqlQuery1 = "SELECT * FROM rentit_db.hostsignin WHERE TEmail = ?";
    sqlQuery2 = "SELECT * FROM rentit_db.hosts WHERE TEmail = ?";
    signin(sqlQuery1, sqlQuery2, email, password, res);
})


app.post('/hosts/apartments', async (req, res) => {
    const city = req.body.City;
    const title = req.body.Title;
    const description = req.body.Descrip;
    const hostID = req.body.HostID;
    const ppd = req.body.priceperday;
    const img = req.body.img;
    const add = req.body.address;
    const placeType = req.body.placeType;
    const rooms = req.body.rooms;
    const img1 = req.body.img1;
    const img2 = req.body.img2;
    const img3 = req.body.img3;
    response = await cloudinary.uploader.upload(img, {
        upload_preset: 'rent_it'
    });
    console.log(response);
    sqlQuery1 = "INSERT INTO rentit_db.apartments (City, Title, Descrip, HostID, priceperday, img) VALUES (?, ?, ?, ?, ?, ?)";
    sqlQuery2 = "SELECT MAX(apartmentID) as 'aid' from rentit_db.apartments";
    sqlQuery3 = "INSERT INTO rentit_db.details (apartmentID, address, placeType, rooms, img1, img2, img3) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.beginTransaction((error) => {
        if(error) {
            console.log(error);
        }
        db.query(sqlQuery1, [city, title, description, hostID, ppd, response.public_id], (error, Data) => {
            try {
                if(error) {
                    db.rollback(() => {
                        throw error;
                    })
                }
                console.log("Apartment insertion successfull!!");  
                db.query(sqlQuery2, async (error, Data1) => {
                    try {
                        if(error) {
                            db.rollback(() => {
                                throw error;
                            })
                        }
                        const id = Data1[0].aid;
                        console.log(id);
                        res1 = await cloudinary.uploader.upload(img1, {
                            upload_preset: 'rent_it'
                        });
                        res2 = await cloudinary.uploader.upload(img2, {
                            upload_preset: 'rent_it'
                        });
                        res3 = await cloudinary.uploader.upload(img3, {
                            upload_preset: 'rent_it'
                        });
                        db.query(sqlQuery3, [id, add, placeType, rooms, res1.public_id, res2.public_id, res3.public_id], (error) => {
                            try {
                                if(error) {
                                    db.rollback(() => {
                                        throw error;
                                    })
                                }
                                console.log("Detail Insertion Successfull!!");
                                db.commit((error) => {
                                    try {
                                        if(error) {
                                            db.rollback(() => {
                                                throw error;
                                            })
                                        }
                                        console.log("Success!!");
                                        res.status(200).json("Successfull Transaction!!");
                                    }
                                    catch {
                                        console.error(error);
                                    }
                                })
                            }
                            catch {
                                console.error(error);
                            }
                        })
                    }
                    catch {
                        console.error(error);
                    }
                })
            }
            catch {
                console.error(error);
            }
        })
    })
})

app.put('/hosts/price', (req, res) => {
    try {
        const id = req.body.apartmentID;
        const newSal = req.body.newSal
        const sqlQuery = "UPDATE TABLE rentit_db.apartments SET priceperday = ? WHERE apartmentID = ?";
        db.query(sqlQuery, [newSal, id], (error, Data) => {
            if(error) {
                throw error;
            }
            res.status(200).json("Updation Successfull!!");
        })
    }
    catch {
        console.error(error);
    }
})

app.get('/hosts/listapartments', (req, res) => {
    const id = req.query.HostID;
    console.log(id);
    sqlQuery = "select * from rentit_db.apartments where rentit_db.apartments.HostID = ?";
    db.query(sqlQuery, [id], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length <= 0) {
                res.status(200).json({
                    statusCode: false,
                    message: "No apartments as of yet!!"
                });
            }
            else {
                res.status(200).json(Data);
            }
        }
        catch {
            console.error(error);
            res.status(400).json("Error in query!!");
        }
    })
})

app.get('/hosts/bookedapartments', (req, res) => {
    const id = req.query.HostID;
    console.log(id);
    sqlQuery = "select * from rentit_db.apartments where rentit_db.apartments.apartmentID IN  (SELECT rentit_db.booking.apartmentID FROM rentit_db.booking WHERE fromDate >= sysdate() AND HostID = ?)";
    db.query(sqlQuery, [id], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length <= 0) {
                res.status(200).json({
                    statusCode: false,
                    message: "No bookings as of yet!!"
                });
            }
            else {
                res.status(200).json(Data);
            }
        }
        catch {
            console.error(error);
            res.status(400).json("Error in query!!");
        }
    })
})


//Advertiser's APIs

app.post('/advertisers/signup', (req, res) => {
    const fname = req.body.FirstName;
    const lname = req.body.LastName;
    const email = req.body.AEmail;
    console.log(email);
    const agency = req.body.AgencyName;
    const password = req.body.password;
    console.log(password);
    const sqlQuery1 = "INSERT INTO rentit_db.advertisers (FirstName, LastName, AEmail, AgencyName) VALUES (?, ?, ?, ?)";
    const sqlQuery2 = "INSERT INTO rentit_db.advertisersignin (AEmail, Hash) VALUES (?, ?)";
    const sqlQuery3 = "SELECT * FROM rentit_db.advertisersignin WHERE AEmail = ?";

    try {
        db.query(sqlQuery3, [email], (error, Data) => {
            if(error) {
                throw error;
            }
            else if(Data.length > 0) {
                res.status(200).json({
                    statusCode: false,
                    message: "Email already exists!!"
                })
            }
            else {
                bcrypt.hash(password, saltRounds, function(error, hash) {
                    if(error) {
                        throw error;
                    }
                    db.beginTransaction((error) => {
                        if(error) {
                            console.log(error);
                            console.log("Bad Request");
                        }
                        db.query(sqlQuery2,[email, hash] ,(error, Data) => {
                            try {
                                if(error) {
                                    db.rollback(() => {
                                        throw error;
                                    })
                                }
                                console.log("Insert1 Successfull");
                            }
                            catch {
                                console.log("Insert Unsuccessful");
                                console.log(error);
                            }
                            db.query(sqlQuery1,[fname, lname, email, agency] ,(error) => {
                                try {
                                    if(error) {
                                        db.rollback(() => {
                                            throw error;
                                        })
                                    }
                                    console.log("Insert2 Successfull");
                                }
                                catch {
                                    console.log("Insert Unsuccessful");
                                    console.log(error);
                                }
                                db.commit((error) => {
                                    if(error) {
                                        db.rollback(() => {
                                            console.log(error);
                                            console.log("Bad Request");
                                        })
                                    }
                                    console.log("Success");
                                    console.log("Successful!");
                                    res.status(200).json("Successfull Transaction");
                                })
                            })    
                        })
                    })
                });
            }
        })
    }
    catch {
        console.error(error);
    }
})

app.get('/advertisers/signin', (req, res) => {
    const email = req.query.AEmail;
    const password = req.query.password;
    console.log(password);
    sqlQuery1 = "SELECT * FROM rentit_db.advertisersignin WHERE AEmail = ?";
    sqlQuery2 = "SELECT * FROM rentit_db.advertisers WHERE AEmail = ?";
    signin(sqlQuery1, sqlQuery2, email, password, res);
})

app.post('/advertisers/insertAdd', async(req, res) => {
    const img = req.body.image_info;
    const title = req.body.Title;
    const tagLine = req.body.TagLine;
    const city = req.body.City;
    const area = req.body.Area;
    const id = req.body.advertiserID;
    const sound = soundex(area);
    const query = "INSERT INTO rentit_db.advertisements (Title, TagLine, City, Area, image_info, advertiserID, soundex) VALUES (?, ?, ?, ?, ?, ?, ?)";
    response = await cloudinary.uploader.upload(img, {
        upload_preset: 'rent_it'
    })
    try {
        db.query(query, [title, tagLine, city, area, response.public_id, id, sound], (error, data) => {
            if(error) {
                throw error;
            }
            res.status(200).json("Success");
        
        })
    }
    catch {
        console.error(error);
    }
})

app.get('/advertisers/citySearch', (req, res) => {
    const city = req.query.City;
    console.log(city);
    query1 = "SELECT * FROM rentit_db.advertisements WHERE City = ?";
    db.query(query1, [city], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length > 0) { 
                res.status(200).json(Data);
            }
            else {
                query2 = "SELECT * FROM rentit_db.advertisements";
                db.query(query2, (error, Data) => {
                    try {
                        if(error) {
                            throw error;
                        }
                        res.status(200).json(Data);
                    }
                    catch {
                        console.error(error);
                    }
                })
            }
        }
        catch {
            console.error(error);
        }
    })
})

app.get('/advertisers/areaSearch', (req, res) => {
    const city = req.query.City;
    const area = req.query.Area;
    sound = soundex(area);
    console.log(sound);
    query1 = "SELECT * FROM rentit_db.advertisements WHERE soundex = ?;"
    db.query(query1, [sound], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length > 0) { 
                res.status(200).json(Data);
            }
            else {
                query2 = "SELECT * FROM rentit_db.advertisements WHERE City = ?";
                db.query(query2, [city], (error, Data) => {
                    try {
                        if(error) {
                            throw error;
                        }
                        else if(Data.length > 0) {
                            res.status(200).json(Data);
                        }
                        else {
                            query3 = "SELECT * FROM rentit_db.advertisements";
                            db.query(query3, (error, Data) => {
                                try {
                                    if(error) {
                                        throw error;
                                    }
                                    res.status(200).json(Data);
                                }
                                catch {
                                    console.error(error);
                                }
                            })
                        }
                    }
                    catch {
                        console.error(error);
                    }
                })
            }
        }
        catch {
            console.error(error);
        }
    })
})

app.get('/advertisers/cityAreaSearch', (req, res) => {
    const city = req.query.City;
    const area = req.query.Area;
    const sound = soundex(area);
    console.log(sound);
    console.log(city);
    query1 = "SELECT * FROM rentit_db.advertisements WHERE City = ? || soundex = ?";
    db.query(query1, [city, sound], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length > 0) { 
                res.status(200).json(Data);
            }
            else {
                query2 = "SELECT * FROM rentit_db.advertisements";
                db.query(query2, (error, Data) => {
                    try {
                        if(error) {
                            throw error;
                        }
                        res.status(200).json(Data);
                    }
                    catch {
                        console.error(error);
                    }
                })
            }
        }
        catch {
            console.error(error);
        }
    })
})

// app.post();
// app.put();
// app.delete();