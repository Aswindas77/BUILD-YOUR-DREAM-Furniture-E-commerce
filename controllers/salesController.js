const express = require("express");
const mongoose = require("mongoose");
const Order = require('../models/ordermodel');
const User = require('../models/userModel');
const Product = require('../models/productModel');




// sales report

//====================================================================================================================================================



const filterSalesReport = async (req, res) => {
    try {
        const { type = 'year', year = new Date().getFullYear(), month, week, startDate, endDate } = req.body;
        let query = {};

       
        switch (type) {
            case 'year':
                query.createdAt = {
                    $gte: new Date(year, 0, 1),
                    $lte: new Date(year, 11, 31, 23, 59, 59)
                };
                break;

            case 'month':
                query.createdAt = {
                    $gte: new Date(year, month - 1, 1),
                    $lte: new Date(year, month, 0, 23, 59, 59)
                };
                break;

            case 'week':
                const [weekYear, weekNum] = week.split('-W');
                const weekStart = new Date(weekYear, 0, (weekNum - 1) * 7 + 1);
                query.createdAt = {
                    $gte: weekStart,
                    $lte: new Date(weekStart.setDate(weekStart.getDate() + 6))
                };
                break;

            case 'custom':
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
                break;
        }

       
        const orders = await Order.find(query)
            .populate('userId', 'username')
            .populate('items.productId', 'name price')
            .sort({ createdAt: -1 });

        
        let revenueData = {
            labels: [],
            values: []
        };

        switch (type) {
            case 'year':
                const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthlyRevenue = Array(12).fill(0);

                orders.forEach(order => {
                    const month = order.createdAt.getMonth();
                    monthlyRevenue[month] += order.totalAmount;
                });

                revenueData = {
                    labels: monthLabels,
                    values: monthlyRevenue
                };
                break;

            case 'month':
                const daysInMonth = new Date(year, month, 0).getDate();
                const dailyRevenue = Array(daysInMonth).fill(0);

                orders.forEach(order => {
                    const day = order.createdAt.getDate() - 1;
                    dailyRevenue[day] += order.totalAmount;
                });

                revenueData = {
                    labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
                    values: dailyRevenue
                };
                break;

            default: // week or custom
                const dateSet = new Set();
                orders.forEach(order => {
                    dateSet.add(order.createdAt.toLocaleDateString());
                });

                const dates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
                const dailyValues = dates.map(date => {
                    return orders
                        .filter(order => order.createdAt.toLocaleDateString() === date)
                        .reduce((sum, order) => sum + order.totalAmount, 0);
                });

                revenueData = {
                    labels: dates,
                    values: dailyValues
                };
        }

        
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const productId = item.productId._id.toString();
                if (!productSales[productId]) {
                    productSales[productId] = {
                        name: item.productId.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[productId].quantity += item.quantity;
                productSales[productId].revenue += item.price * item.quantity;
            });
        });

       
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const productData = {
            labels: topProducts.map(product => product.name),
            values: topProducts.map(product => product.revenue)
        };

        
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalOrders = orders.length;
        const totalProducts = orders.reduce((sum, order) => sum + order.items.length, 0);
        const uniqueCustomers = new Set(orders.map(order => order.userId._id)).size;

       
        const totalStats = {
            orders: totalOrders,
            products: totalProducts,
            revenue: totalRevenue,
            avgGrowth: 0 
        };

       
        const salesByDate = orders.reduce((acc, order) => {
            const date = order.createdAt.toLocaleDateString();
            if (!acc[date]) {
                acc[date] = {
                    orders: 0,
                    revenue: 0,
                    products: 0
                };
            }
            acc[date].orders++;
            acc[date].revenue += order.totalAmount;
            acc[date].products += order.items.length;
            return acc;
        }, {});

         
        const salesData = Object.entries(salesByDate).map(([date, data], index, array) => {
            const prevData = array[index - 1]?.[1];
            return {
                date,
                orderCount: data.orders,
                revenue: data.revenue,
                totalProducts: data.products,
                revenueGrowth: prevData ? ((data.revenue - prevData.revenue) / prevData.revenue * 100) : 0
            };
        });

        res.render('salesReport', {
            salesData,
            totalStats,
            totalRevenue,
            totalOrders,
            totalProducts,
            totalCustomers: uniqueCustomers,
            revenueData,
            productData, 
            filterType: type,
            selectedYear: year,
            selectedMonth: month,
            selectedWeek: week,
            startDate,
            endDate
        });

    } catch (error) {
        console.error('Sales Report Error:', error);
        
    }
};













module.exports = {
    filterSalesReport
};

