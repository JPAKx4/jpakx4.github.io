let width, height, canvas, context, bezier_data, last_update, new_update, sound_enabled, audioContext;

/*
To make them all sync up at the end of interval:
speed = distance/time
speed = count*lengthOfPath/interval
length goes to 2 (lerp function 2 times), therfore
speed = 2*count/interval
distance (or what goes in the lerp function) increases at a rate of speed.

interval is represented by animation length
*/

let json_paramaters = 
{
    count: 12,
    animation_length: 60,
    completed_cycle_count: 15,
    completed_cycle_count_by_index: -1,
    line_color: "#aaaaaa",
    circle_color: "#ffffff",
    background_color: "#1c1c1c",
    pitch_difference: 2,
    bezier_curve: {
        p1: {
            x: 350,
            y: 0
        },
        p2: {
            x: 400,
            y: 0
        },
        cp1: {
            x: 375,
            y: 50
        },
        cp2: {
            x: 375,
            y: 50
        }
    },
    scale_by_index: {
        p1 : {
            x: 1,
            y: 1
        },
        p2 : {
            x: 1,
            y: 1
        },
        cp1 : {
            x: 1,
            y: 1
        },
        cp2 : {
            x: 1,
            y: 1
        }
    },
    offset_by_index: {
        p1 : {
            x: -30,
            y: 0
        },
        p2 : {
            x: 30,
            y: 0
        },
        cp1 : {
            x: 0,
            y: (4/3)*30
        },
        cp2 : {
            x: 1,
            y: (4/3)*30
        }
    }
}

function ready(){
    canvas = document.getElementById("Polyrhythm-Canvas");
    height =  canvas.height;
    width = canvas.width;
    sound_enabled = false;

    clearInterval();

    audioContext = new AudioContext();
    document.onclick = () => sound_enabled = true;
    document.onvisibilitychange = () => sound_enabled = false;

    if(!canvas.getContext){
        throw new Error("Canvas had a critical failure.");
    }
    context = canvas.getContext("2d");

    bezier_data = createBezierData();

    last_update = Date.now();

    updateTextFields();

    setInterval(update, 10);
}

function update() {
    new_update = Date.now();

    context.clearRect(0, 0, width, height);

    context.rect(0, 0, width, height);
    context.strokeStyle = json_paramaters.background_color;
    context.stroke;

    context.strokeStyle = json_paramaters.line_color;
    for(let i = 0; i < json_paramaters.count; i++){
        context.beginPath();
        drawBezierCurve(bezier_data[i]);
        updateDistance(bezier_data[i]);
        context.stroke();
    }

    context.fillStyle = json_paramaters.circle_color;
    for(let i = 0; i < json_paramaters.count; i++){
        context.beginPath();
        drawCircle(bezier_data[i]);
        context.fill();
    }

    last_update = new_update;

}

function updateJsonData() {
    let parameterContainer = document.getElementById("parameter-container");
    let inputs = parameterContainer.getElementsByTagName("input");

    for(let i = 0; i < inputs.length; i++){
        if(!inputs[i].getAttribute("data")) continue;

        let jsonKeyArray = inputs[i].getAttribute("data").split(" ");

        let value = inputs[i].value;

        if(!isNaN(parseInt(value))){
            value = parseInt(value);
        }

        console.log(value);

        setDataArray(jsonKeyArray, value);
    }

    ready();
}

function updateTextFields() {
    let parameterContainer = document.getElementById("parameter-container");
    let inputs = parameterContainer.getElementsByTagName("input");

    for(let i = 0; i < inputs.length; i++){
        if(!inputs[i].getAttribute("data")) continue;

        let jsonKeyArray = inputs[i].getAttribute("data").split(" ");
        inputs[i].value = getDataArray(jsonKeyArray);
    }
}

function updateDistance(curve_data){
    curve_data.distance = curve_data.speed*((new_update - last_update)/1000) + curve_data.distance;

    if(curve_data.distance >= curve_data.nextSoundDistance){
        curve_data.nextSoundDistance = (curve_data.nextSoundDistance % 2) + 1;
        
        if(sound_enabled){
            loadAudioSample('audio/c4.mp3')
                .then(sample => playAudioSample(sample, curve_data.pitch));
        }
    }

    curve_data.distance = curve_data.distance % 2;
}

function createBezierData(){
    let data = [];
    let offset = json_paramaters.offset_by_index;
    let scale = json_paramaters.scale_by_index;

    let initial_curve = json_paramaters.bezier_curve;

    for(let i = 0; i < json_paramaters.count; i++){
        data[i] = {
            p1: scaleAndOffsetByIndex(initial_curve.p1, offset.p1, scale.p1, i),
            p2: scaleAndOffsetByIndex(initial_curve.p2, offset.p2, scale.p2, i),
            cp1: scaleAndOffsetByIndex(initial_curve.cp1, offset.cp1, scale.cp1, i),
            cp2: scaleAndOffsetByIndex(initial_curve.cp2, offset.cp2, scale.cp2, i),
            speed: 2*(json_paramaters.completed_cycle_count + json_paramaters.completed_cycle_count_by_index*i) / json_paramaters.animation_length,
            distance: 0,
            nextSoundDistance: 1,
            pitch: Math.pow(2, (json_paramaters.pitch_difference*i + 1)/12)
        };
    }

    return data;
}

function scaleAndOffsetByIndex(p, offset, scale, index){
    pCopy = {
        x: p.x*((scale.x-1)*index + 1) + offset.x*index,
        y: height-(p.y*((scale.y-1)*index + 1) + offset.y*index)
    }

    return pCopy;
}

function drawBezierCurve(curve_data){
    let p1 = curve_data.p1;
    let p2 = curve_data.p2;
    let cp1 = curve_data.cp1;
    let cp2 = curve_data.cp2;

    context.moveTo(p1.x, p1.y);
    context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
}

function drawCircle(curve_data){
    let distance = curve_data.distance <= 1 ? curve_data.distance : 2 - curve_data.distance;
    let center = secondOrderLerp(curve_data, distance);
    context.arc(center.x, center.y, 5, 0, Math.PI*2);
}

function secondOrderLerp(curve_data, t){
    q1 = lerp(curve_data.p1, curve_data.cp1, t);
    q2 = lerp(curve_data.cp1, curve_data.cp2, t);
    q3 = lerp(curve_data.cp2, curve_data.p2, t);

    b1 = lerp(q1, q2, t);
    b2 = lerp(q2, q3, t);

    return lerp(b1, b2, t);
}

function lerp(p1, p2, t){
    p = {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
    }
    return p;
}

function loadAudioSample(url) {
  return fetch(url)
    .then(response => response.arrayBuffer())
    .then(buffer => audioContext.decodeAudioData(buffer));
}

function playAudioSample(sample, rate) {
  const source = audioContext.createBufferSource();
  source.buffer = sample;
  source.playbackRate.value = rate;
  source.connect(audioContext.destination);
  source.start(0);
}

function setData(name, value){
    json_paramaters[name] = value;
}

function setDataArray(nameArray, value){
    targetedKey = json_paramaters;
    for(let i = 0; i < nameArray.length-1; i++){
        //console.log(targetedKey);
        targetedKey = targetedKey[nameArray[i]];
        //console.log(targetedKey);
    }
    targetedKey[nameArray[nameArray.length-1]] = value;
}

function getDataArray(nameArray) {
    targetedKey = json_paramaters;
    for(let i = 0; i < nameArray.length-1; i++){
        //console.log(targetedKey);
        targetedKey = targetedKey[nameArray[i]];
        //console.log(targetedKey);
    }
    return targetedKey[nameArray[nameArray.length-1]];
}

function showJsonData(){
    let field = document.getElementById("json-data");
    field.value = JSON.stringify(json_paramaters);

    let parent = document.getElementById("json-container");
    parent.style.visibility = "visible";
    parent.style.height = "unset";
}

function showEmbedData(){
    let field = document.getElementById("embed-data");
    field.value = "EMBED GOES HERE";

    let parent = document.getElementById("embed-container");
    parent.style.visibility = "visible";
    parent.style.height = "unset";
}

function useJsonData(){
    let textField = document.getElementById("add-json-data");
    jsonString = textField.value;

    json_paramaters = JSON.parse(jsonString);

    ready();
}