
const Categories = require("../models/categoryModel");
const product = require("../models/productModel");
const fs = require("fs");
const path = require("path");




// load category page

//====================================================================================================================================================

const loadCategory = async (req, res) => {
  try {
    const SearchQuery = req.query.search ||"";
    const isAjax =req.headers["x-requested-with"]==="XMLhttpRequest";

    let categories = await Categories.find({
      isDeleted:false,
      name:{ $regex :SearchQuery , $options:'i'},
    });
    if(isAjax){
      return res.json({success:true,categories});
    }


    res.render("categoryManagement", { categories });


  } catch (err) {
    console.error("Error in loadCategory:", err.message);

    if (req.headers["x-requested-with"] === "XMLHttpRequest") {
      return res.json({ success: false, message: "Error loading categories" });
    }
    res.render("categoryManagement", { categories: [] });
  }
}

//====================================================================================================================================================


// load Addcategory page

//====================================================================================================================================================

const loadAddCategory = async (req, res) => {
  try {

    res.render("addCategory")
  } catch (error) {
    console.log(error.message)
  }
}

//====================================================================================================================================================


// add category

//====================================================================================================================================================

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body
    console.log(name, description)

    const existingCategory = await Categories.findOne({name:{$regex: new RegExp("^" + name + "$", "i")}
  });
    
    if(existingCategory){
      return res.status(400).json({message:'Category already exists!'})
    }
    const category = new Categories({
      name,
      description,
    })
    await category.save();
    
    return res.status(200).json({ message: 'Category added successfully!' });
    
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

//====================================================================================================================================================


//load edit category

//====================================================================================================================================================

const loadEditCategory = async (req, res) => {
  try {
    
    res.render("editCategory")
  } catch (error) {
    console.log(error.message)
  }
}

//====================================================================================================================================================
 

// edit category

//====================================================================================================================================================

const EditCategory = async (req, res) => {
  try {
    const categoryId = req.body.id;

    const category = await Categories.findById(categoryId)

    if (!category) return res.send("category not found")

    res.render("editCategory", { category })

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
    // Extracting values from req.body
    const { name, description, id } = req.body;
    console.log(req.body)

    // Updating the category in the database
    const updatedCategory = await Categories.findByIdAndUpdate(
      id,
      { name, description },
      { new: true } // Return the updated document
    );

    if (!updatedCategory) {
      throw new Error("Category not found.");
    }

    console.log("Updated Category:", updatedCategory);

    res.redirect("/admin/categoryManagement");
  } catch (error) {
    console.log(error.message);
    res.redirect("dashboard");
  }
}; 

 
//====================================================================================================================================================

// soft delete 

const deleteCategory = async (req,res)=>{
  try {
    const categoryId =req.params.categoryid;
    
     const softdelete = await Categories.findByIdAndUpdate(
          categoryId,
          {isDeleted:true},
          {new:true}
          
        );
        if(!softdelete){
          throw new Error("Category not found.");
        }
        return res.status(200).json({ success: true, message: "Category deleted successfully." });

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({ success: false, message: "An error occurred." });
  }
}



















//!  category info 
// const categoryInfo = async (req,res)=>{
//     try{
//         const page = parseInt(req.query.page) || 1;
//         const limit = 3;
//         const skip = (page-1)*limit;

//         const categoryData = await Category.find({}) 
//         .sort({createdAt:-1})
//         .skip(skip)
//         .limit(limit);

//        const totalCategories = await Category.countDocuments();
//        const totalPages = Math.ceil(totalCategories/limit);
//        res.render("category",{
//         cat:categoryData,
//         currentPage:page,
//         totalPages:totalPages,
//         totalCategories:totalCategories

//        });
//     }catch(error){
//         console.error(error.message);

//     }
// }




// !add category 

// const addCategory = async (req,res) =>{
//     try {
//         const existingCategory = await Category.findOne({name});
//         if(existingCategory){
//             return res.status(400).json({error:"cat already exists"})
//         } 

//         const newCategory = new Category({
//             name,
//             description,
//         })

//         await newCategory.save()
//         return res.json({message:"category added successfully"})



//     } catch (error) {
//         console.error(error)
//     }
// }



module.exports = {
  loadCategory,
  loadAddCategory,
  addCategory,
  loadEditCategory,
  EditCategory,
  updateCategory,
  deleteCategory,


}