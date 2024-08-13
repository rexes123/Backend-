const express = require("express");
const path = require("path");
const app = express();

const { Pool } = require("pg");
const cors = require("cors");
require('dotenv').config();


app.use(express.json());
app.use(express.static(path.join(__dirname, "../public"))); // Serve static files from the 'public' directory
app.use(cors());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html")); // Update path to point to 'public' directory
});


const { DATABASE_URL, SECRET_KEY } = process.env;

// Initialize the PostgreSQL connection
const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },
});

(async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  }
})();

app.get("/bookings", async (req, res) => {
  const client = await pool.connect();
  try {
    //SQL query
    const query = "SELECT * FROM BOOKINGS";
    console.log(query);

    //Execute sql quete
    const execute = await client.query(query);
    console.log(execute);
    //Response to client
    res.status(200).json(execute.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

app.post("/booking", async (req, res) => {
  const client = await pool.connect();

  try {

    const { title, description, date, time, phoneNum, email, uid } = req.body;

    const obj = {
      title,
      description,
      date,
      time,
      phoneNum,
      email,
      uid
    }

    const param = [obj.title, obj.description, obj.date, obj.time, obj.phoneNum, obj.email, obj.uid];

    const query = "INSERT INTO BOOKINGS(title, description, date, time, phone_number, email, uid) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id"

    const execute = await client.query(query, param)

    // Retrieve the if of newly inserted post and assign it into obj
    obj.id = execute.rows[0].id;
    res.status(201).json(obj);
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
  }
})

//Get booking with specific id



app.put("/booking/:id", async (req, res) => {
  const id = req.params.id;
  const client = await pool.connect();

  try {
    //Check if booking exists
    const queryBooking = "SELECT * FROM BOOKINGS WHERE id = $1";
    const bookingResult = await client.query(queryBooking, [id]);

    if (bookingResult.rows.length == 0) {
      return res.status(404).json({
        message: "Booking not found"
      })
    }

    //Update the specify booking
    const query = `UPDATE BOOKINGS 
    SET title =$1, description = $2, date = $3, time =$4, phone_number =$5, email =$6, uid= $7 
    WHERE id = $8
    RETURNING *
    `;

    const { title, description, date, time, phone_number, email, uid } = req.body;
    
    const param = [title, description, date, time, phone_number, email, uid, id];

    const result = await client.query(query, param);

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");

  } finally {
    client.release();
  }
});

app.get("/booking/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const query = `SELECT * FROM BOOKINGS where id = $1`;
    const param = [req.params.id];
    const result = await client.query(query, param);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error.message);
  } finally {
    client.release();
  }
});

 app.get("/bookings/user/:uid", async (req, res)=>{
   const client = await pool.connect();

   try{
     const query = "SELECT * FROM BOOKINGS WHERE uid = $1";
     const params = [req.params.uid];
     const booking = await client.query(query, params);
     res.status(200).json(booking.rows);
   } catch(error){
     console.error(error.message);
     res.status(500).json('Server Error');
   } finally{
     client.release();
   }
 })


app.delete("/booking/:id", async (req, res) => {
  const id = req.params.id;
  const client = await pool.connect();

  try {
    const query = `DELETE FROM BOOKINGS WHERE id = $1 RETURNING *`;
    //Prepare param for query
    const param = [id]
    const execute = await client.query(query, param)
    res.status(200).json(execute.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  } finally {
    client.release();
  }

})


app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "../public", "error.html")); // Update path to point to 'public' directory
});

const PORT = process.env.PORT || 3001; // Use a different port if needed
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = (req, res) => app(req, res);