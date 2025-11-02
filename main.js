// d3.select();
// d3.selectAll();
// d3.select(h1).style("color", "blue");
// d3.selectAll("p").style("font-size", "18px");

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let xScale, yScale;

async function loadData() {
    const data = await d3.csv("../datasets/economy-and-growth.csv", d => ({
        country: d["Country Name"],
        gdp: +d["average_value_GDP per capita (current US$)"],
        year: +d.Year
    }));
    return data;
}

function renderGraph(data) {
    const width = 1200;
    const height = 800;
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMinYMin')
        .style('overflow', 'visible');

    xScale = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.year))
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.gdp)]);

    const margin = { top: 10, right: 20, bottom: height * 0.1, left: 80 };
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

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale);

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', (usableArea.left + usableArea.right) / 2)
        .attr('y', height - 30)
        .style('font-family', 'Roboto')
        .style('font-size', '16px')
        .text('Year');

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(usableArea.top + usableArea.bottom) / 2)
        .attr('y', usableArea.left - 60) 
        .style('font-family', 'Roboto')
        .style('font-size', '16px')
        .text('GDP Per Capita (Current USD$)');
}

let data = await loadData();
renderGraph(data)
