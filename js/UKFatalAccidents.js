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

const filters = {};

filters.RoadType = ["Single carriageway","Dual carriageway","Roundabout","Slip road","One way street","Other"]
filters.SpeedLimit = ["20","30","40","50","60","70"]
filters.RoadSurface = ["Dry","Wet or damp","Frost or ice","Flood","Snow","Other"]

var svg = d3.select("#svgContainer").append("svg").attr("width",width).attr("height",height)

Promise.all([
    d3.csv("https://raw.githubusercontent.com/TensorBundle/UK-Accidents/main/data/UKAccidentData.csv"),
    d3.json("https://raw.githubusercontent.com/TensorBundle/UK-Accidents/main/data/LAD_May_2022_V3.json"),
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
        if(!d3.subset([AccidentData[i]["Road Type"]],filters.RoadType)) {AccidentData[i]["Road Type"] = "Other"}
        if(!d3.subset([AccidentData[i]["Road Surface Conditions"]],filters.RoadSurface)) {
          AccidentData[i]["Road Surface Conditions"] == "Flood over 3cm. deep" ? AccidentData[i]["Road Surface Conditions"] = "Flood" : AccidentData[i]["Road Surface Conditions"] = "Other"
        }
      })

    //console.log(AccidentData)
    //console.log(TopoJSON)
    render(AccidentData, TopoJSON)
        }).catch(function(err) {
                    console.log(err)
                                });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function drawMap(MapData) {
  //console.log(topojson.feature(MapData,MapData.objects.LAD_UK_TOPOJSON).features)
    
  svg.select("#mapContainer").selectAll("path")
    //.datum(topojson.feature(MapData,MapData.objects.LAD_UK_TOPOJSON))
    .data(topojson.feature(MapData,MapData.objects.LAD_UK_TOPOJSON).features)
    .enter().append("path")
    .attr("d", d3.geoPath().projection(projection))
    .attr("fill", "#141414")
    //.attr("style","stroke: #141414; stroke-width: 1px; stroke-opacity: 0.3")
    .on("mouseover",function(e) {d3.select("#hoverContainer").text(d3.select(this).datum().properties.LAD22NM)})
    .on("mouseout", function(e) {})
}

function fadeIn() {
    svg.select("#mapContainer").selectAll("path")
    .transition()
    .duration(2000)
    .style("stroke","#9e9e9e8a")
    .style("stroke-width","1px")
    .style("stroke-opacity","30%")

    d3.select("#filterContainer").transition().duration(2000).style("opacity",1)
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
    .attr("r",0)
    
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

function render(AccidentData,TopoJSON) {
var expArray = [0,1,2,3,4,5,6,7,8,9,10]

svg.append("g").attr("id","mapContainer")
svg.append("g").attr("id","pointContainer")


// Temporary drawmap
/*
drawMap(TopoJSON)
svg.select("#mapContainer").selectAll("path")
.style("stroke","#9e9e9e8a")
.style("stroke-width","1px")
.style("stroke-opacity","0.3")
*/

drawMap(TopoJSON)

var k = 0;
var totalCount = 0;
var currentMode = "bubbles";
var durations = {}
durations.expDuration = 600
durations.circleDelay = 200
durations.circleDuration = 1000
var colorScale = d3.scaleThreshold().domain([0, 1, 2, 3, 4, 5]).range(d3.schemeYlOrRd[7]);

function intervalCallback(elapsed) {
  if(elapsed > timeoutDelay)
  {
    //console.log("elapsed: "+elapsed+" k: "+k)
    var rows

    rows = AccidentData.filter(function(d) {return d.batch == k})
    //console.log(rows.length)
  
    if (k == 5) {
        durations.expDuration = 300
        durations.circleDelay = 0
        durations.circleDuration = 1000
        timeoutDelay = 30
    }
    if(rows.length == 0) { // End of inital rendering
        timer.stop();
        console.log("Timeout stop called")
        fadeIn()
    }
    if (rows.length > 0) { // If not done yet, restart the timer and draw the next batch
      timer.restart(intervalCallback);
      drawCircle(rows,durations.circleDuration)
      totalCount = totalCount + rows.length
      d3.select("#fatalCounter").text(totalCount)
    }
    k++;
  }
}

var timeoutDelay = 1500
var timer = d3.timer(intervalCallback,timeoutDelay)
//drawCircle(AccidentData,durations.circleDuration)

d3.select("#displayBubbles").on("click", showBubbles)
d3.select("#displayHeatmap").on("click", showHeatmap)

function showBubbles() {
  currentMode = "bubbles"

  d3.select("#mapContainer").selectAll("path").transition().duration(1000)
  .attr("fill", "#141414")
  .style("stroke-opacity","0.3")  // TBD: Chain on transition end

  d3.select("#pointContainer").selectAll("circle")
  .data(filteredData, function(d) {return d.AccidentID})
  .join(
    function(enter) {var circles = enter.append("circle")
                      .attr("transform", function(d) {
                          return "translate(" + [d.x,d.y] + ")";
                        })
                      .style("fill","rgba(176, 33, 18, 0.5)")
                      .style("stroke","red")
                      .style("stroke-width","0.5")
                      .attr("r",0)
                      .transition()
                      .duration(600)
                      .attr("r",(d) => {return d.CasualtyCount})
                    }
    ,update => update
    ,exit => exit)
}

function showHeatmap() {
  currentMode = "heatmap"
  var circles = d3.select("#pointContainer").selectAll("circle")

  circles.transition().duration(1000).attr("r",0)
  .end().then(function() {
    circles.remove()

    d3.select("#mapContainer").selectAll("path").transition().duration(1000)
    .attr("fill", function (d) {
      var LADMeasures = d3.rollup(filteredData, (D) => D.length, (d) => d["Local Authority ONS District"])
      d.total = LADMeasures.get(d.properties.LAD22NM) || 0;
      return colorScale(d.total);
    })
    .style("stroke-opacity","0.9")
  } 
  );
}

var activeFilters = {};
activeFilters.RoadType = [];
activeFilters.SpeedLimit = [];
activeFilters.RoadSurface = [];
var filteredData = AccidentData;
function filterOnClick(clickedValue, filter) {
  //console.log(clickedValue)
  if(d3.subset([clickedValue], activeFilters[filter])) // if the clicked value exists in the applied filters, remove it, otherwise add it
  {activeFilters[filter] = d3.difference(activeFilters[filter], [clickedValue])}
  else
  {activeFilters[filter] = d3.union(activeFilters[filter], [clickedValue])} 
  console.log(activeFilters)
  updateFilters()
}


function updateFilters() {
  
  if(activeFilters.RoadType.size > 0) {
    filteredData = AccidentData.filter(function(d) {return d3.subset([d["Road Type"]],activeFilters.RoadType) })
    } else {filteredData = AccidentData}
  if(activeFilters.SpeedLimit.size > 0) {
    filteredData = filteredData.filter(function(d) {return d3.subset([d["Speed Limit"]],activeFilters.SpeedLimit) })
    } else {}
  if(activeFilters.RoadSurface.size > 0) {
    filteredData = filteredData.filter(function(d) {return d3.subset([d["Road Surface Conditions"]],activeFilters.RoadSurface) })
    } else {}
  
  console.log(filteredData)
  updateChart(currentMode)
}

function updateChart(currentMode) {
  if(currentMode == "bubbles")
  {
    d3.select("#pointContainer").selectAll("circle")
        .data(filteredData, function(d) {return d.AccidentID})
        .join(
          function(enter) {console.log(enter);
                                var circles = enter.append("circle")
                                    .attr("transform", function(d) {
                                        return "translate(" + [d.x,d.y] + ")";
                                      })
                                    .style("fill","rgba(176, 33, 18, 0.5)")
                                    .style("stroke","red")
                                    .style("stroke-width","0.5")
                                    .attr("r",0)
                                    .transition()
                                    .duration(600)
                                    .attr("r",(d) => {return d.CasualtyCount})
                          }
          ,update => update
          ,function(exit) {exit.transition().duration(1000).attr("r",0).end().then(function() {exit.remove()}) })
  }
  if(currentMode == "heatmap")
  {
    d3.select("#mapContainer").selectAll("path").transition().duration(1000)
    .attr("fill", function (d) {
      var LADMeasures = d3.rollup(filteredData, (D) => D.length, (d) => d["Local Authority ONS District"])
      d.total = LADMeasures.get(d.properties.LAD22NM) || 0;
      return colorScale(d.total);
    })
  }
}
//Set up filters
d3.select("#RoadTypeFilterGroup").selectAll("li").data(filters.RoadType)
    .join(
      function(enter) {
              var li = enter.append("li")
              li.append("span").attr("class","filterToggle").datum(function(d,i) {return {item: d,index: i}})
              li.append("span").attr("class","filterItem").datum(function(d,i) {return {item: d,index: i}}).text(function(d) {return d.item})
              li.on("click", function() {
                d3.select(this).classed("checked", !d3.select(this).classed("checked"))  // Toggle checkbox
                var clickedValue = d3.select(this).datum()  // Get clicked value
                filterOnClick(clickedValue, "RoadType")}) 
            }
    )

d3.select("#SpeedLimitFilterGroup").selectAll("li").data(filters.SpeedLimit)
.join(
  function(enter) {
          var li = enter.append("li")
          li.append("span").attr("class","filterToggle").datum(function(d,i) {return {item: d,index: i}})
          li.append("span").attr("class","filterItem").datum(function(d,i) {return {item: d,index: i}}).text(function(d) {return d.item})
          li.on("click", function() {
            d3.select(this).classed("checked", !d3.select(this).classed("checked"))  // Toggle checkbox
            var clickedValue = d3.select(this).datum()  // Get clicked value
            filterOnClick(clickedValue, "SpeedLimit")}) 
        }
)

d3.select("#RoadSurfaceFilterGroup").selectAll("li").data(filters.RoadSurface)
.join(
  function(enter) {
          var li = enter.append("li")
          li.append("span").attr("class","filterToggle").datum(function(d,i) {return {item: d,index: i}})
          li.append("span").attr("class","filterItem").datum(function(d,i) {return {item: d,index: i}}).text(function(d) {return d.item})
          li.on("click", function() {
            d3.select(this).classed("checked", !d3.select(this).classed("checked"))  // Toggle checkbox
            var clickedValue = d3.select(this).datum()  // Get clicked value
            filterOnClick(clickedValue, "RoadSurface")}) 
        }
)


}


