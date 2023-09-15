let svgLogosAsPathArray;
let logoContainer;
let root;
let target;
let current;
let lerpSpeed = .1;
let offset;

function start(){
    svgLogosAsPathArray = getLogos()
    logoContainer = document.getElementsByClassName("language-image-container")[0];

    root = document.documentElement;

    offset = 0*document.getElementsByClassName("slider-bar")[0].clientWidth/8;

    root.style.setProperty("--window-x", document.body.clientWidth + "px");
    root.style.setProperty("--mouse-x", (document.body.clientWidth/2 + offset) + "px");

    $(".quality-banner").on("mousemove", function ( event ) {
        event.stopImmediatePropagation();
        var xPos = event.pageX + offset;
        target = xPos;
    });

    $(".quality-banner").on("mouseleave", function ( event ){
        target = document.body.clientWidth/2 + offset;
    });

    $(".quality-banner").on("touchmove", function ( event ) {
        event.stopImmediatePropagation();
        
        var touch = event.originalEvent.changedTouches[0];
        var xPos = touch.clientX + offset;
        target = xPos;
    });

    $(".quality-banner").on("touchleave", function ( event ){
        target = document.body.clientWidth/2 + offset;
    });

    $(window).resize(function(){
        root.style.setProperty("--window-x", document.body.clientWidth + "px");
      });

    target = document.body.clientWidth/2 + offset;
    current = document.body.clientWidth/2 + offset;

    setInterval(changeX, 10);
}

function changeX(){
    if(Math.abs(current+ offset - target) < 0.01) return;

    current = lerp(current, target, lerpSpeed);
    root.style.setProperty("--mouse-x", (current + offset) + "px");
}



function getLogos(){
    var objectTags = document.getElementsByTagName("object");
    var logos = [];

    for(var i = 0; i < objectTags.length; i++){
        var object = objectTags[i];
        logos[i] = object.contentDocument.getElementsByTagName("path");
    }
    return logos; 
}

function lerp(currentValue, targetValue, amount){
    return currentValue + (targetValue - currentValue) * amount;
}