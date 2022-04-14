const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const res = require('express/lib/response');
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

app.listen(3001, () => {
    console.log("Local host running at port 3001");
});

const saltRounds = 10;

function signup (sqlQuery1, sqlQuery2, fname, lname, email, contact, hash, res) {
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
                    db.end();
                    res.status(200).json("Successfull Transaction");
                })
            })    
        })
    })
}

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
                        throw error;
                    }
                });
            }
            else {
                res.status(400).json("Email or Password Incorrect");
            }
        }
        catch {
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
    bcrypt.hash(password, saltRounds, function(error, hash) {
        if(error) {
            throw error;
        }
        signup(sqlQuery1, sqlQuery2, fname, lname, email, contact, hash, res);
    });
})

app.get('/customers/signin', (req, res) => {
    const email = req.body.CEmail;
    const password = req.body.password;
    //sqlQuery1 = "SELECT rentit_db.customers.customerID, rentit_db.customers.FirstName, rentit_db.customers.LastName, rentit_db.customers.CEmail, rentit_db.customers.Contact FROM rentit_db.customers, rentit_db.cussignin whererentit_db.customers.CEmail = rentit_db.cussignin.CEmailAND rentit_db.cussignin.CEmail = ? AND rentit_db.cussignin.Hash = ?";
    sqlQuery1 = "SELECT * FROM rentit_db.cussignin WHERE CEmail = ?";
    sqlQuery2 = "SELECT * FROM rentit_db.customers WHERE CEmail = ?";
    signin(sqlQuery1, sqlQuery2, email, password, res);
})

app.get('/customers/searchResults', (req, res) => {
    const city = req.body.City;
    sqlQuery = "select * from rentit_db.apartments where rentit_db.apartments.apartmentID NOT IN  (SELECT rentit_db.booking.apartmentID FROM rentit_db.booking WHERE fromDate > sysdate() AND toDate < sysdate()) AND rentit_db.apartments.City = ?";
    db.query(sqlQuery, [city], (error, Data) => {
        try {
            if(error) {
                throw error;
            }
            else if(Data.length <= 0) {
                res.status(200).json("Search returned 0 results:/");
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
    const sqlQuery1 = "INSERT INTO rentit_db.hosts (FirstName, LastName, TEmail, Contact) VALUES (?, ?, ?, ?)";
    const sqlQuery2 = "INSERT INTO rentit_db.hostsignin (TEmail, Hash) VALUES (?, ?)";

    bcrypt.hash(password, saltRounds, function(error, hash) {
        if(error) {
            throw error;
        }
        signup(sqlQuery1, sqlQuery2, fname, lname, email, contact, hash, res);
    });
})

app.get('/hosts/signin', (req, res) => {
    const email = req.body.TEmail;
    const password = req.body.password;
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
                                        db.end();
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

// app.post();
// app.put();
// app.delete();