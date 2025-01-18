const express = require('express');
const config = require('../config/config');
const adminAuth = require('../middlewares/adminAuth');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require("../controllers/productController");
const adminRouter = express.Router();
const multer = require('../config/multer')





// admin login
adminRouter.get("/login",adminAuth.isLogout, adminController.loadLogin);

// admin dash load
adminRouter.post("/login", adminController.loadDash);

// admin dashboard
adminRouter.get("/dashboard",adminAuth.isLogin,adminAuth.verifyAdmin,adminController.dashboad);

// load user management
adminRouter.get('/user-managment', adminController.loadusermanagment)

// // route for block the user 
// adminRouter.patch("/admin/user-management/:userId/block",adminController.blockUser)

// // route for unblock the user 
// adminRouter.post("/admin/user-management/:userId/unblock",adminController.unBlockUser)

// block route
adminRouter.patch("/admin/users/toggle/:userId/:action", adminController.toggleUserAccess);




    


// load category admin management
adminRouter.get('/categoryManagement',adminAuth.isLogin,categoryController.loadCategory)

// load add category 
adminRouter.get("/addcategory",adminAuth.isLogin,categoryController.loadAddCategory)

// add category
adminRouter.post("/addcategory",adminAuth.isLogin,categoryController.addCategory)

// edit category
adminRouter.post("/editcategory",adminAuth.isLogin,categoryController.EditCategory)

// updated category
adminRouter.post("/updatecategory",adminAuth.isLogin,categoryController.updateCategory)

// soft delete categories
adminRouter.patch("/deletecategory/:categoryid",adminAuth.isLogin,categoryController.deleteCategory)





 



// load admin product management
adminRouter.get('/productManagement',adminAuth.isLogin, productController.loadProducts)

// load add product
adminRouter.get("/addProduct",adminAuth.isLogin,productController.loadAddProducts)

// add product
adminRouter.post("/addproduct", multer.upload.array('images', 3),productController.addProducts)


// load overview product 
adminRouter.get("/productView/:productid",adminAuth.isLogin,productController.loadProductView)

// load edit product
adminRouter.get("/editProduct/:productid",adminAuth.isLogin,productController.loadEditProduct)

// update product
adminRouter.post("/editProduct/:productid",adminAuth.isLogin,productController.editProduct)

// soft delete products
adminRouter.patch('/deleteProduct/:productId',adminAuth.isLogin,productController.deleteProduct)









// logout route
adminRouter.get("/logout",adminAuth.isLogin,adminController.logout);





module.exports = adminRouter