const Products = require("../models/productModel");
const multer = require("../config/multer")

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Module } = require("module");
const Categories = require("../models/categoryModel");
const { log } = require("console");
const Category = require("../models/categoryModel");





//====================================================================================================================================================

const loadProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number, default is 1
    const limit = 4; // Number of products per page
    const skip = (page - 1) * limit;

    // Fetch total product count for pagination
    const totalProducts = await Products.countDocuments({ isDeleted: false });

    // Fetch products for the current page
    const products = await Products.find({ isDeleted: false })
      .populate('category', 'name description')
      .skip(skip)
      .limit(limit);

    // Calculate total pages 
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("productManagement", {
      products,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading products");
  }
};

//====================================================================================================================================================



// load product page

//====================================================================================================================================================

const loadAddProducts = async (req, res) => {
  try {
    const categories = await Categories.find({isDeleted:false})
    res.render('addProduct', { categories })
  }
  catch (err) {
    console.log(err);
  }
}

//====================================================================================================================================================


// add product page

//====================================================================================================================================================

const addProducts = async (req, res) => {
  try {
    const imgArray = [req.body.image0, req.body.image1, req.body.image2];
    const dirPath = `./public/uploads/products/${req.body.name}`;
    console.log(imgArray);

    // Create directory for product images
    fs.mkdirSync(dirPath, { recursive: true });

    const imagePaths = [];

    // Process images and save to folder
    imgArray.forEach((img, index) => {
      if (img) {
        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
        const binary = Buffer.from(base64Data, "base64");
        const filePath = `${dirPath}/image${index}.png`;
        fs.writeFile(filePath, binary, (er) => {
          console.log(er);

        });
        imagePaths.push(`/public/uploads/products/${req.body.name}/image${index}.png`);
      }
    });

    // Add product to database
    req.body.images = imagePaths; // Assign processed image paths to `images`
    const newProduct = await Products.create(req.body);
    res.status(201).redirect("/admin/productManagement");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Error adding product");
  }
};







//====================================================================================================================================================


// product view

const loadProductView = async (req, res) => {

  try {
    const productId = req.params.productid
    const category = await Categories.find({})

    const product = await Products.findOne({ _id: productId })



    res.render("productView", { product, category })
  } catch (error) {
    console.log(error.message)
  }
}


// load edit product

const loadEditProduct = async (req, res) => {
  try {
    res.render("editproduct")

  } catch (error) {
    console.log(error.message)
  }

}


// edit product 

const editProduct = async (req, res) => {

  try {

    const productId = req.body.id;

    const product = await Products.findById(productId)

    if (!product) return res.send("category not found")

    res.render("editproduct", { product })




  } catch (error) {
    console.log(error.message);
    res.redirect("/admin/productManagement");
  }

}


// update product
const updateProduct = async (req, res) => {
  try {

    const { name, description, salesPrice, productOffer, stock, status } = req.body;
    console.log(req.body);


    const id = name[0]
    const namee = name[1]
    await Products.findByIdAndUpdate
      (
        id,
        { name: namee, description, salesPrice, category: 'huhuhu', productOffer, stock, status }

      );



    res.redirect("/admin/productManagement");


  } catch (error) {
    console.error(error.message)
    res.redirect("/admin/productManagement");
  }
}

//  delete product 

const deleteProduct = async (req, res) => {
  try {

    const productId = req.params.productId
    console.log(productId)

    const softdelete = await Products.findByIdAndUpdate(
      productId,
      { isDeleted: true },
      { new: true }

    );
    if (!softdelete) {
      throw new Error("Category not found.");
    }

    return res.status(200).json({ message: "Product successfully marked as deleted." });

  } catch (error) {
    console.log(error.message);

  }
}


// product list || unlist

const toggleListProduct = async (req, res) => {
  try {
    const { productId, action } = req.params;
    console.log("blaaaaaaaaaaaaaaaaaaaaaaaaaaa", productId);

    // Validate category
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log("Invalid userId:", productId);
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    // Validate action
    if (!["block", "unblock"].includes(action)) {
      console.log("Invalid action:", action);
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'listed' or 'unlisted'."
      });
    }

    const isListed = action === 'block';

    // Update category and get updated document
    const updateProduct = await Products.findByIdAndUpdate(
      productId,
      { isListed },
      { new: true, runValidators: true }
    );

    // Check if user exists
    if (!updateProduct) {
      console.log("Category not found in database for ID:", productId);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    console.log("User updated successfully:", updateProduct);

    // Send success response
    return res.status(200).json({
      success: true,
      message: `Product list ${action}ed successfully`,
      isListed: updateProduct.isListed
    });

  } catch (error) {
    console.error("Error in toggleListAccess:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating user status"
    });
  }
}













module.exports = {
  loadProducts,
  loadAddProducts,
  addProducts,
  loadProductView,
  loadEditProduct,
  editProduct,
  updateProduct,
  deleteProduct,
  toggleListProduct,



}