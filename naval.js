const PH = require('./physics.js');

var gid = 1111111;
var clients = [];
var weapons = [];
var sprites = [];
var playing = true;
var gdata = {

};

function addPlayer(client,data){
	let p = new Player(client,new PH.Vector(0,0));
}
function remPlayer(client){
	if(client.player){
		removeSprite(client.player);
		if(client.player.vehicle) client.player.vehicle.player = null;
	}
}

game_loop();

function game_loop(){
	if(playing) setTimeout(game_loop,1000/45);
	for(sprite of sprites){
		sprite.move();
		if(sprite.stats.dead>0){
			if(sprite.stats.dead>1){
				removeSprite(sprite);
			}
			sprite.stats.dead++;
		}
	}
	for(let weapon of weapons){
		weapon.move();
		for(let sprite of sprites){
			if(weapon.touches(sprite)){
				sprite.stats.health -= 1;
				weapon.remove();
				if(sprite.stats.health < 1){
					sprite.stats.dead = true;
				}
			}
		}
	}
	sendData();
}

function sendData(){
	let sdata = sprites.map(e=>e.toObjt());
	let wdata = weapons.map(e=>e.toObjt());
	let all_data = {sdata,wdata,gdata};
	for(let client of clients){
		client.emit('nav-data',all_data);
	}
}

function removeSprite(s){
	let ix = sprites.indexOf(s);
	if(ix!=-1){
		sprites.splice(ix,1);
	}
}

function tv(o){return new PH.Vector(o.x,o.y)}

PH.Hitbox.prototype.team = -1;

class Player extends PH.Hitbox{
	constructor(client,vector){
		super(vector,32,32);
		this.scale = new PH.Vector(.5,.5);
		this.h=40;
		this.client = client;
		this.client.player = this;
		this.id=gid++;
		this.team = this.id;
		this.stats = {
			type:'Player',
			max_health: 50,
			health: 50,
			dead: false
		}
		this.vehicle = null;
		clients.push(client);
		client.socket.on('nav-controls',d=>{
			this.controls(d);
		});
		client.emit('nav-id',this.id);
		sprites.push(this);
		console.log('Created Player, ID:'+this.id);
	}
	controls(d){
		if(!this.vehicle){
			this.direction = PH.Vector.getDir(d.m.x,d.m.y)+90;
			let p = this.pos;
			let s = 3; // player speed
			d.p.dx = Math.max(Math.min(d.p.dx,1),-1);
			d.p.dy = Math.max(Math.min(d.p.dy,1),-1);
			this.position = new PH.Vector(d.p.dx*s+p.x,d.p.dy*s+p.y);
			if(d.vreq == 'Plane'){
				new Plane(this,this.pos.clone());
			}
			if(d.mount){
				let vhs = sprites.filter(e=>!e.client).filter(e=>e.touches(this));
				if(vhs.length != 0){
					this.vehicle = vhs[0];
					this.vehicle.start();
					this.vehicle.player = this;
					this.vehicle.team = this.team;
				}
			}
			if(d.shoot){
				new Bullet(this.team,this.pos.x,this.pos.y,this.dir-90,400,16).offsetStart(7,5)
			}
		} else {
			this.vehicle.turn(d.ddir);
			this.position = this.vehicle.pos;
			this.vehicle.shoot(this,d);
			if(d.mount){
				this.vehicle.team = -1;
				this.vehicle.player = null;
				this.vehicle = null;
			}
		}
	}
	move(){}
	toObjt(){
		let hb = this.toObj();
		let id = this.id;
		let stats = this.stats;
		let v = this.vehicle?.id;
		return {hb,id,stats,v};
	}
}

class Vehicle extends PH.Hitbox{
	constructor(p,vector){
		super(vector,135,179);
		sprites.push(this);
		this.id = gid++;
		this.on = false;
		this.stats = {};
		this.player = null;
		this.spin = 0; // must overwrite turn speed
		this.team = 0; // 0 Means not on team, -1 mean invincible, otherwise team ids must match
	}
	moveVehicle(){
		if(this.on){
			let dir = this.dir;
			this.position = PH.Vector.getPointIn(PH.Vector.rad(dir),this.speed,this.pos.x,this.pos.y);
		}
	}
	turn(ddir){
		this.dir += this.spin * Math.max(Math.min(ddir,1),-1);
	}
	toObjt(){
		let hb = this.toObj();
		let id = this.id;
		let stats = this.stats;
		let on = this.on;
		let pid = this.player?.id;
		return {hb,id,stats,on,pid};
	}
	start(){
		this.on = true;
	}
}

class Plane extends Vehicle{
	constructor(p,vector){
		super(p,vector);
		this.stats = {
			type:'Plane',
			max_health: 200,
			health: 200,
			fuel:100,
			ammo:200,
			bombs:1,
			dead:false
		}
		this.setScale = new PH.Vector(.8,.4);
		this.speed = 16;
		this.cdown = 30;
		this.spin = 3;
	}
	move(){
		this.moveVehicle();
		if(this.on){
			if(!this.player){
				if(this.cdown-- == 1){
					this.stats.dead = true;
				} else if(this.cdown == 0){
					removeSprite(this);
				}
			}
		}
	}
	shoot(player,d){
		if(d.shoot){
			new Bullet(player.team,this.pos.x,this.pos.y,this.dir,800,35).offsetStart(22,25);
			new Bullet(player.team,this.pos.x,this.pos.y,this.dir,800,35).offsetStart(-22,25);
		}
	}
}

class Bullet{
	constructor(team,x,y,dir,range,s){
		this.position = new PH.Vector(x,y);
		this.direction = dir;
		this.count_down = range;
		this.speed = s;
		let back_pt = PH.Vector.getPointIn(PH.Vector.rad(this.direction),-this.speed,this.position.x,this.position.y);
		this.line = new PH.Line(this.position.x,this.position.y,back_pt.x,back_pt.y);
		weapons.push(this);
		this.team=team;
	}
	offsetStart(right=0,up=0){
		this.position = PH.Vector.getPointIn(PH.Vector.rad(this.direction),up,this.position.x,this.position.y);
		this.position = PH.Vector.getPointIn(PH.Vector.rad(this.direction+90),right,this.position.x,this.position.y);
	}
	move(){
		this.position = PH.Vector.getPointIn(PH.Vector.rad(this.direction),this.speed,this.position.x,this.position.y);
		this.count_down -= this.speed;
		let back_pt = PH.Vector.getPointIn(PH.Vector.rad(this.direction),-this.speed,this.position.x,this.position.y);
		this.line = new PH.Line(this.position.x,this.position.y,back_pt.x,back_pt.y);
		if(this.count_down < 0){
			this.remove();
		}
	}
	touches(hb){
		return hb.touches(this.line) && hb.team != this.team && hb.team != -1;
	}
	toObjt(){
		return {x:this.position.x,y:this.position.y};
	}
	remove(){
		let ix = weapons.indexOf(this);
		if(ix!=-1){
			weapons.splice(ix,1);
		}
	}
}

exports.addPlayer = addPlayer;
exports.remPlayer = remPlayer;