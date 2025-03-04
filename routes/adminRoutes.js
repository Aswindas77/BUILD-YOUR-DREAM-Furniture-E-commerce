const express = require('express');
const config = require('../config/config');
const adminAuth = require('../middlewares/adminAuth');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require("../controllers/productController");
const orderController = require("../controllers/ordersController");
const couponController = require("../controllers/couponController");
const adminRouter = express.Router();







// admin login
adminRouter.get("/login", adminAuth.isLogout, adminController.loadLogin);

// admin dash load
adminRouter.post("/login", adminController.loadDash);

// admin dashboard
adminRouter.get("/dashboard", adminAuth.isLogin, adminAuth.verifyAdmin, adminController.loadDashboard);

// load user management
adminRouter.get('/user-managment', adminController.loadusermanagment)



// block ||unblock  route
adminRouter.patch("/admin/toggle/:userId/:action", adminController.toggleBlockAccess);







// load category admin management
adminRouter.get('/categoryManagement', adminAuth.isLogin, categoryController.loadCategory)

// load add category 
adminRouter.get("/addcategory", adminAuth.isLogin, categoryController.loadAddCategory)

// add category
adminRouter.post("/addcategory", adminAuth.isLogin, categoryController.addCategory)

// edit category
adminRouter.post("/editcategory", adminAuth.isLogin, categoryController.EditCategory)

// updated category
adminRouter.post("/updatecategory", adminAuth.isLogin, categoryController.updateCategory)

// soft delete categories
adminRouter.patch("/deletecategory/:categoryid", adminAuth.isLogin, categoryController.deleteCategory)

// list || unlist route
adminRouter.patch("/admin/list/:categoryId/:action", categoryController.toggleListCategory);


// adminRouter.get("/export-sales-report", adminAuth, adminController.generateSalesReportPDF);








// load admin product management
adminRouter.get('/productManagement', adminAuth.isLogin, productController.loadProducts)

// load add product
adminRouter.get("/addProduct", adminAuth.isLogin, productController.loadAddProducts)

// add product
adminRouter.post("/addproduct", productController.addProducts)


// load overview product 
adminRouter.get("/productView/:productid", adminAuth.isLogin, productController.loadProductView)

// load edit product
adminRouter.get("/editProduct", adminAuth.isLogin, productController.loadEditProduct)

// update product
adminRouter.post("/editProduct", adminAuth.isLogin, productController.editProduct)

adminRouter.post("/updateProduct", adminAuth.isLogin, productController.updateProduct)

// soft delete products
adminRouter.patch('/deleteProduct/:productId', adminAuth.isLogin, productController.deleteProduct)

// product list || unlist route

adminRouter.patch("/admin/product/:productId/:action", productController.toggleListProduct);



// admin order management

adminRouter.get("/orderManagement", adminAuth.isLogin, orderController.loadOrderPage)

// Order management routes

adminRouter.post('/update-order-status', orderController.updateOrderStatus);






// load coupon management

adminRouter.get('/coupon', couponController.loadCoupon);

//add coupon 
adminRouter.post('/addCoupon', couponController.addCoupon);

// edit coupon
adminRouter.get('/editCoupon/:id', couponController.editCoupon);

// update coupon
adminRouter.put('/updateCoupon/:id', couponController.updateCoupon);

// delete coupon
adminRouter.delete('/deleteCoupon/:id', couponController.deleteCoupon);



// return order management
adminRouter.get('/returnOrders', orderController.loadReturnOrder)

// update return status
adminRouter.put('/updateReturnStatus/:returnId', orderController.updateReturnStatus);




// logout route
adminRouter.get("/logout", adminAuth.isLogin, adminController.logout);


adminRouter.get('/orders/:period', adminController.getOrdersByPeriod);






module.exports = adminRouter