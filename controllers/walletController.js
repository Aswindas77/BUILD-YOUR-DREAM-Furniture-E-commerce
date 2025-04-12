const express = require("express")
const mongoose = require("mongoose");
const Wallet = require("../models/walletModel");
const HttpStatus = require('../constants/httpStatus');
const Messages =require('../constants/messages.json');

// load wallet

const loadWallet = async (req, res) => {
    try {
        const userId = req.session?.User?._id;

      

        if (!userId) {
            console.log("No User ID, redirecting...");
            res.redirect('/user/login')
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;



        const wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            const newWallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });

            await newWallet.save();

            return res.render('profile/profileWallet', {
                walletBalance: 0,
                walletHistory: [],
                currentPage: 1,
                totalPages: 1
            });
        }


        const sortedTransactions = wallet.transactions.sort((a, b) => b.date - a.date);
        const paginatedTransactions = sortedTransactions.slice(skip, skip + limit);

        const totalTransactions = wallet.transactions?.length;
        const totalPages = Math.ceil(totalTransactions / limit);



        res.render('profile/profileWallet', {
            walletBalance: wallet.balance,
            walletHistory: paginatedTransactions,
            currentPage: page,
            totalPages: totalPages
        });


    } catch (error) {

        console.error("Error loading wallet:", error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}

// add money
 
const addMoneyWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session?.User?._id;

        if(amount>550000){
            res.status(HttpStatus.BAD_REQUEST).json({success:false , message:"Max add limit: ₹5,00,000 per transaction."})
        }

        const wallet = await Wallet.findOneAndUpdate(
            { userId },
            {
                $inc: { balance: amount },
                $push: {
                    transactions: {
                        type: 'credit',
                        amount: amount,
                        description: 'Money Added to Wallet',
                        date: new Date()
                    }
                }
            },
            { upsert: true, new: true }
        );

        res.status(HttpStatus.CREATED).json({ success: true, message: 'Money added to wallet successfully' });

    } catch (error) {
        console.error('Error adding money to wallet:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// deduct from wallet

const deductFromWallet = async (userId, amount, description = 'Purchase') => {
    try {
        const wallet = await Wallet.findOne({ userId });

        if (!wallet || wallet.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }


        const updatedWallet = await Wallet.findOneAndUpdate(
            { userId },
            {
                $inc: { balance: -amount },
                $push: {
                    transactions: {
                        type: 'debit', 
                        amount: amount,
                        description: description,
                        date: new Date()
                    }
                }
            },
            { new: true }
        );

        return updatedWallet;
    } catch (error) {
        console.error('Error deducting from wallet:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};



// check wallet balance

const checkWalletBalance = async (userId) => {
    try {
        const wallet = await Wallet.findOne({ userId });
        return wallet ? wallet.balance : 0;
    } catch (error) {
        console.error('Error checking wallet balance:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};






module.exports = {
    loadWallet,
    addMoneyWallet,
    deductFromWallet,
    checkWalletBalance
};



