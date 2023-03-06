var socket = io();
var name = '',started=false;
var canvas = obj('canvas'),ctx=canvas.getContext('2d');
var drawable = [];
var plane;

obj('#play').on('click',play);
obj('input').focus();

window.onresize = resize;

function resize(){
	canvas.width=window.innerWidth;
	canvas.height=window.innerHeight;
}

function play(){
	hide(obj('menu'));
	name = obj('input').value;
	started = true;

	plane = new Sprite('imgs/planeani/0.png')
	plane.addAnimation('imgs/planeani/plane.anims').then(e=>{
		plane.animation.play('fly',true);
	})
	plane.slideTo(300,300);
	plane.addMovement(plane_fly);

	mouse.start(canvas);
	resize();
	loop();
}

function plane_fly(){
	var dir = Vector.getDir(mouse.pos.x-plane.pos.x,mouse.pos.y-plane.pos.y);
	plane.direction = dir-90;
	plane.slideTo(mouse.pos.x,mouse.pos.y,1);
}

function loop(){
	setTimeout(loop,1000/60);
	ctx.clearRect(-2,-2,canvas.width+2,canvas.height+2);
	plane.draw();
}