const express = require('express');
const session = require("express-session");
const config = require("../config/config");
const { isLogin, isBan,payment } = require("../middlewares/userAuth")
const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController.js");
const profileController = require("../controllers/profileController.js");
const userRouter = express.Router();
const multer = require('../config/multer.js');
const googleAuth = require('../middlewares/googleAuth.js');
const passport = require('../middlewares/googleAuth.js');
const orderController = require('../controllers/ordersController.js');
const productController = require("../controllers/productController.js");
const couponController = require("../controllers/couponController.js")
const walletController = require("../controllers/walletController.js");


userRouter.use(
    session({
        secret: "jdakxlhjk",
        saveUninitialized: false,
        resave: false,
    })
);



// default route
userRouter.get("/", isBan, userController.loadHome);

// login route
userRouter.get("/login", isLogin, userController.loadLogin);

// userHome route
userRouter.post("/login", isLogin, userController.verifyUser);


// forgot passwordpage load
userRouter.get("/forgot", isLogin, userController.ForgotPassword);

// generate for forgot password 
userRouter.post("/forgot", isLogin, userController.genOtpForgotPass);



// change password 
userRouter.get("/changePassword", isLogin, userController.changePassword)

// register route
userRouter.get("/register",isLogin, userController.loadSingUp);


// generate otp route
userRouter.post("/register",isLogin, userController.registration);

// load otp
userRouter.get('/otp',isLogin, userController.loadOtp);

// resend otp
userRouter.get('/resendOtp',isLogin, userController.resendOtp)

// verify otp
userRouter.post("/otp",isLogin, userController.verifyOtp)



// ==============================================================================================================================================================================================================================

// load user profile
userRouter.get("/myProfile", isBan, profileController.userProfile);

// load user profile
userRouter.get("/updateProfile", isBan, profileController.loadupdateProfile);

// update user profile
userRouter.patch("/updateProfile", isBan, profileController.updateProfile);

// change password
userRouter.get("/changePassword", isBan, profileController.loadChangePassword);

// update password
userRouter.post("/updatePassword", isBan, profileController.updatePassword);



// load user address
userRouter.get("/useraddress", isBan, profileController.loaduserAddress);


// load add user address
userRouter.get("/addAddress", isBan, profileController.loadAddAddress);

//  add address
userRouter.post("/addAddress", isBan, profileController.addAddress);

// load edit address
userRouter.get("/editAddress", isBan, profileController.loadEditAddress);

// load update address
userRouter.post("/editAddress", isBan, profileController.updateAddress);

//  delete address
userRouter.delete("/deleteAddress", isBan, profileController.deleteAddress);

// ==============================================================================================================================================================================================================================

// wallet controller
userRouter.get("/wallet",isBan,walletController.loadWallet) 

// cart

// load cart route
userRouter.get('/cart', isBan, cartController.loadCart);

// add cart route
userRouter.post('/cart', isBan, cartController.addcart);

// update cart route
userRouter.post('/update', isBan, cartController.updateCart)

// cart delete
userRouter.delete('/cartDelete', isBan, cartController.deleteCart)

// load checkout
userRouter.get('/checkout', isBan, cartController.loadCheckout)


userRouter.post("/checkout", userController.buyNow)

userRouter.post('/paypal/success',userController.paypalSuccess)

userRouter.get('/orderCancel', orderController.orderCancel)


// load whishlist
userRouter.get('/whishList',userController.loadWhishList)

userRouter.post('/whishList',userController.addWhishList)

// load delete whishlist
userRouter.delete('/removeWhishlist',userController.deleteWhishlist)


// show coupon user side

userRouter.get('/showCoupon',couponController.getAvailableCoupons)

// apply coupon
userRouter.post('/applyCoupon',couponController.applyCoupon)

// cancel coupon 
userRouter.post('/remove-coupon',couponController.removeCoupon)
// ==============================================================================================================================================================================================================================


// pages routing section 




userRouter.get("/shop", userController.loadShop);

// shop search route
userRouter.get("/search", userController.searchProducts)

// shop-category route
userRouter.get("/shop-Category/:cat", isBan, userController.loadShopCategory);



// contact route
userRouter.get("/productBan", isBan, userController.loadBanProduct);

// contact route
userRouter.get("/contact", isBan, userController.loadContact);

// logout route 
userRouter.get("/logout", userController.logOut);

// product view
userRouter.get('/product_view/:product_id', isBan, userController.loadProductView)


userRouter.post("/checkout", isBan,userController.buyNow)

userRouter.get("/orderPlace", userController.loadOrderPlaced)

// Add this new route
userRouter.get("/shop/filter", userController.filterProducts);

// Order details route
userRouter.get('/orderdetails/:orderId', profileController.getOrderDetails);

// return order details
userRouter.post('/request-return',isBan,orderController.requestReturn)

// Cancel order route
userRouter.get('/orderCancel/:orderId', isBan, orderController.orderCancel);






// google auth

userRouter.get('/auth/google', isLogin,
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

// Google callback route
userRouter.get('/auth/google/callback', isLogin,
    passport.authenticate('google', {
        failureRedirect: '/user/signup'
    }), userController.googleLogin
);


// 404

userRouter.get('*', (req, res) => {
    try {
        res.render('userError')
    } catch (err) {
        console.log(err.message)
    }
})




module.exports = userRouter;

