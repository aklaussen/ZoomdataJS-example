/*
* Copyright (C) Zoomdata, Inc. 2012-2014. All rights reserved.
*/
"use strict";
//initLabels();
var duration = 1000;
var brushed = false;
var widgetBody = d3.select(controller.element.parentNode);
var widgetContent = d3.select(controller.element);
var widgetContentNode = d3.select(controller.element).node();
var chart = scatterplot()
    .width($(controller.element).width())
    .height($(controller.element).height())
    .x(function(d) {
        var metric = controller.metrics['X'],
            metricType = metric.get('type'),
            axisFormatter = d3.format("s"),
            formattedValue;

        if (!isInt(d)) {
            axisFormatter = d3.format(",.2f");
            formattedValue = axisFormatter(d);
        }
        else if(metricType === "MONEY") {
            axisFormatter = d3.format("$s");
            formattedValue = axisFormatter(d);
        } else {
            formattedValue = axisFormatter(d);
        }

        formattedValue.replace('G', 'B');

        return formattedValue;
    })
    .y(function(d) {
        var metric = controller.metrics['Y'],
            metricType = metric.get('type'),
            axisFormatter = d3.format("s"),
            formattedValue;

        if (!isInt(d)) {
            axisFormatter = d3.format(",.2f");
            formattedValue = axisFormatter(d);
        }
        else if(metricType === "MONEY") {
            axisFormatter = d3.format("$s");
            formattedValue = axisFormatter(d);
        } else {
            formattedValue = axisFormatter(d);
        }

        formattedValue.replace('G', 'B');

        return formattedValue;
    });

var tooltip;
var linearScale = d3.scale.linear(),
    quantileScale = d3.scale.quantile(),
    colorScale;

controller.update = function(data, progress) {
    //if(controller.state.filters.length <= 1 || data.length === 0) return;

    d3.select(controller.element)
        .datum(data)
        .call(chart);
};

// Called when the widget is resized
controller.resize = function(newWidth, newHeight, size) {
    brushed = false;
    !d3.select(controller.element.parentNode).select(".brush-botton").empty() ? d3.select(controller.element.parentNode).select(".brush-botton").remove() : null;
    chart.height(newHeight).width(newWidth);

    d3.select(controller.element)
        .call(chart);
};

controller.clear = function() {
    brushed = false;
    !d3.select(controller.element.parentNode).select(".brush-botton").empty() ? d3.select(controller.element.parentNode).select(".brush-botton").remove() : null;
};

function isInt(n) {
    return n % 1 === 0;
}

function scatterplot() {
    var svg = null,
        timestamp = new Date().getTime(),
        widgetHeight = 500,
        widgetWidth = 500,
        widgetSize = 'large',
        transitioning = false,
        brushDomainX = [],
        brushDomainY = [],
        xDomainOrig = [],
        yDomainOrig = [],
        fontSize = 14,
        margin = {top: 15, right: 0, bottom: 35, left: 50},
        width = widgetWidth - margin.left - margin.right,
        height = widgetHeight - margin.top - margin.bottom,
        x = d3.scale.linear(),
        y = d3.scale.linear().nice(),
        size = d3.scale.linear(),
        brush = d3.svg.brush().on("brush", brushmove).on("brushend", brushend),
        xAxis = d3.svg.axis().scale(x).orient("bottom").outerTickSize(6).ticks(8).tickFormat(xValue),
        yValue = function(d) { return d; },
        xValue = function(d) { return d; },
        yAxis = d3.svg.axis().scale(y).orient("left").outerTickSize(0).ticks(6).tickFormat(yValue),
        color = d3.scale.category20c(),
        groupKey = function(d) { return d.group };
    
    var clearBrushButton = $('<button/>', {
        text: "Reset Zoom",
        "class": "clear-zoom",
        click: function() {
            x.domain(xDomainOrig).nice;
            y.domain(yDomainOrig).nice;
            transitioning = true;
            d3.select(controller.element).selectAll(".scatter-group")
                .transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + x(controller.metrics["X"].raw(d)) + "," + y(controller.metrics["Y"].raw(d)) + ")"; })
                .call(endall, function() { transitioning = false; });

            svg.select("g.main-group").call(redrawAxis);
            brushed = false;
            d3.select(controller.element.parentNode).select(".brush-botton").remove();
            clearBrushButton.fadeOut("fast");
        }
    }).hide();
    
    clearBrushButton.appendTo(controller.element);

    function chart(selection) {
        selection.each(function(data) {
            makeResponsive();
            width = widgetWidth - margin.left - margin.right;
            height = widgetHeight - margin.top - margin.bottom;

            if(transitioning) return;

            // Select the svg element, if it exists.
            svg = d3.select(this).selectAll("svg").data([data]);

            updateAxisScales(data);

            var svgEnter = svg.enter()
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%");
            
            var defs = svgEnter.append("defs");
            
            defs.append("pattern")
                .attr("id", "stripes")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 4)
                .attr("height", 4)
                .attr("patternUnits", "userSpaceOnUse")
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 4)
                    .attr("height", 2)
                    .style("stroke", "none")
                    .style("opacity", 0.5)
                    .style("fill", "#A8A8A8");
        
            defs.append("pattern")
                .attr("id", "scatter-circle-stripes")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 2)
                .attr("height", 2)
                .attr("patternUnits", "userSpaceOnUse")
                .attr("patternTransform", "rotate(30)")
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 2)
                    .attr("height", 1)
                    .style("stroke", "none")
                    .style("fill", "#505050");
            
            var titleLine = svgEnter.append("line")
                .attr("x1", margin.left)
                .attr("y1", 0)
                .attr("x2", margin.left)
                .attr("y2", margin.top)
                .style("stroke-width", 1)
                .style("stroke", "black")
                .style("shape-rendering", "crispEdges");
            
            var titleRect = svgEnter.append("rect")
                .attr("height", margin.top)
                .attr("width", "100%")
                .attr("x", margin.left + 1)
                .attr("fill", "#bababa");
            
            var title = svgEnter.append("text")
                .attr("class", "title")
                .attr("x", margin.left + 5)
                .attr("y", "8")
                .attr("dy", ".3em")
                .text("Size = Complaints")
                .style("text-anchor", "left")
                .style("font-size", 11)
                .style("fill", "black")
                .style("letter-spacing", "0.15em")
                .style("text-transform", "uppercase")
                .style("font-weight", 700);
            
            var yAxisLabel = svgEnter.append("text")
                .attr("class", "label")
                .attr("x", "-25%")
                .attr("y", "9")
                .attr("transform", "rotate(-90)")
                .text("Crashes")
                .style("text-anchor", "left")
                .style("font-size", 13)
                .style("fill", "black")
                .style("text-transform", "uppercase")
                .style("font-weight", 600);
            
            var xAxisLabel = svgEnter.append("text")
                .attr("class", "label")
                .attr("x", "40%")
                .attr("y", "99%")
                .text("Injuries")
                .style("text-anchor", "left")
                .style("font-size", 13)
                .style("fill", "black")
                .style("text-transform", "uppercase")
                .style("font-weight", 600);
            
            var gEnter = svgEnter.append("g")
                .attr("class", "main-group");
            
            // gEnter.append("rect")
            //     .attr("width", "100%")
            //     .attr("height", "100%")
            //     .attr("fill", "url(#stripes)");

            gEnter.append("g").attr("class", "brush").call(brush);
            
            gEnter.select('g.brush').insert('rect', 'rect.background')
                .attr('class', 'striped-background');
            
            svg.select('rect.striped-background')
                .attr('width', svg.select('rect.background').attr('width'))
                .attr('height', svg.select('rect.background').attr('height'));
                
            gEnter.select("rect.background")
                .style("visibility", null);

            var scatterplotGroup = gEnter.append("g")
                .attr("class", "scatterplot-area")
                .append("g")
                .attr("class", "scatterplot-group")

            // Draw the X and Y Axis for the first time
            gEnter.call(drawAxis);

            // Update the inner group dimensions.
            var g = svg.select("g.main-group")
                .attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");

            // Refresh the Axis position and text labels
            g.call(redrawAxis);

            // Redraw the brush to account for changes in width and height
            g.select(".brush").call(brush);

            var scatterGroup = g.select(".scatterplot-group").selectAll(".scatter-group")
                .data(data, groupKey);

            var scatterEnterGroup = scatterGroup.enter()
                .append("g")
                .attr("class", "scatter-group")
                .attr("transform", function(d) { return "translate(" + x(controller.metrics["X"].raw(d)) + "," + y(controller.metrics["Y"].raw(d)) + ")"; })
                .style("opacity",  Math.random() / 2 + 0.5)
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseout", mouseleave);

            scatterEnterGroup
                .append("circle")
                .attr("class", "dot");
                
            scatterEnterGroup
                .append("circle")
                .attr("class", "pattern");

            scatterGroup.each(function (d) {
                    controller.releaseInteractiveElement(this);
                    controller.registerInteractiveElements(this, {
                        data: function() {
                            return d;
                        }
                    });
                })
                .transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + x(controller.metrics["X"].raw(d)) + "," + y(controller.metrics["Y"].raw(d)) + ")"; });

            scatterGroup.select("circle.dot")
                .attr("r", function(d) { return size(Math.abs(controller.metrics["Size"].raw(d))); })
                .style("fill", "#00e8ff")
                //.style("fill", "url(#scatter-circle-stripes)")
                .style("opacity", 1);
                
            scatterGroup.select("circle.pattern")
                .attr("r", function(d) { return size(Math.abs(controller.metrics["Size"].raw(d))); })
                //.style("fill", "#00e8ff")
                .style("fill", "url(#scatter-circle-stripes)")
                .style("opacity", 1);

            scatterGroup.exit()
                .transition()
                .duration(duration)
                .attr("r", 0)
                .style("opacity", 1e-6)
                .remove();
        });
    }

    function mouseover(d) {
        widgetContent.selectAll('.tooltips').remove();
        var elementColor = d3.select(this).select("circle").style("fill");
        var absoluteMousePos = d3.mouse(widgetContentNode);
        var valueFormatSize, valueFormatX, valueFormatY = d3.format(",.0f");
        tooltip = d3.select(controller.element).append("div").attr("class", "tooltips").style("opacity", 0);
        tooltip.style("opacity", 0.9)
            .style("background", "white")
            .style("border-color", elementColor)
            .style("left", (absoluteMousePos[0] + 10)+'px')
            .style("top", (absoluteMousePos[1] - 40)+'px');

        

        var fields = ["Crashed", "Injuries", "Fires", "Avg. Speed", "Complaints"],
            dataObject = {
                Crashed: controller.metrics['Y'].raw(d),
                Injuries: controller.metrics['X'].raw(d),
                Fires: d.current.metrics.fire.sum,
                'Avg. Speed': d.current.metrics.speed.avg,
                Complaints: controller.metrics['Size'].raw(d)
            };
        var html = '<div class="marker-title">' + d.group + '</div>';
        for (var i=0; i < fields.length; i++) {
            var value = dataObject[fields[i]];
            if(fields[i] === 'Avg. Speed') {
                value = Math.round(value) + "MPH";
            } else {
                value = addCommas(value);
            }
            
          html += "<br /><div class='left'>" + fields[i] + "</div><div class='right'>" + value + "</div>";
        }
    
        tooltip.html(html);
    }

    function mousemove(d) {
        var absoluteMousePos = d3.mouse(widgetContentNode);
        tooltip.style("left", (absoluteMousePos[0] + 10)+'px')
            .style("top", (absoluteMousePos[1] - 40)+'px');

        if(parseInt(tooltip.style("left")) + parseInt(tooltip.style("width")) + (parseInt(tooltip.style("padding")) * 2) + parseInt(tooltip.style("border-radius")) + parseInt(tooltip.style("border")) > widgetWidth) {
            tooltip.style("left", function() {
                return (parseInt(tooltip.style("left")) - parseInt(tooltip.style("width")) - (parseInt(tooltip.style("padding")) * 2) - parseInt(tooltip.style("border-radius")) - parseInt(tooltip.style("border")) - 10) + "px";
            });
        }

        if(parseInt(tooltip.style("top")) - (parseInt(tooltip.style("padding")) * 2) - parseInt(tooltip.style("border-radius")) - parseInt(tooltip.style("border")) < 0) {
            tooltip.style("top", function() {
                return (parseInt(tooltip.style("top")) + (parseInt(tooltip.style("padding")) * 2) + parseInt(tooltip.style("border-radius")) + parseInt(tooltip.style("border"))) + "px";
            });
        }

        if(parseInt(tooltip.style("top")) + parseInt(tooltip.style("height")) + (parseInt(tooltip.style("padding")) * 2) + parseInt(tooltip.style("border-radius")) + parseInt(tooltip.style("border")) > widgetHeight) {
            tooltip.style("top", function() {
                return (parseInt(tooltip.style("top")) - (parseInt(tooltip.style("padding")) * 2) - parseInt(tooltip.style("border-radius")) - parseInt(tooltip.style("border"))) + "px";
            });
        }


    }

    // Mouseleave Handler
    function mouseleave(d) {
        tooltip.style("opacity", 0)
        tooltip.remove();
    }

    function updateAxisScales(data) {
        // Update the x-scale & y-scale domain
        var minMetricValueX = d3.min(data, function(d) {
            return controller.metrics["X"].raw(d);
        });
        var minMetricValueY = d3.min(data, function(d) {
            return controller.metrics["Y"].raw(d);
        });
        var minMetricValueSize = d3.min(data, function(d) {
            return controller.metrics["Size"].raw(d);
        });

        var absMaxMetricValueX = d3.max(data, function(d) {
            return Math.abs(controller.metrics["X"].raw(d));
        });
        var absMaxMetricValueY = d3.max(data, function(d) {
            return Math.abs(controller.metrics["Y"].raw(d));
        });
        var absMaxMetricValueSize = d3.max(data, function(d) {
            return Math.abs(controller.metrics["Size"].raw(d));
        });

        xDomainOrig = [minMetricValueX < 0 ? -absMaxMetricValueX : 0, absMaxMetricValueX];
        yDomainOrig = [minMetricValueY < 0 ? -absMaxMetricValueY : 0, absMaxMetricValueY];
        var xDomain = brushed ? brushDomainX : xDomainOrig,
            xRange = [0, width];
        var yDomain = brushed ? brushDomainY : yDomainOrig,
            yRange = [height, 0];
        var sizeDomain = [0, absMaxMetricValueSize],
            sizeRange = [5, 25];

        if ((brushed ? x.domain()[0] : minMetricValueX) < 0) {
            xDomain[0] = -absMaxMetricValueX;
            xDomainOrig[0] = -absMaxMetricValueX;
            xRange[0] = 0;
        }
        if ((brushed ? y.domain()[0] : minMetricValueY) < 0) {
            yDomain[0] = -absMaxMetricValueY;
            yDomainOrig[0] = -absMaxMetricValueY;
            yRange[0] = height;
        }

        x.range(xRange).domain(xDomain).nice();
        y.range(yRange).domain(yDomain).nice();
        size.range(sizeRange).domain(sizeDomain).nice();

        brush.x(x).y(y);
    }

    function brushmove() {
        var extent = brush.extent();
        if(brush.empty()) {
            return;
        }
        d3.select(controller.element).selectAll(".scatter-group").classed("selected", function(d) {
            var is_brushed = extent[0][0] <= x.invert(x(controller.metrics["X"].raw(d))) && x.invert(x(controller.metrics["X"].raw(d))) <= extent[1][0]
                && extent[0][1] <= y.invert(y(controller.metrics["Y"].raw(d))) && y.invert(y(controller.metrics["Y"].raw(d))) <= extent[1][1];
            return is_brushed;
        });
    }

    function brushend() {
        if(brush.empty()) {
            return;
        }

        brushed = true;
        brushDomainX = [brush.extent()[0][0], brush.extent()[1][0]];
        brushDomainY = [brush.extent()[0][1], brush.extent()[1][1]];
        x.domain(brushDomainX).nice;
        y.domain(brushDomainY).nice;
        
        clearBrushButton.fadeIn("slow");

        transitioning = true;
        d3.select(controller.element).selectAll(".scatter-group")
            .transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + x(controller.metrics["X"].raw(d)) + "," + y(controller.metrics["Y"].raw(d)) + ")"; })
            .call(endall, function() { transitioning = false; });

        svg.select("g.main-group").call(redrawAxis);

        d3.select(controller.element).selectAll(".scatter-group").classed("selected", false);
        d3.select(controller.element).select(".brush").call(brush.clear());
    }

    function drawAxis() {
        var xAxisGroup = this.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0, " + y(0) + ")")
            .call(xAxis);

        var yAxisGroup = this.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + x(0) + ", 0)")
            .call(yAxis);
    }

    // Update the positions and values of the X and Y Axis
    function redrawAxis() {
        // Update the x-axis based on the updated xScale range
        this.select(".x.axis")
            .attr("transform", function() {
                if(y.domain()[0] >= 0) {
                    return "translate(0, " + y(y.domain()[0]) + ")";
                } else if (y.domain()[0] < 0 && y.domain()[1] < 0) {
                    return "translate(0, " + y(y.domain()[1]) + ")";
                } else {
                    return "translate(0, " + y(0) + ")";
                }
            })
            .call(xAxis);

        // Update the y-axis based on the updated yScale range
        this.select(".y.axis")
            .attr("transform", function() {
                if(x.domain()[0] >= 0) {
                    return "translate(" + x(x.domain()[0]) + ", 0)";
                } else if (x.domain()[0] < 0 && x.domain()[1] < 0) {
                    return "translate(" + x(x.domain()[1]) + ", 0)";
                } else {
                    return "translate(" + x(0) + ", 0)";
                }
            })
            .call(yAxis);
        
        var ticks = this.selectAll(".x.axis > g.tick");
        var lastTick = ticks[0][ticks[0].length - 1];
        d3.select(lastTick).select("text").style("text-anchor", "end");
    }

    function endall(transition, callback) {
        var n = 0;
        transition
            .each(function() { ++n; })
            .each("end", function() { if (!--n) callback.apply(this, arguments); });
    }

    function getFieldLabel(fieldName) {
        var field = controller.fields.findWhere({name:fieldName});
        return field && field.attributes ? field.attributes.label : '';
    }

    function getFieldType(fieldName) {
        var field = controller.fields.findWhere({name:fieldName});
        var fieldType = field && field.attributes ? field.attributes.type : '';
        return fieldType;
    }

    function makeResponsive() {
        if(widgetWidth < 500 || widgetHeight < 380) {
            //medium
            widgetSize = 'medium';
            fontSize = 11;
        } else {
            //large
            widgetSize = 'large';
            fontSize = 14;
        }
    }

    // Setter and getter methods
    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        width = widgetWidth - margin.left - margin.right;
        height = widgetHeight - margin.top - margin.bottom;
        return chart;
    };

    chart.width = function(_) {
        if (!arguments.length) return widgetWidth;
        widgetWidth = _;
        width = widgetWidth - margin.left - margin.right;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) return widgetHeight;
        widgetHeight = _;
        height = widgetHeight - margin.top - margin.bottom;
        return chart;
    };

    chart.duration = function(_) {
        if (!arguments.length) return duration;
        duration = _;
        return chart;
    };

    chart.x = function(_) {
        if (!arguments.length) return xValue;
        xValue = _;
        xAxis.tickFormat(xValue);
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) return yValue;
        yValue = _;
        yAxis.tickFormat(yValue);
        return chart;
    };

    chart.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return chart;
    };

    return chart;
}

function initLabels(){
    controller.createAxisLabel({
        picks: 'Group By',
        orientation: 'horizontal',
        position: 'bottom',
        popoverTitle: 'Group'
    });

    controller.createAxisLabel({
        picks: 'X',
        orientation: 'horizontal',
        position: 'bottom',
        popoverTitle: 'X'
    });

    controller.createAxisLabel({
        picks: 'Color',
        orientation: 'vertical',
        position: 'left',
        popoverTitle: 'Color'
    });

    controller.createAxisLabel({
        picks: 'Y',
        orientation: 'vertical',
        position: 'left',
        popoverTitle: 'Y'
    });

    controller.createAxisLabel({
        picks: 'Size',
        orientation: 'horizontal',
        position: 'bottom',
        popoverTitle: 'Size'
    });
}

// Remove default panning when dragging
$(controller.element).mousedown(function() {
    var $widget = $(this).closest('li.widget');
    if ($widget.hasClass('selectedWidget')) {
        return false;
    }

});

function addCommas(nStr) {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

controller.customReadyStatusDelay = duration*2;