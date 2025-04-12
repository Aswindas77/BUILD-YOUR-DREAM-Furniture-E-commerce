const express = require('express');
const config = require('../config/config');
const adminAuth = require('../middlewares/adminAuth');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require("../controllers/productController");
const orderController = require("../controllers/ordersController");
const couponController = require("../controllers/couponController");
const salesController = require("../controllers/salesController")
const adminRouter = express.Router();







// admin login
adminRouter.get("/login", adminAuth.isLogout, adminController.loadLogin);

// admin dash load
adminRouter.post("/login", adminController.loadDash);

// admin dashboard
adminRouter.get("/dashboard", adminAuth.isLogin, adminAuth.verifyAdmin, adminController.loadDashboard);

// load user management
adminRouter.get('/user-managment',adminAuth.isLogin, adminController.loadusermanagment)



// block ||unblock  route
adminRouter.patch("/admin/toggle/:userId/:action", adminAuth.isLogin,adminController.toggleBlockAccess);







// load category admin management
adminRouter.get('/categoryManagement',adminAuth.isLogin, adminAuth.isLogin, categoryController.loadCategory)

// load add category 
adminRouter.get("/addcategory", adminAuth.isLogin,adminAuth.isLogin, categoryController.loadAddCategory)

// add category
adminRouter.post("/addcategory", adminAuth.isLogin,adminAuth.isLogin, categoryController.addCategory)

// edit category
adminRouter.post("/editcategory", adminAuth.isLogin,adminAuth.isLogin, categoryController.EditCategory)

// updated category
adminRouter.post("/updatecategory", adminAuth.isLogin,adminAuth.isLogin, categoryController.updateCategory)

// soft delete categories
adminRouter.patch("/deletecategory/:categoryid", adminAuth.isLogin,adminAuth.isLogin, categoryController.deleteCategory)

// list || unlist route
adminRouter.patch("/admin/list/:categoryId/:action", adminAuth.isLogin,categoryController.toggleListCategory);

// sales report 

adminRouter.get('/salesReport', adminAuth.isLogin, salesController.loadSalesReport)







// load admin product management
adminRouter.get('/productManagement', adminAuth.isLogin, productController.loadProducts)

// load add product
adminRouter.get("/addProduct", adminAuth.isLogin, productController.loadAddProducts)

// add product
adminRouter.post("/addproduct", adminAuth.isLogin, productController.addProducts)


// load overview product 
adminRouter.get("/productView/:productid", adminAuth.isLogin, adminAuth.isLogin, productController.loadProductView)

// load edit product
adminRouter.get("/editProduct", adminAuth.isLogin, productController.loadEditProduct)

// update product
adminRouter.post("/editProduct", adminAuth.isLogin, productController.editProduct)

adminRouter.post("/updateProduct", adminAuth.isLogin, productController.updateProduct)

// soft delete products
adminRouter.patch('/deleteProduct/:productId', adminAuth.isLogin, productController.deleteProduct)

// product list || unlist route

adminRouter.patch("/admin/product/:productId/:action", adminAuth.isLogin,productController.toggleListProduct);



// admin order management

adminRouter.get("/orderManagement", adminAuth.isLogin, orderController.loadOrderPage)

adminRouter.get("/orderView/:orderId", adminAuth.isLogin, orderController.loadOrderView)

// Order management routes

adminRouter.post('/update-order-status', orderController.updateOrderStatus);






// load coupon management

adminRouter.get('/coupon', adminAuth.isLogin,couponController.loadCoupon);

//add coupon 
adminRouter.post('/addCoupon', adminAuth.isLogin,couponController.addCoupon);

// edit coupon
adminRouter.get('/editCoupon/:id', adminAuth.isLogin,couponController.editCoupon);

// update coupon
adminRouter.put('/updateCoupon/:id', adminAuth.isLogin,couponController.updateCoupon);

// delete coupon
adminRouter.delete('/deleteCoupon/:id', couponController.deleteCoupon);



// return order management
adminRouter.get('/returnOrders', adminAuth.isLogin,orderController.loadReturnOrder)

// update return status
adminRouter.put('/updateReturnStatus/:returnId', adminAuth.isLogin,orderController.updateReturnStatus);




// logout route
adminRouter.get("/logout",  adminController.logout);


adminRouter.get('/orders/:period', adminController.getOrdersByPeriod);

// Add graph data endpoint
adminRouter.get('/graph-data', adminAuth.isLogin, adminController.getGraphData);

// Add sales data endpoint
adminRouter.get('/sales-data/:period', adminAuth.isLogin, adminController.getSalesDataByPeriod);

// Dashboard analytics route
adminRouter.get('/dashboard/analytics/:period', adminAuth.isLogin, adminController.getAnalytics);






module.exports = adminRouter