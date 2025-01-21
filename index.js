const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 7800;
const app = express();

// middleware
const corsOptions = { origin: ["http://localhost:5173"], Credential: true };
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("71 digital sign server is running");
});

app.listen(port, () => {
  console.log(`71 DIGITAL SIGN SERVER IS RUNNING ON PORT ${port}`);
});
