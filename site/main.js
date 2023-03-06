var socket = io();
var name = '',started=false;
var canvas = obj('canvas'),ctx=canvas.getContext('2d');
var drawable = [];
var drawObjs = {};
var plane,ID=-1;

obj('#play').on('click',play);
obj('input').focus();
Hitbox.show = true;



window.onresize = resize;

function resize(){
	canvas.width=window.innerWidth;
	canvas.height=window.innerHeight;
}

function play(){
	hide(obj('menu'));
	name = obj('input').value;
	started = true;
	socket.emit('nav-begin',{name});
	setup();
	mouse.start(canvas);
	keys.start(canvas);
	resize();
	loop();
}

function setup(){
	socket.on('nav-id',id=>{ID=id});
	socket.on('nav-data',data=>{
		for(let sp of data.sdata){
			let d = drawObjs[sp.id];
			if(d){
				d.upd(sp);
			} else {
				if(sp.stats.type=='Player'){
					d = new Player(sp);
				} else if(sp.stats.type=='Plane'){
					d = new Plane(sp); 
				}
				drawObjs[sp.id] = d;
				drawable.push(d);
			}
		}
	});
}

function controls(){
	let command_data = {
		p:{dx:0,dy:0},
		m:{x:0,y:0},
		shoot:false,
		vreq:'', // vehicle request
		ddir:0
	}
	if(keys.down('a')){
		command_data.p.dx -= 5;
		command_data.ddir += 3;
	}
	if(keys.down('d')){
		command_data.p.dx += 5;
		command_data.ddir -= 3;
	}
	if(keys.down('s')){
		command_data.p.dy += 5;
	}
	if(keys.down('w')){
		command_data.p.dy -= 5;
	}
	command_data.m.x = canvas.width/2 - mouse.pos.x;
	command_data.m.y = canvas.hight/2 - mouse.pos.y;
	socket.emit('nav-controls',command_data);
}

function loop(){
	if(started) setTimeout(loop,1000/60);
	if(keys.down('escape')) started = false;
	ctx.clearRect(-2,-2,canvas.width+2,canvas.height+2);
	for(let thing of drawable){
		thing.draw();
	}
	controls();
}

function tv(o){return new Vector(o.x,o.y)}

class Player extends Sprite{
	constructor(data){
		super('imgs/player/sprite_0.png');
		this.upd(data);
	}
	upd(d){
		this.stats = d.stats;
		this.w = d.hb.w;
		this.h = d.hb.h;
		this.position = tv(d.hb.pos);
		this.setOffset = tv(d.hb.offset);
		this.setScale = tv(d.hb.scale);
	}
}

class Plane extends Sprite{
	constructor(data){
		super('imgs/planeani/0.png');
		this.addAnimation('imgs/planeani/plane.anims').then(e=>{
			this.animation.play('fly',true);
		});
		this.upd(data);
	}
	upd(d){
		this.stats = d.stats;
		this.w = d.hb.w;
		this.h = d.hb.h;
		this.position = tv(d.hb.pos);
		this.setOffset = tv(d.hb.offset);
		this.setScale = tv(d.hb.scale);
		if(this.pid) {
			this.player = drawObjs[d.pid];
			this.player.vehicle = this;
		}
		if(this.flying){
			this.animation.play('fly',true);
		} else {
			this.animation.stop();
		}
	}
}