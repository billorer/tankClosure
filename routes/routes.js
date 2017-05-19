var express = require('express');
var formidable = require('formidable');

//FILE UPLOAD
var mv = require('mv');
var fs = require('fs');

//ENCRYPTION
var sha1 = require('sha1');

//DATABASE
var mongojs = require("mongojs");
var db = mongojs('mongodb://root:root@ds143151.mlab.com:43151/tankclosure', ['account']);

//EMAIL
var emails = require('../emails/email');
var router = express.Router();

/*Here we store all the active, logged in users*/
var sessionArray = [];

/* GET home page. */
router.get('/', function(req, res) {
	if(!req.session.user){
		res.render('login.pug');
	}else {
		res.render('menu.pug', {user: req.session.user});
	}
});

/* LOGIN to the menu */
router.route('/login')
	.get(function(req, res) {
		res.render('login.pug');
	})
	.post (function(req, res) {
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files){

			var username = fields.username;
			var password = fields.password;

			if(checkIfUserIsAlreadyLogged(username)){
				res.render('login.pug', {information: "The user already uses this account!"});
			}
			else {
				isValidPassworrd(fields, function(response, username) {
					if(response){
						console.log("Successful login!");
						req.session.user = username;

						var fileExistence = './img/uploads/avatars/' + req.session.user + '.jpg';
                        console.log("Path: " + fileExistence);
						if (fs.existsSync(fileExistence)) {
                            req.session.avatar = './img/uploads/avatars/' + req.session.user + '.jpg';
						}

						// we make sure that all of the usernames that are logged in are saved
						sessionArray.push(username);

						var controllerCode = Math.floor((Math.random() * 1000) + 1);
						req.session.controllerCode = controllerCode;

						db.account.find({username: req.session.user}).toArray(function(err, result){
							if (err){
								res.send(err);
							} else if(result.length){

								req.session.forward = result[0].controlButtons.forward;
								req.session.backward = result[0].controlButtons.backward;
								req.session.left = result[0].controlButtons.left;
								req.session.right = result[0].controlButtons.right;
								req.session.attack = result[0].controlButtons.attack;

								res.render('menu.pug', {user: req.session.user,
									forward:req.session.forward,
									backward:req.session.backward,
									left:req.session.left,
									right:req.session.right,
									attack:req.session.attack
								});
							} else {
								console.log("No documents found");
								res.render('menu.pug', {user: req.session.user});
							}
						});
					}else{
						res.render('login.pug', {information: "Unsuccessful login!"});
					}
				});
			}
		});
	});

router.route('/register')
	.get(function(req, res) {
		res.render('register.pug');
	})
	.post(function(req, res) {
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files){

			var username = fields.username;
			var password = fields.password;
			var email = fields.email;

			isUsernameTaken(username, function(response){
				if(response){
					console.log("Username already taken!");
					res.render('register.pug', {information: "Username already taken!"});
				}else{
					addUser(fields, function(){
						console.log("Successful registration!");

						emails.sendEmail(fields);

						res.render('login.pug', {information: "Successful registration!"});
					});
				}
			});
		});
	});
router.get('/menu', function(req, res){
	if(req.session.user){
		res.render('menu.pug', {user: req.session.user});
	}
});

router.get('/profile', function(req, res){
	if(req.session.user){
		res.render('profile.pug', {user: req.session.user, avatar: req.session.avatar});
	}
});

router.post('/fileupload', function(req, res){
	if(req.session.user){
	  	var form = new formidable.IncomingForm();
	  	form.parse(req, function (err, fields, files) {
			var oldpath = files.filetoupload.path;

			var str = files.filetoupload.name;

			var tok = str.split(".");
			//only jpg allowed
			if(tok[1] == 'jpg'){
				var newpath = __dirname + '/../client/img/uploads/avatars/' + req.session.user + '.jpg';
			//	req.session.avatar =  __dirname.substr(0, __dirname.length - 7) + '/client/img/uploads/avatars/' + req.session.user + '.jpg';
				req.session.avatar =  '../../client/img/uploads/avatars/' + req.session.user + '.jpg';
                console.log("FileUpload: " + req.session.avatar);
				mv(oldpath, newpath, function(err){
					if (err) throw err;
					res.render('profile.pug', {user: req.session.user, successfulUpload: true, avatar: req.session.avatar});
				});
			}
		});
	}
});

router.get('/play', function(req, res){
	if(req.session.user){
		var controllerButtons = {
			forward: req.session.forward,
			backward: req.session.backward,
			left: req.session.left,
			right: req.session.right,
			attack: req.session.attack
		};

        var controllerParameters = {
                controllerCode:req.session.controllerCode,
                controlButtons:controllerButtons
        };

		res.render('index.pug', {user: req.session.user, controllerParameters: JSON.stringify(controllerParameters)});
	}else{
		res.render('login.pug');
	}
});

router.route('/logout')
    .get( function( req, res ){

		deleteUserFromSessionArray(req.session.user);

        req.session.destroy(function(err){
            if(err){
                console.log(err);
            }
            else
            {
                res.render('login.pug'); //kijelentkeztunk
            }
        });
    });

/*After a user logs out, its username should be removed from the sessionArray*/
var deleteUserFromSessionArray = function(username) {
	for(var index = 0; index < sessionArray.length; index++){
		if(sessionArray[index] == username){
			sessionArray.splice(index, 1);
		}
	}
};

/*Before a user logs in we check, whether they are already logged in, but from another device*/
var checkIfUserIsAlreadyLogged = function(username){
	for(var index = 0; index < sessionArray.length; index++){
		if(sessionArray[index] == username){
			return true;
		}
	}
	return false;
};

router.route('/options')
	.get(function(req, res) {
		if(req.session.user){
            console.log("forward: " + req.session.forward);
			res.render('options.pug', {controllerCode: req.session.controllerCode, user: req.session.user,
				forward:  checkIfArrowKey(req.session.forward), backward:  checkIfArrowKey(req.session.backward), left:  checkIfArrowKey(req.session.left),
				right:  checkIfArrowKey(req.session.right), attack:  checkIfArrowKey(req.session.attack),
				forwardText:  req.session.forward, backwardText:  req.session.backward, leftText:  req.session.left,
				rightText: req.session.right, attackText:  req.session.attack
			});
		}
	});

//checks if the keyInputCode is an arrow or a moue button, returns a string
var checkIfArrowKey = function(keyInput){
	switch (keyInput) {
		case "37": // left
			return "Left Arrow";
		case "38": // up
			return "Up Arrow";
		case "39": // right
			return "Right Arrow";
		case "40": // down
			return "Down Arrow";
		case "1":
			return "Left Mouse Button";
		default:
			return String.fromCharCode(keyInput);
	}
};

//checks if the user has given a button twice for different functionalities
var checkUniqueButton = function(fields){
	for (var property1 in fields) {
		if (fields.hasOwnProperty(property1)) {
			for (var property2 in fields) {
				if (fields.hasOwnProperty(property2)) {
					if(fields[property1] == fields[property2] && property1 != property2){
						return true;
					}
				}
			}
		}
	}
	return false;
};

router.route('/saveoptions')
	.post(function(req, res){
		if(req.session.user){
			var form = new formidable.IncomingForm();
			form.parse(req, function(err, fields, files){

				if(checkUniqueButton(fields)){
					res.render('options.pug', {user: req.session.user, error: "The buttons should be unique!"});
				}
				var forward = fields.forward;
				var backward = fields.backward;
				var left = fields.left;
				var right = fields.right;
				var attack = fields.attack;

				var controlButtons = {
					forward: forward,
					backward: backward,
					left: left,
					right: right,
					attack: attack
				};

				req.session.forward = forward;
				req.session.backward = backward;
				req.session.left = left;
				req.session.right = right;
				req.session.attack = attack;

				db.account.update({username:req.session.user}, {$set:{controlButtons:controlButtons}});

				res.render('menu.pug', {user: req.session.user});
			});
		}
	});


    //tries to find a user where the username and password exists
    var isValidPassworrd = function(data, cb){
    	var hash =  sha1(data.password);
    	db.account.find({username:data.username,password:hash}, function(err, res){
    		if(res.length > 0)
    			cb(true, data.username);
    		else
    			cb(false, data.username);
    	});
    };

    //gets a username and checks if it exists
    var isUsernameTaken = function(data, cb){
    	db.account.find({username:data}, function(err, res){
    		if(res.length > 0)
    			cb(true);
    		else
    			cb(false);
    	});
    };

    var addUser = function(data, cb){
    	var controlButtons = {
    		forward: 87,
    		backward: 83,
    		left: 65,
    		right: 68,
    		attack: 1
    	};
    	var hash = sha1(data.password);
    	db.account.insert({username:data.username, password:hash, email:data.email, controlButtons:controlButtons}, function(err){
    		cb();
    	});
    };

module.exports = router;
