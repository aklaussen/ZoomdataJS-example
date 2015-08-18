/*
 * Copyright (C) Zoomdata, Inc. 2012-2014. All rights reserved.
 */
 
/* global controller */

var duration = 1000,
    vendorPrefix = getVendorPrefix(),
    datasetLength = 0,
    isStopped = false,
    noTouch = $('html').hasClass('no-touch');

var BAR_WIDTH = 'Bar Width';

var linearScale = d3.scale.linear(),
    quantileScale = d3.scale.quantile(),
    colorScale,
    chart = barChart()
        .width($(controller.element).width())
        .height($(controller.element).height())
        .x(function(d) {
            var metric = controller.metrics[BAR_WIDTH],
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
        .comparison(controller.state.attributes.comparison);

controller.update = function(data, progress) {
    console.log(data);
    isStopped = false;

    console.log(data);
    console.log(controller);

    data.forEach(function(item) {
        item.count = controller.metrics[BAR_WIDTH].raw(item);
    });

    datasetLength = data.length;
    d3.select(controller.element)
        .datum(data)
        .call(chart);
};

// Called when the widget is resized
controller.resize = function(newWidth, newHeight, size) {
    chart.height(newHeight).width(newWidth);

    d3.select(controller.element)
        .call(chart);
};

controller.clear = function() {
    d3.select(controller.element).select(".bars-group").style(vendorPrefix + "transform", "translate3d(0, 0, 0)");
    isStopped = true;
};

// Called when comparison mode is started or changed
controller.state.on("change:comparison", function() {
    chart.comparison(controller.state.attributes.comparison);
});

function historicalMetric(metricName, d) {
    var historicalMetric = controller.metrics[metricName];

    if (historicalMetric.isCount()) {
        return d.historical.count;
    } else {
        if (!d.historical || !d.historical.metrics) {
            return 0;
        }
        return d.historical.metrics[historicalMetric.get('name')][historicalMetric.get('func')];
    }
}

function isInt(n) {
    return n % 1 === 0;
}

function barChart() {
    var instance = this,
        svg = null,
        layout = null,
        comparison = false,
        timestamp = new Date().getTime(),
        minimumColor = '#DB3024',
        neutralColor = '#B1B1B1',
        maximumColor = '#109452',
        widgetHeight = 500,
        widgetWidth = 500,
        widgetSize = 'large',
        fontSize = 14,
        margin = {top: 0, right: 1, bottom: 0, left: 0},
        width = widgetWidth - margin.left - margin.right,
        height = widgetHeight - margin.top - margin.bottom,
        barHeight = 26,
        minBarHeight,
        maxBarHeight = 26,
        colorScale = d3.scale.quantize().range([minimumColor, neutralColor, maximumColor]),
        yScale = d3.scale.ordinal(),
        yScaleHist = d3.scale.ordinal(),
        xScale = d3.scale.linear(),
        xAxisScale = d3.scale.linear(),
        yAxis = d3.svg.axis().scale(yScale).orient("left").tickSize(0).ticks(0),
        xValue = function(d) { return d; },
        xAxis = d3.svg.axis().scale(xAxisScale).orient("top").ticks(3).tickFormat(xValue),
        currentBarPadding = 0,
        currentOuterPadding = 0,
        ease = "cubic-in-out",
        groupKey = function(d) {
            return d.group;
        };

    function chart(selection) {
        selection.each(function(data) {
            data || (data = []);
            instance.data = data;
            makeResponsive();
            width = widgetWidth;
            height = data.length * barHeight;

            updateAxisScales(data);

            // Select the svg element, if it exists.
            svg = d3.select(this).selectAll("svg").data([data]);

            svg.enter()
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .append("g")
                 .attr("transform", "translate(0,20)");

            layout = d3.select(this).selectAll(".wigetLayout").data([data]);

            var divEnter = layout.enter()
                .append("div")
                .attr("class", "wigetLayout")
                .append("div")
                .attr("class", "main-group");

            var barsGroup = divEnter.append("div")
                .attr("class", "bar-area")
                .append("div")
                .attr("class", "bars-group");

            barsGroup.append("div")
                .attr("class", "bars-background")
                .style("top", 0)
                .style("left", 0);

            // Draw the X and Y Axis for the first time
            if (!svg.selectAll(".x.axis")[0].length) {
                svg.select('g').call(drawAxis);
            }

            // Update the inner group dimensions.
            var mainGroup = layout.select("div.main-group")
                .style('top', margin.top + 'px')
                .style('left', (margin.left + 1) + 'px');

            mainGroup.select(".bars-background")
                .style("width", (width - margin.right) + "px")
                .style("height", height - margin.top - margin.bottom + "px");
                //.style("height", (height < widgetHeight ? widgetHeight - margin.top - margin.bottom : height) + "px");

            // Refresh the Axis position and text labels
            svg.select("g.main-group").call(redrawAxis);

            // Update the bars background width
            mainGroup.select("div.bar-background")
                .style("width", (width < widgetWidth ? widgetWidth - margin.left - margin.right : width) + "px")
                .style("height", height + "px");

            var bars = mainGroup.select('.bars-group').selectAll("div.bar-group")
                .data(data, groupKey);

            var barsEnterGroup = bars.enter()
                .append("div")
                .attr("class", function(d, i) {
                    var klass = (i % 2) === 0 ? "bar-group even" : "bar-group odd"
                    if(noTouch) klass += " no-touch";
                    return klass;
                })
                .style(vendorPrefix + "transform", function(d) {
                    return "translate3d(0, " + (yScale(d.group) - 1) + "px, 0)";
                });

            // Append the current period bar rect
            barsEnterGroup
                .append("div")
                .attr("class", "bar current")
                .style("height", (yScale.rangeBand() - currentBarPadding) + "px")
                .style("width", 0);

            // Append the bar text label
            barsEnterGroup
                .append("div")
                .attr("class", "label")
                .text(groupKey);

            // Append the bar text label
            barsEnterGroup
                .append("div")
                .attr("class", "value")
                .text(function(d) {
                    return addCommas(controller.metrics[BAR_WIDTH].raw(d));
                });

            // Update Bar Group Positions
            bars
                .style("height", (yScale.rangeBand() - currentBarPadding) + "px")
                .style(vendorPrefix + "transform", function(d) {
                    return "translate3d(0, " + yScale(d.group) + "px, 0)";
                })
                .each(function(d) {
                    controller.releaseInteractiveElement(this);
                    controller.registerInteractiveElements(this, {
                        data: function() {
                            return d;
                        }
                    });
                });

            // Update the current period rects
            bars.select('div.bar.current')
                .style("height", "100%")
                .transition()
                .delay(function(d, i) { return i / data.length * duration; })
                .style("width", function(d) {
                    return xScale(controller.metrics[BAR_WIDTH].raw(d)) + "px";
                });

            // Remove any unnecessary bar groups
            bars.exit()
                .remove();
        });
    }

    // Convenience method for getting the min value of an array
    function minValue(array) {
        return Math.min.apply(Math, array.map(function(d) {
            return Math.abs(d);
        }));
    }

    // Convenience method for getting the max value of an array
    function maxValue(array) {
        return Math.max.apply(Math, array.map(function(d) {
            return Math.abs(d);
        }));
    }

    function updateAxisScales(data) {
        // Update the scales in case the data has changed
        yScale.domain(data.map(groupKey))
            .rangeRoundBands([0, height], currentBarPadding, currentOuterPadding);

        yScaleHist.domain(data.map(groupKey))
            .rangeRoundBands([0, height], 0.1, 0);

        // Update the x-scale domain
        var minMetricValue = d3.min(data, function(d) {
            if (comparison) {
                var metric = controller.metrics[BAR_WIDTH].raw(d),
                    histMetric = historicalMetric(BAR_WIDTH, d);

                return histMetric > metric ? histMetric : metric;
            } else {
                return controller.metrics[BAR_WIDTH].raw(d);
            }
        });

        var absMaxMetricValue = d3.max(data, function(d) {
            if (comparison) {
                var metric = Math.abs(controller.metrics[BAR_WIDTH].raw(d)),
                    histMetric = Math.abs(historicalMetric(BAR_WIDTH, d));

                return histMetric > metric ? histMetric : metric;
            } else {
                return Math.abs(controller.metrics[BAR_WIDTH].raw(d));
            }
        });

        var xScaleDomain = [0, absMaxMetricValue];
        if(minMetricValue < 0) {
            xScaleDomain[0] = -absMaxMetricValue;
        }

        xAxisScale.range([1, width - margin.right]).domain(xScaleDomain).nice();
        xScale.range([0, width - margin.right]).domain(xScaleDomain).nice();
    }

    // Event fired when the bars are being scrolled
    function dragmove() {
        layout.select('.bars-group').classed('prevent-click', true).classed("transition-all-05s",false);

        //return if no scrolling is required.
        if(height <= widgetHeight - margin.top - margin.bottom) {
            return;
        }

        var y = d3.event.y;
        if(y > 0) {
            y = 0;
        } else if(y < -height + widgetHeight - margin.top - margin.bottom) {
            y = -height + (widgetHeight - margin.top - margin.bottom);
        }

        d3.select(this).style(vendorPrefix + "transform", "translate3d(0, " + y + "px, 0)");
    }

    // Event fired when the bars are finished being scrolled
    function postdragmove() {
        setTimeout(function() {
            layout.select('.bars-group').classed('prevent-click', false);
        }, 1);
    }

    // Draw the X and Y Axis for the first time
    function drawAxis() {
        this.append("g")
            .attr("class", "x axis")
            .call(xAxis);
    }

    // Update the positions and values of the X and Y Axis
    function redrawAxis() {
        // Update the x-axis based on the updated xScale range
        this.select(".x.axis")
            .attr("transform", "translate(0, 0)")
            .call(xAxis);
        var $el = $(controller.element);
        var ticks = $el.find('.x.axis > g.tick');
        var firstTick = ticks.first(),
            lastTick = ticks.last();
        firstTick.children('text').attr('style','text-anchor: start;');
        lastTick.children('text').attr('style','text-anchor: end;');
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

        if (comparison) {
            minBarHeight = 50;
        } else {
            minBarHeight = 25;
        }
        var newBarHeight = Math.round((widgetHeight - margin.top - margin.bottom) / (datasetLength || 1));
        newBarHeight = newBarHeight > maxBarHeight ? maxBarHeight : newBarHeight;
        barHeight = newBarHeight < minBarHeight ? minBarHeight : newBarHeight;
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
        if (!arguments.length) return height;
        widgetHeight = _;
        height = widgetHeight - margin.top - margin.bottom;
        return chart;
    };

    chart.minimumColor = function(_) {
        if (!arguments.length) return minimumColor;
        minimumColor = _;
        return chart;
    };

    chart.neutralColor = function(_) {
        if (!arguments.length) return neutralColor;
        neutralColor = _;
        return chart;
    };

    chart.maximumColor = function(_) {
        if (!arguments.length) return maximumColor;
        maximumColor = _;
        return chart;
    };

    chart.duration = function(_) {
        if (!arguments.length) return duration;
        duration = _;
        return chart;
    };

    chart.ease = function(_) {
        if (!arguments.length) return ease;
        ease = _;
        return chart;
    };

    chart.comparison = function(_) {
        if (!arguments.length) return comparison;
        comparison = _;

        return chart;
    };

    chart.currentBarPadding = function(_) {
        if (!arguments.length) return currentBarPadding;
        currentBarPadding = _;
        return chart;
    };

    chart.currentOuterPadding = function(_) {
        if (!arguments.length) return currentOuterPadding;
        currentOuterPadding = _;
        return chart;
    };

    chart.barHeight = function(_) {
        if (!arguments.length) return barHeight;
        barHeight = _;
        return chart;
    };

    chart.x = function(_) {
        if (!arguments.length) return xValue;
        xValue = _;
        xAxis.tickFormat(xValue);
        return chart;
    };

    chart.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return chart;
    };

    return chart;
}

function getVendorPrefix() {
    var styles = window.getComputedStyle(document.documentElement, ''),
        pre = (Array.prototype.slice
            .call(styles)
            .join('')
            .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
            )[1];
    return '-' + pre + '-';
}

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
