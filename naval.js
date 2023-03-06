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
	if(playing) setTimeout(game_loop,1000/60);
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
			this.direction = PH.Vector.getDir(d.m.x,d.m.y);
			let p = this.pos;
			this.position = new PH.Vector(d.p.dx+p.x,d.p.dy+p.y);
		} else {

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
	constructor(vector){
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
		this.flying = false;
		this.player = null;
		this.speed = 5;
	}
	move(){
		if(this.flying){
			const spin = 3;
			let dir = this.dir;
			// if(keys.down('arrowleft')) dir += 360-spin;
			// if(keys.down('arrowright')) dir += spin;
			this.direction = dir;
			this.position = Vector.getPointIn(Vector.rad(dir),this.speed,this.pos.x,this.pos.y)
		}
	}
	toObjt(){
		let hb = this.toObj();
		let id = this.id;
		let stats = this.stats;
		let flying = this.flying;
		let pid = this.player.id;
		return {hb,id,stats,flying,pid};
	}
}

exports.addPlayer = addPlayer;
exports.remPlayer = remPlayer;