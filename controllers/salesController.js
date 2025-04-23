const mongoose = require("mongoose");
const Order = require("../models/ordermodel");
const User = require("../models/userModel");
const Return = require("../models/returnModel");
const HttpStatus = require("../constants/httpStatus");
const Messages = require("../constants/messages.json");
const Coupon = require("../models/couponModel");

// load sales report

// ===========================================================================================================

const loadSalesReport = async (req, res) => {
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

    const [dailySalesData, weeklySalesData, monthlySalesData, yearlySalesData] =
      await Promise.all([
        getDailySales(startDate, endDate),
        getWeeklySales(page, limit, startDate, endDate),
        getMonthlySales(page, limit, startDate, endDate),
        getYearlySales(page, limit, startDate, endDate),
      ]);

    if (!dailySalesData.length) {
      const emptyData = {
        data: [],
        totalPages: 0,
      };

      return res.render("salesReport", {
        totalUsers: await User.countDocuments(),
        totalOrders: 0,
        totalProducts: 0,
        totalDeliveredProducts: 0,
        totalRevenue: 0,
        totalReturns: 0,
        orders: [],
      });
    }
    let orderQuery = {};
    if (startDate && endDate) {
      orderQuery.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    const totalUsers = await User.countDocuments();
    const totalReturns = await Return.countDocuments(orderQuery);

    const totalOrdersCount = await Order.aggregate([
      {
        $match: orderQuery,
      },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]).then((result) => (result.length ? result[0].total : 0));

    const totalProducts = await Order.aggregate([
      {
        $match: orderQuery,
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: "$items.quantity" },
        },
      },
    ]).then((result) => (result.length ? result[0].totalProducts : 0));

    const totalDeliveredProducts = await Order.aggregate([
      {
        $match: {
          ...orderQuery,
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
        },
      },
    ]).then((result) => (result.length ? result[0].total : 0));

    const orders = await Order.find(orderQuery).populate("items.productId");
    let totalRevenue = 0;

    const couponCode = orders.couponCode;
    const coupon = await Coupon.findOne({ code: couponCode });
    let couponPercentage = coupon?.discountPercentage || null;

    let discount = null;

    if (coupon && couponPercentage) {
      discount = (couponPercentage / 100) * grandTotal;
    }

    orders.forEach((order) => {
      if (order.status === "Delivered") {
        totalRevenue += order.totalAmount;
      }
    });

    return res.render("salesReport", {
      totalUsers,
      totalOrders: totalOrdersCount,
      totalProducts,
      totalDeliveredProducts,
      totalProductDiscount: discount,
      totalRevenue,
      totalReturns,
      orders,
      currentPage: {
        daily: page,
        weekly: page,
        monthly: page,
        yearly: page,
      },
      totalPages: {
        daily: dailySalesData.length,
        weekly: weeklySalesData.totalPages,
        monthly: monthlySalesData.totalPages,
        yearly: yearlySalesData.totalPages,
      },
      dailySales: dailySalesData,
      weeklySales: weeklySalesData.data,
      monthlySales: monthlySalesData.data,
      yearlySales: yearlySalesData.data,
      startDate: startDate ? startDate.toISOString().split("T")[0] : "",
      endDate: endDate ? endDate.toISOString().split("T")[0] : "",
    });
  } catch (error) {
    console.error("SalesReport loading error:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

const getSalesData = async (startDate, endDate) => {
  try {
    const orders = await Order.find({
      createAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: "Deliverd",
    }).populate("items.productId");

    let totalOrders = orders.length;
    let totalRevenue = 0;
    let totalProductCount = 0;
    let totalProductDiscount = 0;

    orders.forEach((order) => {
      totalRevenue += ordertotalAmount || 0;

      order.items.forEach((item) => {
        const product = item.productId;
        if (!product || !item.quantity) return;

        totalProductCount += item.quantity;

        const productPrice =
          typeof product.price === "string"
            ? parseFloat(product.price.replace(/,/g, ""))
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
      couponDiscount: 0,
    };
  } catch (error) {
    console.error("Error in getSalesData:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalProductCount: 0,
      totalProductDiscount: 0,
      couponDiscount: 0,
    };
  }
};

const getDailySales = async (startDate = null, endDate = null) => {
  const queryStartDate = startDate
    ? new Date(startDate)
    : new Date(new Date().setDate(new Date().getDate() - 30));
  const queryEndDate = endDate ? new Date(endDate) : new Date();

  queryStartDate.setHours(0, 0, 0, 0);
  queryEndDate.setHours(23, 59, 59, 999);

  const dailySales = [];

  for (
    let d = new Date(queryStartDate);
    d <= queryEndDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dayStart = new Date(d);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const salesData = await getSalesData(dayStart, dayEnd);
    dailySales.push({
      date: dayStart.toISOString().split("T")[0],
      ...salesData,
    });

    return dailySales.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};

const getWeeklySales = async (
  page = 1,
  limit = 10,
  startDate = null,
  endDate = null
) => {
  const skip = (page - 1) * limit;

  const queryStartDate =
    startDate ||
    (await Order.findOne()
      .sort({ createdAt: 1 })
      .then((order) => order?.createdAt));
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
      $lte: end,
    },
  });

  if (!hasOrders) {
    return {
      data: [],
      totalPages: 0,
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
        ...salesData,
      });
    }
  }

  return {
    data: weeklySales.slice(skip, skip + limit),
    totalPages: Math.ceil(weeklySales.length / limit),
  };
};

const getMonthlySales = async (
  page = 1,
  limit = 10,
  startDate = null,
  endDate = null
) => {
  const skip = (page - 1) * limit;

  const queryStartDate =
    startDate ||
    (await Order.findOne()
      .sort({ createAt: 1 })
      .then((order) => order?.createAt));
  const queryEndDate = endDate || new Date();

  if (!queryStartDate) return { date: [], totalPages: 0 };

  const start = new Date(queryStartDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(queryEndDate);
  end.setHours(23, 59, 59, 999);

  const hasOrders = await Order.findOne({
    createdAt: {
      $gte: start,
      $lte: end,
    },
  });

  if (!hasOrders) {
    return {
      data: [],
      totalPages: 0,
    };
  }

  const monthlySales = [];

  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    let startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    let endOfMonth = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

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

const getYearlySales = async (
  page = 1,
  limit = 0,
  startDate = null,
  endDate = null
) => {
  const skip = (page - 1) * limit;

  const queryStartDate =
    startDate ||
    (await Order.findOne()
      .sort({ createdAt: 1 })
      .then((order) => order?.createdAt));

  const queryEndDate = endDate || new Date();

  if (!queryStartDate) return { data: [], totalPages: 0 };

  const startYear = new Date(queryStartDate).getFullYear();
  const endYear = new Date(queryEndDate).getFullYear();
  const yearlySales = [];

  const hasOrders = await Order.findOne({
    createdAt: {
      $gte: new Date(startYear, 0, 1),
      $lte: new Date(endYear, 11, 31, 23, 59, 59, 999),
    },
  });

  if (!hasOrders) {
    console.log("  No orders found in year range ");
    return {
      data: [],
      totalPages: 0,
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
    if (
      salesData &&
      (salesData.totalOrders > 0 || salesData.totalProductCount > 0)
    ) {
      yearlySales.push({
        year,
        startDate: startOfYear.toISOString().split("T")[0],
        endDate: endOfYear.toISOString().split("T")[0],
        ...salesData,
      });
    }
  }

  yearlySales.sort((a, b) => b.year - a.year);

  console.log("Yearly Sales Found:", {
    startYear,
    endYear,
    dataFound: yearlySales.length > 0,
    numberOfYears: yearlySales.length,
  });

  if (yearlySales.length === 0) {
    return {
      data: [],
      totalPages: 0,
    };
  }

  return {
    data: yearlySales.slice(skip, skip + limit),
    totalPages: Math.ceil(yearlySales.length / limit),
  };
};

module.exports = {
  loadSalesReport,
};
