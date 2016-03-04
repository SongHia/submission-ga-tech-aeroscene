// more here:
// http://fhtr.org/JSARToolKit/demos/tests/test2.html
var capture;
var w = window.innerWidth, h = window.innerHeight;
var xAvg = 0;
var yAvg = 0;
var detectedOn = false;
var vid;

var raster, param, pmat, resultMat, detector;

var audioScale = d3.scale.linear().domain([0,760]).range([.2,1]).nice()
var videoScale = d3.scale.linear().domain([0,1280]).range([.3,5]).nice()
var svg = d3.select('#chart')

svg.append('filter').attr('id','blur')
  .append('feGaussianBlur')
  .attr('stdDeviation',8)

svg.append('defs').append('pattern').attr('id','pattern')
  .attr('x',2)
  .attr('y',2)
  .attr('width',8)
  .attr('height',8)
  .attr('patternUnits','userSpaceOnUse')
  .append('circle')
  .attr('cx',2)
  .attr('cy',2)
  .attr('r',4)

var circle = svg
  .attr('width',window.innerWidth)
  .attr('height',window.innerHeight)
  .append('circle')
  .attr('r',100)
  .style('opacity',0)
function setup() {
  pixelDensity(1); // this makes the internal canvas smaller
  capture = createCapture(VIDEO);
  var cnv = createCanvas(w, h);
  capture.size(w, h);
  capture.hide();

  raster = new NyARRgbRaster_Canvas2D(canvas);
  param = new FLARParam(canvas.width, canvas.height);
  pmat = mat4.identity();
  param.copyCameraMatrix(pmat, 100, 10000);
  resultMat = new NyARTransMatResult();
  detector = new FLARMultiIdMarkerDetector(param, 2);
  detector.setContinueMode(true);
  cnv.position(0, 0);

  vid = document.getElementById("demo");
  vid.playbackRate = 3.0;
  vid.volume = 1;
}

function draw() {
  image(capture, 0, 0, w, h);
  canvas.changed = true;
  var thresholdAmount = 128;//select('#thresholdAmount').value() * 255 / 100;
  detected = detector.detectMarkerLite(raster, thresholdAmount);
  //detection
  if(detected > 0) {
    detectedOn = true;
    // console.log('detection: sweet spot');
    vid.playbackRate =.3;
  }else{
    detected = 0
    detectedOn = false;
    // console.log('detection: off');
    vid.playbackRate =3;
    vid.play();
  }
  debounce(move(xAvg,yAvg),100)



  for (var i = 0; i < detected; i++) {
    // read data from the marker
    // var id = detector.getIdMarkerData(i);

    // get the transformation for this marker
    detector.getTransformMatrix(i, resultMat);

    // convert the transformation to account for our camera
    var mat = resultMat;
    var cm = mat4.create();
    cm[0] = mat.m00, cm[1] = -mat.m10, cm[2] = mat.m20, cm[3] = 0;
    cm[4] = mat.m01, cm[5] = -mat.m11, cm[6] = mat.m21, cm[7] = 0;
    cm[8] = -mat.m02, cm[9] = mat.m12, cm[10] = -mat.m22, cm[11] = 0;
    cm[12] = mat.m03, cm[13] = -mat.m13, cm[14] = mat.m23, cm[15] = 1;
    mat4.multiply(pmat, cm, cm);

    // define a set of 3d vertices
    var q = 1;
    var verts = [
      vec4.create(-q, -q, 0, 1),
      vec4.create(q, -q, 0, 1),
      vec4.create(q, q, 0, 1),
      vec4.create(-q, q, 0, 1),
      // vec4.create(0, 0, -2*q, 1) // poke up
    ];
    // convert that set of vertices from object space to screen space
    var w2 = width / 2, h2 = height / 2;
    verts.forEach(function(v) {
      mat4.multiplyVec4(cm, v);
      v[0] = v[0] * w2 / v[3] + w2;
      v[1] = -v[1] * h2 / v[3] + h2;
      // v[2] and v[3] are crazy numbers
      xAvg = (v[0]+v[1]/4);
      yAvg = (v[1]-v[2]/2);
    });

    noStroke();
    fill(0, millis() % 255);
    beginShape();
    verts.forEach(function(v) {
      vertex(v[0], v[1]);
    });
    endShape();
  }
}

function move() {
  circle
    .attr('cx',window.innerWidth-xAvg)
    .attr('cy',yAvg)

  vid.volume = audioScale(yAvg)

  if(detected>0){
    circle.style('opacity',.6)
  }else{
    circle.style('opacity',0)
  }
}

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};
