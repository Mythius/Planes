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

class Player extends PH.Hitbox{
	constructor(client,vector){
		super(vector,32,32);
		this.scale = new PH.Vector(.5,.5);
		this.h=40;
		this.client = client;
		this.client.player = this;
		this.id=gid++;
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
			let s = 3;
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
				}
			}
			if(d.shoot){
				new Bullet(this.pos.clone(),this.dir,200);
			}
		} else {
			this.vehicle.dir += d.ddir;
			this.position = this.vehicle.pos;
			if(d.mount){
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

class Plane extends PH.Hitbox{
	constructor(p,vector){
		super(vector,135,179);
		sprites.push(this);
		this.stats = {
			type:'Plane',
			max_health: 200,
			health: 200,
			fuel:100,
			ammo:200,
			bombs:1,
			dead:false
		}
		this.id = gid++;
		console.log('Created Plane ID:'+this.id);
		this.flying = false;
		this.scale = new PH.Vector(.8,.4);
		this.player = null;
		this.speed = 9;
		this.cdown = 30;
	}
	move(){
		if(this.flying){
			const spin = 3;
			let dir = this.dir;
			// if(keys.down('arrowleft')) dir += 360-spin;
			// if(keys.down('arrowright')) dir += spin;
			this.direction = dir;
			this.position = PH.Vector.getPointIn(PH.Vector.rad(dir),this.speed,this.pos.x,this.pos.y);
			if(!this.player){
				if(this.cdown-- == 1){
					this.stats.dead = true;
				} else if(this.cdown == 0){
					removeSprite(this);
				}
			}
		}
	}
	toObjt(){
		let hb = this.toObj();
		let id = this.id;
		let stats = this.stats;
		let flying = this.flying;
		let pid = this.player?.id;
		return {hb,id,stats,flying,pid};
	}
	start(){
		this.flying = true;
	}
}

class Bullet{
	constructor(vector,dir,range){
		
	}
}

exports.addPlayer = addPlayer;
exports.remPlayer = remPlayer;