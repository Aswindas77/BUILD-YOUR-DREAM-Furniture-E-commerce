const Categories = require("../models/categoryModel");
const product = require("../models/productModel");
const mongoose = require("mongoose");
const HttpStatus = require("../constants/httpStatus");
const Messages = require("../constants/messages.json");

// load category page

//====================================================================================================================================================

const loadCategory = async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    const totalCategories = await Categories.countDocuments({
      name: { $regex: searchQuery, $options: "i" },
      isDeleted: false,
    });

    const totalPages = Math.ceil(totalCategories / limit);

    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    const skip = (page - 1) * limit;

    const categories = await Categories.find({
      isDeleted: false,
      name: { $regex: searchQuery, $options: "i" },
    })
      .skip(skip)
      .limit(limit);

    res.render("categoryManagement", {
      categories,
      searchQuery,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error("Error in loadCategory:", err.message);
    res.render("categoryManagement", {
      categories: [],
      searchQuery: "",
      currentPage: 1,
      totalPages: 1,
    });
  }
};

//====================================================================================================================================================

// load Addcategory page

//====================================================================================================================================================

const loadAddCategory = async (req, res) => {
  try {
    res.render("addCategory");
  } catch (error) {
    console.error(error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

//====================================================================================================================================================

// add category

//====================================================================================================================================================

const addCategory = async (req, res) => {
  try {
    const { name, description, categoryOffer, minimumPrice, claimableAmount } =
      req.body;

    const changedName = name.trim().toLowerCase();

    console.log(changedName, description, "njjjjjjjjnnn");

    const existingCategory = await Categories.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") },
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists!" });
    }

    const category = new Categories({
      name: changedName,
      description: description,
      offerPercentage: categoryOffer,
      minimumPrice: minimumPrice,
      claimableAmount: claimableAmount,
    });

    await category.save();
    return res.status(200).json({ message: "Category added successfully!" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//====================================================================================================================================================

//load edit category

//====================================================================================================================================================

const loadEditCategory = async (req, res) => {
  try {
    res.render("editCategory");
  } catch (error) {
    console.log(error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

//====================================================================================================================================================

// edit category

//====================================================================================================================================================

const EditCategory = async (req, res) => {
  try {
    const categoryId = req.body.id;

    const category = await Categories.findById(categoryId);

    if (!category) return res.send("category not found");

    console.log("catname", category.name);
    console.log("discription", category.description);
    console.log("offerPercentage", category.offerPercentage);
    console.log("minimumPrice", category.minimumPrice);
    console.log("claimableAmount", category.claimableAmount);

    res.render("editCategory", { category });
  } catch (error) {
    console.log(error.message);
    res.redirect("/admin/categoryManagement");
  }
};

// ====================================================================================================================================================

//load edit category

//====================================================================================================================================================

const updateCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      id,
      categoryOffer,
      minimumPrice,
      claimableAmount,
    } = req.body;

    console.log(claimableAmount, minimumPrice, categoryOffer);

    const updatedCategory = await Categories.findByIdAndUpdate(
      id,
      {
        name,
        description,
        offerPercentage: categoryOffer,
        minimumPrice,
        claimableAmount,
      },
      { new: true }
    );

    if (!updatedCategory) {
      throw new Error("Category not found.");
    }

    console.log("Updated Category:", updatedCategory);

    res.redirect("/admin/categoryManagement");
  } catch (error) {
    console.log(error.message);
    res.redirect("/admin/categoryManagement");
  }
};

//====================================================================================================================================================

// soft delete

//====================================================================================================================================================

const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryid;

    const softdelete = await Categories.findByIdAndUpdate(
      categoryId,
      { isDeleted: true },
      { new: true }
    );
    if (!softdelete) {
      throw new Error("Category not found.");
    }
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Category deleted successfully." });
  } catch (error) {
    console.log(error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

// toggle list||unlist category

//====================================================================================================================================================

const toggleListCategory = async (req, res) => {
  try {
    const { categoryId, action } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.log("Invalid userId:", categoryId);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    if (!["block", "unblock"].includes(action)) {
      console.log("Invalid action:", action);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid action. Use 'listed' or 'unlisted'.",
      });
    }

    const isListed = action === "block";

    const updateCategory = await Categories.findByIdAndUpdate(
      categoryId,
      { isListed },
      { new: true, runValidators: true }
    );

    if (!updateCategory) {
      console.log("Category not found in database for ID:", categoryId);
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }
    console.log("User updated successfully:", updateCategory);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: `category list ${action}ed successfully`,
      isListed: updateCategory.isListed,
    });
  } catch (error) {
    console.error("Error in toggleListAccess:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

module.exports = {
  loadCategory,
  loadAddCategory,
  addCategory,
  loadEditCategory,
  EditCategory,
  updateCategory,
  deleteCategory,
  toggleListCategory,
};
