//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
mongoose.set('strictQuery', false);

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret:"Our little secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect('mongodb://127.0.0.1:27017/test');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/logout", function (req, res) {
    req.logout;
    res.redirect("/");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}})
    .then(function (foundUsers) {
      res.render("secrets",{usersWithSecrets:foundUsers});
      })
    .catch(function (err) {
      console.log(err);
      })
});

app.get("/submit", function (req, res) {
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", function (req, res) {
    // console.log(req.user);
    User.findById(req.user)
      .then(foundUser => {
        if (foundUser) {
          foundUser.secret = req.body.secret;
          return foundUser.save();
        }
        return null;
      })
      .then(() => {
        res.redirect("/secrets");
      })
      .catch(err => {
        console.log(err);
      });
});


app.post("/register", function (req, res) {

 User.register({username: req.body.username},req.body.password, function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });
    }
 });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    })
});



const start = async() => {
  const password = process.env.MONGO_PASSWORD;
  const PORT = process.env.PORT || 3000 ;
  try{
  await mongoose.connect('mongodb+srv://anshulrai077:'+password+'@cluster0.k2q1czn.mongodb.net/test');
  app.listen(PORT, function () {
    console.log("server started on port " + PORT);
  });
  }
  catch(e){
    console.log(e.message);
  }
};

start();
