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
const {deductFromWallet}= require("../controllers/walletController")




// default loadHome page

// ==================================================================================================================================================== 

const loadHome = async (req, res) => {

    const user = req.session?.User
    console.log("userr data===========", user)
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
    }
};


//  verifyUser load

// ====================================================================================================================================================

const verifyUser = async (req, res) => {
    try {
        const { email, password, 'g-recaptcha-response': captchaResponse } = req.body;



        const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const secretKey = '6LfVW8MqAAAAAI2w-b4uB11B24m0BtDABGV9Q-8H';

        // try {
        //     const verificationResponse = await axios.post(verifyUrl, null, {
        //         params: {
        //             secret: secretKey
        //             ,
        //             response: captchaResponse
        //         }
        //     });

        //     console.log("verifiationresponseeee===", verificationResponse.data)

        //     if (!captchaResponse) {
        //         return res.status(400).json({
        //             success: false,
        //             emailError: 'reCAPTCHA response is missing'
        //         });
        //     }

        //     if (!verificationResponse.data.success) {
        //         return res.status(400).json({
        //             success: false,
        //             emailError: 'reCAPTCHA verification failed'
        //         });
        //     }
        // } catch (captchaError) {
        //     console.error('reCAPTCHA verification error:', captchaError);
        //     return res.status(500).json({
        //         success: false,
        //         emailError: 'reCAPTCHA verification failed'
        //     });
        // }

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

        req.session.User = user;
        req.session.logged = true;
        res.status(200).json({ success: true });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ error: " internal Server Error" });
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
    }
};


// otp load for forgot password page  

//====================================================================================================================================================

const genOtpForgotPass = async (req, res) => {
    try {
        const { email } = req.body;

        const emailName = await User.findOne({ email })
        req.session.checkPass = "forgot"
        if (!emailName) {
            req.flash("message", "user not fount")
            return res.send('shuiijnk')
        }

        const otp = generateOtp()

        sendotp(otp, email)

        req.session.data = {
            email,

        }
        req.session.otp = otp
        console.log(
            otp
        )

        res.status(200).render("userotp");
    } catch (err) {
        console.log(err.message);

    }
};


// load otp verify for forgot password page 

//====================================================================================================================================================


const loadOtpForgetPass = async (req, res) => {
    try {
        res.render("passOtp")
    } catch (err) {
        console.error(err.message);
    }
};


// load otp verify for forgot password page 

//====================================================================================================================================================

const changePassword = async (req, res) => {
    try {
        res.render("changePassword")
    } catch (err) {
        console.log(err)
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
    }
};


// register user  

//====================================================================================================================================================

const registration = async (req, res) => {

    try {

        console.log('this is the data', req.body)
        const { name, email, password } = req.body;
        const username = name
        req.session.checkPass = "singUp"
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
    }
}


// otp generator 

// ====================================================================================================================================================

const generateOtp = () => {

    const otp = crypto.randomInt(100000, 1000000);

    return otp.toString();

};


// load otp verify section 

//====================================================================================================================================================

const verifyOtp = async (req, res) => {
    try {

        const checkData = req.session.checkPass

        if (checkData == "singUp") {
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
                


                const hashedpassword = await bcrypt.hash(password, saltRounds);

                const newUser = await User.create({
                    username,
                    email,
                    password: hashedpassword,

                });
                console.log(" user blocked=====", User)



                req.session.User = newUser;
                req.session.logged = true;
                req.session.otp = null;
                return res.status(200).send('account created successfully ')




            }

            else {
                res.status(400).send('invalid OTP')
            }


        }

        if (checkData == "forgot") {


            if (!req.body.otp) {
                return res.status(400).send('OTP is required');
            }



            else {
                if (req.session.otp === req.body.otp) {


                    return res.render('changePassword')
                }
            }
            const currentTime = Date.now()

        }


    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');

    }
}


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

        res.status(200).redirect("/user/otp")


    } catch (err) {

        console.log(err.message)

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
    }
}


// load Category based Shop page 

//====================================================================================================================================================

const loadShop = async (req, res) => {
    try {
        const user = req.session?.User;
        const { search = "", category, minPrice, maxPrice, sort, page = 1 } = req.query;
        const limit = 6;
        const skip = (page - 1) * limit;

        let query = {
            isDeleted: false,
            isListed: false,
            stock: { $gt: 0 }
        };



        if (search) {
            query.name = { $regex: new RegExp(search, 'i') };
        }
        if (category) query.category = category;

        if (minPrice || maxPrice) {
            query.salesPrice = {};
            if (minPrice) query.salesPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.salesPrice.$lte = parseFloat(maxPrice);
        }


        let sortOption = {};
        switch (sort) {
            case 'nameAsc': sortOption = { name: 1 }; break;
            case 'nameDesc': sortOption = { name: -1 }; break;
            case 'priceAsc': sortOption = { salesPrice: 1 }; break;
            case 'priceDesc': sortOption = { salesPrice: -1 }; break;
        }

        const totalProducts = await Products.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Products.find(query)
            .populate({
                path: "category",
                match: { isListed: false, isDeleted: false },
            })
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const filteredProducts = products.filter(product => product.category);
        const categories = await Category.find({ isDeleted: false, isListed: false });


        let wishlistProducts = [];
        if (user) {
            const wishlist = await WhishList.findOne({ userId: user._id });
            wishlistProducts = wishlist ? wishlist.products.map((product) => product.productId.toString()) : [];
           
        }





        

        res.render("shop", {
            categories,
            user,
            wishlistProducts,
            products: filteredProducts,
            filters: { search, category, minPrice, maxPrice, sort },
            currentPage: parseInt(page),
            searchQuery: search,
            totalPages,
        });
    } catch (err) {
        console.log('Error in loadShop:', err.message);
        res.status(500).send("Server Error");
    }
}


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
        res.status(500).json({ error: "Server error" });
    }
};


// product-view 

//====================================================================================================================================================

const loadProductView = async (req, res) => {
    try {
        const user = req.session?.User
        const productId = req.params.product_id
        const product = await Products.findOne({ _id: productId, isListed: false }).populate('category', 'name description');
        const categories = await Category.find({ isDeleted: false, isListed: false })

        if (!product) {
            res.redirect("/user/productBan")
        }

        res.render("userProductView", { product, categories, user });
    } catch (err) {
        console.log(err.message);
    }
}


// loadAbout page

//====================================================================================================================================================

const loadAbout = async (req, res) => {
    try {
        res.render("about");
    } catch (err) {
        console.log(err.message);
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


        req.session.User = {
            username: user.username,
            email: user.email
        };


        res.redirect('/user');

    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
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
    }
}


//====================================================================================================================================================



//  buynow  controller

const buyNow = async (req, res) => {
    try {


        const { selectedAddressId, paymentMethod, cartId, couponCode, grandTotal } = req.body;
        const userId = req.session?.User?._id;

        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });


        const cart = await Cart.findById(cartId)
            .populate({
                path: 'products.productId',
                select: 'name salesPrice quantity stock'
            });

        cart.products = cart.products.filter(p => p.productId && p.productId.stock > 0)


        if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        const coupon = await Coupon.findOne({ code: couponCode })

        const wallet = await Wallet.findOne({ userId }).select("balance");



        let totalAmount = grandTotal
        if (couponCode) {
            const discountAmount = (grandTotal * coupon?.discountPercentage) / 100;
            totalAmount = grandTotal - discountAmount;
        }

        for (let item of cart.products) {
            await Products.findByIdAndUpdate(
                item.productId._id, {
                $inc: { stock: -item.quantity }
            })
        }


        const orderItems = cart.products.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.salesPrice,
        }));


        if (paymentMethod.toLowerCase() === "wallet") {
            try {
               
                await deductFromWallet(
                    userId,
                    totalAmount,
                    'Order Payment'
                );

                
                const newOrder = new ordermodel({
                    userId,
                    items: orderItems,
                    addressId: selectedAddressId,
                    couponCode: couponCode,
                    paymentMethod,
                    totalAmount,
                    paymentStatus: "Paid",
                    orderStatus: "Pending",
                });

                await newOrder.save();
                await Cart.findByIdAndDelete(cartId);

                
                if (couponCode) {
                    await Coupon.findOneAndUpdate(
                        { code: couponCode },
                        { $push: { usedBy: userId } }
                    );
                }

                return res.status(200).json({
                    success: true,
                    message: "Order placed successfully using Wallet",
                    orderId: newOrder._id,
                });
            } catch (error) {
                console.error("Error processing wallet payment:", error);
                return res.status(400).json({
                    success: false,
                    message: error.message || "Error processing wallet payment",
                });
            }
        }

        if (paymentMethod.toLowerCase() === "paypal") {
            console.log('inside the paypal anpunt')
            console.log(totalAmount, 'inside the paypal; paypal');
            console.log(paymentMethod, 'method inside the payoap')
            const { orderId, paypalRedirectUrl } = await createPayPalOrder(totalAmount, userId);
            console.log(paypalRedirectUrl, 'paypal order inside paypal');
            return res.status(200).json({
                success: true,
                message: "Redirect to PayPal",
                orderId: orderId,
                paypalRedirectUrl: paypalRedirectUrl
            });
        }


        if (paymentMethod.toLowerCase() === "cash on delivery") {
            const newOrder = new ordermodel({
                userId,
                items: orderItems,
                addressId: selectedAddressId,
                couponCode: couponCode,
                paymentMethod,
                totalAmount,
                paymentStatus: "Pending",
                orderStatus: "Pending",
            });

            await newOrder.save();
            await Cart.findOneAndDelete(cartId);
            await Coupon.findOneAndUpdate(
                { code: couponCode },
                { $push: { usedBy: userId } }
            );
            return res.status(200).json({
                success: true,
                message: "Order placed successfully. Pay on delivery.",
                orderId: newOrder._id,
            });
        }

        if (paymentMethod.toLowerCase() === "razorpay") {
            const newOrder = new ordermodel({
                userId,
                items: orderItems,
                addressId: selectedAddressId,
                couponCode: couponCode,
                paymentMethod,
                totalAmount,
                paymentStatus: "Pending",
                orderStatus: "Pending",
            });

            await newOrder.save();
            await Products.findOneAndUpdate()

            await Coupon.findOneAndUpdate(
                { code: couponCode },
                { $push: { usedBy: userId } }
            );
            await Cart.findByIdAndDelete(cartId);

            return res.status(200).json({
                success: true,
                message: "Order placed successfully. Pay on delivery.",
                orderId: newOrder._id,
            });


        }

    } catch (error) {
        console.error("Error in buyNow:", error);
        res.status(500).json({ success: false, message: "Error processing order" });
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
        console.log(_id)
        const userid = _id


        res.render("orderPlaced", { userid })
    } catch (error) {

    }
}

// filter product

const filterProducts = async (req, res) => {
    try {
        const user = req.session?.User;
        const { search, category, sort, minPrice, maxPrice } = req.query;


        let query = {
            isDeleted: false,
            isListed: false
        };


        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }


        if (category && category !== 'all') {
            const categoryData = await Category.findOne({ name: category });
            if (categoryData) {
                query.category = categoryData._id;
            } else {
                return res.status(404).json({ success: false, message: "Category not found" });
            }
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Add price filter
        if (minPrice || maxPrice) {
            query.salesPrice = {};
            if (minPrice) query.salesPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.salesPrice.$lte = parseFloat(maxPrice);
        }

        // Set up sort options
        let sortOption = {};
        if (sort) {
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
            }
        }

        // Get filtered products
        const products = await Products.find(query)
            .sort(sortOption)
            .populate('category',);

        const filteredProducts = products.filter(product => product.category);


        let wishlistProducts = [];
        if (user) {
            const wishlist = await WhishList.findOne({ userId: user._id });
            
            wishlistProducts = wishlist ? wishlist.products.map((product) => product.productId.toString()) : [];

        }

        

        res.json({
            success: true,
            wishlistProducts,
            products: filteredProducts
        });

    } catch (error) {
        console.error('Filter error:', error);
        res.status(500).json({
            success: false,
            message: 'Error filtering products'
        });
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
        res.status(500).send("Internal Server Error");
    }
};


// add to whishlist 

const addWhishList = async (req, res) => {
    try {
        const { productId } = req.body;
        const user = req.session?.User;

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        
        const userData = await User.findOne({ email: user.email });
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userId = userData._id;
        

        
        const product = await Products.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const cart = await Cart.findOne({ userId, "products.productId": productId })
        if (cart) {
            return res.status(400).json({
                success: false,
                message: "Product is already in your cart. Cannot add to wishlist."
            })
        }
        

        let wishlist = await WhishList.findOne({ userId });

        if (wishlist) {
            
            if (wishlist.products.some(p => p.productId.toString() === productId)) {
                return res.status(400).json({
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
       

        res.status(201).json({
            success: true,
            message: "Product added to wishlist"
        });

    } catch (error) {
       
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
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
            return res.status(400).json({ success: false, message: "Whishlist is empty" });
        }

        const productIndex = whishlist.products.findIndex(item => item.productId.toString() === productId);

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in whishlist" });
        }

        whishlist.products.splice(productIndex, 1);
        console.log("product deleted")
        await whishlist.save();
        return res.status(200).json({ success: true, message: "Product removed from wishlist" });


    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: "Server error" });
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



    loadShop,
    searchProducts,
    loadShopCategory,
    loadAbout,
    loadContact,
    verifyOtp,
    logOut,
    loadProductView,
    loadBanProduct,

    loadWhishList,
    addWhishList,


    buyNow,
    paypalSuccess,
    loadOrderPlaced,
    filterProducts,
    deleteWhishlist,
    


};

