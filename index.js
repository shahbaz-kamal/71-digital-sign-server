const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 7800;
const app = express();

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "http://127.0.0.1:3000","https://71-digital-sign.netlify.app"],
  Credential: true,
};
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
    const messageCollection = client
      .db("71-digital-sign-db")
      .collection("messages");
    const portfolioCollection = client
      .db("71-digital-sign-db")
      .collection("portfolio");
    const paymentCollection = client
      .db("71-digital-sign-db")
      .collection("payments");

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
      // console.log("inside verify Token", req.headers);
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
    // getting message data

    app.get("/messages", verifyToken, async (req, res) => {
      const result = await messageCollection.find().toArray();
      res.send(result);
    });

    // posting client message to db

    app.post("/client/message", async (req, res) => {
      const newMessage = req.body;
      const result = await messageCollection.insertOne({
        ...newMessage,
        isRead: false,
        readBy: null,
      });
      res.send(result);
    });
    app.get("/messages", verifyToken, async (req, res) => {
      const result = await messageCollection.find().toArray();
      res.send(result);
    });

    // updating message Data
    app.patch("/message/update/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { email } = req.body;
      console.log("ID & Email", id, email);
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          readBy: email,
          isRead: true,
        },
      };
      const result = await messageCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // *testimonial related api

    app.get("/testimonials", async (req, res) => {
      const result = await testimonialCollection.find().toArray();
      res.send(result);
    });
    app.get("/portfolio", async (req, res) => {
      const result = await portfolioCollection.find().toArray();
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
          isVerified: false,
          isFired: false,
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
    // updating profile

    app.patch("/update-profile", verifyToken, async (req, res) => {
      const { bankAccount, salary, designation, email } = req.body;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          bankAccount,
          salary,
          designation,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
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

    // updating worksheet data(private)
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

    // *HR related apis

    // getting user data for dynamic name in the progress page
    app.get("/progress/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // getting task data for HR with filters (by employee and month)
    app.get("/progress/tasks", verifyToken, async (req, res) => {
      const { employeeName, month } = req.query;

      // Check if the month is provided
      let query = {};
      if (employeeName) {
        query.name = employeeName;
      }
      if (month) {
        const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;
        query = {
          ...query,
          $expr: {
            $eq: [{ $month: { $toDate: "$date" } }, monthNumber],
          },
        };
      }

      try {
        const records = await taskCollection.find(query).toArray();
        res.send(records);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch work records", error });
      }
    });

    // getting all-empoyee data(private) (if query present it will give only employee data & if not it will give all employee data)

    app.get("/all-employee-list", verifyToken, async (req, res) => {
      const query = req.query.employee;
      let filter = {};
      console.log(query);
      if (query) {
        filter = { role: query };
        // const result = await userCollection.find(filter).toArray();
        // return res.result;
      }
      const result = await userCollection.find(filter).toArray();
      res.send(result);
    });

    // //for payment collection

    app.get("/payment", verifyToken, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    app.post("/payment", verifyToken, async (req, res) => {
      const newPaymentData = req.body;
      const query = {
        month: newPaymentData.month,
        year: newPaymentData.year,
        employee_email: newPaymentData.employee_email,
      };
      const alreadySubmittedForVerification = await paymentCollection.findOne(
        query
      );
      if (alreadySubmittedForVerification) {
        const result = {
          message: "Already Submitted Payment request for This Month & Year",
        };
        res.send(result);
      } else {
        const result = await paymentCollection.insertOne({
          ...newPaymentData,
          authorizedBy: null,
          trxId: null,
          isAuthorized: false,
        });
        res.send(result);
      }
    });

    // getting payment data count
    app.get("/paymentCount/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { employee_email: email };
      const count = await paymentCollection.countDocuments(query);
      res.send({ count });
    });

    // get payment data for payment history
    app.get("/payment-history/:email", verifyToken, async (req, res) => {
      console.log(req.params.email);
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page);
      console.log("pagination quer", req.query);
      const email = req.params.email;
      const filter = { employee_email: email };
      const result = await paymentCollection
        .find(filter)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // updating verified status(private)
    app.patch("/update/isVerified/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          isVerified: true,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // for details

    app.get("/details/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { employee_email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // *admin related apis
    // checking if user is fired or not(public as it should be checked before Login)

    app.get("/fire/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.patch("/update/salary/:id", verifyToken, async (req, res) => {
      const { salaryData } = req.body;

      const id = req.params.id;
      console.log("ID:", id);
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          salary: salaryData,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // making hr
    app.patch("/role/makeHr/:id", verifyToken, async (req, res) => {
      const { roleData } = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: roleData,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // firing an employee

    app.patch("/fire/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          isFired: true,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { salary } = req.body;
      if (!salary || isNaN(salary)) {
        return res.status(400).json({ error: "Invalid salary value" });
      }
      const totalPrice = parseInt(salary);
      const { client_secret } = await stripe.paymentIntents.create({
        amount: totalPrice,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.send({ client_secret });
    });

    // after payment is done

    app.patch(
      "/update/paymentCollection/:id",
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        const updatedPaymentInfo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            authorizedBy: updatedPaymentInfo.authorizedBy,
            trxId: updatedPaymentInfo.trxId,
            isAuthorized: updatedPaymentInfo.isAuthorized,
            paymentDate: new Date(),
          },
        };
        const result = await paymentCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`71 DIGITAL SIGN SERVER IS RUNNING ON PORT ${port}`);
});
