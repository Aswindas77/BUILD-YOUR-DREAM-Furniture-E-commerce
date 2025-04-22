const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Products = require("../models/productModel");
const Category = require("../models/categoryModel");
const OTP = require("../models/otpModel");
const Address = require("../models/addressModel")
const { isDate } = require('util/types');
const { name } = require('ejs');
const axios = require('axios');
const { log } = require('util');
const ordermodel = require('../models/ordermodel');
const WhishList = require("../models/whishlistModel")
const Cart = require("../models/cartModel")
const { createPayPalOrder } = require("../services/paypalService");
const { capturePayPalOrder } = require("../services/paypalService");
const saltRounds = 10;
const Coupon = require('../models/couponModel');
const Wallet = require("../models/walletModel");
const { deductFromWallet } = require("../controllers/walletController");
const Razorpay = require('razorpay');
const walletModel = require('../models/walletModel');
const HttpStatus = require('../constants/httpStatus');
const Messages = require('../constants/messages.json');





// default loadHome page

// =================================================================================== 

const loadHome = async (req, res) => {

    const user = req.session?.User
    const products = await Products.aggregate([
        {
            $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "categoryDetails"
            }
        },
        {
            $match: {
                isDeleted: false,
                isListed: false,
                "categoryDetails.isListed": false,
                "categoryDetails.isDeleted": false
            }
        },
        {
            $unwind: "$categoryDetails"
        }
    ])

    const categories = await Category.find({ isDeleted: false, isListed: false })



    res.render('home', { categories, user, products });
};


// load login page

// ====================================================================================================================================================

const loadLogin = async (req, res) => {
    try {

        const user = req.session.user
        const message = req.session.gerrmessage || ""
        delete req.session.gerrmessage


        const categories = await Category.find({ isDeleted: false })

        res.render("userLogin", { emailError: "", passwordError: "", message, categories, user });
    } catch (err) {
        console.log(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


//  verifyUser load

// ====================================================================================================================================================

const verifyUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(HttpStatus.BAD_REQUEST).json({ emailError: "user not found!" });

        }



        if (user.isBlocked) {
            return res.status(HttpStatus.BAD_REQUEST).json({ emailError: "sorry you have been blocked!" });

        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(HttpStatus.BAD_REQUEST).json({ passwordError: "Invalid password!" });
        }

        req.session.User = user;
        req.session.logged = true;
        res.status(HttpStatus.OK).json({ success: true, message: Messages.SUCCESS });
    } catch (err) {
        console.log(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// forgot password page load 

//====================================================================================================================================================


const ForgotPassword = async (req, res) => {

    try {
        const user = req.session?.User

        const products = await Products.find({ isDeleted: false, isListed: false })

        const categories = await Category.find({ isDeleted: false, isListed: false })

        const message = req.flash("message")
        res.render("forgotPassword", { message, products, categories, user })
    } catch (err) {
        console.error(err.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// otp load for forgot password page  

//====================================================================================================================================================

const genOtpForgotPass = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        req.session.checkPass = "forgot";

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        const otp = generateOtp();
        sendotp(otp, email);

        req.session.data = { email };
        req.session.otp = otp;
        req.session.time = Date.now();

        console.log("Forgot password OTP:", otp);

        return res.status(HttpStatus.OK).json({
            success: true,
            message: 'OTP sent successfully'
        });

    } catch (err) {
        console.error(err.message);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Internal server error'
        });
    }
};



// load otp verify for forgot password page 

//====================================================================================================================================================


const loadOtpForgetPass = async (req, res) => {
    try {
        res.render("passOtp")
    } catch (err) {
        console.error(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// load otp verify for forgot password page 

//====================================================================================================================================================

const changePassword = async (req, res) => {
    try {
        res.render("changePassword")
    } catch (err) {
        console.log(err)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// otp verify for forgot password page 

//====================================================================================================================================================

const otpVerifyForgotPassword = async (req, res) => {
    try {
        if (req.session.otp === req.body.otp) {
            res.render("changePassword")

        }
    } catch (err) {
        console.error(err.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// register user  

//====================================================================================================================================================

const registration = async (req, res) => {

    try {

        console.log('this is the data', req.body)
        const { name, email, password } = req.body;
        const username = name

        req.session.checkPass = "singup"
        const existingUser = await User.findOne({ email });
        console.log("Existing User:", existingUser);

        if (existingUser) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                emailError: "Email already exists. Please use a different email."
            });
        }

        else {
            const otp = generateOtp();

            sendotp(otp, email)


            req.session.data = { username, email, password }
            req.session.otp = otp
            req.session.time = Date.now()
            console.log(`requset time=============${req.session.time}`)

            console.log(`your email is:${otp}`)

            res.status(HttpStatus.OK).json({
                success: true,
                message: "OTP sent successfully"
            });
        }
    } catch (err) {
        console.log(err.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });

    }
};


// google auth 

const googleAuth = async (req, res) => {
    try {
        if (!req.user) {
            req.session.gerrmessage = "Google authentication failed.";
            return res.redirect("/user/signup");
        }

        const { displayName, emails } = req.user;
        const email = emails[0].value;

        console.log("displayName", displayName)


        req.session.data = {
            username: displayName,
            email: email
        };


        console.log("Google User Session Data:", req.session.data);

        res.redirect("/dashboard");
    } catch (err) {
        console.error("Google Auth Error:", err.message);
        res.redirect("/user/signup");
    }
};
// otp page load

//====================================================================================================================================================

const loadOtp = async (req, res) => {
    try {
        const message = req.flash("Expired")
        res.render("userotp", { message });
    } catch (err) {
        console.log(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


// otp sending

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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


// otp generator 

// ====================================================================================================================================================

const generateOtp = () => {

    const otp = crypto.randomInt(100000, 1000000);

    return otp.toString();

};


// verify otp for changepassword

const verifyOtpPassword = async (req, res) => {
    try {
        const checkData = req.session.checkPass;
        const { otp } = req.body;
        const sessionOtp = req.session.otp;
        const currentTime = Date.now();
        const otpSentTime = req.session.time || 0;

        console.log("checkData", checkData)

        console.log("type otp", otp);
        console.log("type session", sessionOtp);

        if (!otp) {
            return res.status(HttpStatus.BAD_REQUEST).send('OTP is required');
        }

        if (String(otp) !== String(sessionOtp)) {
            return res.status(HttpStatus.BAD_REQUEST).send('Invalid OTP');
        }

        if (currentTime - otpSentTime > 60000) {
            return res.status(HttpStatus.NOT_FOUND).send('Your OTP has expired');
        }

        if (checkData.trim() === "signUp") {
            console.log("lllll")
            const { username, email, password } = req.session.data;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const newUser = await User.create({
                username,
                email,
                password: hashedPassword
            });

            req.session.User = newUser;
            req.session.logged = true;
            req.session.otp = null;
            req.session.checkPass = null;
            return res.status(HttpStatus.OK).send('Account created successfully');
        }
        else if (checkData.trim() === "forgot") {
            console.log("hhhh");
            const { email } = req.session.data
            req.session.forgotPasswordEmail = email;
            req.session.checkPass = null;
            req.session.otp = null;
            req.session.time = null;
            req.session.data = null;

            return res.status(HttpStatus.CREATED).send("forgot password otp verified successfully");
        }

        // Just in case checkPass is undefined or invalid
        return res.status(HttpStatus.BAD_REQUEST).send('Invalid session state');

    } catch (err) {
        console.error(err);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};



// load otp verify section 

//====================================================================================================================================================

const verifyOtp = async (req, res) => {
    try {
        const checkData = req.session.checkPass;
        const { otp } = req.body;
        const sessionOtp = req.session.otp;
        const currentTime = Date.now();
        const otpSentTime = req.session.time || 0;

        console.log("checkData:", checkData);
        console.log("checkData.trim():", checkData?.trim())

        console.log("type otp", otp);
        console.log("type session", sessionOtp);

        if (!otp) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'OTP is required' });
        }

        if (String(otp) !== String(sessionOtp)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid OTP or Invalid format' });
        }

        if (currentTime - otpSentTime > 60000) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Your OTP has expired' });
        }


        if (checkData == "singup") {

            const { username, email, password } = req.session.data;

            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const newUser = await User.create({
                username,
                email,
                password: hashedPassword
            });

            console.log("new User", newUser)

            req.session.User = newUser;
            req.session.logged = true;
            req.session.otp = null;
            req.session.checkPass = null;

            return res.status(HttpStatus.OK).json({ message: 'Account created successfully' });
        }
        else if (checkData == "forgot") {
            console.log("forrrr")
            const { email } = req.session.data
            req.session.forgotPasswordEmail = email;
            req.session.checkPass = null;
            req.session.otp = null;
            req.session.time = null;
            req.session.data = null;

            return res.status(HttpStatus.CREATED).json({ message: "forgot password otp verified successfully" });

        } else {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid session state' });
        }

    } catch (err) {
        console.error(err);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};



// resend otp

//====================================================================================================================================================

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



        let newOtp;
        do {
            newOtp = generateOtp()

        } while (newOtp === req.session.otp)

        req.session.otp = newOtp;

        console.log("resend", newOtp)
        console.log("session stored Otp===:", req.session.otp)

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

        res.status(HttpStatus.OK).redirect("/user/otp")


    } catch (err) {
        console.log(err.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });

    }
}


// load Category based Shop page

//====================================================================================================================================================

const loadShopCategory = async (req, res) => {
    try {
        const user = req.session?.User

        const categories = await Category.findOne({ name: req.params.cat, isListed: false, isDeleted: false });



        const products = await Products.find({ isListed: false, isDeleted: false, category: categories?._id })




        res.render("shopCategory", { products, categories, user });
    } catch (err) {
        console.log(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


// load Category based Shop page 

//====================================================================================================================================================

const loadShop = async (req, res) => {
    try {
        const user = req.session?.User;
        const { search = "", category, sort, page = 1 } = req.query;
        const limit = 12;
        const skip = (page - 1) * limit;


        let query = {
            isDeleted: false,
            isListed: false
        };

        if (search) {
            query.name = { $regex: new RegExp(search, 'i') };
        }

        if (category) {
            const categoryDoc = await Category.findOne({ name: category });
            if (categoryDoc) {
                query.category = categoryDoc._id;
            }
        }


        let sortQuery = {};
        switch (sort) {
            case 'nameAsc': sortQuery = { name: 1 }; break;
            case 'nameDesc': sortQuery = { name: -1 }; break;
            case 'priceAsc': sortQuery = { salesPrice: 1 }; break;
            case 'priceDesc': sortQuery = { salesPrice: -1 }; break;
            default: sortQuery = { createdAt: 1 };
        }


        const totalProducts = await Products.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);


        const products = await Products.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .populate('category');


        let wishlistProducts = [];
        if (user) {
            const wishlist = await WhishList.findOne({ userId: user._id });
            wishlistProducts = wishlist ? wishlist.products.map(p => p.productId.toString()) : [];
        }


        const categories = await Category.find({ isDeleted: false, isListed: false });


        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                products,
                wishlistProducts,
                currentPage: parseInt(page),
                totalPages,
                filters: { search, category, sort }
            });
        }


        res.render('shop', {
            products,
            categories,
            user,
            wishlistProducts,
            currentPage: parseInt(page),
            totalPages,
            filters: { search, category, sort }
        });

    } catch (error) {
        console.error('Shop error:', error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Error loading products'
            });
        }
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// shop products search

//====================================================================================================================================================

const searchProducts = async (req, res) => {
    try {
        let searchQuery = req.query.q;
        if (!searchQuery) return res.json([]);
        console.log(searchQuery)

        const products = await Products.find({
            name: { $regex: searchQuery, $options: "i" },
            isDeleted: false,
            isListed: false,

        });

        res.json(products);
    } catch (err) {
        console.log(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// product-view 

//====================================================================================================================================================

const loadProductView = async (req, res) => {
    try {
        const user = req.session?.User
        const productId = req.params.product_id

        if(!mongoose.Types.ObjectId.isValid(productId)){
            return res.render('userError')
        }

        
        const product = await Products.findOne({ _id: productId, isListed: false }).populate('category', 'name description');
        const categories = await Category.find({ isDeleted: false, isListed: false })

        

        if (!product) {
            res.redirect("/user/productBan")
        }

        res.render("userProductView", { product, categories, user });
    } catch (err) {
        console.log(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


// loadAbout page

//====================================================================================================================================================

const loadAbout = async (req, res) => {
    try {
        res.render("about");
    } catch (err) {
        console.log(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


// loadContact page

//====================================================================================================================================================

const loadContact = async (req, res) => {
    try {
        const user = req.session?.User

        const products = await Products.find({ isDeleted: false, isListed: false })
        const categories = await Category.find({ isDeleted: false, isListed: false })
        res.render("contact", { user, products, categories });
    } catch (err) {
        console.error(err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


// load logout controller

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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


// load google login

//====================================================================================================================================================

const googleLogin = async (req, res) => {
    try {


        const user = await User.findOne({ email: req.user.email });

        if (!user) {



            return res.redirect('/user/login');
        }


        if (user.isBlocked) {
            req.session.gerrmessage = "Your google account has been blocked. Please contact support."
            const categories = await Category.find({ isDeleted: false })

            return res.redirect('/user/login')
        }


        req.session.User = user;
        req.session.logged = true;


        res.redirect('/user');

    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


//====================================================================================================================================================


// load logout controller

//====================================================================================================================================================

const loadBanProduct = async (req, res) => {
    try {
        const user = req.session?.User

        const products = await Products.find({ isDeleted: false, isListed: false })
        const categories = await Category.find({ isDeleted: false, isListed: false })
        res.render("productBan", { products, categories, user });
    } catch (err) {
        console.error(err.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}


//====================================================================================================================================================



//  buynow  controller

const buyNow = async (req, res) => {
    try {
        const { selectedAddressId, paymentMethod, cartId, peymentStatus, couponCode } = req.body;
        const userId = req.session.User._id;






        const coupon = await Coupon.findOne({ code: couponCode, isActive: true, isDeleted: false });

        let couponPercentage = coupon?.discountPercentage || null;


        const dummyId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;





        const user = await User.findById(userId);
        if (!user) return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "User not found" });




        const cart = await Cart.findById(cartId).populate("products.productId");
        if (!cart) return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Cart not found" });

        let totalAmount = cart.products.reduce((total, item) => total + item.quantity * item.salesPrice, 0);
        console.log(totalAmount)

        const subTotal = totalAmount

        if (coupon) {
            let discountAmount = (couponPercentage / 100) * totalAmount
            totalAmount = totalAmount - discountAmount

        }

        console.log(totalAmount, 'totalAmount')

        const orderItems = cart.products.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.salesPrice,
        }));


        if (paymentMethod.toLowerCase() === "wallet") {
            const wallet = await walletModel.findOne({ userId });

            if (!wallet || wallet.balance < totalAmount) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Insufficient Wallet Balance",
                });
            }

            for (let item of orderItems) {
                const product = await Products.findById(item.productId);

                if (!product) {
                    return res.status(HttpStatus.NOT_FOUND).json({
                        success: false,
                        message: `Product with ID ${item.productId} not found`,
                    });
                }

                if (product.stock < item.quantity) {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: false,
                        message: `Not enough stock for ${product.name}. Available stock: ${product.stock}`,
                    });
                }
            }

            const dummyId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;



            wallet.balance -= totalAmount;

            wallet.transactions.push({
                type: 'debit',
                amount: totalAmount,
                description: 'Order placed using wallet',
                date: new Date()
            });

            await wallet.save();



            for (let item of orderItems) {
                const product = await Products.findById(item.productId);
                product.stock -= item.quantity;
                await product.save();
            }

            const newOrder = new ordermodel({
                userId,
                dummyOrderId: dummyId,
                couponCode: couponCode || null,
                items: orderItems,
                addressId: selectedAddressId,
                paymentMethod,
                subTotal,
                totalAmount,
                paymentStatus: "Paid",
                orderStatus: "Pending",
            });

            await newOrder.save();

            if (coupon) {
                coupon.usedBy.push(userId);
                await coupon.save();
            }

            await Cart.findByIdAndDelete(cartId);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Order placed successfully using Wallet",
                orderId: newOrder._id,
            });
        }


        if (paymentMethod.toLowerCase() === "paypal") {
            console.log('inside the paypal anpunt')
            console.log(totalAmount, 'inside the paypal; paypal');
            console.log(paymentMethod, 'method inside the payoap')
            const { orderId, paypalRedirectUrl } = await createPayPalOrder(totalAmount, userId);
            console.log(paypalRedirectUrl, 'paypal order inside paypal approvalLinkapprovalLinkapprovalLink');
            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Redirect to PayPal",
                orderId: orderId,
                paypalRedirectUrl: paypalRedirectUrl
            });
        }


        if (paymentMethod.toLowerCase() === "cash on delivery") {



            if (totalAmount > 10000) {

                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: "sorry user COD available only 10000rs"
                })
            }

            for (let item of orderItems) {
                const product = await Products.findById(item.productId);

                if (!product) {
                    return res.status(HttpStatus.NOT_FOUND).json({
                        success: false,
                        message: `Product with ID ${item.productId} not found`,
                    });
                }

                if (product.stock < item.quantity) {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: false,
                        message: `Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
                    });
                }


                product.stock -= item.quantity;

                await product.save();
            }

            const newOrder = new ordermodel({
                userId,
                dummyOrderId: dummyId,
                couponCode: couponCode || null,
                items: orderItems,
                addressId: selectedAddressId,
                paymentMethod,
                subTotal: subTotal,
                totalAmount,
                paymentStatus: "Pending",
                orderStatus: "Pending",
                updatedAt: new Date(),
            });

            await newOrder.save()
            await Cart.findByIdAndDelete(cartId);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Order placed successfully. Pay on delivery.",
                orderId: newOrder._id,
            });
        }

        if (paymentMethod.toLowerCase() === "razorpay") {



            for (let item of orderItems) {
                const product = await Products.findById(item.productId);

                if (!product) {
                    return res.status(HttpStatus.NOT_FOUND).json({
                        success: false,
                        message: `Product with ID ${item.productId} not found`,
                    });
                }

                if (product.stock < item.quantity) {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: false,
                        message: `Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
                    });
                }

                product.stock -= item.quantity;

                await product.save();
            }

            const newOrder = new ordermodel({
                userId,
                dummyOrderId: dummyId,
                items: orderItems,
                addressId: selectedAddressId,
                paymentMethod,
                subTotal: subTotal,
                totalAmount,
                paymentStatus: "Pending",
                orderStatus: "Pending",
            });

            await newOrder.save();
            await Cart.findByIdAndDelete(cartId);


            const razorpayOrder = await razorpay.orders.create({
                amount: totalAmount * 100,
                currency: "INR",
                receipt: newOrder._id.toString()
            });

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Order created, proceed with payment",
                orderId: newOrder._id,
                razorpayOrderId: razorpayOrder.id,
                amount: totalAmount
            });
        }


    } catch (error) {
        console.error("Error in buyNow:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};



// paypal success

const paypalSuccess = async (req, res) => {
    const { token } = req.query;
    try {
        const captureResponse = await capturePayPalOrder(token);
        console.log("PayPal Payment Captured:", captureResponse);
        res.redirect("/user/orderPlace?success=true");
    } catch (error) {
        console.error("Error capturing PayPal payment:", error);
        res.redirect("/user/orderPlace?success=false");
    }
}


// load order placed

const loadOrderPlaced = async (req, res) => {

    try {
        const { _id } = req.session?.User

        const userid = _id


        res.render("orderPlaced", { userid })
    } catch (error) {

    }
}

// filter product

const filterProducts = async (req, res) => {
    try {
        const user = req.session?.User;
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        const { search, category, sort, minPrice, maxPrice } = req.query;

        let query = {
            isDeleted: false,
            isListed: false,
            status: 'active'
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') {
            const categoryData = await Category.findOne({ name: category });
            if (categoryData) {
                query.category = categoryData._id;
            }
        }

        if (minPrice || maxPrice) {
            query.salesPrice = {};
            if (minPrice) query.salesPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.salesPrice.$lte = parseFloat(maxPrice);
        }

        let sortOption = {};
        switch (sort) {
            case 'priceAsc':
                sortOption = { salesPrice: 1 };
                break;
            case 'priceDesc':
                sortOption = { salesPrice: -1 };
                break;
            case 'nameAsc':
                sortOption = { name: 1 };
                break;
            case 'nameDesc':
                sortOption = { name: -1 };
                break;
            case 'rating':
                sortOption = { ratings: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const totalProducts = await Products.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Products.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .populate('category')
            .select('name description salesPrice productOffer stock images status ratings isDeleted isListed createdAt updatedAt');

        const filteredProducts = products.filter(product =>
            product.category && !product.category.isListed && !product.category.isDeleted
        );

        let wishlistProducts = [];
        if (user) {
            const wishlist = await WhishList.findOne({ userId: user._id });
            wishlistProducts = wishlist ? wishlist.products.map(p => p.productId.toString()) : [];
        }

        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                products: filteredProducts,
                wishlistProducts,
                currentPage: page,
                totalPages,
                filters: { search, category, sort, minPrice, maxPrice }
            });
        }

        const categories = await Category.find({ isDeleted: false, isListed: false });

        res.render("shop", {
            products: filteredProducts,
            categories,
            user,
            wishlistProducts,
            currentPage: page,
            totalPages,
            filters: { search, category, sort, minPrice, maxPrice },
            searchQuery: search
        });

    } catch (error) {
        console.error('Filter error:', error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error filtering products'
            });
        }
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('error', { message: 'Error filtering products' });
    }
};




// load whishlist page

const loadWhishList = async (req, res) => {
    try {
        const user = req.session?.User;
        if (!user) {
            return res.redirect('/user/login');
        }

        const categories = await Category.find({ isDeleted: false, isListed: false });

        const cart = await Cart.findOne({ userId: user._id }).populate("products.productId")


        const cartProductIds = cart ? cart.products.map(p => p.productId._id.toString()) : [];


        const wishlist = await WhishList.findOne({ userId: user._id })
            .populate({
                path: 'products.productId',
                model: 'Product',
                select: 'name images salesPrice stock',
                match: { isDeleted: false, isListed: false }
            });

        if (wishlist) {
            wishlist.products = wishlist.products.filter(p =>
                p.productId && !cartProductIds.includes(p.productId._id.toString())
            );
        }



        res.render("whishList", { user, categories, wishlist });
    } catch (error) {
        console.error("Error loading wishlist:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// add to whishlist 

const addWhishList = async (req, res) => {
    try {
        const { productId } = req.body;
        const user = req.session?.User;

        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "User not authenticated" });
        }


        const userData = await User.findOne({ email: user.email });
        if (!userData) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "User not found" });
        }

        const userId = userData._id;



        const product = await Products.findById(productId);
        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found" });
        }

        const cart = await Cart.findOne({ userId, "products.productId": productId })
        if (cart) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Product is already in your cart. Cannot add to wishlist."
            })
        }


        let wishlist = await WhishList.findOne({ userId });

        if (wishlist) {

            if (wishlist.products.some(p => p.productId.toString() === productId)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Product already in wishlist"
                });
            }


            wishlist.products.push({ productId });

        } else {

            wishlist = new WhishList({
                userId,
                products: [{ productId }]
            });
        }

        await wishlist.save();


        res.status(HttpStatus.CREATED).json({
            success: true,
            message: "Product added to wishlist"
        });

    } catch (error) {

        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// delete wishList

const deleteWhishlist = async (req, res) => {
    try {
        const productId = req.query.id
        const userId = req.session?.User;
        console.log(productId)

        const whishlist = await WhishList.findOne({ userId });


        if (!whishlist || !whishlist.products || whishlist.products.length === 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Whishlist is empty" });
        }

        const productIndex = whishlist.products.findIndex(item => item.productId.toString() === productId);

        if (productIndex === -1) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found in whishlist" });
        }

        whishlist.products.splice(productIndex, 1);
        console.log("product deleted")
        await whishlist.save();
        return res.status(HttpStatus.OK).json({ success: true, message: "Product removed from wishlist" });


    } catch (error) {
        console.log(error.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}







const razorpay = new Razorpay({
    key_id: "rzp_test_av7bn0QCiETOX0",
    key_secret: "wehlBhfqQlWoouA0ZGxYB373"
});


const createOrder = async (req, res) => {
    try {

        const { amount, currency, receipt, totalAmount, coupon, cartId } = req.body;


        const cart = await Cart.findById(cartId).populate("products.productId");
        if (!cart) return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Cart not found" });

        const orderItems = cart.products.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.salesPrice,
        }));

        for (let item of orderItems) {
            const product = await Products.findById(item.productId);

            if (!product) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: `Product with ID ${item.productId} not found`,
                });
            }

            if (product.stock < item.quantity) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: `Not enough stock for ${product.name}.currently Available: ${product.stock}`,
                });
            }
        }



        const couponCode = await Coupon.findOne({ code: coupon })

        const couponPercentage = Number(couponCode?.discountPercentage) || 0;

        let totalamount = Number(totalAmount);

        if (couponCode) {
            let discountAmount = (couponPercentage / 100) * totalamount
            totalamount = totalamount - discountAmount

        }



        console.log("Final amount after discount:", totalamount)

        const finalAmount = Math.round(totalamount * 100);

        const order = await razorpay.orders.create({
            amount: finalAmount,
            currency,
            receipt,

        });




        res.status(HttpStatus.OK).json({ success: true, order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};




const verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, requestData } = req.body;

        const userId = req.session?.User?._id



        const cartId = requestData.cartId;

        const codeCoupon = requestData?.couponCode;

        const coupon = await Coupon.findOne({ code: codeCoupon, isActive: true, isDeleted: false });

        let couponPercentage = coupon?.discountPercentage || null;

        const dummyId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;



        const cart = await Cart.findById(cartId).populate("products.productId");
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        let totalAmount = cart.products.reduce((total, item) => total + item.quantity * item.salesPrice, 0);

        const subTotal = Number(totalAmount);
        console.log("subtotal", subTotal);

        if (coupon) {
            let discountAmount = (couponPercentage / 100) * totalAmount
            totalAmount = totalAmount - discountAmount

        }

        const orderItems = cart.products.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.salesPrice,
        }));


        for (let item of orderItems) {
            const product = await Products.findById(item.productId);

            if (!product) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: `Product with ID ${item.productId} not found`,
                });
            }

            if (product.stock < item.quantity) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
                });
            }

            product.stock -= item.quantity;

            await product.save();
        }

        const newOrder = new ordermodel({
            userId: userId,
            dummyOrderId: dummyId,
            addressId: requestData.selectedAddressId,
            items: orderItems,
            cartId: requestData.cartId,
            paymentMethod: requestData.paymentMethod,
            couponCode: requestData.couponCode || null,
            totalAmount: totalAmount,
            subTotal: subTotal,
            paymentStatus: "Paid",
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId
        });



        await newOrder.save();

        if (coupon) {
            coupon.usedBy.push(userId);
            await coupon.save();
        }
        await Cart.findByIdAndDelete(requestData.cartId);


        console.log(" Order Saved Successfully:", newOrder);

        res.json({ success: true, message: "Payment verified & order saved successfully", order: newOrder });
    } catch (error) {
        console.error(" Payment verification error:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }

}



const placePendingOrder = async (req, res) => {
    try {
        const { requestData, orderId, paymentId } = req.body;

        console.log("req.body;", req.body)
        const userId = req.session?.User?._id

        const dummyId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

        const coupon = requestData.couponCode

        const totalAmount = requestData.grandTotal

        const subTotal = Number(totalAmount);

        const couponCode = await Coupon.findOne({ code: coupon })

        const couponPercentage = Number(couponCode?.discountPercentage) || 0;

        let totalamount = Number(totalAmount);



        if (couponCode) {
            let discountAmount = (couponPercentage / 100) * totalamount
            totalamount = totalamount - discountAmount

        }


        const newOrder = new ordermodel({
            userId: userId,
            dummyOrderId: dummyId,
            addressId: requestData.selectedAddressId,
            cartId: requestData.cartId,
            paymentMethod: requestData.paymentMethod,
            couponCode: requestData.couponCode || null,
            totalAmount: totalamount,
            subTotal: subTotal,
            paymentStatus: "Pending",
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId || ""
        });

        await newOrder.save();
        await Cart.findByIdAndDelete(requestData.cartId);

        console.log(" Order Placed with Payment Pending:", newOrder);

        res.json({ success: true, message: "Order placed with pending payment", order: newOrder });
    } catch (error) {
        console.error(" Error placing pending order:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to place pending order." });
    }
};




const addAddressCheckout = async (req, res) => {
    try {
        const addressData = req.body;
        console.log("Request Body:", addressData);


        const user = req.session?.User;
        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message: Messages.UNAUTHORIZED_ACCESS
            });
        }
        console.log("Address User Data:", user);


        const { houseNumber, street, city, landmark, country, pincode, phone, isDefault } = addressData;


        if (!houseNumber || !street || !city || !country || !pincode || !phone) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "All required fields must be provided."
            });
        }


        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Invalid phone number format. Must be a 10-digit number starting with 6-9."
            });
        }

        // Validate pincode (6 digits)
        const pincodeRegex = /^\d{6}$/;
        if (!pincodeRegex.test(pincode)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Invalid pincode format. Must be 6 digits."
            });
        }


        let addressDoc = await Address.findOne({ userId: user._id });


        const newAddress = {
            houseNumber,
            street,
            city,
            landmark: landmark || '',
            country,
            pincode,
            phone,
            isDeleted: false,
            isDefault: isDefault || false
        };


        if (!addressDoc) {
            addressDoc = new Address({
                userId: user._id,
                address: [newAddress]
            });
        } else {

            if (isDefault) {
                addressDoc.address.forEach(addr => (addr.isDefault = false));
            }

            addressDoc.address.push(newAddress);
        }

        await addressDoc.save();
        console.log("Address Saved:", addressDoc);


        const addedAddress = addressDoc.address[addressDoc.address.length - 1];

        return res.status(HttpStatus.CREATED).json({
            success: true,
            message: "Address added successfully!",
            address: {
                _id: addedAddress._id,
                houseNumber: addedAddress.houseNumber,
                street: addedAddress.street,
                city: addedAddress.city,
                landmark: addedAddress.landmark,
                country: addedAddress.country,
                pincode: addedAddress.pincode,
                phone: addedAddress.phone,
                isDefault: addedAddress.isDefault
            }
        });
    } catch (error) {
        console.error("Error Adding Address:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: Messages.INTERNAL_ERROR
        });
    }
};




const verifyChangePassword = async (req, res) => {

    try {
        const { newPassword } = req.body;

        console.log("newPassword", newPassword)


        const email = req.session.forgotPasswordEmail;
        console.log(req.session.forgotPasswordEmail)



        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one letter, one number, and one special character'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }


        const hashedPassword = await bcrypt.hash(newPassword, 10);


        user.password = hashedPassword;
        await user.save();


        req.session.forgotPasswordEmail = null;
        console.log("hello")
        return res.status(200).json({ success: true });
    } catch (error) {

        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }


}



module.exports = {

    loadHome,
    loadLogin,
    verifyUser,




    googleLogin,
    googleAuth,
    ForgotPassword,
    resendOtp,
    genOtpForgotPass,
    loadOtpForgetPass,
    otpVerifyForgotPassword,
    changePassword,
    verifyChangePassword,



    loadSingUp,
    registration,
    loadOtp,
    placePendingOrder,



    loadShop,
    searchProducts,
    loadShopCategory,
    loadAbout,
    loadContact,
    verifyOtp,
    verifyOtpPassword,
    logOut,
    loadProductView,
    loadBanProduct,


    loadWhishList,
    addWhishList,


    buyNow,
    createOrder,
    verifyPayment,
    paypalSuccess,
    loadOrderPlaced,
    filterProducts,
    deleteWhishlist,

    addAddressCheckout




};

