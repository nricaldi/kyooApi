const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: false}));
// app.use("/api/users", require("./routes/api/users"));
app.use("/api/songs", require("./routes/api/songs"));

const port = process.env.PORT;
app.listen(port,() => console.log(`Listening on port: ${port}`));