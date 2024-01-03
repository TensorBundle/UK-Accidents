// !preview r2d3 data=c(0.3, 0.6, 0.8, 0.95, 0.40, 0.20), viewer = "browser"
//
// r2d3: https://rstudio.github.io/r2d3
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

var width = 800;
var height = 700;

var projection = d3.geoAlbers()
    .center([0, 55.4])
    .rotate([4.4, 0])
    .parallels([50, 60])
    .scale(3500)
    .translate([width / 2, height / 2])

const batchCount = 7;

var svg = d3.select("#svgContainer").append("svg").attr("width",width).attr("height",height)

Promise.all([
    d3.csv("https://raw.githubusercontent.com/TensorBundle/skills-introduction-to-github/main/dataFord3.csv"),
    d3.json("https://raw.githubusercontent.com/TensorBundle/skills-introduction-to-github/main/LAD_May_2022_V2.json"),
]).then(function(data) {
    var AccidentData = data[0]
    var TopoJSON = data[1]

    AccidentData.forEach((a,i) => {
        AccidentData[i].Longitude2=Number(a.Longitude.replace("'",""));
        //AccidentData[i].CasualtyCount=a["Sum.of.Accident.Casualty.Count"];
        (i < 5) ? AccidentData[i].isShowcase = 1 : AccidentData[i].isShowcase = 0;
        var p = projection([AccidentData[i].Longitude2,AccidentData[i].Latitude])
        AccidentData[i].x = p[0]; AccidentData[i].y = p[1];
        (i < 5) ? AccidentData[i].batch = i : AccidentData[i].batch = 5+((i - (i % batchCount)) / batchCount)
      })

    console.log(AccidentData)
    console.log(TopoJSON)
    render(AccidentData, TopoJSON)
        }).catch(function(err) {
                    console.log(err)
                                });

/*
console.log(data)
var AccidentData = d3.csv("https://raw.githubusercontent.com/TensorBundle/skills-introduction-to-github/main/dataFord3.csv").then(function(d) {console.log(d)})
var UKmap = d3.json("https://raw.githubusercontent.com/TensorBundle/skills-introduction-to-github/main/LAD_May_2022.json").then(function(d) {render(data, d)})
*/


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function drawMap(MapData) {
  var colorScale = d3.scaleThreshold()
  .domain([100000, 1000000, 10000000, 30000000, 100000000, 500000000])
  .range(d3.schemeBlues[7]);

//  console.log(topojson.feature(MapData,MapData.objects.LAD_UK_TOPOJSON))
    
  svg.select("#mapContainer").append("path")
    .datum(topojson.feature(MapData,MapData.objects.LAD_UK_TOPOJSON))
    .attr("d", d3.geoPath().projection(projection))
    .attr("fill", "#141414")
    //.attr("style","stroke: black; stroke-width: 1px; stroke-opacity: 30%")
}

function fadeInMap() {
    svg.select("#mapContainer").select("path")
    .transition()
    .duration(2000)
    .style("stroke","#9e9e9e8a")
    .style("stroke-width","1px")
    .style("stroke-opacity","30%")
}

function drawLocations(AccidentData) {
  svg.select("#pointContainer").selectAll(".loc")
    .data(AccidentData)
    .join("circle")
    .attr("transform", function(d) {
        return "translate(" + [d.x,d.y] + ")";
      })
    .attr("r",(d) => {return d.CasualtyCount})
    .style("fill","rgba(176, 33, 18, 0.5)")
    .style("stroke","red")
    .style("stroke-width","0.5")
}

function drawExplosion(rows, expArray, durations) {
  var theta = 2 * Math.PI / expArray.length;
  //var x = row.x, y = row.y;
  var r = 10
  var r2 = 10
  var batchid = rows[0].batch
  var rowsg = svg.selectAll("#b"+batchid)
                  .data(rows)
                  .enter()
                  .append("g")
                  .attr("id","b"+batchid)
  
  var lines = rowsg.selectAll('#p'+batchid)  //function(d, i) { return expArray.map(function(x){return d}; }
    .data(function(d, i) {return expArray.map(function(x) {return d}) })
    .enter()
    .append('line')
    .attr("id","p"+batchid)
    .attr("x1",(d)=>{return d.x}).attr("y1",(d)=>{return d.y}).attr("x2",(d)=>{return d.x}).attr("y2",(d)=>{return d.y})
    .attr("style","stroke:#d13e2e")
  
  lines.transition()
    .duration(durations.expDuration)
    .attr("x2",function(d, i) { return(d.x+r * Math.cos(i * theta)); })
    .attr("y2",function(d, i) { return(d.y+r * Math.sin(i * theta)); })  

    .transition()
    .duration(durations.expDuration-100)
    .attr("x1",function(d, i) { return(d.x+r2 * Math.cos(i * theta)); })
    .attr("y1",function(d, i) { return(d.y+r2 * Math.sin(i * theta)); })
    .on("end", () => {
                      rowsg.remove();
                      if(durations.circleDelay>0)
                        {
                          sleep(durations.circleDelay).then(() => {drawCircle(rows,durations.cirleDuration)  });
                        }
                      else
                        {drawCircle(rows,durations.cirleDuration)}
                      });
                      
}

function drawCircle(rows,duration) {
  var circles = svg.select("#pointContainer").selectAll("#c"+rows[0].batch)
    .data(rows)
    .join("circle")
    .attr("transform", function(d) {
        return "translate(" + [d.x,d.y] + ")";
      })
    .style("fill","rgba(176, 33, 18, 0.5)")
    .style("stroke","red")
    .style("stroke-width","0.5")
    
  if(duration>0)
  {
    circles.transition()
    .duration(duration)
    .attr("r",(d) => {return d.CasualtyCount})
  }
  else
  {
    circles.attr("r",(d) => {return d.CasualtyCount})
  }
  
}

function drawAccident(rows, expArray, durations) {
  drawExplosion(rows, expArray, durations)
}  

function drawTitle(duration) {
  d3.select("body").insert("div",":first-child").attr("id","headerContainer").attr("class","header").attr("style","display: block;").append("h1").text("U.K. Fatal Accidents in 2022")
  
  d3.select("body")
    .insert("div").attr("id","fatalCountContainer").attr("style","display: block;")
    .insert("span").attr("id","fatalCounter").text("0")
    .insert("br")
    .insert("span").attr("id","fatalCounterDesc").text("Died in accident")
  //var hCont = svg.append("g").attr("id","headerContainer")
  
  //hCont.append("text")
}

function render(AccidentData,TopoJSON) {
var expArray = [0,1,2,3,4,5,6,7,8,9,10]

svg.append("g").attr("id","mapContainer")
svg.append("g").attr("id","pointContainer")

drawMap(TopoJSON)
//drawTitle()
//drawLocations(AccidentData)

var k = 0;
var totalCount = 0;
var e
var durations = {}
durations.expDuration = 600
durations.circleDelay = 200
durations.circleDuration = 1000

function intervalCallback(elapsed) {
  if(elapsed > timeoutDelay)
  {
    console.log("elapsed: "+elapsed+" k: "+k)
    var rows
    /*
    if(k<3) {
      rows = [AccidentData[k]]
    }
    else
    {
      rows = AccidentData.filter(function(d) {return d.batch == k})
    }
    */
    rows = AccidentData.filter(function(d) {return d.batch == k})
    console.log(rows.length)
  
    if (k == 5) {
        durations.expDuration = 300
        durations.circleDelay = 0
        durations.circleDuration = 0
        timeoutDelay = 30
    }
    if(rows.length == 0) { // End of drawing
        timer.stop();
        console.log("Timeout stop called")
        fadeInMap()
    }
    if (rows.length > 0) {
      timer.restart(intervalCallback);
      //console.log("Timeout restarted with delay: "+timeoutDelay)
      drawCircle(rows,durations.circleDuration)
      totalCount = totalCount + rows.length
      //console.log(d3.select("fatalCounter"))
      d3.select("#fatalCounter").text(totalCount)
      //drawAccident(rows, expArray, durations)
      //console.log(k)
    }
    k++;
  }
}

var timeoutDelay = 1500
var timer = d3.timer(intervalCallback,timeoutDelay)
//const t = d3.interval(intervalCallback, 1500);


}


