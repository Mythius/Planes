class Vector{
	static distance(x1,y1,x2,y2){
		return Math.sqrt((x2-x1)**2+(y2-y1)**2);
	}
	static getDir(x,y){
		return (Math.atan(y/x)+(x<0?0:Math.PI))*180/Math.PI;
	}
	static rad(deg){
		return deg*Math.PI/180;
	}
	static getPointIn(dir,dist,ox=0,oy=0){
		let x = ox + Math.cos(dir) * dist;
		let y = oy + Math.sin(dir) * dist;
		return new Vector(x,y);
	}
	constructor(x=0,y=0){
		this.x = x;
		this.y = y;
	}
	mult(m){
		return new Vector(this.x*m,this.y*m);
	}
	add(x,y){
		return new Vector(this.x+x,this.y+y);
	}
	clone(){
		return new Vector(this.x,this.y);
	}
	toObj(){
		return {x:this.x,y:this.y};
	}
}
function Line(px1=0,py1=0,px2=1,py2=1){
	var x1 = px1;
	var y1 = py1;
	var x2 = px2;
	var y2 = py2;
	function setPos(px1,py1,px2,py2){
		x1 = px1;
		y1 = py1;
		x2 = px2;
		y2 = py2;
	}
	function getPosA(){return new Vector(x1,y1)}
	function getPosB(){return new Vector(x2,y2)}
	function touches(line){
		let posA = line.getPosA();
		let posB = line.getPosB();
		const x3 = posA.x;
		const y3 = posA.y;
		const x4 = posB.x;
		const y4 = posB.y;
		const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
		if(den == 0){
			return;
		}
		const t =  ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
		const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
		if(t >= 0 && t <= 1 && u >= 0 && u <= 1){
			const pt = new Vector();
			pt.x = x1 + t * (x2-x1);
			pt.y = y1 + t * (y2-y1);
			return pt;
		}
		else return;
	}
	function draw(color='white'){
		ctx.beginPath();
		ctx.lineWidth = 3;
		ctx.strokeStyle = color;
		ctx.moveTo(x1,y1);
		ctx.lineTo(x2,y2);
		ctx.stroke();
	}
	function toString(){
		return JSON.stringify([x1,y1,x2,y2]);
	}
	this.getPosA = getPosA;
	this.getPosB = getPosB;
	this.touches = touches;
	this.draw = draw;
	this.setPos = setPos;
}
class Hitbox{
	static show = false;
	#iter = 0;
	#max_iter = 0;
	#slide_x = 0;
	#slide_y = 0;
	#end_slide;
	constructor(pos,w,h){
		this.pos = pos;
		this.w = w;
		this.h = h;
		this.lines = [new Line,new Line,new Line,new Line];
		this.angles = [];
		this.scale = new Vector(1,1);
		this.offset = new Vector;
		this.sliding = false;
		this.dir = 0;
		this.update();
	}
	update(){
		let scaleX = this.scale.x;
		let scaleY = this.scale.y;
		let w2 = (this.w*scaleX)/2;
		let h2 = (this.h*scaleY)/2;
		let px = this.pos.x;
		let py = this.pos.y;
		this.angles[0] = Vector.getDir(-w2,-h2);
		this.angles[1] = Vector.getDir(w2,-h2);
		this.angles[2] = Vector.getDir(w2,h2);
		this.angles[3] = Vector.getDir(-w2,h2);
		let points = [];
		let dist = Vector.distance(px,py,px-w2,py-h2);
		let offsetX = this.offset.x;
		let offsetY = this.offset.y;
		for(let i=0;i<4;i++){
			let ln = this.lines[i];
			let an = this.angles[i];
			let pt = Vector.getPointIn(Vector.rad(this.dir+an),dist,px+offsetX,py+offsetY);
			points.push(pt);
		}
		for(let i=4;i<8;i++){
			let pt1 = points[i%4];
			let pt2 = points[(i-1)%4];
			this.lines[i%4].setPos(pt1.x,pt1.y,pt2.x,pt2.y);
		}
		if(this.sliding) {
			if(this.#iter <= this.#max_iter){
				let p = this.pos;
				this.position = new Vector(p.x+this.#slide_x,p.y+this.#slide_y);
			} else {
				this.sliding = false;
				if(typeof this.#end_slide == 'function'){
					this.#end_slide();
				}
			}
			this.#iter++;
		} else {
			this.move.call(this,this.pos.clone());
		}
	}
	DRAW(){
		if(this.sliding) {
			if(this.#iter <= this.#max_iter){
				let p = this.pos;
				this.position = new Vector(p.x+this.#slide_x,p.y+this.#slide_y);
			} else {
				this.sliding = false;
				if(typeof this.#end_slide == 'function'){
					this.#end_slide();
				}
			}
			this.#iter++;
		} else {
			this.move.call(this,this.pos.clone());
		}
	}
	touches(hitbox){
		if(hitbox instanceof Hitbox){
			let lines = this.lines;
			let other = hitbox.lines;
			for(let l1 of lines){
				for(let l2 of other){
					if(l1.touches(l2)){
						return true;
					}
				}
			}
		}
		return false;
	}
	toObj(){
		let pos = this.pos.toObj();
		let w=this.w,
			h=this.h,
			scale=this.scale.toObj(),
			offset=this.offset.toObj(),
			dir=this.dir;
		return {pos,w,h,scale,offset,dir};
	}
	toString(){
		return JSON.stringify(this.toObj());
	}
	slideTo(x,y,segs=8){
		return new Promise(resolve=>{
			this.sliding = true;
			let pos = this.pos;
			this.#max_iter = segs;
			this.#iter = 1;
			this.#slide_x = (x-pos.x)/segs;
			this.#slide_y = (y-pos.y)/segs;
			this.#end_slide = function(){
				resolve();
			}
		});
	}
	set direction(d){
		this.dir = d;
		this.update();
		return d;
	}
	set position(v){
		this.pos.x = v.x;
		this.pos.y = v.y;
		this.update();
		return v;
	}
	set width(w){
		this.w = w;
		this.update();
		return w;
	}
	set height(h){
		this.h = h;
		this.update();
		return h;
	}
	set setScale(v){
		this.scale.x = v.x;
		this.scale.y = v.y;
		this.update();
		return v;
	}
	set setOffset(v){
		this.offset.x = v.x;
		this.offset.y = v.y;
		this.update();
		return v;
	}
}
exports.Vector=Vector;
exports.Line=Line;
exports.Hitbox=Hitbox;