const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Products = require("../models/productModel");
const Category = require("../models/categoryModel")
const OTP = require("../models/otp");
const { isDate } = require('util/types');
const { name } = require('ejs');

const saltRounds = 10;

// default loadHome page

// ==================================================================================================================================================== 
const loadHome = async (req, res) => {

    const user = req.session.user
    const products = await Products.find({isDeleted:false ,isListed:false})
    const categories = await Category.find({ isDeleted: false ,isListed:false})


    // Pass categories to the frontend
    res.render('home', { categories, user,products });
};

// ====================================================================================================================================================


// load userHome 

// ====================================================================================================================================================

const userhome = (req, res) => {

    if (req.session.user) {

        const user = req.session.user

        res.render("userHome", { user })
    } else {
        res.redirect("login")
    }
}

// ====================================================================================================================================================


// load user profile

// ====================================================================================================================================================

const userProfile = async (req, res) => {
    if (req.session.user) {
        res.render("profileView")
    } else {
        res.redirect("login")
    }
}

// ====================================================================================================================================================

// loadLogin page

// ====================================================================================================================================================

const loadLogin = async (req, res) => {
    try {

        const user = req.session.user
        const categories = await Category.find({ isDeleted: false })

        res.render("userLogin", { emailError: "", passwordError: "", message: "", categories, user });
    } catch (err) {
        console.log(err.message);
    }
};

// ====================================================================================================================================================

//  verifyUser page load

// ====================================================================================================================================================

const verifyUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(400).json({ emailError: "user not found!" });

        }

        // Check if the user is blocked
        if (user.isBlocked) {
            return res.status(400).json({ emailError: "sorry you have been blocked!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ passwordError: "Invalid password!" });
        }

        req.session.user = user;
        req.session.logged = true
        res.status(200).json({ success: true });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ error: " internal Server Error" });
    }
};



//====================================================================================================================================================





//====================================================================================================================================================




// forgot password page load

//====================================================================================================================================================


const ForgotPassword = async (req, res) => {
    try {
        res.render("forgotPassword")
    } catch (err) {
        console.error(err.message)
    }
}

//====================================================================================================================================================


// otp load for forgot password page 

//====================================================================================================================================================

const genOtpForgotPass = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = generateOtp()

        sendotp(otp, email)

        req.session.data = {
            email,

        }
        req.session.otp = otp
        console.log(

        )

        res.status(200).render("passOtp");
    } catch (err) {
        console.log(err.message);

    }
}


//====================================================================================================================================================


// load otp verify for forgot password page 

//====================================================================================================================================================

const loadOtpForgetPass = async (req, res) => {
    try {
        res.render("passOtp")
    } catch (err) {
        console.error(err.message);
    }
}


//====================================================================================================================================================


// load otp verify for forgot password page 

//====================================================================================================================================================

const changePassword = async (req, res) => {
    try {
        res.render("changePassword")
    } catch (err) {
        console.log(err)
    }
}


//====================================================================================================================================================


// otp verify for forgot password page 

//====================================================================================================================================================

const otpVerifyForgotPassword = async (req, res) => {
    try {
        if (req.session.otp === req.body.otp) {
            res.render("changePassword")

        }
    } catch (err) {
        console.error(err.message)
    }
}


//====================================================================================================================================================


// sign up page load (register page)

//====================================================================================================================================================

const loadSingUp = async (req, res) => {
    try {
        if (!req.session.user) {

            const user = req.session.user
            const categories = await Category.find({ isDeleted: false })
            res.render("signUp", { categories, user });
        } else {
            res.redirect('/')
        }
    } catch (err) {
        console.log(err.message);
    }
};

//====================================================================================================================================================


// register user  

//====================================================================================================================================================

const registration = async (req, res) => {
    try {
        console.log('this is the data', req.body)
        const { name, email, password } = req.body;
        const username = name

        const existingUser = await User.findOne({ email });
        console.log("Existing User:", existingUser);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                emailError: "Email already exists. Please use a different email."
            });
        }


        else {
            const otp = generateOtp()

            sendotp(otp, email)


            req.session.data = { username, email, password }
            req.session.otp = otp
            req.session.time = Date.now()
            console.log(`requset time=============${req.session.time}`)

            console.log(`your email is:${otp}`)

            res.status(200).json({
                success: true,
                message: "OTP sent successfully"
            });
        }
    } catch (err) {
        console.log(err.message)
        res.status(500).send("internal Server Error");

    }
};





//====================================================================================================================================================



//====================================================================================================================================================







// otp page load

//====================================================================================================================================================

const loadOtp = async (req, res) => {
    try {
        const message = req.flash("Expired")
        res.render("userotp", { message });
    } catch (err) {
        console.log(err.message);
    }
}


//====================================================================================================================================================


// otp generator and checking

//====================================================================================================================================================

async function sendotp(otp, email) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'aswindasachu2004@gmail.com',
            pass: 'asag tany ghvt sfsf'
        }
    })
    const mail = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        html: `
        <div style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #ddd; padding: 20px; max-width: 500px; margin: auto; border-radius: 10px;">
            <h2 style="color: #4CAF50;">Your One-Time Password (OTP)</h2>
            <p style="font-size: 18px;">Hello,</p>
            <p style="font-size: 16px;">Your OTP for login/registration is:</p>
            <h1 style="font-size: 36px; color: #333;">${otp}</h1>
            <p style="font-size: 16px; color: #555;">This OTP is valid for the next 5 minutes.</p>
            <p style="font-size: 14px; color: #888;">If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">BUILD YOUR DREAM | Secure Login System</p>
        </div>`
    }
    try {
        const info = await transporter.sendMail(mail);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
    }
}


const generateOtp = () => {

    const otp = crypto.randomInt(100000, 1000000);

    return otp.toString();

};


//====================================================================================================================================================

// load otp verify section 

//====================================================================================================================================================

const verifyOtp = async (req, res) => {
    try {

        if (!req.body.otp) {
            return res.status(400).send('OTP is required');
        }
        console.log(`session: ${req.session.otp} ,,,
            body: ${req.body.otp}`)

        const currentTime = Date.now()



        if (req.session.otp === req.body.otp) {

            if (currentTime - req.session.time > 60000) {

                return res.status(404).send("your OTP time expired ")
            }

            const { username, email, password } = req.session.data;
            console.log('this is the user data from session', req.session)


            const hashedpassword = await bcrypt.hash(password, saltRounds);

            const newUser = await User.create({
                username,
                email,
                password: hashedpassword,
            });


            req.session.user = newUser;
            req.session.otp = null;

            res.redirect('/user/login')

        }
        else {
            res.status(400).send('invalid OTP')
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');

    }
}

//====================================================================================================================================================

// resend otp

const resendOtp = async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'aswindasachu2004@gmail.com',
                pass: 'asag tany ghvt sfsf'
            }
        })
        const email = req.session?.data?.email

        console.log("asdfghjiuygfdsdfghj", email)

        let newOtp;
        do {
            newOtp = generateOtp()

        } while (newOtp === req.session.otp)

        req.session.otp = newOtp;

        console.log("resend", newOtp)

        req.session.time = Date.now()

        const mail = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            html: `
            <div style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #ddd; padding: 20px; max-width: 500px; margin: auto; border-radius: 10px;">
                <h2 style="color: #4CAF50;">Your One-Time Password (OTP)</h2>
                <p style="font-size: 18px;">Hello,</p>
                <p style="font-size: 16px;">Your OTP for login/registration is:</p>
                <h1 style="font-size: 36px; color: #333;">${newOtp}</h1>
                <p style="font-size: 16px; color: #555;">This OTP is valid for the next 5 minutes.</p>
                <p style="font-size: 14px; color: #888;">If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa;">BUILD YOUR DREAM | Secure Login System</p>
            </div>`
        }

        const info = await transporter.sendMail(mail);

        res.status(200).redirect("/user/otp")


    } catch (err) {

        console.log(err.message)

    }
}



//==============================================================================================================================================================================================================================

//  category  pages loading







// loadShop-sofa page

//====================================================================================================================================================

const loadShopCategory = async (req, res) => {
    try {
        const user= req.session.user
        
        const categories = await Category.findOne({ name: req.params.cat, isListed: false, isDeleted: false });
        const a = await Category.find({ isListed: false, isDeleted: false });
        

        const products = await Products.find({ isListed:false,isDeleted: false, category: categories?._id })
        console.log('llllllllll');

        console.log(a);
        console.log('llllllllll');

        res.render("shopCategory", { products, categories: a ,user});
    } catch (err) {
        console.log(err.message);
    }
}

//====================================================================================================================================================


// loadShop-beds page

//====================================================================================================================================================

const loadShopBeds = async (req, res) => {
    try {
        const category = await Category.findOne({ name: 'beds' });
        const products = await Products.find({ isDeleted: false, category: category._id }).populate('category', 'name');
        res.render("shop-beds", { products });
    } catch (err) {
        console.log(err.message);
    }
}

//====================================================================================================================================================


// product-view 

const loadProductView = async (req, res) => {
    try {
        const productId = req.params.product_id
        const product = await Products.findOne({ _id: productId }).populate('category', 'name description');

        if (!product) return res.send("category not found")

        res.render("userProductView", { product });
    } catch (err) {
        console.log(err.message);
    }
}



// loadShop-sofa page

//====================================================================================================================================================

const loadShopChairs = async (req, res) => {
    try {

        const category = await Category.findOne({ name: 'chairs' });
        const products = await Products.find({ isDeleted: false, category: category._id }).populate('category', 'name');

        res.render("shop-chairs", { products });
    } catch (err) {
        console.log(err.message);
    }
}


//====================================================================================================================================================


// loadAbout page

//====================================================================================================================================================

const loadAbout = async (req, res) => {
    try {
        res.render("about");
    } catch (err) {
        console.log(err.message);
    }
}

//====================================================================================================================================================


// loadContact page

const loadContact = async (req, res) => {
    try {
        const user = req.session.user
    const products = await Products.find({isDeleted:false ,isListed:false})
    const categories = await Category.find({ isDeleted: false ,isListed:false})
        res.render("contact",{user,products,categories});
    } catch (err) {
        console.log(err.message);
    }
}

//====================================================================================================================================================


// loadShop-sofa page

//====================================================================================================================================================

const logOut = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                res.send("error logging out. Try again.");
            } else {
                res.redirect('/user');
            }
        })
    } catch (err) {
        console.error(err.message)
    }
}


const googleLogin = async (req, res) => {
    try {
        console.log(req.user);

        // Check if the user exists in the database
        const user = await User.findOne({ email: req.user.email });

        if (!user) {
            // If the user doesn't exist, handle accordingly (you may create the user or show an error)
            return res.redirect('/user/login');
        }

        // Check if the user is blocked
        if (user.isBlocked) {
            return res.render("userLogin", {
                message: "Your google account has been blocked. Please contact support.",
                emailError: "",
                passwordError: ""
            });
        }

        // Set the session with user info
        req.session.user = {
            username: user.username,
            email: user.email
        };

        // If the user is logged in and not blocked, redirect to home
        res.redirect('/user');

    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }
}






module.exports = {

    loadHome,
    loadLogin,
    verifyUser,

    googleLogin,
    ForgotPassword,
    resendOtp,
    genOtpForgotPass,
    loadOtpForgetPass,
    otpVerifyForgotPassword,
    changePassword,


    loadSingUp,
    registration,
    loadOtp,


    loadShopCategory,
    loadShopBeds,
    loadShopChairs,
    loadAbout,
    loadContact,
    verifyOtp,
    userProfile,
    logOut,
    loadProductView,

};

