// require("../config/multer.js")
const express = require('express');
const session = require("express-session");
const config = require("../config/config");
const {isLogin,isBan} = require("../middlewares/userAuth")
const userController = require("../controllers/userController");
const userRouter = express.Router();
const multer = require('../config/multer.js');
const googleAuth = require('../middlewares/googleAuth.js')
const passport = require('../middlewares/googleAuth.js');


userRouter.use(
    session({ 
        secret: "jdakxlhjk",
        saveUninitialized: false,
        resave: false,
    })
); 
 
  

// default route
userRouter.get("/",userController.loadHome);


// login route
userRouter.get("/login", isLogin, userController.loadLogin);



// userHome route
userRouter.post("/login", isLogin, userController.verifyUser);


// forgot passwordpage load
userRouter.get("/forgot",isLogin,userController.ForgotPassword);

// generate for forgot password 
userRouter.post("/forgot",isLogin,userController.genOtpForgotPass);

// load otp forgot password
userRouter.get("/forgetPassOtp",isLogin,userController.loadOtpForgetPass);

// verify otp forgot password
userRouter.post("/forgetPassOtp",isLogin,userController.otpVerifyForgotPassword);

// change password 
userRouter.get("/changePassword",isLogin,userController.changePassword)

// register route
userRouter.get("/register", isLogin,userController.loadSingUp);
 

// generate otp route
userRouter.post("/register", userController.registration);
 
// load otp
userRouter.get('/otp',isLogin,userController.loadOtp);

// resend otp
userRouter.get('/resendOtp',isLogin,userController.resendOtp)

// verify otp
userRouter.post("/otp", isLogin,userController.verifyOtp)

// user home
userRouter.get("/home",isBan,userController.userhome);

// user profile
userRouter.get("/myProfile",isBan,userController.userProfile);

//==============================================================================================================================================================================================================================

// pages routing section



userRouter.get("/shop",userController.loadHome);

// shop-sofa route
userRouter.get("/shop-Category/:cat",isBan, userController.loadShopCategory);

// shop-sofa route
userRouter.get("/shop-beds",isBan, userController.loadShopBeds);

// shop-sofa route
userRouter.get("/shop-chairs",isBan,userController.loadShopChairs);

// contact route
userRouter.get("/contact",isBan, userController.loadContact);

// logout section

userRouter.get("/logout",userController.logOut);



// product view

userRouter.get('/product_view/:product_id',isBan,userController.loadProductView)



// google auth

userRouter.get('/auth/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);

// Google callback route
userRouter.get('/auth/google/callback',isLogin,
    passport.authenticate('google', { 
        failureRedirect: '/user/signup'  
    }),userController.googleLogin  
);



module.exports = userRouter;  

