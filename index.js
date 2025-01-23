const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 7800;
const app = express();

// middleware
const corsOptions = { origin: ["http://localhost:5173"], Credential: true };
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("71 digital sign server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jxshq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // *creating collections

    const serviceCollection = client
      .db("71-digital-sign-db")
      .collection("services");
    const testimonialCollection = client
      .db("71-digital-sign-db")
      .collection("testimonials");
    const userCollection = client.db("71-digital-sign-db").collection("users");

    // !all public API
    // *service related api
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });
    // *testimonial related api

    app.get("/testimonials", async (req, res) => {
      const result = await testimonialCollection.find().toArray();
      res.send(result);
    });
    // !user related api
    // publis:storing user data to the db
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email;
      const newUser = req.body;
      // checking if user exist
      const query = { email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        const result = { message: "User already Exists in the Database" };
        res.send(result);
      } else {
        const result = await userCollection.insertOne({
          ...newUser,
          timeStamp: Date.now(),
        });
        res.send(result);
      }
    });
    // private: fetching user photoUrl for navbar (under verify token)
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`71 DIGITAL SIGN SERVER IS RUNNING ON PORT ${port}`);
});
