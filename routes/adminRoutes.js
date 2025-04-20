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








adminRouter.get("/login", adminAuth.isLogout, adminController.loadLogin);


adminRouter.post("/login", adminAuth.isLogout, adminController.verifyAdmin);


adminRouter.get("/dashboard", adminAuth.isLogin, adminAuth.verifyAdmin, adminController.loadDashboard);


adminRouter.get('/user-managment', adminAuth.isLogin, adminController.loadusermanagment)



adminRouter.patch("/admin/toggle/:userId/:action", adminAuth.isLogin, adminController.toggleBlockAccess);







adminRouter.get('/categoryManagement', adminAuth.isLogin, adminAuth.isLogin, categoryController.loadCategory)

adminRouter.get("/addcategory", adminAuth.isLogin, adminAuth.isLogin, categoryController.loadAddCategory)

adminRouter.post("/addcategory", adminAuth.isLogin, adminAuth.isLogin, categoryController.addCategory)

adminRouter.post("/editcategory", adminAuth.isLogin, adminAuth.isLogin, categoryController.EditCategory)

adminRouter.post("/updatecategory", adminAuth.isLogin, adminAuth.isLogin, categoryController.updateCategory)

adminRouter.patch("/deletecategory/:categoryid", adminAuth.isLogin, adminAuth.isLogin, categoryController.deleteCategory)

adminRouter.patch("/admin/list/:categoryId/:action", adminAuth.isLogin, categoryController.toggleListCategory);


adminRouter.get('/salesReport', adminAuth.isLogin, salesController.loadSalesReport)







adminRouter.get('/productManagement', adminAuth.isLogin, productController.loadProducts)

adminRouter.get("/addProduct", adminAuth.isLogin, productController.loadAddProducts)

adminRouter.post("/addproduct", adminAuth.isLogin, productController.addProducts)

adminRouter.get("/productView/:productid", adminAuth.isLogin, adminAuth.isLogin, productController.loadProductView)

adminRouter.get("/editProduct", adminAuth.isLogin, productController.loadEditProduct)

adminRouter.post("/editProduct", adminAuth.isLogin, productController.editProduct)

adminRouter.post("/updateProduct", adminAuth.isLogin, productController.updateProduct)

adminRouter.patch('/deleteProduct/:productId', adminAuth.isLogin, productController.deleteProduct)


adminRouter.patch("/admin/product/:productId/:action", adminAuth.isLogin, productController.toggleListProduct);




adminRouter.get("/orderManagement", adminAuth.isLogin, orderController.loadOrderPage)

adminRouter.get("/orderView/:orderId", adminAuth.isLogin, orderController.loadOrderView)


adminRouter.post('/update-order-status', orderController.updateOrderStatus);








adminRouter.get('/coupon', adminAuth.isLogin, couponController.loadCoupon);

adminRouter.post('/addCoupon', adminAuth.isLogin, couponController.addCoupon);

adminRouter.get('/editCoupon/:id', adminAuth.isLogin, couponController.editCoupon);

adminRouter.put('/updateCoupon/:id', adminAuth.isLogin, couponController.updateCoupon);

adminRouter.delete('/deleteCoupon/:id', couponController.deleteCoupon);



adminRouter.get('/returnOrders', adminAuth.isLogin, orderController.loadReturnOrder)

adminRouter.put('/updateReturnStatus/:returnId', adminAuth.isLogin, orderController.updateReturnStatus);




adminRouter.get("/logout", adminController.logout);


adminRouter.get('/orders/:period', adminController.getOrdersByPeriod);

adminRouter.post('/ordersCustom', adminAuth.isLogin, adminController.getOrdersByCustomRange);

adminRouter.get('/graph-data', adminAuth.isLogin, adminController.getGraphData);

adminRouter.get('/sales-data/:period', adminAuth.isLogin, adminController.getSalesDataByPeriod);

adminRouter.get('/dashboard/analytics/:period', adminAuth.isLogin, adminController.getAnalytics);






module.exports = adminRouter