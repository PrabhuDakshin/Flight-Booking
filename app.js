require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-find-or-create');
const _ = require("lodash");


const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: "auto" }
}));


app.use(passport.initialize());
app.use(passport.session());


//mongoose.connect("mongodb://localhost:27017/flightDB", { useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect("mongodb+srv://admin:admin123@cluster0-odccj.mongodb.net/flightDB?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  googleId:String,
  facebookId: String
});

const flightSchema = new mongoose.Schema({
  fName: String,
  dep: String,
  arr: String,
  price: Number,
  seats: Number
});




const bookingSchema = new mongoose.Schema({
  flightName: String,
  from: String,
  to: String,
  adults: Number,
  children: Number,
  fromDate: String,
  toDate: String,
  seats: Number,
  price: Number
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

const Flight = new mongoose.model("flight", flightSchema);

const flight = new Flight({
  fName: "Mark_2",
  dep: "Chennai",
  arr: "Delhi",
  price: 80,
  seats: 120
});flight.save()

const Book = new mongoose.model("booking", bookingSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
  if(req.isAuthenticated())
  {
    res.locals.title = "Home | Flight Booking";
    res.render("home");
  }
  else{
      res.sendFile(__dirname + "/signin.html");
  }

});

//signip POST
app.post("/", function(req, res){
  const user = new User({
    email: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log("Login Error ", err);
      res.redirect("/")
    }
    else{
      passport.authenticate("local")(req, res, function(){
        res.locals.title = "Home | Flight Booking";
        res.render("home");
      });
    }
  });
});

///sign-up get

app.get("/signup", function(req, res){
  res.sendFile(__dirname + "/signup.html");
});

//sign-up POST

app.post("/signup", function(req, res){
    console.log(req.body);
    User.register({username: req.body.username, name: req.body.name}, req.body.password, function(err, user){
console.log("hell");
      if(err){
        console.log("Sign Up Error", err);
        res.redirect("/signup");
      }
      else{
        console.log("Succes");
        passport.authenticate("local")(req, res, function(){
          res.render("home");
        });
      }
    });
});


app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/home",
  passport.authenticate('google', { failureRedirect: "/signup" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/home");
  });


  app.get('/auth/facebook',
    passport.authenticate('facebook'));

  app.get('/auth/facebook/home',
    passport.authenticate('facebook', { failureRedirect: '/signup' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/home');
    });

//home get

app.get("/home", function(req, res){
  if(req.isAuthenticated()){
    res.locals.title = "Home | Flight Booking";
    res.render("home");
  }
  else{
    res.redirect("/")
  }
});

// home POST
app.post("/home", function(req, res){
  console.log(req.body);
});


//logout get
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/")
});

app.get("/flights",function(req, res){
  res.locals.title = "Flights | Flight Booking";
  console.log(req.body);

  Flight.find({}, function(err, found){
    if(err){console.log("ERROR", err);}
    else{
      console.log(found);
      res.render("flights", {data:found, bookCheck:0});
    }
  });

});

app.post("/flights", function(req, res){
  res.locals.title = "Flights | Flight Booking";
  Flight.find({dep: _.capitalize(req.body.from), arr: _.capitalize(req.body.to)}, function(err, found){
    if(err){console.log("ERR", err);}
    else{
      res.render("flights", {data: found, bookingDetails: req.body, bookCheck: 1});
    }
  });
//  console.log(req.body);
});



app.get("/bookings", function(req, res){
  res.locals.title = "Bookings | Flight Booking";
  Book.find({}, function(err, found){
    if(err){console.log(err);}
    else{
      if(_.isEmpty(found))
      {
        res.render("bookings", {msg: "No Bookings found!", data: found});
      }
      else{
        res.render("bookings", {msg: "Available Bookings are", data: found});
      }
    }
  });
});

app.post("/bookings", function(req, res){
  res.locals.title = "Bookings | Flight Booking";
  console.log(typeof(req.body.toDate));
  const bookee = new Book({
    flightName: req.body.flightName,
    from: req.body.from,
    to: req.body.to,
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    adults: req.body.adults,
    children: req.body.children,
    seats: req.body.seats,
    price: parseInt(req.body.price) * parseInt(req.body.seats)
  });
  console.log(bookee._id);

  res.redirect("/bookings");

  bookee.save();

});

app.post("/cancel", function(req, res){
  Book.deleteOne({_id: req.body.id}, function(err, f){
    if(err){console.log(err);}
    else{
      res.redirect("/bookings");
    }
  });
});



app.listen(process.env.PORT || 3000, function(req, res){
  console.log("Server running at 3000.");
});
