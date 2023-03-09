var socket = io();
var name = '',started=false;
var canvas = obj('canvas'),ctx=canvas.getContext('2d');
var drawable = [],bullets = [];
var drawObjs = {};
var plane,ID=-1;
var bg = new Image;bg.src='https://i.pinimg.com/originals/fd/02/54/fd0254ea4f545b0e7ba9d4f64f1688a6.jpg';
var pbg;
var gox=0,goy=0;
bg.onload = function(){
	pbg=ctx.createPattern(bg,'repeat');
}

obj('#play').on('click',play);
obj('input').focus();
Hitbox.show = false;
Sprite.prototype.stats = {};


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
					removeDrawable(drawObjs[sp.id]);
					if(drawObjs[sp.id instanceof Battleship]) drawObjs[sp.id].destroy();
					if(!(drawObjs[sp.id] instanceof Player)) explode(drawObjs[sp.id].pos);
					drawObjs[sp.id] = null;
					return;
				}
			} else {
				if(sp.stats.dead) continue;
				if(sp.stats.type=='Player'){
					d = new Player(sp);
				} else if(sp.stats.type=='Plane'){
					d = new Plane(sp); 
				} else if(sp.stats.type=='Battleship'){
					d = new Battleship(sp);
				}
				drawObjs[sp.id] = d;
				drawable.unshift(d);
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
	let cx = canvas.width/2;
	let cy = canvas.height/2
	let command_data = {
		p:{dx:0,dy:0},
		m:{x:0,y:0},
		shoot:false,
		vreq:'', // vehicle request
		mount:false,
		ddir:0,
		cx,
		cy
	}
	if(keys.down('a')){
		command_data.p.dx -= 1;
		command_data.ddir -= 1;
	}
	if(keys.down('d')){
		command_data.p.dx += 1;
		command_data.ddir += 1;
	}
	if(keys.down('s')){
		command_data.p.dy += 1;
	}
	if(keys.down('w')){
		command_data.p.dy -= 1;
	}
	if(keys.down('p')){
		keys.keys['p'] = false;
		command_data.vreq = 'Plane';
	}
	if(keys.down('b')){
		keys.keys['b'] = false;
		command_data.vreq = 'Battleship';
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
		gox = canvas.width/2//-me.pos.x;
		goy = canvas.height/2//-me.pos.y;
		ctx.translate(canvas.width/2-me.pos.x,canvas.height/2-me.pos.y);
	}
	ctx.beginPath();
	ctx.rect(-500,-500,6000,6000);
	ctx.fill();
	ctx.beginPath();
	ctx.strokeStyle = 'black';
	for(let bullet of bullets){
		ctx.rect(bullet.x,bullet.y,1,1);
	}
	ctx.stroke();
	let ordered = layer(drawable);
	for(let thing of ordered){
		thing.draw();
	}
	if(me) ctx.restore();
	controls();
}

function layer(things){
	let layers = {Plane:10,Battleship:1,Turret:2,Player:0};
	return things.sort((a,b)=>layers[a.stats.type]-layers[b.stats.type]);
}

function tv(o){return new Vector(o.x,o.y)}

function loadData(object,d){
	object.stats = d.stats;
	object.w = d.hb.w;
	object.h = d.hb.h;
	object.direction = d.hb.dir;
	object.position = tv(d.hb.pos);
	object.setOffset = tv(d.hb.offset);
	object.setScale = tv(d.hb.scale);
}

class Player extends Sprite{
	constructor(data){
		super('imgs/player/sprite_1.png');
		this.upd(data);
	}
	upd(d){
		loadData(this,d);
		this.v = d.v;
		if(d.v){
			this.visible = false;
		} else {
			this.visible = true;
		}
	}
}

class Island extends Sprite{
	constructor(data){
		
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
		loadData(this,d);
		this.on = d.on;
		if(this.pid) {
			this.player = drawObjs[d.pid];
			this.player.vehicle = this;
			this.player.position = tv(d.hb.pos);
		}
		if(this.on){
			this.animation?.play('fly',true);
		} else {
			this.animation?.stop();
		}
	}
}

class Battleship extends Sprite{
	constructor(data){
		super('imgs/boat/0.png');
		this.turret1 = new Sprite('imgs/Guns/0.png');
		this.turret1.stats.type = 'Turret';
		this.turret2 = new Sprite('imgs/Guns/2.png');
		this.turret2.stats.type = 'Turret';
		drawable.push(this.turret1)
		drawable.push(this.turret2)
		this.upd(data);
	}
	upd(d){
		loadData(this,d);
		this.on = d.on;
		if(this.pid) {
			this.player = drawObjs[d.pid];
			this.player.vehicle = this;
			this.player.position = tv(d.hb.pos);
		}
		var tur1pos = Vector.getPointIn(Vector.rad(this.dir),95,this.pos.x,this.pos.y);
		this.turret1.position = tur1pos;
		let dir1 = d.stats.td1;
		this.turret1.direction = dir1;
		var tur2pos = Vector.getPointIn(Vector.rad(this.dir),-170,this.pos.x,this.pos.y);
		this.turret2.position = tur2pos;
		let dir2 = d.stats.td2;
		this.turret2.direction = dir2;
	}
	destroy(){
		removeDrawable(this.turret1);
		removeDrawable(this.turret2);
	}
}
