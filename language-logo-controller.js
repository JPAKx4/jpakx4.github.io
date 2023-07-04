let svgLogosAsPathArray;
let logoContainer;
let root;
let target;
let current;
let lerpSpeed = .1;

function start(){
    svgLogosAsPathArray = getLogos()
    logoContainer = document.getElementsByClassName("language-image-container")[0];

    root = document.documentElement;

    root.style.setProperty("--window-x", window.innerWidth + "px");
    root.style.setProperty("--mouse-x", "50vw");

    $(".quality-banner").on("mousemove", function ( event ) {
        event.stopImmediatePropagation();
        var xPos = event.pageX;
        target = xPos;
    });

    $(".quality-banner").on("mouseleave", function ( event ){
        target = window.innerWidth / 2;
    });

    $(".quality-banner").on("touchmove", function ( event ) {
        event.stopImmediatePropagation();
        
        var touch = event.originalEvent.changedTouches[0]
        var xPos = touch.clientX;
        target = xPos;
    });

    $(".quality-banner").on("touchleave", function ( event ){
        target = window.innerWidth / 2;
    });

    $(window).resize(function(){
        root.style.setProperty("--window-x", window.innerWidth + "px");
      });

    target = window.innerWidth / 2;
    current = window.innerWidth / 2;

    setInterval(changeX, 10);
}

function changeX(){
    if(Math.abs(current-target) < 0.1) return;

    current = lerp(current, target, lerpSpeed);
    root.style.setProperty("--mouse-x", current + "px");
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