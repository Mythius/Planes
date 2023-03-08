var socket = io();
var name = '',started=false;
var canvas = obj('canvas'),ctx=canvas.getContext('2d');
var drawable = [],bullets = [];
var drawObjs = {};
var plane,ID=-1;
var bg = new Image;bg.src='imgs/bg.png';
var pbg;
bg.onload = function(){
	pbg=ctx.createPattern(bg,'repeat');
}

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
	// loop();
}

function explode(vec){
	let exp = new Sprite('imgs/explode/00.png');
	exp.position = vec;
	exp.addAnimation('imgs/explode/explode.anims').then(e=>{
		drawable.push(exp);
		exp.animation.play('explode',false).then(e=>{
			removeDrawable(exp);
		})
	})
}

function removeDrawable(d){
	let ix = drawable.indexOf(d);
	if(ix!=-1){
		drawable.splice(ix,1);
	}
}

function setup(){
	socket.on('nav-id',id=>{ID=id});
	socket.on('nav-data',data=>{
		for(let sp of data.sdata){
			let d = drawObjs[sp.id];
			if(d){
				d.upd(sp);
				if(d.stats.dead){
					if(!(drawable[1] instanceof Player)) explode(drawObjs[sp.id].pos);
					removeDrawable(drawObjs[sp.id]);
					drawObjs[sp.id] = null;
					return;
				}
			} else {
				if(sp.stats.dead) continue;
				if(sp.stats.type=='Player'){
					d = new Player(sp);
				} else if(sp.stats.type=='Plane'){
					d = new Plane(sp); 
				}
				drawObjs[sp.id] = d;
				drawable.push(d);
			}
		}
		bullets = [];
		for(let wp of data.wdata){
			bullets.push(wp)
		}
		loop();
	});
}

function controls(){
	let command_data = {
		p:{dx:0,dy:0},
		m:{x:0,y:0},
		shoot:false,
		vreq:'', // vehicle request
		mount:false,
		ddir:0
	}
	if(keys.down('a')){
		command_data.p.dx -= 1;
		command_data.ddir -= 3;
	}
	if(keys.down('d')){
		command_data.p.dx += 1;
		command_data.ddir += 3;
	}
	if(keys.down('s')){
		command_data.p.dy += 1;
	}
	if(keys.down('w')){
		command_data.p.dy -= 1;
	}
	if(keys.down('b')){
		keys.keys['b'] = false;
		command_data.vreq = 'Plane';
	}
	if(keys.down('e')){
		keys.keys['e'] = false;
		command_data.mount = true;
	}
	command_data.shoot = mouse.down;
	command_data.m.x = canvas.width/2 - mouse.pos.x;
	command_data.m.y = canvas.height/2 - mouse.pos.y;
	socket.emit('nav-controls',command_data);
}

function loop(){
	// if(started) setTimeout(loop,1000/60);
	if(keys.down('escape')) started = false;
	ctx.clearRect(-2,-2,canvas.width+2,canvas.height+2);
	ctx.fillStyle=pbg;
	let me = drawObjs[ID];
	if(me){
		ctx.save();
		ctx.translate(canvas.width/2-me.pos.x,canvas.height/2-me.pos.y);
	}
	ctx.beginPath();
	ctx.rect(-500,-500,1000,1000);
	ctx.fill();
	ctx.beginPath();
	ctx.strokeStyle = 'black';
	for(let bullet of bullets){
		ctx.rect(bullet.x,bullet.y,1,1);
	}
	ctx.stroke();
	for(let thing of drawable){
		thing.draw();
	}
	if(me) ctx.restore();
	controls();
}

function tv(o){return new Vector(o.x,o.y)}

class Player extends Sprite{
	constructor(data){
		super('imgs/player/sprite_1.png');
		this.upd(data);
	}
	upd(d){
		this.stats = d.stats;
		this.w = d.hb.w;
		this.h = d.hb.h;
		this.direction = d.hb.dir;
		this.position = tv(d.hb.pos);
		this.setOffset = tv(d.hb.offset);
		this.setScale = tv(d.hb.scale);
		this.v = d.v;
		if(d.v){
			this.visible = false;
		} else {
			this.visible = true;
		}
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
		this.direction = d.hb.dir;
		this.flying = d.flying;
		if(this.pid) {
			this.player = drawObjs[d.pid];
			this.player.vehicle = this;
			this.player.position = tv(d.hb.pos);
		}
		if(this.flying){
			this.animation?.play('fly',true);
		} else {
			this.animation?.stop();
		}
	}
}