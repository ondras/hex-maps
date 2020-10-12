var canvas = false;

function svg(name, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (var p in attrs) { node.setAttribute(p, attrs[p]); }
    return node;
}

var Data = {
	w:10,
	h:10,
	r:25,
	dotSize:3,
	border:1,
	borderRiver:8,
	borderSea:3,

	TERRAIN_NONE:0,
	TERRAIN_NORMAL:1,
	TERRAIN_SEA:2,
	TERRAIN_MOUNTAIN:3,
	cells:[],

	cell:function(i,j,optObj) {
		var self = this;

		this.options = {
			terrain:Data.TERRAIN_NORMAL,
			terrain:Math.floor(Math.random()*4),
			numbers:[],
			rivers:"a",
			label:""
		}
		for (var p in optObj) { self.options[p] = optObj[p]; }

		this.segments = new Array(6);
		this.points = [];

		var rx = Data.r * 3 / 2;
		var ry = Data.r * Math.sqrt(3);

		/* center */
		this.x = (i+1)*rx;
		this.y = (j+1)*ry;
		if (i % 2) { this.y += ry/2; }

		/* segments */
		for (var angle = 0;angle < self.segments.length;angle++) {
			var a1 = angle * Math.PI / 3;
			var a2 = (angle+1) * Math.PI / 3;
			var x1 = self.x + Data.r * Math.cos(a1);
			var y1 = self.y - Data.r * Math.sin(a1);
			var x2 = self.x + Data.r * Math.cos(a2);
			var y2 = self.y - Data.r * Math.sin(a2);

			var s = false;
			var reverse = false;
			if (angle == 1 && j) {
				s = Data.cells[i][j-1].segments[4];
				reverse = true;
			}
			if (angle == 2 && i) {
				var ok = (i % 2 || j > 0);
				if (ok) {
					s = Data.cells[i-1][j + (i % 2 ? 0 : -1)].segments[5];
					reverse = true;
				}
			}
			if (angle == 3 && i) {
				var ok = (i % 2 == 0 || j+1 < Data.h);
				if (ok) {
					s = Data.cells[i-1][j + (i % 2 ? 1 : 0)].segments[0];
					reverse = true;
				}
			}

			if (!s) { s = new Data.segment(x1,y1,x2,y2,false); }

			s.cells.push(self);
			self.points.push(reverse ? [s.x2,s.y2] : [s.x1,s.y1]);
			self.segments[angle] = s;
		}
		switch (self.options.rivers) {
			case "b":
				self.segments[1].river = 1;
			break;
			case "c":
				self.segments[0].river = 1;
			break;
			case "d":
				self.segments[0].river = 1;
				self.segments[1].river = 1;
			break;
			case "e":
				self.segments[5].river = 1;
			break;
			case "f":
				self.segments[1].river = 1;
				self.segments[5].river = 1;
			break;
			case "g":
				self.segments[0].river = 1;
				self.segments[5].river = 1;
			break;
			case "h":
				self.segments[0].river = 1;
				self.segments[1].river = 1;
				self.segments[5].river = 1;
			break;
		}

		this.drawFill = function() {
			var points = "";
			for (var idx=0;idx<self.points.length;idx++) {
				var p = self.points[idx];
				points += p[0]+","+p[1]+" ";
			}
			var fill = false;
			switch (self.options.terrain) {
				case Data.TERRAIN_NONE:
					fill = "black";
				break;
				case Data.TERRAIN_NORMAL:
					fill = false;
//					fill = "lightgreen";
				break;
				case Data.TERRAIN_SEA:
					fill = "url(#wave)";
				break;
				case Data.TERRAIN_MOUNTAIN:
//					fill = "brown";
//					fill = "green";
					fill = "lightgreen";
				break;
			}
			if (!fill) { return; }
			var poly = svg("polyline",{points:points,fill:fill});
			canvas.appendChild(poly);
		}

		this.drawStroke = function() {
			if (self.options.terrain == Data.TERRAIN_NORMAL || self.options.terrain == Data.TERRAIN_MOUNTAIN) {
				var circle = svg("circle",{r:Data.dotSize,cx:self.x,cy:self.y});
				canvas.appendChild(circle);
			}

			for (var idx=0;idx<self.segments.length;idx++) {
				var segment = self.segments[idx];
				if (segment.drawn) { continue; }
				segment.draw();
			}
		}

		this.drawText = function() {
			if (self.options.numbers.length) {
				var a = self.options.numbers[0];
				var b = self.options.numbers[1];
				var attr = {
					y:self.y+Data.r/3,
					"text-anchor":"middle",
					"font-size":"28px"
				}
				attr.x = self.x-0.9*Data.r/2;
				var t1 = svg("text",attr);
				attr.x = self.x+0.9*Data.r/2;
				var t2 = svg("text",attr);
				t1.textContent = a;
				t2.textContent = b;
				canvas.appendChild(t1);
				canvas.appendChild(t2);
			}

			if (self.options.label) {
				var label = svg("text",{"text-anchor":"middle",x:self.x,y:self.y+37,"font-size":"12px"/*,"font-stretch":"wider"*/});
				label.textContent = self.options.label.toUpperCase();
				canvas.appendChild(label);
				var dims = label.getBBox();
				var rect = svg("rect",{x:dims.x-2,y:dims.y-2,width:dims.width+4,height:dims.height+4,fill:"white"});
				canvas.insertBefore(rect,label);
			}
		}
	},

	segment:function(x1,y1,x2,y2,river) {
		var self = this;
		this.drawn = false;
		this.x1 = x1;
		this.x2 = x2;
		this.y1 = y1;
		this.y2 = y2;
		this.river = river;
		this.cells = [];

		this.draw = function() {
			self.drawn = true;
			var b = false;
			if (self.river) {
				b = Data.borderRiver;
			} else if (self.cells.length < 2) {
				b = Data.borderSea;
			} else if (self.cells[0].options.terrain == Data.TERRAIN_SEA && self.cells[1].options.terrain == Data.TERRAIN_SEA) {
				return;
			} else if (self.cells[0].options.terrain == Data.TERRAIN_SEA || self.cells[1].options.terrain == Data.TERRAIN_SEA) {
				b = Data.borderSea;
			} else {
				b = Data.border;
			}
			var l = svg("line",{x1:self.x1,y1:self.y1,x2:self.x2,y2:self.y2,stroke:"black","stroke-width":b,"stroke-linecap":"round"});
			canvas.appendChild(l);
		}
	},

	computeCells:function() {
		Data.cells = [];
		for (var i=0;i<Data.w;i++)
			for (var j=0;j<Data.h;j++) {
				var h = new Data.cell(i,j);
				if (Data.cells.length == i) { Data.cells.push([]); }
				Data.cells[i].push(h);
		}
	}
}

function draw() {
	var x = (3/2*Data.w + 2) * Data.r;
	var y = Math.sqrt(3) * (Data.h + 2) * Data.r;
	canvas = svg("svg", {width:x,height:y});
	document.body.appendChild(canvas);

	var defs = svg("defs");
	var pat = svg("pattern",{id:"wave",x:"0",y:"1",width:"20",height:"8",patternUnits:"userSpaceOnUse"});
	var p = svg("path",{d:"M 0,5 C 2,2 8,2 10,5 C 12,8 18,8 20,5",stroke:"blue","fill-opacity":"0"});
	defs.appendChild(pat);
	pat.appendChild(p);
	canvas.appendChild(defs);
}

function parse(arraybuffer) {
	let view = new Uint8Array(arraybuffer);
	let chars = [];
	view.forEach((byte, i) => {
		let char;
		if (byte < 128) {
			char = String.fromCharCode(byte);
		} else {
			char = CP1250.charAt(byte-128);
		}
		chars.push(char);
	});

	return chars.join("");
}

function load(arraybuffer) {
	let file = parse(arraybuffer);

	Data.w = parseInt(file.match(/Width *= *(.*)/)[1]);
	Data.h = parseInt(file.match(/Height *= *(.*)/)[1]);
	var cities = parseInt(file.match(/Cities *= *(.*)/)[1]);
	draw();
	Data.cells = [];
	var map = [0,2,3,1,1,1,1,1];
	var rows = file.match(/R_.*=.*/g);
	for (var i=0;i<Data.w;i++) {
		if (Data.cells.length == i) { Data.cells.push(new Array(j)); }
		for (var j=0;j<rows.length;j++) {
			var row = rows[j].match(/= *(.*)/)[1];
			var terr = row.charAt(2*i);
			var rivers = row.charAt(2*i+1);
			var cell = new Data.cell(i,j,{rivers:rivers,terrain:map[parseInt(terr)]});
			Data.cells[i][j] = cell;
		}
	}

	for (var i=1;i<=cities;i++) {
		var ii = i.toString();
		if (i < 10) { ii = "0" + ii; }
		var re = new RegExp("M_"+ii+".*","g");
		var all = file.match(re);
		var x = 0;
		var y = 0;
		var label = [];
		var r = false;
		for (var j=0;j<all.length;j++) {
			var str = all[j];
			if ((r=str.match(/X *= *(.*)/))) { x = parseInt(r[1]); }
			if ((r=str.match(/Y *= *(.*)/))) { y = parseInt(r[1]); }
			if ((r=str.match(/N *= *(.*)/))) { label = r[1].split(","); }
		}

		var cell = Data.cells[x][y];
		if (label.length == 3) {
			cell.options.numbers = [label[1],label[2]];
		}
		label = label[0];
		cell.options.label = label;
	}

	for (var i=0;i<Data.w;i++)
		for (var j=0;j<Data.h;j++) {
			Data.cells[i][j].drawFill();
	}
	for (var i=0;i<Data.w;i++)
		for (var j=0;j<Data.h;j++) {
			Data.cells[i][j].drawStroke();
	}
	for (var i=0;i<Data.w;i++)
		for (var j=0;j<Data.h;j++) {
			Data.cells[i][j].drawText();
	}
}

function init() {
	var r = location.search.match(/f=([^&]+)/);
	if (r) {
		let xhr = new XMLHttpRequest();
		xhr.responseType = "arraybuffer";
		xhr.open("get", r[1], true);
		xhr.send();
		xhr.onload = function(e) {
			let data = e.target.response;
			load(data);
		}
	} else {
		draw();
		Data.computeCells();
		for (var i=0;i<Data.w;i++)
			for (var j=0;j<Data.h;j++) {
				Data.cells[i][j].drawFill();
		}
		for (var i=0;i<Data.w;i++)
			for (var j=0;j<Data.h;j++) {
				Data.cells[i][j].drawStroke();
		}
		for (var i=0;i<Data.w;i++)
			for (var j=0;j<Data.h;j++) {
				Data.cells[i][j].drawText();
		}
	}
}
init();

// shamelessly stolen from https://github.com/mathiasbynens/windows-1250
const CP1250 = "\u20AC\u0081\u201A\u0083\u201E\u2026\u2020\u2021\u0088\u2030\u0160\u2039\u015A\u0164\u017D\u0179\u0090\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u0098\u2122\u0161\u203A\u015B\u0165\u017E\u017A\u00A0\u02C7\u02D8\u0141\u00A4\u0104\u00A6\u00A7\u00A8\u00A9\u015E\u00AB\u00AC\u00AD\u00AE\u017B\u00B0\u00B1\u02DB\u0142\u00B4\u00B5\u00B6\u00B7\u00B8\u0105\u015F\u00BB\u013D\u02DD\u013E\u017C\u0154\u00C1\u00C2\u0102\u00C4\u0139\u0106\u00C7\u010C\u00C9\u0118\u00CB\u011A\u00CD\u00CE\u010E\u0110\u0143\u0147\u00D3\u00D4\u0150\u00D6\u00D7\u0158\u016E\u00DA\u0170\u00DC\u00DD\u0162\u00DF\u0155\u00E1\u00E2\u0103\u00E4\u013A\u0107\u00E7\u010D\u00E9\u0119\u00EB\u011B\u00ED\u00EE\u010F\u0111\u0144\u0148\u00F3\u00F4\u0151\u00F6\u00F7\u0159\u016F\u00FA\u0171\u00FC\u00FD\u0163\u02D9";
