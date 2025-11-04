// d3.select();
// d3.selectAll();
// d3.select(h1).style("color", "blue");
// d3.selectAll("p").style("font-size", "18px");

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let xScale, yScale, colorScale;

async function loadData() {
    const data = await d3.csv("./datasets/economy-and-growth.csv", d => ({
        country: d["Country Name"],
        gdp: +d["average_value_GDP per capita (current US$)"],
        year: +d.Year
    }));
    return data;
}

function renderGraph(data) {

    // Starter frame sampled from Lab , set up the main drawung area and svg size
    const width = 1350;
    const height = 800;
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width}, ${height}`)
        // Preserving aspect ratio here so that it scales to the top and not push everything down
        // due to the viewbox having the same dimensions
        .attr('preserveAspectRatio', 'xMinYMin')
        .style('overflow', 'visible');

    xScale = d3.scaleLinear().domain(d3.extent(data, (d) => d.year)).range([0, width]).nice();
    yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.gdp)]);

    // Used a responsive height for bottom margin to have the heading under scale better
    const margin = { top: 10, right: 200, bottom: 80, left: 80 };  
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

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('d'));
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
    const legendGroup = svg.append('g')
        .attr('class', 'legend')
        //Make a space for the legend, top right
        .attr('transform', `translate(${usableArea.right + 10 }, ${usableArea.top + 10})`);
    return { svg, usableArea, yAxisGroup, xAxisGroup, yAxis, legendGroup};
}

function syncPickerFromSet() {
  const sel = document.getElementById('countryPicker');
  for (const opt of sel.options) {
    opt.selected = selected.has(opt.value);
  }
}

let data = await loadData();
const { svg, usableArea, yAxisGroup, yAxis, legendGroup } = renderGraph(data);

// Stores contries in alphabetical order
const dataByCountry = d3.group(data, d => d.country);
//keeps the list of countries for dropdown and colors
const allCountries = Array.from(dataByCountry.keys()).sort();

// keeps track of the countries being shown
const selected = new Set();  // starts empty

// Color palette (repeats if needed)
const palette = [
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd',
  '#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf',
  '#393b79','#637939','#8c6d31','#843c39','#7b4173',
  '#3182bd','#31a354','#756bb1','#636363','#e6550d'
];
const color = d3.scaleOrdinal().domain(allCountries).range(palette);

function render() {
  // Creates list of countries currently selected
  const series = Array.from(selected).map(ctry => ({
    country: ctry,
    values: dataByCountry.get(ctry).slice().sort((a,b) => d3.ascending(a.year, b.year))
  }));

  // auto fit Y axis so all lines nicely fit
  const maxY = series.length
    ? d3.max(series, s => d3.max(s.values, v => v.gdp))
    : d3.max(data, d => d.gdp); // if no country is selected
  yScale.domain([0, maxY]).nice();
  yAxisGroup.transition().duration(400).call(yAxis.scale(yScale));

  // Draws lines for each counrty selected
  const lineGen = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.gdp));

  const lines = svg.selectAll('.graphLine')
    //Sort alphabetically so legend looks organized
    .data(series.sort((a, b) => d3.ascending(a.country, b.country)), d => d.country)

  // Removes old lines that aren't selectec anymore
  lines.exit()
    .transition().duration(300)
    .style('opacity', 0)
    .remove();

  // Adds new lines for countries selected
  const linesEnter = lines.enter()
    .append('path')
    .attr('class', 'graphLine')
    .attr('fill', 'none')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .attr('stroke', d => color(d.country))
    .on('click', (event, d) => {
      // when you click a line, turn it on/off
      if (selected.has(d.country)) selected.delete(d.country);
      else selected.add(d.country);
      syncPickerFromSet();
      render();
    });

  // updates line colors and shapes
  linesEnter.merge(lines)
    .transition().duration(500)
    .attr('d', d => lineGen(d.values))
    .attr('stroke', d => color(d.country));

  // Created the legend for the countries picked
  const rowH = 18;
const legend = legendGroup.selectAll('.legend-item')
  .data(series, d => d.country);  // KEY by country (selected only)

legend.exit().remove();

const legendEnter = legend.enter()
  .append('g')
  .attr('class', 'legend-item')
  .style('cursor', 'pointer')
  .on('click', (event, d) => {
    // When you click a legend item, deselects the country
    if (selected.has(d.country)) selected.delete(d.country);
    else selected.add(d.country);
    syncPickerFromSet();
    render();
  });

legendEnter.append('rect')
  .attr('x', 0)
  .attr('y', (d, i) => i * rowH - 8)
  .attr('width', 12)
  .attr('height', 12)
  .attr('fill', d => color(d.country));

legendEnter.append('text')
  .attr('x', 18)
  .attr('y', (d, i) => i * rowH)
  .attr('dominant-baseline', 'middle')
  .style('font-size', '12px')
  .text(d => d.country);

// update legend color and position when countries change
legend.merge(legendEnter).select('rect')
  .attr('y', (d, i) => i * rowH - 8)
  .attr('fill', d => color(d.country));

legend.merge(legendEnter).select('text')
  .attr('y', (d, i) => i * rowH)
  .text(d => d.country);
}



// Handles the country dropdown list

d3.select('#countryPicker')
    .selectAll('option')
    .data(allCountries) 
    .join('option')
    .attr('value', d => d)
    .text(d => d);
    // picks st
    if (allCountries.length) {
        selected.add(allCountries[252]);   // Makes US the first you see by default
        syncPickerFromSet();             // makes dropdown show it
    }
    render();

//Lets you click to select/unselect countries in the dropdown
d3.select('#countryPicker').on('mousedown', (event) => {
    event.preventDefault();
    const option = event.target;
    const country = option.value;

    // add or remove the clicked country
    if (selected.has(country)) selected.delete(country);
    else selected.add(country);

    // updates the dropdown and refreshes the chart
    syncPickerFromSet();
    render();
});