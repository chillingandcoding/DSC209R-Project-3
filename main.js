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

    const width = 1200;
    const height = 800;
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMinYMin')
        .style('overflow', 'visible');

    const margin = { top: 10, right: 200, bottom: 80, left: 80 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.gdp)])
        .range([usableArea.bottom, usableArea.top])
        .nice();

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
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

    return { svg, usableArea };
}

const data = await loadData();
const { svg, usableArea } = renderGraph(data);

const dataCountry = d3.group(data, d => d.country);
const selectedCountry = Array.from(dataCountry.keys()).sort();

function drawLine(selected) {
    const newData = selected.map(c => ({
        country: c,
        values: dataCountry.get(c).sort((a, b) => d3.ascending(a.year, b.year))
    }));

    const maxY = d3.max(newData, d => d3.max(d.values, v => v.gdp));
    yScale.domain([0, maxY]).nice();

    svg.selectAll('.graphline')
        .data(newData, d => d.country)
        .join('path')
        .attr('class', 'graphline')
        .attr('fill', 'none')
        .attr('stroke', 'blue')
        .attr('stroke-width', 2)
        .attr('d', d => d3.line()
            .x(v => xScale(v.year))
            .y(v => yScale(v.gdp))(d.values));

    // --- Legend ---
    svg.selectAll('.legendGroup').remove();

    const legendGroup = svg.append('g')
        .attr('class', 'legendGroup')
        .attr('transform', `translate(${usableArea.right + 20}, ${usableArea.top + 20})`);

    const legend = legendGroup.selectAll('.legend')
        .data(selected)
        .join('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);

    legend.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', 'blue');

    legend.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .style('font-size', '12px')
        .style('font-family', 'Roboto')
        .text(d => d);
}

d3.select('#countryPicker')
    .selectAll('option')
    .data(selectedCountry)
    .join('option')
    .attr('value', d => d)
    .text(d => d);

d3.select('#countryPicker').on('change', (event) => {
    const selected = Array.from(event.target.selectedOptions).map(d => d.value);
    drawLine(selected);
});