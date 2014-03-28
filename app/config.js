/* global require, exports, process */

var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var crypto = require('crypto');



console.log(process.env.MONGO_URL);

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/test');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
  console.log('successfully connect to mongo');
  var userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    }
  });

  userSchema.methods = {
    comparePassword: function(attemptedPassword, callback) {
      bcrypt.compare(attemptedPassword, this.get('password'), function(err, isMatch) {
        callback(isMatch);
      });
    },
    hashPassword: function(callback){
      var cipher = Promise.promisify(bcrypt.hash);
      return cipher(this.get('password'), null, null).bind(this)
        .then(function(hash) {
          this.set('password', hash);
          callback(true);
        });
    },
  };

  userSchema.pre('save', function(next) {
    this.hashPassword(function(saved) {
      if (saved) {
        next();
      }
    });
  });

  var urlSchema = new mongoose.Schema({
    url: {
      type: String,
      unique: true
    },
    base_url: String,
    code: String,
    title: String,
    visits: {
      type: Number,
      default: 0
    }
  });

  urlSchema.pre('save', function(next){
      var shasum = crypto.createHash('sha1');
      shasum.update(this.get('url'));
      this.set('code', shasum.digest('hex').slice(0, 5));
      next();
    });

  exports.User = mongoose.model('User', userSchema);
  exports.Url = mongoose.model('Url', urlSchema);
});

