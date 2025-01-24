const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const taskCollection = client.db("71-digital-sign-db").collection("tasks");

    // *jwt related
    app.post("/jwt", async (req, res) => {
      // payload
      const user = req.body;
      // generating token
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // *middlewares

    const verifyToken = (req, res, next) => {
      console.log("inside verify Token", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

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
          status: "pending",
        });
        res.send(result);
      }
    });
    // private: fetching user photoUrl for navbar (under verify token)
    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // getting role (should be private route)

    app.get("/role/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    // *Employee related APIS
    // getting task data from db :private route
    app.get("/tasks/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await taskCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // posting new task data (should be private rout)
    app.post("/work-sheet", verifyToken, async (req, res) => {
      const newTask = req.body;
      const result = await taskCollection.insertOne(newTask);
      res.send(result);
    });

    // updating worksheet data
    app.patch("/update/work-sheet/:id", verifyToken, async (req, res) => {
      const updatedData = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          task: updatedData.task,
          hoursWorked: updatedData.hoursWorked,
          date: updatedData.date,
        },
      };
      const result = await taskCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // deleting worksheet data(private route)

    app.delete("/work-sheet/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await taskCollection.deleteOne(query);
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
