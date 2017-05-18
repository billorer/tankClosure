
	var Img = {};
	Img.bullet = new Image();
	Img.bullet.src = '../img/bullet2.png';

	Img.map = new Image();
	Img.map.src = '../img/map.png';

	Img.tankBodies = {};
	Img.tankTowers = {};

	Img.tankBodies[0] = new Image();
	Img.tankBodies[0].src = '../img/tanks/tank1_body.png';
	Img.tankTowers[0] = new Image();
	Img.tankTowers[0].src = '../img/tanks/tank1_tower.png';

	Img.tankBodies[1] = new Image();
	Img.tankBodies[1].src = '../img/tanks/tank2_body.png';
	Img.tankTowers[1] = new Image();
	Img.tankTowers[1].src = '../img/tanks/tank2_tower.png';

	Img.tankBodies[2] = new Image();
	Img.tankBodies[2].src = '../img/tanks/tank3_body.png';
	Img.tankTowers[2] = new Image();
	Img.tankTowers[2].src = '../img/tanks/tank3_tower.png';


	var controllerButtons;

	var chosenTank = function(tankNumber, controllerCode, controlButtons){
		document.getElementById("chooseTankDiv").style.display = 'none';
		document.getElementById("gameDiv").style.display = 'block';

		var tankBodyImage = Img.tankBodies[tankNumber - 1];

		controllerButtons = controlButtons;

		socket.emit('startGame', controllerCode);
		socket.emit('playerImgData', {imgNR: tankNumber, width:tankBodyImage.width, height:tankBodyImage.height});
	};

	//explosion
	/*var explosionImages = {};
	for ( var index = 0; index < 17; index++){
		explosionImages[index] = new Image();
		explosionImages[index].onload = function () {

		};
		explosionImages[index].src = "/client/img/explosion/frame_" + index + "_delay-0.01s.gif";
	}

	function explosion(destroyedTank) {
		gameOver = false;

		var indexGif = 0;
		var id = setInterval(frame, 62.5);

		function frame() {
			if(indexGif != 17)
				ctx.clearRect(destroyedTank.x, destroyedTank.y, explosionImages[indexGif].width / 2, explosionImages[indexGif].height / 2);

			console.log("Frame");
			if (indexGif == 17) {
				clearInterval(id);

				return;
				//reset();
				//main();
			} else {
				ctx.drawImage(explosionImages[indexGif], destroyedTank.x, destroyedTank.y, explosionImages[indexGif].width / 3, explosionImages[indexGif].height / 3);
				indexGif++;
			}
		}
	}*/

	var WIDTH = document.getElementById('ctx').width;
	var HEIGHT = document.getElementById('ctx').height;

	var socket = io();

	var curMouseAngle = 0;

	//chat
	var chatText = document.getElementById('chat-text');
	var chatInput = document.getElementById('chat-input');
	var chatForm = document.getElementById('chat-form');

	socket.on('evalAnswer', function(data){
		console.log(data);
	});

	socket.on('addToChat', function(data){
		//var username = document.getElementById('username').innerText;
		// username = username.slice(0, -1);

		var date = new Date;
		date.setTime(new Date().getTime());

		var seconds = date.getSeconds();
		var minutes = date.getMinutes();
		var hour = date.getHours();

		chatText.innerHTML += '<div>' + "<" + hour + ":" + minutes + ":" + seconds + ">" + data.username + ": " + data.message + '</div>';
		//this makes sure when the new message arrives, the user should not scroll to see it
   		chatText.scrollTop = chatText.scrollHeight;
	});

	chatForm.onsubmit = function(e){
		e.preventDefault(); //if we submit without this, the page would be refreshed

		//We take the username from the navbar
		var username = document.getElementById('username').innerText;

		if(chatInput.value[0] === '/')
			socket.emit('evalServer', chatInput.value.slice(1));
		else
			socket.emit('sendMsgToServer', {"message":chatInput.value, "username":username});
		chatInput.value = '';
	};


	// var continueButton = document.getElementById('continueButton');

	// continueButton.onclick = function() {
	// 	var codeDiv = document.getElementById('codeDiv');
	// 	codeDiv.style.display = 'none';
	// 	var chooseTankDiv = document.getElementById('chooseTankDiv');
	// 	chooseTankDiv.style.display = 'block';
	//
	// 	var code = document.getElementById('codeLabel').innerHTML;
	//
	// 	socket.emit('startGame', code);
	// }

	// function getCode(){
	// 	socket.emit('getCode', 'getCode');
	// }

	socket.on('sendCode', function(data){
		document.getElementById('codeLabel').innerHTML = data;
	});


	//GAME---------------------------------------------------

	var ctx = document.getElementById('ctx').getContext('2d');
	ctx.font = '30px Arial';

	var Player = function(initPack){
		var self = {};
		self.id = initPack.id;
		self.number = initPack.number;
		self.x = initPack.x;
		self.y = initPack.y;
		self.hp = initPack.hp;
		self.hpMax = initPack.hpMax;
		self.score = initPack.score;
		self.tankAngle = initPack.tankAngle;
		self.mouseAngle = initPack.mouseAngle;
		self.curBullet = initPack.curBullet;

		self.imgNR = initPack.imgNR;

		//default
		self.reloading = false;

		self.drawHP = function(){
			var hpWidth = 50 * self.hp / self.hpMax;

			// ctx.shadowBlur = 20;
			// ctx.shadowColor = "#ff4949";
			// ctx.lineWidth = 2.5;
			// ctx.strokeStyle = "#003300";
			//console.log("SELF: " + self.hp + " " + self.hpMax);
			ctx.fillStyle = "red";
			ctx.fillRect(self.xPlayerPivot - hpWidth / 2, self.yPlayerPivot - 40, hpWidth, 4);
			//ctx.shadowColor = "rgba(0, 0, 0, 0)";
			//console.log("HPWIDTH: " + hpWidth + " " + self.hp + " " + self.hpMax);
		};

		self.drawTankBody = function(TO_RADIANS, tankBodyImage){

			self.xPlayerPivot = self.x + tankBodyImage.width / 2;
			self.yPlayerPivot = self.y + tankBodyImage.height / 2;

			var width = tankBodyImage.width;
			var height = tankBodyImage.height;

			/// we make sure that the current state is saved
			ctx.save();

			/// make sure pivot is moved to center
			ctx.translate(self.xPlayerPivot, self.yPlayerPivot);

			/// rotate, you should make new sprite where direction
			/// points to the right. I'm add 90 here to compensate
			ctx.rotate((self.tankAngle + 90) * TO_RADIANS);

			/// translate back before drawing the sprite
			ctx.translate(-self.xPlayerPivot, -self.yPlayerPivot);
			ctx.drawImage(tankBodyImage, 0, 0, width, height, self.x, self.y, width, height);

			ctx.restore();
		};

		self.drawTankTower = function(TO_RADIANS, tankBodyImage, tankTowerImage){
			//TANKTOWER
			ctx.save();

			/// make sure pivot is moved to center
			ctx.translate(self.xPlayerPivot, self.yPlayerPivot);

			/// rotate, you should make new sprite where direction
			ctx.rotate((self.mouseAngle - 90) * TO_RADIANS);
			/// translate back before drawing the sprite
			ctx.translate(-self.xPlayerPivot, -self.yPlayerPivot);

			var newXTower = self.x + tankBodyImage.width / 2 - tankTowerImage.width / 2;
			var newYTower = self.y + tankBodyImage.height / 2 - tankTowerImage.width / 2;

			if(self.canShoot == false && self.recoilSpeed < 17 && !self.reloading){
				self.recoilSpeed += 1.5;
				newYTower -= self.recoilSpeed;
			}else{
				self.recoilSpeed = 0;
			}

			ctx.drawImage(tankTowerImage, 0, 0, tankTowerImage.width, tankTowerImage.height, newXTower, newYTower, tankTowerImage.width, tankTowerImage.height);
			ctx.restore();
		};

		self.draw = function(){
		  if(self.imgNR != 0){
			var TO_RADIANS = Math.PI/180;
			var tankBodyImage = Img.tankBodies[self.imgNR - 1];
			var tankTowerImage = Img.tankTowers[self.imgNR - 1];

			self.drawTankBody(TO_RADIANS, tankBodyImage);
			self.drawTankTower(TO_RADIANS, tankBodyImage, tankTowerImage);

			self.drawHP();
		  }
	  };

		Player.list[self.id] = self;
		for(var i in Player.list){
			Player.list[i].draw();
		}
		return self;
	};

	Player.list = {};

	var Bullet = function(initPack){
		var self = {};
		self.id = initPack.id;
		self.x = initPack.x;
		self.y = initPack.y;

		self.draw = function(){

			var width = Img.bullet.width / 2;
			var height = Img.bullet.width / 2;

			ctx.drawImage(Img.bullet, 0, 0, Img.bullet.width, Img.bullet.height,
				self.x, self.y, width, height);
		};

		Bullet.list[self.id] = self;
		return self;
	};

	Bullet.list = {};

	var selfId = null;

	//init
	socket.on('init', function(data){
		if(data.selfId){
			selfId = data.selfId;
		}

		for(var i = 0; i < data.player.length; i++){
			new Player(data.player[i]);
		}

		for(var i = 0; i < data.bullet.length; i++){
			new Bullet(data.bullet[i]);
		}
	});

	//update
	socket.on('update', function(data){

		for(var i = 0; i < data.player.length; i++){

			var pack = data.player[i];
			var p = Player.list[pack.id];
			if(p){
				if(pack.x !== undefined)
					p.x = pack.x;
				if(pack.y !== undefined)
					p.y = pack.y;
				if(pack.hp !== undefined)
					p.hp = pack.hp;
				if(pack.hpMax !== undefined)
					p.hpMax = pack.hpMax;
				if(pack.score !== undefined)
					p.score = pack.score;
				if(pack.tankAngle !== undefined)
					p.tankAngle = pack.tankAngle;
				if(pack.mouseAngle !== undefined)
					p.mouseAngle = pack.mouseAngle;
				if(pack.curBullet !== undefined)
					p.curBullet = pack.curBullet;
				if(pack.reloading !== undefined)
					p.reloading = pack.reloading;
				if(pack.imgNR !== undefined)
					p.imgNR = pack.imgNR;
				if(pack.canShoot !== undefined){
						p.canShoot = pack.canShoot;
				}
			}
		}

		for(var i = 0; i < data.bullet.length; i++){
			var pack = data.bullet[i];
			var b = Bullet.list[data.bullet[i].id];
			if(b){
				if(pack.x !== undefined)
					b.x = pack.x;
				if(pack.y !== undefined)
					b.y = pack.y;
			}
		}
	});

	//remove
	socket.on('remove', function(data){
		for(var i = 0; i < data.player.length; i++){
			delete Player.list[data.player[i]];
		}
		for(var i = 0; i < data.bullet.length; i++){
			delete Bullet.list[data.bullet[i]];
		}
	});

	socket.on('explosion', function(data){
		//explosion(data);
		socket.emit('reset', data);
	});

	setInterval(function(){
		if(!selfId)
			return;

		ctx.clearRect(0, 0, WIDTH, HEIGHT);

		//drawMap();
		drawCircle();
		drawScore();
		drawRemainingBullets();

		if(Player.list[selfId].reloading)
			drawReloading();

		for(var i in Player.list){
			Player.list[i].draw();
		}
		for(var i in Bullet.list)
			Bullet.list[i].draw();
	}, 40);

	var drawMap = function(){
		ctx.drawImage(Img.map, 0, 0);
	};

	var drawCircle = function(){
		var radius = 45;
		var cx = Player.list[selfId].x;
		var cy = Player.list[selfId].y;


		var tankBodyImage = Img.tankBodies[Player.list[selfId].imgNR - 1];
		var tankTowerImage = Img.tankTowers[Player.list[selfId].imgNR - 1];

		var xPlayerPivot = Player.list[selfId].x + tankBodyImage.width / 2;
		var yPlayerPivot = Player.list[selfId].y + tankBodyImage.height / 2;

		ctx.shadowBlur = 30;
		ctx.shadowColor = "#77ff49";
		ctx.lineWidth = 2.5;
		ctx.strokeStyle = "#003300";
		ctx.beginPath();
		ctx.arc(xPlayerPivot, yPlayerPivot, radius, 0, 2 * Math.PI);
		ctx.stroke();

		ctx.shadowColor = "rgba(0, 0, 0, 0)";
	};

	var drawScore = function(){
		ctx.fillStyle = 'black';
		ctx.fillText("Score: " + Player.list[selfId].score, 5, 30);
	};

	var drawRemainingBullets = function(){
		ctx.fillStyle = 'black';
		ctx.fillText("Bullets: " + Player.list[selfId].curBullet, 5, 70);
	};

	var drawReloading = function(){
		ctx.fillStyle = 'black';
		ctx.fillText("Reloading... ", 5, 110);
	};


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

var lastDownTarget, canvasKeyDown;
canvas = document.getElementById('ctx');

document.addEventListener('mousedown', function(event) {
    lastDownTarget = event.target;
}, false);

document.addEventListener('keydown', function(event) {
    if(lastDownTarget == canvas) {
		if(event.keyCode == controllerButtons.right) //68) //d
			socket.emit('keyPress', {inputId:'right', state:true});
		if(event.keyCode == controllerButtons.backward)//83) //s
			socket.emit('keyPress', {inputId:'down', state:true});
		if(event.keyCode == controllerButtons.left)//65) //a
			socket.emit('keyPress', {inputId:'left', state:true});
		if(event.keyCode == controllerButtons.forward)///87) //w
			socket.emit('keyPress', {inputId:'up', state:true});
		if(event.keyCode == controllerButtons.attack)
			socket.emit('keyPress', {inputId:'attack', state:true});
    }
}, false);

document.addEventListener('keyup', function(event) {
    if(lastDownTarget == canvas) {
		if(event.keyCode == controllerButtons.right)//68) //d
			socket.emit('keyPress', {inputId:'right', state:false});
		if(event.keyCode == controllerButtons.backward)//83) //s
			socket.emit('keyPress', {inputId:'down', state:false});
		if(event.keyCode == controllerButtons.left)//65) //a
			socket.emit('keyPress', {inputId:'left', state:false});
		if(event.keyCode == controllerButtons.forward)//87) //w
			socket.emit('keyPress', {inputId:'up', state:false});
		if(event.keyCode == controllerButtons.attack)
			socket.emit('keyPress', {inputId:'attack', state:false});
    }
}, false);

	document.onmousedown = function(event){
		if(lastDownTarget == canvas) {
			if(controllerButtons.attack == 1){
				socket.emit('keyPress', {inputId:'attack', state:true});
			}

		}
	};

	document.onmouseup = function(event){
		if(lastDownTarget == canvas) {
			if(controllerButtons.attack == 1){
				socket.emit('keyPress', {inputId:'attack', state:false});
			}
		}
	};

	document.onmousemove = function(event){
		//selfID szukseges, h tudjuk, melyik jatekosrol beszelunk, az imgNR meg akkor nem nulla, ha a jatekos mar kivalasztott maganak egy tankot
	  if(selfId != null && Player.list[selfId].imgNR != 0){

		var cx = Player.list[selfId].x + Img.tankBodies[Player.list[selfId].imgNR - 1].width / 2;
		var cy = Player.list[selfId].y + Img.tankBodies[Player.list[selfId].imgNR - 1].height / 2;

		//Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
		var radius = 80;

		var canvas = document.getElementById('ctx');
		// get mouse x/y
		var r = canvas.getBoundingClientRect(),
			mx = event.clientX - r.left,
			my = event.clientY - r.top;

		// get diff. between mouse and circle center
		var dx = mx - cx,
			dy = my - cy,
			angle = Math.atan2(dy, dx);

		console.log("DX: " + dx + " DY: " + dy);

		// get new point
		var x = cx + radius * Math.cos(angle),
			y = cy + radius * Math.sin(angle);

		// draw line to mouse
		//ctx.beginPath();
		//ctx.moveTo(cx, cy);
		//ctx.lineTo(mx, my);
		//ctx.stroke();

		// draw dot on new point
		//ctx.fillRect(x - 2, y - 2, 8, 8);
		console.log("angle11111111111111111111111: " + angle);
		console.log("angle2222222222222222: " + angle / Math.PI * 180);

		socket.emit('keyPress', {inputId:'mouseAngle', state:angle / Math.PI * 180, x:x, y:y});
	  }
  };
