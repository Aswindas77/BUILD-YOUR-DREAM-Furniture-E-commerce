const express = require("express")
const mongoose = require("mongoose");
const Wallet = require("../models/walletModel");


// load wallet

const loadWallet = async (req, res) => {
    try {
        const userId = req.session.User._id;
        const wallet = await Wallet.findOne({ userId: userId });
        console.log(userId)
        if (!wallet) {
            const newWallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });
            await newWallet.save();
            return res.render('profile/profileWallet', {
                walletBalance: 0,
                walletHistory: []
            });
        }


        const walletHistory = wallet.transactions.sort((a, b) => b.date - a.date);

        res.render('profile/profileWallet', {
            walletBalance: wallet.balance,
            walletHistory: walletHistory
        });

    } catch (error) {

        console.error(error.message)
    }
}

// add money

const addMoneyWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.User._id;

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

        res.json({ success: true, message: 'Money added to wallet successfully' });

    } catch (error) {
        console.error('Error adding money to wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// deductFormWallet

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
        throw error;
    }
};



// Add function to check wallet balance

const checkWalletBalance = async (userId) => {
    try {
        const wallet = await Wallet.findOne({ userId });
        return wallet ? wallet.balance : 0;
    } catch (error) {
        console.error('Error checking wallet balance:', error);
        throw error;
    }
};

module.exports = {
    loadWallet,
    addMoneyWallet,
    deductFromWallet,
    checkWalletBalance
};



