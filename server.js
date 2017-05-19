var path = require('path');
var http = require('http');
var express = require('express');
var session = require('express-session');

var app = express();
app.set('views', path.join(__dirname, 'client/views'));
app.set("view engine", "pug");

//starts the server
var server = http.createServer(app);

var sessionMiddleware = session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
});
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'client')));

var routes = require('./routes/routes');
app.use('/', routes);

server.listen(process.env.PORT || 2000);
console.log("Server has been started!");

var SOCKET_LIST = {};

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
						curPlayer.mouseAngle = parseFloat(data.state);
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

//25 frame per second
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
