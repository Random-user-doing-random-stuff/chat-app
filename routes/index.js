const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

module.exports = function (passport) {
    const router = express.Router();

    // GET home page
    router.get("/", (req, res) => {
        res.render("index");
    });

    // GET login page
    router.get("/login", (req, res) => {
        res.render("login");
    });

    // GET signup page
    router.get("/signup", (req, res) => {
        res.render("signup");
    });

    // POST signup
    router.post("/signup", async (req, res) => {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });

        await newUser.save();
        res.redirect("/login");
    });

    // POST login
    router.post("/login", (req, res, next) => {
        passport.authenticate("local", {
            successRedirect: "/chat",
            failureRedirect: "/login",
        })(req, res, next);
    });

    // GET logout
    router.get("/logout", (req, res) => {
        req.logout((err) =>
            err ? res.status(500).send("Logout failed") : res.redirect("/")
        );
    });

    return router;
};
