const express = require('express');
const session = require("express-session");
const config = require("../config/config");
const { isLogin, isBan, payment } = require("../middlewares/userAuth")
const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController.js");
const profileController = require("../controllers/profileController.js");
const userRouter = express.Router();
const multer = require('../config/multer.js');
const googleAuth = require('../middlewares/googleAuth.js');

const passport = require('../middlewares/googleAuth.js');

const {productStock} =require("../middlewares/products");

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

 
 
userRouter.get("/", isBan, userController.loadHome);

userRouter.get("/login", isLogin, userController.loadLogin);

userRouter.post("/login", isLogin, userController.verifyUser);


userRouter.get("/forgot", isLogin, userController.ForgotPassword);

userRouter.post("/forgot", isLogin, userController.genOtpForgotPass);

 

userRouter.get("/changePassword", isLogin, userController.changePassword)

userRouter.post("/changePassword", isLogin, userController.verifyChangePassword)

userRouter.get("/register", isLogin, userController.loadSingUp);


userRouter.post("/register", isLogin, userController.registration);

userRouter.get('/otp', isLogin, userController.loadOtp);

userRouter.get('/resendOtp', isLogin, userController.resendOtp)

userRouter.post("/otp", isLogin, userController.verifyOtp)

userRouter.post('/passOtp',isLogin,userController.verifyOtpPassword)


// ==============================================================================================================================================================================================================================

userRouter.get("/myProfile", isBan, profileController.userProfile);

userRouter.get("/updateProfile", isBan, profileController.loadupdateProfile);

userRouter.patch("/updateProfile", isBan, profileController.updateProfile);

userRouter.get("/changePassword", isBan, profileController.loadChangePassword);

userRouter.post("/updatePassword", isBan, profileController.updatePassword);



userRouter.get("/useraddress", isBan, profileController.loaduserAddress);


userRouter.get("/addAddress", isBan, profileController.loadAddAddress);


userRouter.post("/addAddress", isBan, profileController.addAddress);


userRouter.get("/editAddress", isBan, profileController.loadEditAddress);


userRouter.post("/editAddress", isBan, profileController.updateAddress);


userRouter.delete("/deleteAddress", isBan, profileController.deleteAddress);


userRouter.post('/checkoutAddAddress', userController.addAddressCheckout); 

// ==============================================================================================================================================================================================================================


userRouter.get("/wallet", isBan, walletController.loadWallet)

userRouter.post('/add-money-wallet', isBan, walletController.addMoneyWallet)


userRouter.get('/cart', isBan, cartController.loadCart);


userRouter.post('/cart', isBan, cartController.addcart);

userRouter.post('/proceedCheckout',isBan,cartController.proceedCheckout)

userRouter.get('/checkout-page', isBan,cartController.renderCheckoutPage)


userRouter.post('/update', isBan, cartController.updateCart)
 

userRouter.delete('/cartDelete', isBan, cartController.deleteCart)


userRouter.post('/loadcheckout', isBan,cartController.loadCheckout)


userRouter.post("/checkout", userController.buyNow)

userRouter.post('/paypal/success', userController.paypalSuccess)

userRouter.post('/orderCancel/:orderId', orderController.orderCancel)



userRouter.get('/whishList', userController.loadWhishList)

userRouter.post('/whishList', userController.addWhishList)


userRouter.delete('/removeWhishlist', userController.deleteWhishlist)




userRouter.get('/showCoupon', couponController.getAvailableCoupons)


userRouter.post('/applyCoupon', couponController.applyCoupon)


userRouter.post('/remove-coupon', couponController.removeCoupon)
// ==============================================================================================================================================================================================================================





userRouter.get('/shop', userController.loadShop);

userRouter.get("/search", userController.searchProducts)


userRouter.get("/shop-Category/:cat", isBan, userController.loadShopCategory);




userRouter.get("/productBan", isBan, userController.loadBanProduct);


userRouter.get("/contact", isBan, userController.loadContact);


userRouter.get("/logout", userController.logOut);


userRouter.get('/product_view/:product_id', isBan, userController.loadProductView);

userRouter.post("/checkout", isBan, userController.buyNow);

userRouter.post("/createOrder", userController.createOrder);

userRouter.post("/verifyPayment", userController.verifyPayment); 

userRouter.post("/placePendingOrder", userController.placePendingOrder)

userRouter.get("/orderPlace", userController.loadOrderPlaced)


userRouter.get("/shop/filter", userController.filterProducts);


userRouter.get('/orderdetails/:orderId', profileController.getOrderDetails);

userRouter.post('/createRetryPayment/:orderId', isBan, orderController.createRetryPayment)


userRouter.post("/updateRetryPayment", isBan, orderController.retryPayment)


userRouter.post('/request-return', isBan, orderController.requestReturn)


userRouter.get('/orderCancel/:orderId', isBan, orderController.orderCancel);

userRouter.get('/orderInvoice/:orderId', isBan, orderController.generateInvoice);






userRouter.get("/auth/google", isLogin, passport.authenticate("google", { scope: ["profile", "email"] }));


userRouter.get('/auth/google/callback', isLogin,
    passport.authenticate('google', {
        failureRedirect: '/user/signup'
    }), userController.googleLogin
);




userRouter.get('*', (req, res) => {
    try {
        res.render('userError')
    } catch (err) {
        console.log(err.message)
    }
})




module.exports = userRouter;
