const Products = require("../models/productModel");
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Categories = require("../models/categoryModel");
const { log } = require("console");
const Category = require("../models/categoryModel");
const { updateCategory } = require("./categoryController");





// load product page

//====================================================================================================================================================

const loadProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4; 
    const skip = (page - 1) * limit;

    
    const totalProducts = await Products.countDocuments({ isDeleted: false });

    
    const products = await Products.find({ isDeleted: false })
      .populate('category', 'name description')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    
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


// load product view

//====================================================================================================================================================

const loadProductView = async (req, res) => {

  try {
    const productId = req.params.productid


    const product = await Products.findOne({ _id: productId, isListed: false, isDeleted: false })

    const category = await Categories.findOne({ _id: product.category })
    console.log(category);


    res.render("productView", { product, categoryname: category.name })
  } catch (error) {
    console.log(error.message)
  }
}

 
// load product page

//====================================================================================================================================================

const loadAddProducts = async (req, res) => {
  try {
    const categories = await Categories.find({ isDeleted: false })
    res.render('addProduct', { categories })
  }
  catch (err) {
    console.log(err);
  }
}



// add product page

//====================================================================================================================================================

const addProducts = async (req, res) => {
  try {
   
    const newProduct = await Products.create(req.body);
    console.log(newProduct);

    
    const dirPath = `./public/uploads/products/${newProduct._id}`;
    fs.mkdirSync(dirPath, { recursive: true });

    
    const imgArray = [req.body.image0, req.body.image1, req.body.image2];
    const imagePaths = [];

    imgArray.forEach((img, index) => {
      if (img) {
        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
        const binary = Buffer.from(base64Data, "base64");
        const filePath = `${dirPath}/image${index}.png`;

        fs.writeFile(filePath, binary, (er) => {
          if (er) {
            console.log(er);
          }
        });

        imagePaths.push(`/public/uploads/products/${newProduct._id}/image${index}.png`);
      }
    });

    newProduct.images = imagePaths;

    await newProduct.save();

    res.status(201).redirect("/admin/productManagement");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Error adding product");
  }
};


// load edit product

//====================================================================================================================================================

const loadEditProduct = async (req, res) => {
  try {
    res.render("editproduct")

  } catch (error) {
    console.log(error.message)
  }

}


// edit product 

//====================================================================================================================================================

const editProduct = async (req, res) => {

  try {

    const productId = req.body.id;

    const product = await Products.findById(productId)
    const categories = await Categories.find({ isDeleted: false })

    if (!product) return res.send("product not found")

    res.render("editproduct", { product, categories })

  } catch (error) {
    console.log(error.message);
    res.redirect("/admin/productManagement");
  }

}


// update product

//====================================================================================================================================================

const updateProduct = async (req, res) => {
  console.log('Updating product...');
  try {

    const { id, name, description, salesPrice, category, productOffer, stock, status } = req.body;

    
    const images = [req.body?.image0, req.body?.image1, req.body?.image2];

    
    const dirPath = `./public/uploads/products/${id}`;
    fs.mkdirSync(dirPath, { recursive: true });

    const imagep = [];
    images.forEach((img, index) => {
      if (img && img !== 'undefined') {
       
        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
        const binary = Buffer.from(base64Data, "base64");
        const filePath = `${dirPath}/image${index}.png`;

       
        fs.writeFile(filePath, binary, (er) => {
          if (er) console.log('Error writing image:', er);
        });

        imagep[index] = `/public/uploads/products/${id}/image${index}.png`;
      } else {
        imagep[index] = null;
      }
    });

    for (let i = 0; i < images.length; i++) {
      if (imagep[i] !== null) {
        await Products.updateOne(
          { _id: id },
          { $set: { [`images.${i}`]: imagep[i] } }
        );
      }
    }

    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      { name, description, salesPrice, category, productOffer, stock, status },
      { new: true } 
    );

    console.log('Product updated successfully:', updatedProduct);
    res.redirect("/admin/productManagement");

  } catch (error) {
    console.error('Error updating product:', error);
    res.redirect("/admin/productManagement");
  }
};

//  delete product 

//====================================================================================================================================================

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

//====================================================================================================================================================

const toggleListProduct = async (req, res) => {
  try {
    const { productId, action } = req.params;
    console.log("blaaaaaaaaaaaaaaaaaaaaaaaaaaa", productId);

    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log("Invalid userId:", productId);
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    
    if (!["block", "unblock"].includes(action)) {
      console.log("Invalid action:", action);
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'listed' or 'unlisted'."
      });
    }

    const isListed = action === 'block';

    
    const updateProduct = await Products.findByIdAndUpdate(
      productId,
      { isListed },
      { new: true, runValidators: true }
    );

    
    if (!updateProduct) {
      console.log("Category not found in database for ID:", productId);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    console.log("User updated successfully:", updateProduct);

   
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