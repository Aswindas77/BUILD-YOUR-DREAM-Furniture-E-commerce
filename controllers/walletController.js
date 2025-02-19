const express = require("express")
const mongoose = require("mongoose");
const Wallet = require("../models/walletModel");


// load wallet page
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
 

module.exports = {
    loadWallet,
}



