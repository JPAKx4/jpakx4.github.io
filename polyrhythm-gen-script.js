let width, height, canvas, context, bezier_data, last_update, new_update, sound_enabled, audioContext, currently_rendered_type;

let firstTimeLoad = true;

let inputTypes = ["input", "textarea", "select"];

let bezierExclusiveParameters = ["bezier_curve", "scale_by_index", "offset_by_index"];
let svgExclusiveParameters = ["svg_paths"];

let audioSampleCache = {};

const defaultJson = {"count":12,"animation_length":60,"completed_cycle_count":15,"completed_cycle_count_by_index":-1,"width":750,"height":750,"precentage_enabled":false,"precentage_amount":{},"line_color":"#aaaaaa","line_color_by_index_enabled":true,"line_color_by_index":{"color0":"red","color1":"orangered","color2":"orange","color3":"orangeyellow","color4":"yellow","color5":"yellowgreen","color6":"green","color7":"greenblue","color8":"blue","color9":"bluepurple","color10":"purple","color11":"white"},"circle_color":"#ffffff","circle_color_by_index_enabled":false,"circle_color_by_index":{},"background_color":"#1c1c1c","pitch_difference":2,"pitch_by_index_enabled":false,"pitch_by_index":{"pitch0":1,"pitch1":1,"pitch2":1,"pitch3":1,"pitch4":1,"pitch5":1,"pitch6":1,"pitch7":1,"pitch8":1,"pitch9":1,"pitch10":1,"pitch11":1},"selectedType":"bezier","fill_mode":"both","bezier_curve":{"p1":{"x":350,"y":750},"p2":{"x":400,"y":750},"cp1":{"x":375,"y":700},"cp2":{"x":375,"y":700}},"scale_by_index":{"p1":{"x":1,"y":1},"p2":{"x":1,"y":1},"cp1":{"x":1,"y":1},"cp2":{"x":1,"y":1}},"offset_by_index":{"p1":{"x":-30,"y":0},"p2":{"x":30,"y":0},"cp1":{"x":0,"y":-40},"cp2":{"x":1,"y":-40}}}

/*
To make them all sync up at the end of interval:
speed = distance/time
speed = count*lengthOfPath/interval
length goes to 2 (lerp function 2 times), therfore
speed = 2*count/interval
distance (or what goes in the lerp function) increases at a rate of speed.

interval is represented by animation length
*/

let json_parameters = 
{
    count: 12,
    animation_length: 60,
    completed_cycle_count: 15,
    completed_cycle_count_by_index: -1,
    width: 750,
    height: 750,

    precentage_enabled: false,
    precentage_amount: {},

    line_color: "#aaaaaa",
    line_color_by_index_enabled: false,
    line_color_by_index: {},

    circle_color: "#ffffff",
    circle_color_by_index_enabled: false,
    circle_color_by_index: {},

    background_color: "#1c1c1c",

    pitch_difference: 1,
    pitch_by_index_enabled: false,
    pitch_by_index: {},

    selectedType: "bezier",
    fill_mode: "both",

    bezier_curve: {
        p1: {
            x: 350,
            y: 750
        },
        p2: {
            x: 400,
            y: 750
        },
        cp1: {
            x: 375,
            y: 700
        },
        cp2: {
            x: 375,
            y: 700
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
            y: -(4/3)*30
        },
        cp2 : {
            x: 1,
            y: -(4/3)*30
        }
    },
    svg_paths: {

    }
}

function ready(){
    canvas = document.getElementById("Polyrhythm-Canvas");

    sound_enabled = false;

    let params = new URLSearchParams(location.search);
    let embed = params.get("embed");
    if(embed == "true"){
        let parametersElement = document.getElementById("parameters");
        parametersElement.remove();
    }

    if(firstTimeLoad){
        firstTimeLoad = false;

        let jsonData = params.get("jsonData");
        if(jsonData != null){
            console.log("json data decoded: ", jsonData);
            decodeJson(jsonData);
        } else {
            for (const key in defaultJson){
                json_parameters[key] = defaultJson[key];
            }
        }
    }

    height =  json_parameters.height;
    width = json_parameters.width;
    
    canvas.setAttribute("height", height);
    canvas.setAttribute("width", width);

    clearInterval();

    audioContext = new AudioContext();
    document.onclick = () => sound_enabled = true;
    document.onvisibilitychange = () => sound_enabled = false;

    if(!canvas.getContext){
        throw new Error("Canvas had a critical failure.");
    }
    context = canvas.getContext("2d");

    path_data = createPathData();
    //console.log("type: " + currently_rendered_type);

    last_update = Date.now();

    updateTextFields();

    setInterval(update, 10);
}

function update() {

    new_update = Date.now();

    context.clearRect(0, 0, width, height);

    context.rect(0, 0, width, height);
    context.strokeStyle = json_parameters.background_color;
    context.stroke();

    for(let i = 0; i < json_parameters.count; i++){
        context.strokeStyle = path_data[i].lineColor;
        if(currently_rendered_type == "bezier"){
            drawBezierCurve(path_data[i]);
        } else if(currently_rendered_type == "svg"){
            drawSVG(path_data[i]);
        }
        updateDistance(path_data[i]);
    }

    for(let i = 0; i < json_parameters.count; i++){
        context.fillStyle = path_data[i].circleColor;
        context.beginPath();
        drawPointAlongLine(path_data[i]);
        context.fill();
    }

    last_update = new_update;

}

function updateJsonData() {
    for(let i = 0; i < inputTypes.length; i++){
        updateJsonDataOfInputType(inputTypes[i]);
    }

    ready();
}

function updateJsonDataOfInputType(inputType){
    let parameterContainer = document.getElementById("parameter-container");

    let inputs = parameterContainer.getElementsByTagName(inputType);
    for(let i = 0; i < inputs.length; i++){
        if(!inputs[i].getAttribute("data")) continue;

        let jsonKeyArray = inputs[i].getAttribute("data").split(" ");

        let value;
        if(inputs[i].type == "checkbox"){
            value = inputs[i].checked;
        } else {
            value = inputs[i].value;
        }

        if(!isNaN(parseFloat(value))){
            value = parseFloat(value);
        }

        setDataArray(jsonKeyArray, value);
    }
}

function updateTextFields() {
    if(json_parameters.selectedType == "svg"){
        selectSVG();
        updateCountOfFields("svg-type", "svg-input", "svg_paths path");
    }

    if(json_parameters.precentage_enabled){
        updateCountOfFields('precentage-amount-container', 'precentage-input', 'precentage_amount amount', '1');
    }

    if(json_parameters.circle_color_by_index_enabled) {
        updateCountOfFields('circle-color-by-index-container', 'circle-color-input', 'circle_color_by_index color', '#ffffff');
    }

    if(json_parameters.line_color_by_index_enabled) {
        updateCountOfFields('line-color-by-index-container', 'line-color-input', 'line_color_by_index color', '#aaaaaa');
    }

    if(json_parameters.pitch_by_index_enabled){
        updateCountOfFields('pitch-by-index-container', 'pitch-by-index', 'pitch_by_index pitch', '1');
    }

    for(let i = 0; i < inputTypes.length; i++){
        updateTextFieldsOfInputType(inputTypes[i]);
    }
}

function updateTextFieldsOfInputType(inputType){
    let parameterContainer = document.getElementById("parameter-container");
    
    if(parameterContainer == null) return;

    let inputs = parameterContainer.getElementsByTagName(inputType);

    for(let i = 0; i < inputs.length; i++){
        if(!inputs[i].getAttribute("data")) continue;

        let jsonKeyArray = inputs[i].getAttribute("data").split(" ");

        if(inputs[i].type == "checkbox"){
            inputs[i].checked = getDataArray(jsonKeyArray);
        } else {
            inputs[i].value = getDataArray(jsonKeyArray);
        }
    }
}

function updateDistance(curve_data){
    curve_data.distance = curve_data.speed*((new_update - last_update)/1000) + curve_data.distance;

    if(curve_data.distance >= curve_data.nextSoundDistance){
        if(json_parameters.fill_mode == "both"){
            curve_data.nextSoundDistance = (curve_data.nextSoundDistance % 2) + curve_data.soundInterval;
        } else {
            curve_data.nextSoundDistance = (curve_data.nextSoundDistance % 1) + curve_data.soundInterval;
        }

        //console.log(curve_data.nextSoundDistance + " " + curve_data.soundInterval + " " + curve_data.pitch);
        
        if(sound_enabled){
            playAudioSample('audio/C4.mp3', curve_data.pitch);
        }
    }

    if(json_parameters.fill_mode == "both"){
        curve_data.distance = curve_data.distance % 2;
    } else {
        curve_data.distance = curve_data.distance % 1;
    }
}

function createPathData(){
    let data = [];
    let speedScale;
    if(json_parameters.fill_mode == "both"){
        speedScale = 2;
    } else {
        speedScale = 1;
    }

    currently_rendered_type = json_parameters.selectedType;

    if(currently_rendered_type == "bezier"){
        let offset = json_parameters.offset_by_index;
        let scale = json_parameters.scale_by_index;
    
        let initial_curve = json_parameters.bezier_curve;

        for(let i = 0; i < json_parameters.count; i++){
            data[i] = {
                p1: scaleAndOffsetByIndex(initial_curve.p1, offset.p1, scale.p1, i),
                p2: scaleAndOffsetByIndex(initial_curve.p2, offset.p2, scale.p2, i),
                cp1: scaleAndOffsetByIndex(initial_curve.cp1, offset.cp1, scale.cp1, i),
                cp2: scaleAndOffsetByIndex(initial_curve.cp2, offset.cp2, scale.cp2, i),
            };
        }
    } else if (currently_rendered_type == "svg"){
        let svgPathData = json_parameters.svg_paths;

        for(let i = 0; i < json_parameters.count; i++){
            let pathNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathNode.setAttribute("d", svgPathData["path" + i]);

            data[i] = {
                node: pathNode,
                length: pathNode.getTotalLength()
            }
        }
    }

    for(let i = 0; i < json_parameters.count; i++){
        let newSoundInterval = 1;

        if(json_parameters.precentage_enabled){
            newSoundInterval = json_parameters.precentage_amount["amount" + i];
        }

        data[i].soundInterval = newSoundInterval;
        data[i].nextSoundDistance = newSoundInterval;
        data[i].speed = speedScale*(json_parameters.completed_cycle_count + json_parameters.completed_cycle_count_by_index*i) / json_parameters.animation_length;
        data[i].distance = 0;

        if(json_parameters.pitch_by_index_enabled) {
            data[i].pitch = Math.pow(2, (json_parameters.pitch_by_index["pitch" + i] + 1)/12);
        } else {
            data[i].pitch = Math.pow(2, (json_parameters.pitch_difference*i + 1)/12);
        }

        if(json_parameters.line_color_by_index_enabled){
            data[i].lineColor = json_parameters.line_color_by_index["color" + i];
        } else {
            data[i].lineColor = json_parameters.line_color;
        }

        if(json_parameters.circle_color_by_index_enabled){
            data[i].circleColor = json_parameters.circle_color_by_index["color" + i];
        } else {
            data[i].circleColor = json_parameters.circle_color;
        }
    }



    return data;
}

function scaleAndOffsetByIndex(p, offset, scale, index){
    pCopy = {
        x: p.x*((scale.x-1)*index + 1) + offset.x*index,
        y: (p.y*((scale.y-1)*index + 1) + offset.y*index)
    }

    return pCopy;
}

function drawBezierCurve(curve_data){
    let p1 = curve_data.p1;
    let p2 = curve_data.p2;
    let cp1 = curve_data.cp1;
    let cp2 = curve_data.cp2;

    context.beginPath();
    context.moveTo(p1.x, p1.y);
    context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
    context.stroke();
}

function drawSVG(curve_data){
    let path = new Path2D(curve_data.node.getAttribute("d"));
    context.stroke(path);
}

//SVG:
//to make getPointAtLength() function work (number between 0-length)
//we multiply the distance (number from 0-1) and the total length of the svg
//this is equivelent to multiplying by a precentage of the way through
function drawPointAlongLine(curve_data){
    let distance;
    let fill_mode = json_parameters.fill_mode;
    if(fill_mode == "both"){
        distance = curve_data.distance <= 1 ? curve_data.distance : 2 - curve_data.distance;
    } else if(fill_mode == "forwards"){
        distance = curve_data.distance % 2;
    } else if(fill_mode == "backwards"){
        distance = 2 - (curve_data.distance % 2);
    }

    let center;

    if(currently_rendered_type == "bezier"){
        center = secondOrderLerp(curve_data, distance);
    } else if (currently_rendered_type == "svg"){
        let totalLength = curve_data.length;
        center = curve_data.node.getPointAtLength(distance * totalLength);
    }

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

async function loadAudioSample(url) {
    if(audioSampleCache[url]){
        return audioSampleCache[url];
    } else {
        let response = await fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => audioContext.decodeAudioData(buffer));
        audioSampleCache[url] = response;
        return response;
    }    
}

async function getSound(url, rate) {
    const source = audioContext.createBufferSource();
    source.buffer = await loadAudioSample(url);
    source.playbackRate.value = rate;
    source.connect(audioContext.destination);
    return source;
}

async function playAudioSample(url, rate) {
    source = await getSound(url, rate)
    source.start(1)
}

function setData(name, value){
    json_parameters[name] = value;
}

function setDataArray(nameArray, value){
    targetedKey = json_parameters;
    for(let i = 0; i < nameArray.length-1; i++){
        if(!targetedKey[nameArray[i]]){
            targetedKey[nameArray[i]] = {};
        }
        targetedKey = targetedKey[nameArray[i]];
    }

    if(!targetedKey[nameArray[nameArray.length-1]]){
        targetedKey[nameArray[nameArray.length-1]] = [];
    }
    targetedKey[nameArray[nameArray.length-1]] = value;
}

function getDataArray(nameArray) {
    targetedKey = json_parameters;
    for(let i = 0; i < nameArray.length-1; i++){
        targetedKey = targetedKey[nameArray[i]];
    }
    return targetedKey[nameArray[nameArray.length-1]];
}

function showJsonData(){
    stripJsonData();

    let field = document.getElementById("json-data");
    field.value = JSON.stringify(json_parameters);

    let parent = document.getElementById("json-container");
    parent.style.visibility = "visible";
    parent.style.height = "unset";
}

function showEmbedData(){
    let field = document.getElementById("embed-data");
    let base64String = encodeJson();
    field.value = "<embed type=\"text/html\" src=\"https://jordan-garner.com/polyrhythm-gen.html?embed=true&jsonData=" + base64String + "\" width=\"" + json_parameters.width + "\" height=\"" + json_parameters.height + "\">";

    let parent = document.getElementById("embed-container");
    parent.style.visibility = "visible";
    parent.style.height = "unset";
}

function useJsonData(){
    let textField = document.getElementById("add-json-data");
    let jsonString = textField.value;

    json_parameters = JSON.parse(jsonString);

    ready();
}

function encodeJson(){
    stripJsonData();

    let jsonString = JSON.stringify(json_parameters);
    return btoa(jsonString);
}

function stripJsonData(){
    json_parameters.selectedType = currently_rendered_type;

    if(currently_rendered_type == "bezier"){
        //remove SVG exclusive items
        removeParametersFromJson(svgExclusiveParameters);
    } else if (currently_rendered_type == "svg"){
        //remove bezier exclusive items
        removeParametersFromJson(bezierExclusiveParameters);
    }

    if(!json_parameters.precentage_enabled){
        removeParametersFromJson("precentage_amount");
    }

    if(!json_parameters.circle_color_by_index_enabled){
        removeParametersFromJson("circle_color_by_index");
    }

    if(!json_parameters.line_color_by_index_enabled){
        removeParametersFromJson("line_color_by_index");
    }
}

function removeParametersFromJson(parameterArray){
    for(let i = 0; i < parameterArray.length; i++){
        if(json_parameters[parameterArray[i]]){
            delete json_parameters[parameterArray[i]];
        }
    }
}

function showLink(){
    let textField = document.getElementById("share-data");   
    let base64String = encodeJson();

    textField.value = "https://jordan-garner.com/polyrhythm-gen.html?jsonData=" + base64String;

    let parent = document.getElementById("share-container");
    parent.style.visibility = "visible";
    parent.style.height = "unset";
}

function decodeJson(encodedString) {
    let decodedString = atob(encodedString);

    let newJson = JSON.parse(decodedString);

    for (const key in newJson){
        json_parameters[key] = newJson[key];
    }
}

function selectBezier(){
    json_parameters["selectedType"] = "bezier";

    removeClass("bezier-type", "hidden");
    addClass("bezier-selector", "selected");

    addClass("svg-type", "hidden");
    removeClass("svg-selector", "selected");
}

function selectSVG(){
    json_parameters["selectedType"] = "svg";

    removeClass("svg-type", "hidden");
    addClass("svg-selector", "selected");

    addClass("bezier-type", "hidden");
    removeClass("bezier-selector", "selected");
}

function addClass(classToAddTo, classToAdd){
    let elements = document.getElementsByClassName(classToAddTo);
   
    for(let i = 0; i < elements.length; i++){
        elements[i].classList.add(classToAdd);
    }
} 

function removeClass(classToRemoveFrom, classToRemove){
    let elements = document.getElementsByClassName(classToRemoveFrom);
   
    for(let i = 0; i < elements.length; i++){
        elements[i].classList.remove(classToRemove);
    }
}

function updateCountOfFields(idOfParent, childClass, dataAttribute, defaultValue){
    let parent = document.getElementById(idOfParent);
    let children = parent.getElementsByClassName(childClass);

    let fieldCount = json_parameters.count;

    let childCount = children.length;

    if(childCount > fieldCount){
    
        for(let i = childCount-1; i > fieldCount-1; i--){
            children[i].remove();
            childCount--;
        }
    } else if(childCount < fieldCount){
        for(let i = childCount; i < fieldCount; i++){
            let divNode = document.createElement("div");
            divNode.classList.add(childClass);

            parent.appendChild(divNode);
            
            let labelNode = document.createElement("label");
            labelNode.innerHTML = `Index ${i} Line:`;
            labelNode.setAttribute("for", childClass + i);

            divNode.appendChild(labelNode);

            let textField = document.createElement("textarea");
            textField.classList.add(childClass + "-field")
            textField.value = defaultValue;
            textField.id = childClass + i;

            if(dataAttribute){
                textField.setAttribute("data", dataAttribute + i);
            }

            divNode.appendChild(textField);
        }
    }
}
