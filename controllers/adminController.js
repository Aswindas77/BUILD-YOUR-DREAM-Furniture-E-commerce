const adminData = require("../models/adminDataModel");
const userData = require('../models/userModel');
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');
const Order = require('../models/ordermodel');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const User = require('../models/userModel');
const Return = require('../models/returnModel');
const HttpStatus = require('../constants/httpStatus');
const Messages =require('../constants/messages.json')


 






// =================  admin verification =================================



// login page load // verify admin


//====================================================================================================================================================

const loadLogin = async (req, res) => {
  try { 
    const { email, password } = req.body;
    res.render("adminLogin", { emailError: "", passwordError: "", layout: false });
  } catch (err) {
    console.log(err.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};

// load dashboad

//====================================================================================================================================================

const loadDash = async (req, res) => {
  try {
    const { email, password } = req.body;



    const admin = await adminData.findOne({ email: email });
    if (!admin) {
      return res.status(HttpStatus.BAD_REQUEST).json({ emailError: "Admin not found!" });
    }


    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(HttpStatus.BAD_REQUEST).json({ passwordError: "Invalid password!" });
    }


    req.session.admin = admin;
    res.status(HttpStatus.OK).json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};

//====================================================================================================================================================




// ====================================================================================================================================================


//  load user management

//====================================================================================================================================================

const loadusermanagment = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const totalUsers = await userData.countDocuments();


    let users = await userData.find({}).skip(skip).limit(limit);


    const totalPages = Math.ceil(totalUsers / limit);



    res.render("userManagement", {
      users,
      currentPage: page,
      totalPages,

    });
  } catch (err) {
    console.error("Error in loadusermanagment:", err.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
}

//====================================================================================================================================================

// user block

//====================================================================================================================================================

const toggleBlockAccess = async (req, res) => {
  try {
    const { userId, action } = req.params;

    console.log("Toggle access request:", { userId, action });


    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid userId:", userId);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Validate action
    if (!["block", "unblock"].includes(action)) {
      console.log("Invalid action:", action);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid action. Use 'block' or 'unblock'."
      });
    }

    const isBlocked = action === 'block';

    // Update user and get updated document
    const updatedUser = await userData.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true, runValidators: true }
    );
    req.session.user

    // Check if user exists
    if (!updatedUser) {
      console.log("User not found in database for ID:", userId);
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("User updated successfully:", updatedUser);

    // Send success response
    return res.status(HttpStatus.OK).json({
      success: true,
      message: `User ${action}ed successfully`,
      isBlocked: updatedUser.isBlocked
    });

  } catch (err) {
    console.error("Error in toggleUserAccess:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};

// logout page

//====================================================================================================================================================

const logout = async (req, res) => {
  try {
    req.session.admin = null
    res.redirect("/admin/login");
  } catch (err) {
    console.log(err.message)
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });

  }
}

//====================================================================================================================================================






const getSalesData = async (startDate, endDate) => {
  try {
    const orders = await Order.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'Delivered'
    }).populate('items.productId');

    let totalOrders = orders.length;
    let totalRevenue = 0;
    let totalProductDiscount = 0;
    let totalProductCount = 0;

    orders.forEach(order => {
      totalRevenue += order.totalAmount || 0;

      order.items.forEach(item => {
        const product = item.productId;
        if (!product || !item.quantity) return;

        totalProductCount += item.quantity;

        const productPrice = typeof product.price === 'string'
          ? parseFloat(product.price.replace(/,/g, ''))
          : product.price;

        const offerPercentage = product.offer ? product.offer / 100 : 0;
        const discountAmount = productPrice * offerPercentage;
        totalProductDiscount += discountAmount * item.quantity;
      });
    });

    return {
      totalOrders,
      totalRevenue: Math.floor(totalRevenue),
      totalProductCount,
      totalProductDiscount: Math.floor(totalProductDiscount),
      couponDiscount: 0
    };
  } catch (error) {
    console.error('Error in getSalesData:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalProductCount: 0,
      totalProductDiscount: 0,
      couponDiscount: 0
    };
  }
};



const getDailySales = async (startDate = null, endDate = null) => {
  const queryStartDate = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  const queryEndDate = endDate ? new Date(endDate) : new Date();

  queryStartDate.setHours(0, 0, 0, 0);
  queryEndDate.setHours(23, 59, 59, 999);

  const dailySales = [];

  for (let d = new Date(queryStartDate); d <= queryEndDate; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const salesData = await getSalesData(dayStart, dayEnd);
    dailySales.push({
      date: dayStart.toISOString().split('T')[0],
      ...salesData
    });
  }

  return dailySales.sort((a, b) => new Date(b.date) - new Date(a.date));
};


const getWeeklySales = async (page = 1, limit = 10, startDate = null, endDate = null) => {
  const skip = (page - 1) * limit;

  const queryStartDate = startDate || await Order.findOne().sort({ createdAt: 1 }).then(order => order?.createdAt);
  const queryEndDate = endDate || new Date();

  if (!queryStartDate) return { data: [], totalPages: 0 };

  const start = new Date(queryStartDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(queryEndDate);
  end.setHours(23, 59, 59, 999);

  const weeklySales = [];

  const hasOrders = await Order.findOne({
    createdAt: {
      $gte: start,
      $lte: end
    }
  });

  if (!hasOrders) {
    return {
      data: [],
      totalPages: 0
    };
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
    let startOfWeek = new Date(d);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    let endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    const salesData = await getSalesData(startOfWeek, endOfWeek);
    if (salesData) {
      weeklySales.push({
        startDate: startOfWeek.toDateString(),
        endDate: endOfWeek.toDateString(),
        ...salesData
      });
    }
  }

  return {
    data: weeklySales.slice(skip, skip + limit),
    totalPages: Math.ceil(weeklySales.length / limit),
  };
};

const getMonthlySales = async (page = 1, limit = 10, startDate = null, endDate = null) => {
  const skip = (page - 1) * limit;

  const queryStartDate = startDate || await Order.findOne().sort({ createdAt: 1 }).then(order => order?.createdAt);
  const queryEndDate = endDate || new Date();

  if (!queryStartDate) return { data: [], totalPages: 0 };

  const start = new Date(queryStartDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(queryEndDate);
  end.setHours(23, 59, 59, 999);

  const hasOrders = await Order.findOne({
    createdAt: {
      $gte: start,
      $lte: end
    }
  });

  if (!hasOrders) {
    return {
      data: [],
      totalPages: 0
    };
  }

  const monthlySales = [];

  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    let startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    let endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const salesData = await getSalesData(startOfMonth, endOfMonth);
    if (salesData) {
      monthlySales.push({
        year: startOfMonth.getFullYear(),
        month: startOfMonth.getMonth() + 1,
        ...salesData,
      });
    }
  }

  return {
    data: monthlySales.slice(skip, skip + limit),
    totalPages: Math.ceil(monthlySales.length / limit),
  };
};

const getYearlySales = async (page = 1, limit = 10, startDate = null, endDate = null) => {
  const skip = (page - 1) * limit;

  const queryStartDate = startDate || await Order.findOne().sort({ createdAt: 1 }).then(order => order?.createdAt);
  const queryEndDate = endDate || new Date();

  if (!queryStartDate) return { data: [], totalPages: 0 };

  const startYear = new Date(queryStartDate).getFullYear();
  const endYear = new Date(queryEndDate).getFullYear();
  const yearlySales = [];

  const hasOrders = await Order.findOne({
    createdAt: {
      $gte: new Date(startYear, 0, 1),
      $lte: new Date(endYear, 11, 31, 23, 59, 59, 999)
    }
  });

  if (!hasOrders) {
    console.log('No orders found in year range');
    return {
      data: [],
      totalPages: 0
    };
  }

  for (let year = startYear; year <= endYear; year++) {
    let startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    let endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    if (year === startYear && startDate) {
      startOfYear = new Date(startDate);
    }
    if (year === endYear && endDate) {
      endOfYear = new Date(endDate);
    }

    const salesData = await getSalesData(startOfYear, endOfYear);
    if (salesData && (salesData.totalOrders > 0 || salesData.totalProductCount > 0)) {
      yearlySales.push({
        year,
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: endOfYear.toISOString().split('T')[0],
        ...salesData
      });
    }
  }

  yearlySales.sort((a, b) => b.year - a.year);

  console.log('Yearly Sales Found:', {
    startYear,
    endYear,
    dataFound: yearlySales.length > 0,
    numberOfYears: yearlySales.length
  });

  if (yearlySales.length === 0) {
    return {
      data: [],
      totalPages: 0
    };
  }

  return {
    data: yearlySales.slice(skip, skip + limit),
    totalPages: Math.ceil(yearlySales.length / limit),
  };
};





// dashboard

const loadDashboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const skip = (page - 1) * limit;

    let startDate = null;
    let endDate = null;

    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    }

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          status: 'Delivered'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          soldCount: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { soldCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ['$productDetails.name', 0] },
          price: { $arrayElemAt: ['$productDetails.price', 0] },
          images: { $arrayElemAt: ['$productDetails.images', 0] },
          soldCount: 1,
          totalRevenue: 1
        }
      }
    ]);

    // Get top categories
    const topCategories = await Order.aggregate([
      {
        $match: {
          status: 'Delivered'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          productCount: { $addToSet: '$product._id' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ['$categoryDetails.name', 0] },
          totalSales: 1,
          totalRevenue: 1,
          productCount: { $size: '$productCount' }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);

    const [dailySalesData, weeklySalesData, monthlySalesData, yearlySalesData] = await Promise.all([
      getDailySales(startDate, endDate),
      getWeeklySales(page, limit, startDate, endDate),
      getMonthlySales(page, limit, startDate, endDate),
      getYearlySales(page, limit, startDate, endDate)
    ]);

    if (!dailySalesData.length) {
      const emptyData = {
        data: [],
        totalPages: 0
      };

      return res.render('adminDashboard', {
        totalUsers: await User.countDocuments(),
        totalOrders: 0,
        totalProducts: 0,
        totalDeliveredProducts: 0,
        totalRevenue: 0,
        totalReturns: 0,
        orders: [],
        topProducts: [],
        topCategories: []
      });
    }

    let orderQuery = {};
    if (startDate && endDate) {
      orderQuery.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const totalUsers = await User.countDocuments();
    const totalReturns = await Return.countDocuments(orderQuery);

    const totalOrdersCount = await Order.aggregate([
      {
        $match: orderQuery
      },
      { $group: { _id: null, total: { $sum: 1 } } }
    ]).then(result => result.length ? result[0].total : 0);

    const totalProducts = await Order.aggregate([
      {
        $match: orderQuery
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: "$items.quantity" }
        }
      }
    ]).then(result => result.length ? result[0].totalProducts : 0);

    const totalDeliveredProducts = await Order.aggregate([
      {
        $match: {
          ...orderQuery,
          'status': 'Delivered'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      }
    ]).then(result => result.length ? result[0].total : 0);

    const orders = await Order.find(orderQuery).populate('items.productId');
    let totalRevenue = 0;

    orders.forEach(order => {
      if (order.paymentStatus === 'Paid') {
        totalRevenue += order.totalAmount;
      }
    });

    return res.render('adminDashboard', {
      totalUsers,
      totalOrders: totalOrdersCount,
      totalProducts,
      totalDeliveredProducts,
      totalRevenue,
      totalReturns,
      orders,
      topProducts,
      topCategories,
      currentPage: {
        daily: page,
        weekly: page,
        monthly: page,
        yearly: page
      },
      totalPages: {
        daily: dailySalesData.length,
        weekly: weeklySalesData.totalPages,
        monthly: monthlySalesData.totalPages,
        yearly: yearlySalesData.totalPages
      },
      dailySales: dailySalesData,
      weeklySales: weeklySalesData.data,
      monthlySales: monthlySalesData.data,
      yearlySales: yearlySalesData.data,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      endDate: endDate ? endDate.toISOString().split('T')[0] : ''
    });
  } catch (error) {
    console.error("Dashboard loading error:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};
















const loadOrderManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { 'userId.email': { $regex: search, $options: 'i' } },
          { 'items.product.name': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .populate('userId', 'email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('admin/adminDashboard', {
      orders,
      currentPage: page,
      totalPages,
      search
    });
  } catch (error) {
    console.error('Error loading order management:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};




const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};



const viewOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('userId', 'email')
      .populate('items.product');

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).send('Order not found');
    }

    res.render('admin/orderDetails', { order });
  } catch (error) {
    console.error('Error viewing order:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};





const getSalesReport = async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    let matchStage = {};
    let groupStage = {};

    const now = new Date();

    switch (period) {
      case 'daily':
        matchStage = {
          createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) }
        };
        groupStage = {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }
        };
        break;
      case 'weekly':
        matchStage = {
          createdAt: { $gte: new Date(now.setDate(now.getDate() - 90)) }
        };
        groupStage = {
          _id: { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } }
        };
        break;
      case 'monthly':
        matchStage = {
          createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 12)) }
        };
        groupStage = {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          }
        };
        break;
      case 'yearly':
        matchStage = {};
        groupStage = {
          _id: { year: { $year: '$createdAt' } }
        };
        break;
    }

    const salesData = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          ...groupStage,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$items.paymentStatus', 'Paid'] },
                '$totalAmount',
                0
              ]
            }
          },
          totalProductDiscount: {
            $sum: {
              $subtract: [
                { $multiply: ['$items.price', '$items.quantity'] },
                '$totalAmount'
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: period === 'daily' ? '$_id.date' :
            period === 'weekly' ? { $concat: ['Week ', { $toString: '$_id.week' }, ', ', { $toString: '$_id.year' }] } :
              period === 'monthly' ? { $concat: [{ $toString: '$_id.month' }, '/', { $toString: '$_id.year' }] } :
                { $toString: '$_id.year' },
          totalOrders: 1,
          totalRevenue: 1,
          couponDiscount: { $ifNull: ['$couponDiscount', 0] },
          totalProductDiscount: 1
        }
      },
      { $sort: { date: -1 } }
    ]);

    res.json(salesData.map(sale => ({
      ...sale,
      totalRevenue: parseFloat(sale.totalRevenue || 0).toFixed(2),
      couponDiscount: parseFloat(sale.couponDiscount || 0).toFixed(2),
      totalProductDiscount: parseFloat(sale.totalProductDiscount || 0).toFixed(2)
    })));
  } catch (error) {
    console.error('Error getting sales report:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};




const getOrdersByPeriod = async (req, res) => {
  try {
    const period = req.params.period;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'yearly':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        return res.status(400).json({ error: 'Invalid period' });
    }

    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lte: now
      }
    })
      .populate('userId', 'name')
      .populate('items.productId', 'name price')
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      userId: order.userId._id,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt
    }));

    console.log('Start date:', startDate);
    console.log('End date:', now);
    console.log('Number of orders found:', formattedOrders.length);

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error getting orders by period:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};






const getGraphData = async (req, res) => {
  try {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const deliveredProducts = [];
    const revenue = [];
    const labels = [];

    for (const date of last7Days) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const deliveredCount = await Order.countDocuments({
        status: 'Delivered',
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });

      const dailyRevenue = await Order.aggregate([
        {
          $match: {
            status: 'Delivered',
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]);

      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });

      labels.push(formattedDate);
      deliveredProducts.push(deliveredCount);
      revenue.push(dailyRevenue[0]?.total || 0);
    }

    res.json({
      labels,
      deliveredProducts,
      revenue
    });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};






const getSalesDataByPeriod = async (req, res) => {
  try {
    const period = req.params.period;
    const now = new Date();
    let startDate, groupBy, dateFormat;

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        dateFormat = { day: '2-digit', month: 'short' };
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        groupBy = {
          week: { $week: "$createdAt" },
          year: { $year: "$createdAt" }
        };
        dateFormat = { week: 'numeric', year: 'numeric' };
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupBy = {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" }
        };
        dateFormat = { month: 'short', year: 'numeric' };
        break;
      case 'yearly':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 5);
        groupBy = { $year: "$createdAt" };
        dateFormat = { year: 'numeric' };
        break;
      default:
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid period' });
    }

    const results = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Paid"] },
                "$totalAmount",
                0
              ]
            }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const formattedData = results.map(item => {
      let label;
      if (period === 'daily') {
        const date = new Date(item._id);
        label = date.toLocaleDateString('en-IN', dateFormat);
      } else if (period === 'weekly') {
        label = `Week ${item._id.week}, ${item._id.year}`;
      } else if (period === 'monthly') {
        const date = new Date(item._id.year, item._id.month - 1);
        label = date.toLocaleDateString('en-IN', dateFormat);
      } else {
        label = `${item._id}`;
      }

      return {
        label,
        orders: item.totalOrders,
        revenue: item.totalRevenue
      };
    });

    res.json({
      labels: formattedData.map(item => item.label),
      orders: formattedData.map(item => item.orders),
      revenue: formattedData.map(item => item.revenue)
    });

  } catch (error) {
    console.error('Error getting sales data:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};






const getAnalytics = async (req, res) => {
  try {
    const period = req.params.period;
    const now = new Date();
    let startDate, groupBy, dateFormat;

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        dateFormat = { day: '2-digit', month: 'short' };
        break;

      case 'weekly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        groupBy = {
          week: { $week: "$createdAt" },
          year: { $year: "$createdAt" }
        };
        break;

      case 'monthly':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupBy = {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" }
        };
        dateFormat = { month: 'short', year: 'numeric' };
        break;

      case 'yearly':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 5);
        groupBy = { $year: "$createdAt" };
        dateFormat = { year: 'numeric' };
        break;

      default:
        return res.status(400).json({ error: 'Invalid period' });
    }


    const results = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Delivered"] },
                "$totalAmount",
                0
              ]
            }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);


    const formattedData = results.map(item => {
      let label;
      if (period === 'daily') {
        const date = new Date(item._id);
        label = date.toLocaleDateString('en-IN', dateFormat);
      } else if (period === 'weekly') {
        label = `Week ${item._id.week}, ${item._id.year}`;
      } else if (period === 'monthly') {
        const date = new Date(item._id.year, item._id.month - 1);
        label = date.toLocaleDateString('en-IN', dateFormat);
      } else {
        label = `${item._id}`;
      }

      return {
        label,
        sales: item.totalSales,
        revenue: item.totalRevenue
      };
    });


    res.json({
      labels: formattedData.map(item => item.label),
      sales: formattedData.map(item => item.sales),
      revenue: formattedData.map(item => item.revenue)
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
  }
};





module.exports = {
  loadLogin,
  loadDash,
  loadDashboard,
  loadusermanagment,
  logout,
  toggleBlockAccess,
  getSalesReport,

  loadOrderManagement,
  updateOrderStatus,
  viewOrder,
  getOrdersByPeriod,
  getGraphData,
  getSalesDataByPeriod,
  getAnalytics
};