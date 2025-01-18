const { default: mongoose } = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
    },
    googleId: {
        type: String,
        sparse: true, 
        default: null
    },
    profilePicture: {
        type: String,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now, 
    }
});

// Ensure you keep uniqueness only on the `email` field
UserSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", UserSchema);

module.exports = User;
