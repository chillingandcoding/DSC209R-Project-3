import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let xScale, yScale, colorScale;
let yearRange = null;

async function loadData() {
    const data = await d3.csv("./datasets/economy-and-growth.csv", d => ({
        country: d["Country Name"],
        gdp: +d["average_value_GDP per capita (current US$)"],
        year: +d.Year
    }));
    return data;
}

// Figure full span and set initial state once the CSV is loaded
function mountYearControls(data) {
  const extent = d3.extent(data, d => d.year);
  yearRange = yearRange ?? [extent[0], extent[1]];
  

  const wrap = d3.select('body')
    .insert('div', '#chart')
    .attr('id', 'year-controls')
    .style('margin', '10px 0')
    .style('display', 'flex')
    .style('gap', '8px')
    .style('align-items', 'center');

  wrap.append('label').text('Years:');

  wrap.append('input')
    .attr('type', 'number')
    .attr('id', 'yearMin')
    .attr('min', extent[0])
    .attr('max', extent[1])
    .attr('value', yearRange[0])
    .on('input', (e) => {
      yearRange[0] = Math.min(+e.target.value || extent[0], yearRange[1]);
      d3.select('#chart').selectAll('*').remove();
      ({ svg, usableArea, yAxisGroup, yAxis, legendGroup } = renderGraph(window.__DATA__));
        render();
    });

  wrap.append('span').text('–');

  wrap.append('input')
    .attr('type', 'number')
    .attr('id', 'yearMax')
    .attr('min', extent[0])
    .attr('max', extent[1])
    .attr('value', yearRange[1])
    .on('input', (e) => {
      yearRange[1] = Math.max(+e.target.value || extent[1], yearRange[0]);
      d3.select('#chart').selectAll('*').remove();
        ({ svg, usableArea, yAxisGroup, yAxis, legendGroup } = renderGraph(window.__DATA__));
        render();
    });
}


function renderGraph(data) {
    // Clamp data to the selected year window
    const filtered = (yearRange && Array.isArray(yearRange))
        ? data.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1])
        : data;

    // Starter frame sampled from Lab , set up the main drawing area and svg size
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

    xScale = d3.scaleLinear().domain(d3.extent(filtered, d => d.year))  // <-- use filtered
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, d3.max(filtered, d => d.gdp)]) // <-- use filtered

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
        .attr('transform', `translate(${usableArea.right + 10}, ${usableArea.top + 10})`);
    return { svg, usableArea, yAxisGroup, xAxisGroup, yAxis, legendGroup };
}

function syncPickerFromSet() {
    const sel = document.getElementById('countryPicker');
    for (const opt of sel.options) {
        opt.selected = selected.has(opt.value);
    }
}

let data = await loadData();
window.__DATA__ = data;   // keep a reference for re-renders
mountYearControls(data);  // mount the two inputs once

let svg, usableArea, yAxisGroup, yAxis, legendGroup;
({ svg, usableArea, yAxisGroup, yAxis, legendGroup } = renderGraph(data));


// Stores contries in alphabetical order
const dataByCountry = d3.group(data, d => d.country);
//keeps the list of countries for dropdown and colors
const exclusion = ['OECD members', 'Arab World', 'Least developed countries: UN classification'];
const allCountries = Array.from(dataByCountry.keys())
    .filter(country => !exclusion.includes(country)
        && !country.toLowerCase().includes('income')
        && !country.toLowerCase().includes('demographic')
        && !country.toLowerCase().includes('ibrd')
        && !country.toLowerCase().includes('fragile')
        && !country.toLowerCase().includes('hipc'))
    .sort()


// keeps track of the countries being shown
const selected = new Set();  // starts empty

// Color palette (repeats if needed)
const palette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#393b79', '#637939', '#8c6d31', '#843c39', '#7b4173',
    '#3182bd', '#31a354', '#756bb1', '#636363', '#e6550d'
];
const color = d3.scaleOrdinal().domain(allCountries).range(palette);

const events = {
    1981: "1980-1982, Global Recession",
    2009: "2008-2009, Global Financial Crisis",
    2020: "2019-2020, COVID-19"
};

// Country-specific events (only show for specific countries)
const countrySpecificEvents = {
    "Rwanda": {
        1994: "1994, Rwandan Genocide"
    }
};

function renderTooltip(year, country) {
    const tooltip = document.getElementById('tooltip');

    // Check for country-specific event first
    if (country && countrySpecificEvents[country] && countrySpecificEvents[country][year]) {
        tooltip.textContent = countrySpecificEvents[country][year];
        return;
    }

    // Otherwise check for global events
    if (!year || !events[year]) {
        tooltip.textContent = '';
        return;
    }
    tooltip.textContent = events[year];
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('tooltip');
    tooltip.hidden = !isVisible;
}

function render() {
    // Creates list of countries currently selected
    const series = Array.from(selected).map(ctry => ({
        country: ctry,
        values: dataByCountry.get(ctry).slice().sort((a, b) => d3.ascending(a.year, b.year))
    }));

    // keep only points within the selected year window
    const [yrMin, yrMax] = yearRange ?? d3.extent(window.__DATA__, d => d.year);
    series.forEach(s => {
        s.values = s.values.filter(v => v.year >= yrMin && v.year <= yrMax);
    });

    const base = window.__DATA__.filter(d => d.year >= yrMin && d.year <= yrMax);
    const maxY = series.length
        ? d3.max(series, s => d3.max(s.values, v => v.gdp))
        : d3.max(base, d => d.gdp);  // use filtered base when nothing selected
    yScale.domain([0, maxY]).nice();
    yAxisGroup.transition().duration(400).call(yAxis.scale(yScale));

    // Draws lines for each counrty selected
    const lineGen = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.gdp));

    const lines = svg.selectAll('.graphLine')
        //Sort alphabetically so legend looks organized
        .data(series.sort((a, b) => d3.ascending(a.country, b.country)), d => d.country)

    // Removes old lines that aren't selected anymore
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

    // Draw markers
    const interestingYears = new Set([1981, 2009, 2020])

    const points = series.flatMap(s => {
        // Filter for global events
        const globalEvents = s.values.filter(v => interestingYears.has(v.year));

        // Add country-specific events if they exist
        const countryEvents = countrySpecificEvents[s.country]
            ? s.values.filter(v => Object.keys(countrySpecificEvents[s.country]).map(Number).includes(v.year))
            : [];

        // Combine both types of events
        return [...globalEvents, ...countryEvents].map(v =>
            ({ country: s.country, year: v.year, gdp: v.gdp }));
    });

    const selectedMarkers = svg.selectAll('.marker').data(points, d => `${d.country}-${d.year}`);

    // When country is deselected
    selectedMarkers.exit()
        .transition().duration(300)
        .style('opacity', 0)
        .remove();

    // When country is selected
    const markerBev = selectedMarkers.enter()
        .append('circle')
        .attr('class', 'marker')
        .attr('r', 6)
        .attr('fill', 'none')
        .attr('stroke', d => color(d.country))
        .attr('stroke-width', 2)
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.gdp))
        .merge(selectedMarkers)

    // To move alongside the y axis change animation
    markerBev
        .transition()
        .duration(500)
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.gdp));

    // Tooltip
    markerBev.on('mouseenter', (event, d) => {
        d3.select(event.currentTarget).style('fill', color(d.country))
            .style('fill-opacity', 1);
        renderTooltip(d.year, d.country);
        updateTooltipVisibility(true);
    })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget)
                .style('fill-opacity', 0);
            updateTooltipVisibility(false);
        });

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
    selected.add(allCountries[225]);   // Makes US the first you see by default
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