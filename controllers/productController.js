const Products = require("../models/productModel");
const multer = require("../config/multer")

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Module } = require("module");
const Categories = require("../models/categoryModel");
const { log } = require("console");




// load product page

//====================================================================================================================================================

const loadProducts = async (req, res) => {
  try {
    const products = await Products.find({ isDeleted: false }).populate('category', 'name description');
    console.log(products)
    res.render("productManagement", { products })
  } catch (err) {
    console.log(err);
  }
}

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
    const { name, description, category, salesPrice, productOffer, stock, status, } = req.body



    let images = req.files.map(file => "/public/uploads/products/" + file.filename);
    // add product
    const addProduct = new Products({
      name,
      description,
      category,
      salesPrice,
      productOffer,
      stock,
      status,
      images,

    })
    console.log("added product:", addProduct)
    await addProduct.save()
    res.redirect("/admin/productManagement");
  } catch (err) {
    console.log(err);
  }
}







//====================================================================================================================================================


// product view

const loadProductView = async (req, res) => {

  try {
    const productId = req.params.productid

    const product = await Products.findOne({ _id: productId })
    

    res.render("productView", { product })
  } catch (error) {
    console.log(error.message)
  }
}


// load edit product

const loadEditProduct = async (req, res) => {
  try {
    const productId = req.params.productid
    console.log(productId)

    const product = await Products.findOne({ _id: productId })
      .select('name description productOffer category salesPrice stock images')
      .populate('category', 'name description')
      .lean();

    if (!product) return res.send("category not found")

    res.render("editProduct", { product })

  } catch (error) {
    console.log(error.message)
  }

}


// edit product 

const editProduct = async (req, res) => {

  try {

    const { name, description, category, salesPrice, productOffer, stock, status } = req.body

    

    const productId = req.params.productid;


    const updateproduct = await Products.findByIdAndUpdate(
      productId,
      { name, description, salesPrice, category, productOffer, stock, status },
      { new: true }

    );
    if (!updateproduct) {
      throw new Error("Category not found.");
    }

    console.log("updated products :======= :", updateproduct);
    console.log('Product ID:================:', req.params.productid);
    console.log('Update Data:==============::', req.body);
    console.log('Updating product with ID:===============:', productId);

    res.redirect("/admin/productManagement")

  } catch (error) {
    console.log(error.message);
    res.redirect("dashboard");
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














module.exports = {
  loadProducts,
  loadAddProducts,
  addProducts,
  loadProductView,
  loadEditProduct,
  editProduct,
  deleteProduct



}