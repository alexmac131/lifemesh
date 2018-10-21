var fetchBtn = document.getElementById("start");

var hero = document.getElementById("hero");
var loader = document.getElementById("loadImg");
var dataBtn = document.getElementById("moreInfo");
//var location = document.getElementById("location");

var dashboard = document.getElementById("dashboard");
var mainDash = document.getElementById("mainDash");
var frontDash = document.getElementById("front");
var backDash = document.getElementById("back");
var humidity, relHumidity, airQ, pressure, temp, windSpeed, uv;


var iconOne = document.getElementById("iconOne");
var iconTwo = document.getElementById("iconTwo");

var iconThree = document.getElementById("iconThree");
var iconFour = document.getElementById("iconFour");



function fetchData() {
    console.log("btn activated");


    //fade in loading element
    fetchBtn.classList.toggle("flip");

    //set timer on animation & hide elements at the end
    setTimeout(function () {
        fetchBtn.classList.toggle("blank");
        hero.style.display = "none";
        dashboard.style.display = "block";
        dashboard.classList.toggle("reveal");

    }, 2500);
    //hide hero element
    // hero.style.display = "none";
    setInterval(function () {
        console.log("dashboard updated")
        visualUpdate();
    }, 4000);
    caseTest();


}

function dashInfo() {
    mainDash.classList.toggle("flip");
    mainDash.classList.remove("mainBg");
    //add bg at end of animation
    setTimeout(function () {
        mainDash.classList.add("mainBg");
        frontDash.style.display = "none";
        backDash.style.display = "flex";
    }, 2500);
}


function checkAir() {
    if (airQ > 4 && airQ <= 6) {
        iconOne.src = "img/lung_G.png";
        console.log("moderate risk" + airQ);
    } else if (airQ >= 7) {
        console.log("high risk" + airQ);
        iconOne.src = "img/lung_H.png";
    } else {
        console.log("low risk" + airQ);
        iconOne.src = "img/lung_L.png";
    }
    document.getElementById("aq").innerHTML = airQ ;

}
function checkTemp() {

    if (temp <= 12) {
        //cold ish
        console.log("LOW TEMP VALUE" + temp);
        iconTwo.src = "img/heat_L.png";

    } else if (temp < 24) {
        //warm
        console.log("WARM TEMP VALUE" + temp);

        iconTwo.src = "img/heat_G.png";
    } else {
        console.log("HIGH Temp VALUE" + temp);
        iconTwo.src = "img/heat_H.png";


    }
    document.getElementById("rh").innerHTML = temp + " Celsius";

} // end of function

function checkWind() {
    if (windSpeed <= 10) {
        console.log("LOW wind VALUE" + windSpeed);
        iconFour.src = "img/wind_L.png";

    } else if (windSpeed > 10 && windSpeed < 30) {
        //average
        console.log("AVG wind VALUE" + windSpeed);
        iconFour.src = "img/wind_G.png";

        //iconThree.src = "img/"
    } else if (windSpeed > 45) {
        //high
        console.log("high Windspeed VALUE" + windSpeed);
        iconFour.src = "img/wind_H.png";
    }
    document.getElementById("wd").innerHTML = windSpeed + " km/h";

} //end of function

function checkSun() {
    if (uv <= 2) {
        //low
        console.log("LOW UV VALUE" + uv);
        iconThree.src = "img/sun_L.png";
    } else if (2 < uv && uv < 6) {
        console.log("avg UV VALUE" + uv);

        iconThree.src = "img/sun_G.png";
    } else if (uv > 6) {
        //uv high
        console.log("high UV VALUE" + uv);
        iconThree.src = "img/sun_H.png";
    }
    document.getElementById("uvv").innerHTML = uv;

} //end of function


//populate dummy variables
function caseTest() {
    //kitchener data
    temp = 4;
    airQ = 2;
    uv = 3;
    windSpeed = 16;
    document.getElementById("location").innerHTML = "Communitech- Kitchener/Waterloo, ON";
    document.getElementById("text").innerHTML = "12 devices on the network";
    document.body.style.backgroundImage = "url('./img/hub.jpg')";
    document.body.style.backgroundSize = "cover";

}

function caseTwo() {
    //china data
console.log("china stats");
    temp = Math.floor(Math.random() * (40-15) + 15);
    airQ = Math.floor(Math.random() * (11-8) + 8);
    uv = Math.floor(Math.random() * (11-1) + 1);
    windSpeed = Math.floor(Math.random() * (45-10) + 10);
    document.getElementById("location").innerHTML = "Bird's Nest-Beijing, China";
    document.getElementById("text").innerHTML = "5,000 devices on the network";
    //document.getElementById("plug").backgroundImage.src = "china.jpg";
    document.body.style.backgroundImage = "url('./img/china.jpg')";
    document.body.style.backgroundSize = "cover";

    console.log("china stats_2");


}

function visualUpdate() {
    //make function part of a timer
    checkAir();
    checkTemp();
    checkWind();
    checkSun();
}

//caseTest();
//caseTwo();
