// d3.select();
// d3.selectAll();
// d3.select(h1).style("color", "blue");
// d3.selectAll("p").style("font-size", "18px");

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let xScale, yScale;

async function loadData() {
    const data = await d3.csv("./datasets/economy-and-growth.csv", d => ({
        country: d["Country Name"],
        gdp: +d["average_value_GDP per capita (current US$)"],
        year: +d.Year
    }));
    return data;
}

function renderGraph(data) {

    // Starter frame sampled from Lab 6
    const width = 1200;
    const height = 800;
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        // Preserving aspect ratio here so that it scales to the top and not push everything down
        // due to the viewbox having the same dimensions
        .attr('preserveAspectRatio', 'xMinYMin')
        .style('overflow', 'visible');

    xScale = d3.scaleLinear().domain(d3.extent(data, (d) => d.year)).range([0, width]).nice();
    yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.gdp)]);

    // Used a responsive height for bottom margin to have the heading under scale better
    // Increased right margin for legend visibility
    const margin = { top: 10, right: 200, bottom: height * 0.1, left: 80 };  
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Create gridlines
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    const xAxisGroup = svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    const yAxisGroup = svg
        .append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Appending Labels, using the same font as the Heading + Body
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', d3.mean([usableArea.left, usableArea.right]))
        .attr('y', height - 30)
        .style('font-family', 'Roboto')
        .style('font-size', '16px')
        .text('Year');

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -d3.mean([usableArea.top, usableArea.bottom]))
        .attr('y', usableArea.left - 60)
        .style('font-family', 'Roboto')
        .style('font-size', '16px')
        .text('GDP Per Capita (Current USD$)');

    // Return both svg and axis groups so they can be updated later
    return { svg, usableArea, yAxisGroup, xAxisGroup, yAxis };
}

let data = await loadData();
const { svg, usableArea, yAxisGroup, yAxis } = renderGraph(data);

// Sorted array of country names
const dataCountry = d3.group(data, d => d.country);
const selectedCountry = d3.map(dataCountry.keys(), d => d).sort();

function drawLine(value) {
    const newData = value.map(country => ({
        country: country,
        values: dataCountry.get(country).sort((a, b) => d3.ascending(a.year, b.year))
    }));

    // Auto-adjust Y axis based on selected countries 
    const maxY = d3.max(newData, d => d3.max(d.values, v => v.gdp));
    if (maxY) {
        yScale.domain([0, maxY]).nice();
        yAxisGroup.transition().duration(700).call(yAxis.scale(yScale));
    }

    svg.selectAll('.graphline')
    
        .join('path')
        .attr('class', 'graphline') 
        .attr('fill', 'none')
        .attr('stroke', 'blue')
        .attr('stroke-width', 2)
        .transition().duration(700)
        .attr('d', d => d3.line().x(d => xScale(d.year)).y(d => yScale(d.gdp))(d.values));

    // Add legend for selected countries
    const legend = svg.selectAll(".legend")
        .data(value, d => d);

    const legendEnter = legend.enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${usableArea.right + 20}, ${30 + i * 20})`);

    legendEnter.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "blue");

    legendEnter.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .style("font-size", "12px")
        .style("font-family", "Roboto")
        .text(d => d);

    legend.exit().remove();
}

    .selectAll('option')
    .data(selectedCountry) 
    .join('option')
    .attr('value', d => d)
    .text(d => d);

d3.select('#countryPicker').on('change', (event) => {
    const eventHolder = event.target; // Holding the select variable
    const picked = eventHolder.selectedOptions; //Picking the countries selected
    const display = Array.from(picked).map(d => d.value); //Getting the countries
    drawLine(display);
});