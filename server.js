var mongojs = require("mongojs");
var db = mongojs('mongodb://root:root@ds143151.mlab.com:43151/tankclosure', ['account']); //mongojs('localhost:27017/myGame', ['account','progress']);
var assert = require('assert');

var path = require('path');
var http = require('http');
var express = require('express');
var formidable = require('formidable');
var session = require('express-session');

var sha1 = require('sha1');

var fs = require('fs');
var mv = require('mv');
//EMAILS
const nodemailer = require('nodemailer');
const xoauth2 = require('xoauth2');

var sendEmail = function(data){
	var transporter = nodemailer.createTransport({
	    service: 'gmail',
	    auth: {
	        //xoauth2: xoauth2.createXOAuth2Generator({
	        	type: 'OAuth2',
	            user: 'zoran@suto.ro',
	            clientId: '75594978998-q29vd6ancdngukru4j25fj1rnnd9clrv.apps.googleusercontent.com',
	            clientSecret: 'CevhJSTLE5JpMdeRVO-GG7gz',
	            refreshToken: '1/Ubz5p5Rqn_l4TQbLbfTExjF3VawGqeWGyKC71kkEwQ0DYJMOts67IGcDD1hjO72b',
	            accessToken: 'ya29.GlsrBESwOfIpuyolYIqcI8PBM_Z6XlXS0p1-5mA7Yf8gZ0lrw_uBwf-cUQyc5elVg1mgX4xXwNPnpkbEm61DwavGBaTobd6kNisE-Sq9zD7CM0466Gu6uKt7_SXP',
	    //    })
	    },
	});

	var mailOptions = {
	    from: 'closureTank <zoran@suto.ro>',
	    to: data.email,
	    subject: 'Successful registration!',
	    text: 'Thank you for registration! \n\nYour username: ' + data.username + ' \nYour password: ' + data.password
	};

	transporter.sendMail(mailOptions, function (err, res) {
	    if(err){
	        console.log('Error');
	    } else {
	        console.log('Email Sent');
	    }
	});

};

var cons = require('consolidate');

var app = express();

app.engine('html', cons.swig);
app.set("view engine", "jade");

var sessionMiddleware = session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
});

var sessionArray = [];

app.use(sessionMiddleware);

//starts the server
var server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'client')));

//routes
app.get('/', function(req, res) {
	if(!req.session.user){
		//res.sendFile(__dirname + '/client/views/login.html');
		res.render(__dirname + '/client/views/login.jade');
	}
	else
		res.render(__dirname + '/client/views/menu.jade', {user: req.session.user});
});

app.get('/menu', function(req, res){
	if(req.session.user){
		res.render(__dirname + '/client/views/menu.jade', {user: req.session.user});
	}
});

app.get('/profile', function(req, res){
	if(req.session.user){
		res.render(__dirname + '/client/views/profile.jade', {user: req.session.user, avatar: req.session.avatar});
	}
});

app.post('/fileupload', function(req, res){
	if(req.session.user){
	  	var form = new formidable.IncomingForm();
	  	form.parse(req, function (err, fields, files) {
			var oldpath = files.filetoupload.path;

			var str = files.filetoupload.name;

			var tok = str.split(".");
			//only jpg allowed
			if(tok[1] == 'jpg'){
				var newpath = __dirname + '/client/img/uploads/avatars/' + req.session.user + '.jpg';
				req.session.avatar = './img/uploads/avatars/' + req.session.user + '.jpg';
				mv(oldpath, newpath, function(err){
					if (err) throw err;
					res.render(__dirname + '/client/views/profile.jade', {user: req.session.user, successfulUpload: true, avatar: req.session.avatar});
				});
			}
		});
	}
});

app.get('/play', function(req, res){
	if(req.session.user){

		var controllerButtons = {
			forward: req.session.forward,
			backward: req.session.backward,
			left: req.session.left,
			right: req.session.right,
			attack: req.session.attack
		};

		res.render(__dirname + '/client/views/index.jade', {user: req.session.user, controllerCode: req.session.controllerCode, controlButtons:  JSON.stringify(controllerButtons)});
	}else{
		res.render(__dirname + '/client/views/login.jade');
	}
});

app.route('/logout')
    .get( function( req, res ){

		deleteUserFromSessionArray(req.session.user);

        req.session.destroy(function(err){
            if(err){
                console.log(err);
            }
            else
            {
                res.render(__dirname + '/client/views/login.jade'); //kijelentkeztunk
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

app.route('/login')
	.get(function(req, res) {
		//res.sendFile(__dirname + '/client/views/login.html');
		res.render(__dirname + '/client/views/login.jade');
	})
	.post (function(req, res) {
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files){

			var username = fields.username;
			var password = fields.password;

			if(checkIfUserIsAlreadyLogged(username)){
				res.render(__dirname + '/client/views/login.jade', {information: "The user already uses this account!"});
			}
			else {
				isValidPassworrd(fields, function(response, username) {
					if(response){
						console.log("Successful login!");
						req.session.user = username;

						var fileExistence = __dirname + '/client/img/uploads/avatars/' + req.session.user + '.jpg';
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

								res.render(__dirname + '/client/views/menu.jade', {user: req.session.user,
									forward:req.session.forward,
									backward:req.session.backward,
									left:req.session.left,
									right:req.session.right,
									attack:req.session.attack
								});
							} else {
								console.log("No documents found");
								res.render(__dirname + '/client/views/menu.jade', {user: req.session.user});
							}
						});
					}else{
						res.render(__dirname + '/client/views/login.jade', {information: "Unsuccessful login!"});
					}
				});
			}
		});

	});

app.route('/register')
	.get(function(req, res) {
		//res.sendFile(__dirname + '/client/views/register.html');
		res.render(__dirname + '/client/views/register.jade');
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
					//res.redirect('/register');
					res.render(__dirname + '/client/views/register.jade', {information: "Username already taken!"});
				}else{
					addUser(fields, function(){
						console.log("Successful registration!");

						sendEmail(fields);

						//res.redirect('/login');
						res.render(__dirname + '/client/views/login.jade', {information: "Successful registration!"});
					});
				}
			});
		});
	});

app.route('/options')
	.get(function(req, res) {
		if(req.session.user){
			res.render(__dirname + '/client/views/options.jade', {controllerCode: req.session.controllerCode, user: req.session.user,
				forward:  checkIfArrowKey(req.session.forward), backward:  checkIfArrowKey(req.session.backward), left:  checkIfArrowKey(req.session.left),
				right:  checkIfArrowKey(req.session.right), attack:  checkIfArrowKey(req.session.attack),
				forwardText:  Number(req.session.forward), backwardText:  req.session.backward, leftText:  req.session.left,
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

//checks if the user has given a buttont wice for different functionalities
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

app.route('/saveoptions')
	.post(function(req, res){
		if(req.session.user){
			var form = new formidable.IncomingForm();
			form.parse(req, function(err, fields, files){

				if(checkUniqueButton(fields)){
					res.render(__dirname + '/client/views/options.jade', {user: req.session.user, error: "The buttons should be unique!"});
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

					res.render(__dirname + '/client/views/menu.jade', {user: req.session.user});
				//}else{
					//res.render(__dirname + '/client/views/options.jade', {user: req.session.user, error: "The buttons must be one character!"});
				//}
			});
		}
	});

// var isLetterOrArrow = function(str) {
//
// 	switch (str) {
// 		case "Left Arrow":
// 			return true;
// 		case "Right Arrow":
// 			return true;
// 		case "Up Arrow":
// 			return true;
// 		case "Down Arrow":
// 			return true;
// 		default:
// 			break;
// 	}
//
//  	return str.length === 1 && str.match(/[a-z]/i);
// };

server.listen(process.env.PORT || 2000); //2000);
console.log("Server has been started!");

var SOCKET_LIST = {};

//var gameOver = false;

var Entity = function(){
	var self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		id:"",
	};

	self.update = function() {
		self.updatePosition();
	};

	self.updatePosition = function(){

		self.x += self.spdX;
		self.y += self.spdY;

	};

	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
	};

	return self;
};

var Player = function(id){
	var self = Entity();
	self.id = id;
	self.number = "" + Math.floor(10 * Math.random());
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 0;
	self.hp = 0;
	self.hpMax = 0;
	self.score = 0;
	self.tankAngle = 0;
	self.turnSpeed = 0;

	self.damage = 0;


	//cuz we dont know the width and height of the image, later its gonna be updated
	self.xPivot = 0;
	self.yPivot = 0;

	self.imgWidth = 0;
	self.imgHeight = 0;
	self.imgNR = 0;

	self.maxBullet = 0;
	self.curBullet = 0;
	self.reloadTime = 0;
	self.reloading = false;
	//self.towerAngle = 0;

	self.canShoot = true;
	self.recoilTime = 0;

	//this overwrites the update of the Entity, it calls the entity's update and the player's update
	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();

		self.checkCollisions();

		if(self.pressingAttack && self.canShoot && !self.reloading){

			//for(var i = -3; i < 3; i++)
			//    self.shootBullet(i * 10 + self.mouseAngle);
			if(self.curBullet > 0){
				self.shootBullet(self.mouseAngle);
				self.curBullet--;
			}
			if(self.curBullet == 0){
				self.reloading = true;
				setTimeout(self.reload, self.reloadTime);
			}
			self.canShoot = false;
			setTimeout(self.setCanShoot, self.recoilTime);
		}
	};

	self.setCanShoot = function(){
		self.canShoot = true;
	};

	self.reload = function(){
		self.curBullet = self.maxBullet;
		self.reloading = false;
	};

	self.collides = function(a, b){
		if (a.x < b.x + b.imgWidth &&
			a.x + a.imgWidth > b.x &&
			a.y < b.y + b.imgHeight &&
			a.y + a.imgHeight > b.y) {
			return true;
		}
		return false;
	};

	self.checkIfOutOfMap = function(){
		if(self.x <= 0) {
			self.x = 10;
		}else if(self.x >= 950){
			self.x = 940;
		}else if(self.y <=0){
			self.y = 10;
		}else if(self.y >= 700){
			self.y = 690;
		}
	};

	self.checkCollisions = function(){
		if (Player.list != undefined){
			for(var i in Player.list){
				var player = Player.list[i];
				self.checkIfOutOfMap();
				//its not the same player
				if(player.x != self.x && player.y != self.y){
					//check the collision
					if(self.collides(self,player)){
						self.x -= self.spdX;
						self.y -= self.spdY;
					}
				}
			}
		}
	};

	self.shootBullet = function(angle){
		var b = Bullet(self.id, angle, self.damage);
		b.x = self.xPivot;
		b.y = self.yPivot;
	};

	self.updateSpd = function() {

		if(self.pressingRight){
			self.tankAngle += self.turnSpeed;
		}else if (self.pressingLeft){
			self.tankAngle -= self.turnSpeed;
		}

		var TO_RADIANS = Math.PI/180;

		if(self.pressingUp){
			self.spdX = self.maxSpd * Math.cos(self.tankAngle * TO_RADIANS);
			self.spdY = self.maxSpd * Math.sin(self.tankAngle * TO_RADIANS);
		}
		else if(self.pressingDown){
			self.spdX = (-1) * self.maxSpd * Math.cos(self.tankAngle * TO_RADIANS);
			self.spdY = (-1) * self.maxSpd * Math.sin(self.tankAngle * TO_RADIANS);
		}
		else{
			self.spdY = 0;
			self.spdX = 0;
		}
	};

	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			number:self.number,
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
			tankAngle:self.tankAngle,
			mouseAngle:self.mouseAngle,
			curBullet:self.curBullet,
			imgNR:self.imgNR,
		};
	};

	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
			tankAngle:self.tankAngle,
			mouseAngle:self.mouseAngle,
			curBullet:self.curBullet,
			reloading:self.reloading,
			imgNR:self.imgNR,
			canShoot:self.canShoot,
		};
	};

	Player.list[id] = self;
	initPack.player.push(self.getInitPack());
	return self;
};

Player.list = {};
Player.onConnect = function(socket){
	var player = Player(socket.id);

	console.log("New Player's controllerCode: " + socket.code);

	socket.on('keyPress', function(data){
		if(data.inputId === 'left'){
			player.pressingLeft = data.state;
		}
		else if(data.inputId === 'right'){
			player.pressingRight = data.state;
		}
		else if(data.inputId === 'up'){
			player.pressingUp = data.state;
		}
		else if(data.inputId === 'down'){
			player.pressingDown = data.state;
		}
		else if(data.inputId === 'attack'){
			player.pressingAttack = data.state;
		}
		else if(data.inputId === 'mouseAngle'){
			player.mouseAngle = data.state;
			player.xPivot = data.x;
			player.yPivot = data.y;
		}
	});

	socket.on('playerImgData', function(data){
		player.imgWidth = data.width;
		player.imgHeight = data.height;
		player.imgNR = data.imgNR;

		switch(player.imgNR){
			case 1:player.maxBullet = 5; player.curBullet = 5; player.reloadTime = 5000; player.recoilTime = 500;
				player.hp = 100;
				player.hpMax = 100;
				player.maxSpd = 6.5;
				player.damage = 10;
				player.turnSpeed = 10;
				break;
			case 2:player.maxBullet = 8; player.curBullet = 8; player.reloadTime = 2500; player.recoilTime = 500;
				player.hp = 50;
				player.hpMax = 50;
				player.maxSpd = 7.5;
				player.damage = 7.5;
				player.turnSpeed = 15;
				break;
			case 3:player.maxBullet = 3; player.curBullet = 3; player.reloadTime = 10000; player.recoilTime = 500;
				player.hp = 150;
				player.hpMax = 150;
				player.maxSpd = 5;
				player.damage = 25;
				player.turnSpeed = 5;
				break;
		}
		socket.emit('init', {
			selfId:socket.id,
			player:Player.getAllInitPack(),
			bullet:Bullet.getAllInitPack(),
		});
	});
};

Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list){
		players.push(Player.list[i].getInitPack());
	}
	return players;
};

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
};

Player.update = function() {
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
};


var Bullet = function(parent, angle, damage){
	var self = Entity();
	self.id = Math.random();
	self.spdX = Math.cos(angle/180*Math.PI) * 10;
	self.spdY = Math.sin(angle/180*Math.PI) * 10;
	self.parent = parent;
	self.timer = 0;
	self.toRemove = false;

	//default
	self.imgWidth = 7;
	self.imgHeight = 7;

	var super_update = self.update;

	self.update = function(){
		if(self.timer++ > 100)
			self.toRemove = true;
		super_update();

		for(var i in Player.list){
			var p = Player.list[i];

			if(p.collides(p, self) && self.parent !== p.id){
				p.hp -= damage;

				if(p.hp <= 0){

					var shooter = Player.list[self.parent];
					if(shooter){
						shooter.score += 1;
					}

					for(var i in SOCKET_LIST){
						var socket = SOCKET_LIST[i];
						socket.emit('explosion', p);
					}
				}
				self.toRemove = true;
			}
		}
	};

	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
		};
	};

	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
		};
	};


	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
};

Bullet.list = {};
Bullet.update = function() {
	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();

		if(bullet.toRemove){
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		}
		else{
			pack.push(bullet.getUpdatePack());
		}

	}
	return pack;
};

Bullet.getAllInitPack = function(){
	var bullets = [];
	for(var i in Bullet.list){
		bullets.push(Bullet.list[i].getInitPack());
	}
	return bullets;
};


var DEBUG = true;

//tries to find a user where the username and password exists
var isValidPassworrd = function(data, cb){
//	return cb(true,null);

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
	//return cb(false);
	db.account.find({username:data}, function(err, res){
		if(res.length > 0)
			cb(true);
		else
			cb(false);
	});
};

var addUser = function(data, cb){

//	return cb();
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

var io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	//igy kulonboztetem meg a mobil es a webkliens socketeket
	socket.mobile = true;

	console.log("Someone connected: " + socket.id);

	console.log("The sockets: ");
	for(var i in SOCKET_LIST){
		console.log(SOCKET_LIST[i].id);
	}

	socket.on('startGame', function(data){
		socket.code = data;
		socket.mobile = false;
		Player.onConnect(socket);
	});

	socket.on('code', function(data){

		for(var i in SOCKET_LIST){

			var currentSocket = SOCKET_LIST[i];

			if(currentSocket.code == data.code && currentSocket.mobile == false) {

				var curPlayer = Player.list[currentSocket.id];
				var stateValue;

				if(data.state == "true"){
					stateValue = true;
				}else{
					stateValue = false;
				}

				switch(data.inputId) {
					case "up":
						curPlayer.pressingUp = stateValue;
						break;
					case "down":
						curPlayer.pressingDown = stateValue;
						break;
					case "left":
						curPlayer.pressingLeft = stateValue;
						break;
					case "right":
						curPlayer.pressingRight = stateValue;
						break;
					case "attack":
						curPlayer.pressingAttack = stateValue;
						break;
					case "mouseAngle":
					//	if(data.state > 0)
					//	{
							curPlayer.mouseAngle = parseFloat(data.state);
						//}
						//else{
						//	curPlayer.mouseAngle = parseFloat(data.state - 90.0);
					//	}
						break;
					default:
						break;
				}
			}
		}
	});

	//this does not need an emit function on the client side, its doen automatically
	socket.on('disconnect', function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});

	socket.on('sendMsgToServer', function(data){
		var playerName = ("" + socket.id).slice(2,7);
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat', {"message":data.message, "username":data.username}); //playerName + ': ' + data);
		}
	});

	//ez VESZELYES egyelore nincs lekezelve, ha a kliens egy rossz uzenetet kulde a server halott lehet
	//pl. Player.list = null;
	// socket.on('evalServer', function(data){
	// 	if(!DEBUG)
	// 		return;
	//
	// 	var res = eval(data);
	// 	socket.emit('evalAnswer', res);
	// });

	socket.on('reset', function(data){
		for(var i in Player.list){
			var p = Player.list[i];
			if(p.x == data.x && p.y == data.y){
				p.hp = p.hpMax;

				do{
					p.x = Math.random() * 950;
					p.y = Math.random() * 700;
				}while(checkIfGoodRespawn(p));
			}
		}

	});
});

var checkIfGoodRespawn = function(player){
	for(var i in Player.list){
		if(player.id != Player.list[i].id)
			if(player.collides(Player.list[i],player))
				return true;
	}
	return false;
};

var initPack = {player:[], bullet:[]};
var removePack = {player:[], bullet:[]};

//25 fram per second
setInterval(function(){
	var pack = {
		player:Player.update(),
		bullet:Bullet.update(),
	};

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('init', initPack);
		socket.emit('update', pack);
		socket.emit('remove', removePack);
	}

	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];

}, 1000/25);
