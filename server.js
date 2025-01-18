
require("dotenv").config();
const express = require('express');
const path = require('path');
const nocache = require('nocache');
const session = require('express-session');
const passport = require('passport');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const config = require('./config/config');
const connectDb = require("./config/db");
const userRoute = require('./routes/usersRoutes');
const adminRouter = require('./routes/adminRoutes');
const User = require("./models/userModel");
const morgan = require("morgan")

const app = express();


connectDb();


app.set('view engine', 'ejs');
app.use(expressLayouts);



// layout dfor admin

app.use('/admin',(req,res,next)=>{
    app.set('layout','layouts/adminLayout');
    next();
})

// layout for user
app.use('/user', (req, res, next) => {
    app.set('layout',false);
    next();
});



// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'))

app.use(nocache());
app.use(session({
    secret: config.sessionSecret,
    saveUninitialized: true,
    resave: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        secure: false,
    }
}));


app.use(passport.initialize());
app.use(passport.session());

// Route Configurations

// Admin Routes
app.use("/admin", (req, res, next) => {
    app.set('views', path.join(__dirname, 'views/admin'));
    next();
});
app.use("/admin", adminRouter);

// User Routes
app.use("/user", (req, res, next) => {
    app.set('views', path.join(__dirname, 'views/user'));
    next();
});
app.use("/user", userRoute);




const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/user`);
    console.log(`Server running at http://localhost:${port}/admin/login`);
});