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
        .attr('step', 1)
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
        .attr('step', 1)
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
        .range([0, width]);

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


// Stores countries in alphabetical order
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

// Regional groupings
const regionGroups = {
    "Africa": [
        "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
        "Central African Republic", "Chad", "Comoros", "Congo, Dem. Rep.", "Congo, Rep.", "Cote d'Ivoire",
        "Djibouti", "Egypt, Arab Rep.", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon",
        "Gambia, The", "Ghana", "Guinea", "Guinea-Bissau", "Kenya", "Lesotho", "Liberia", "Libya",
        "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
        "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone",
        "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda",
        "Zambia", "Zimbabwe"
    ],
    "North America": [
        "Canada", "United States"
    ],
    "Central America": [
        "Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Mexico", "Nicaragua", "Panama"
    ],
    "South America": [
        "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay", "Peru",
        "Suriname", "Uruguay", "Venezuela"
    ],
    "East Asia": [
        "China", "Hong Kong SAR, China", "Japan", "Korea, Dem. People's Rep.", "Korea, Rep.", "Macao SAR, China",
        "Mongolia", "Taiwan, China"
    ],
    "South & Southeast Asia": [
        "Afghanistan", "Bangladesh", "Bhutan", "Brunei Darussalam", "Cambodia", "India", "Indonesia",
        "Lao PDR", "Malaysia", "Maldives", "Myanmar", "Nepal", "Pakistan", "Philippines", "Singapore",
        "Sri Lanka", "Thailand", "Timor-Leste", "Vietnam"
    ],
    "West Europe": [
        "Andorra", "Austria", "Belgium", "Denmark", "Finland", "France", "Germany", "Greece", "Iceland",
        "Ireland", "Italy", "Liechtenstein", "Luxembourg", "Malta", "Monaco", "Netherlands", "Norway",
        "Portugal", "San Marino", "Spain", "Sweden", "Switzerland", "United Kingdom"
    ],
    "East Europe": [
        "Albania", "Armenia", "Azerbaijan", "Belarus", "Bosnia and Herzegovina", "Bulgaria", "Croatia",
        "Cyprus", "Czech Republic", "Estonia", "Georgia", "Hungary", "Kazakhstan", "Kosovo",
        "Kyrgyz Republic", "Latvia", "Lithuania", "Moldova", "Montenegro", "North Macedonia", "Poland",
        "Romania", "Russian Federation", "Russia", "Serbia", "Slovak Republic", "Slovenia", "Tajikistan",
        "Turkmenistan", "Ukraine", "Uzbekistan"
    ],
    "Australia": [
        "Australia", "New Zealand"
    ],
    "Pacific Islands": [
        "Fiji", "Kiribati", "Marshall Islands", "Micronesia, Fed. Sts.", "Nauru", "Palau",
        "Papua New Guinea", "Samoa", "Solomon Islands", "Tonga", "Tuvalu", "Vanuatu"
    ],
    "Middle East": [
        "Bahrain", "Iran, Islamic Rep.", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon", "Oman",
        "Qatar", "Saudi Arabia", "Syrian Arab Republic", "Syria", "Turkey", "United Arab Emirates", "West Bank and Gaza", "Yemen, Rep."
    ]
};

// Organize countries by region
const countriesByRegion = {};
Object.keys(regionGroups).forEach(region => {
    countriesByRegion[region] = allCountries.filter(country =>
        regionGroups[region].includes(country)
    );
});

// Define the order of regions
const regionOrder = [
    "North America",
    "Central America",
    "South America",
    "West Europe",
    "East Europe",
    "East Asia",
    "South & Southeast Asia",
    "Middle East",
    "Africa",
    "Australia",
    "Pacific Islands"
];

// Function to calculate regional averages
function calculateRegionalAverage(region, yearValue) {
    const regionCountries = countriesByRegion[region];
    if (!regionCountries || regionCountries.length === 0) return null;

    const values = regionCountries
        .map(country => {
            const countryData = dataByCountry.get(country);
            if (!countryData) return null;
            const yearData = countryData.find(d => d.year === yearValue);
            return yearData ? yearData.gdp : null;
        })
        .filter(val => val !== null && !isNaN(val));

    if (values.length === 0) return null;
    return d3.mean(values);
}

// Pre-calculate regional average data
const regionalAverages = {};
regionOrder.forEach(region => {
    const years = d3.extent(data, d => d.year);
    const avgData = [];
    for (let year = years[0]; year <= years[1]; year++) {
        const avg = calculateRegionalAverage(region, year);
        if (avg !== null) {
            avgData.push({ country: `${region} Region Average`, year: year, gdp: avg });
        }
    }
    regionalAverages[`${region} Region Average`] = avgData;
});


// keeps track of the countries being shown
const selected = new Set();  // starts empty

// Color palette (repeats if needed)
const palette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#393b79', '#637939', '#8c6d31', '#843c39', '#7b4173',
    '#3182bd', '#31a354', '#756bb1', '#636363', '#e6550d'
];
// Include regional averages in the color domain
const allItems = [...allCountries, ...Object.keys(regionalAverages)];
const color = d3.scaleOrdinal().domain(allItems).range(palette);

const events = {
    1981: "1980-1982, Global Recession",
    2000: "2000, Dot-com Bubble Burst",
    2009: "2008-2009, Global Financial Crisis",
    2020: "2019-2020, COVID-19"
};

// Country-specific events (only show for specific countries)
const countrySpecificEvents = {
    "Rwanda": {
        1994: "1994, Rwandan Genocide"
    },
    "Germany": {
        1990: "1990, German Reunification",
        2010: "2010, Dot-com Bubble Burst"
    },
    "South Africa": {
        1994: "1994, End of Apartheid"
    },
    "Afghanistan": {
        2001: "2001, US-Afghanistan War begins"
    },
    "United Kingdom": {
        2020: "2020, Brexit",
        2007: "Cyclone Tilo / North Sea flood"
    },
    "France": {
        2005: "2005, European Heat Wave",
        2002: "2002, Euro currency introduced"
    },
    "Japan": {
        1997: "1997, Asian Financial Crisis",
        2011: "2011, Tōhoku earthquake and tsunami"
    },
    "Vietnam": {
        1986: "1986, Đổi Mới economic reforms begin",
        1989: "1989, US lifts trade embargo"
    },
    "China": {
        1978: "1978, Economic reforms begin under Deng Xiaoping",
        1997: "1997, Asian Financial Crisis",
        2009: "2009, China becomes world's 2nd largest economy"
    },
    "Korea, Rep.": {
        1997: "1997, Asian Financial Crisis",
        2018: "2018, SK hosts Winter Olympics",
        2012: "2012, Gangnam Style goes viral"
    },
    "Thailand": {
        1997: "1997, Asian Financial Crisis"
    },
    "Indonesia": {
        1997: "1997, Asian Financial Crisis"
    },
    "Malaysia": {
        1997: "1997, Asian Financial Crisis"
    },
    "Philippines": {
        1997: "1997, Asian Financial Crisis"
    },
    "Taiwan": {
        1997: "1997, Asian Financial Crisis"
    },
    "Singapore": {
        1997: "1997, Asian Financial Crisis"
    },
    "Lao PDR": {
        1986: "1986, New Economic Mechanism reforms begin",
        1997: "1997, Asian Financial Crisis"
    },
    "United States": {
        1990: "1990, Gulf War",
        2001: "2001, 9/11 Attacks",
        2005: "2005, Hurricane Katrina",
        2015: "2015, Same-sex Marriage Legalized Nationwide"
    },
    "Mexico": {
        1994: "1994, NAFTA goes into effect"
    },
    "Sweden": {
        1986: "Assassination of Prime Minister Olof Palme",
        1991: "1991, Swedish banking crisis",
        1995: "1995, Sweden joins the EU",
        2018: "2018, Military Conscription Reactivated"
    },
    "Norway": {
        1990: "1990, Petroleum Act passed"
    },
    "Italy": {
        1992: "1992, Mani Pulite corruption investigations"
    },
    "Switzerland": {
        2002: "2002, Switzerland joins the UN"
    },
    "Canada": {
        1982: "1982, Canada Constitution Act enacted",
        2018: "2018, Canada legalizes cannabis"
    },
    "Greece": {
        2009: "2009, Start of Greek government-debt crisis"
    },
    "Ukraine": {
        2014: "2014, Annexation of Crimea by Russia",
        2022: "2022, Russian invasion of Ukraine"
    },
    "Russia": {
        1991: "1991, Dissolution of the Soviet Union",
        1998: "1998, Russian financial crisis",
        2014: "2014, Annexation of Crimea",
        2022: "2022, Invasion of Ukraine"
    },
    "Brazil": {
        1994: "1994, Real Plan stabilizes economy",
        2014: "2014, Start of Brazilian economic crisis"
    },
    "Argentina": {
        2001: "2001, Argentine economic crisis"
    },
    "India": {
        1984: "1984, Anti-Sikh Riots",
        1991: "1991, Economic liberalization reforms begin",
        2004: "2004, India applies for UN Security Council seat",
        2013: "2013, Launch of Mars Orbiter Mission"
    },
    "Pakistan": {
        2001: "2001, US-Afghanistan War begins"
    },
    "Turkey": {
        2001: "2001, Turkish economic crisis",
        1980: "1980, Military coup d'état",
        2011: "2011, Syrian Civil War begins"
    },
    "Iraq": {
        2003: "2003, US-led invasion of Iraq",
        1998: "1998, Iraq disarmament crisis",
        1991: "1991, Gulf War"
    },
    "Spain": {
        1992: "1992, Barcelona hosts Summer Olympics",
        1986: "1986, Spain joins the European Community"
    },
    "Portugal": {
        1986: "1986, Portugal joins the European Community",
        2002: "2002, Euro currency introduced",
        1982: "1982, Civilian government restored after military rule",
        2010: "2010, European sovereign debt crisis"
    },
    "Netherlands": {
        2002: "2002, Euro currency introduced",
        2001: "2001, Assassination of Pim Fortuyn"
    },
    "Belgium": {
        2002: "2002, Euro currency introduced",
        1993: "1993, Belgium becomes a federal state"
    },
    "Austria": {
        2002: "2002, Euro currency introduced"

    },
    "Finland": {
        1995: "1995, Finland joins the EU",
        2002: "2002, Euro currency introduced"
    },
    "Denmark": {
        2002: "2002, Euro currency introduced",
        2003: "2003, Denmark participates in Iraq War"
    },
    "Ireland": {
        2002: "2002, Euro currency introduced",
        1995: "1995, Ireland joins the EU",
        1998: "1998, Good Friday Agreement"
    },
    "Czech Republic": {
        2004: "2004, Czech Republic joins the EU"
    },
    "Slovak Republic": {
        2004: "2004, Slovakia joins the EU"
    },
    "Hungary": {
        2004: "2004, Hungary joins the EU",
        1991: "1991, Independence from Soviet Union",
    },
    "Poland": {
        1991: "1991, Independence from Soviet Union",
        2004: "2004, Poland joins the EU"
    },
    "Slovenia": {
        2004: "2004, Slovenia joins the EU"
    },
    "Croatia": {
        2013: "2013, Croatia joins the EU"
    },
    "Bulgaria": {
        2007: "2007, Bulgaria joins the EU"
    },
    "Romania": {
        2007: "2007, Romania joins the EU",
        1991: "1991, Independence from Soviet Union",
    },
    "Lithuania": {
        2004: "2004, Lithuania joins the EU",
        1991: "1991, Independence from Soviet Union",
    },
    "Latvia": {
        2004: "2004, Latvia joins the EU"
    },
    "Estonia": {
        2004: "2004, Estonia joins the EU"
    },
    "Iceland": {
        2008: "2008, Icelandic financial crisis",
        2005: "2005, Icelandic troops withdraw from Iraq"
    },
    "New Zealand": {
        2006: "2006, New Zealand withdraws troops from Iraq",
        1984: "1984, Economic reforms begin under Roger Douglas",
        2010: "2010, Multiple earthquakes"
    },
    "Australia": {
        2008: "2008, Global Financial Crisis impacts Australia",
        2003: "2003, Australia participates in Iraq War"
    },
    "Egypt": {
        2011: "2011, Egyptian Revolution"
    },
    "Libya": {
        2011: "2011, Libyan Civil War begins"
    },
    "Syria": {
        2011: "2011, Syrian Civil War begins"
    },
    "Lebanon": {
        2005: "2005, Cedar Revolution"
    },
    "Jordan": {
        2011: "2011, Arab Spring protests"
    },
    "Morocco": {
        2011: "2011, Arab Spring protests"
    },
    "Algeria": {
        2011: "2011, Arab Spring protests"
    },
    "Tunisia": {
        2011: "2011, Arab Spring begins in Tunisia"
    },
    "Sudan": {
        2019: "2019, Sudanese Revolution"
    },
    "Ethiopia": {
        2018: "2018, Political reforms under Abiy Ahmed"
    },
    "Nigeria": {
        2009: "2009, Boko Haram insurgency intensifies",
    },
    "Ghana": {
        2007: "2007, Ghana becomes a oil-producing nation"
    },
    "Kenya": {
        2007: "2007, Post-election violence"
    },
    "Tanzania": {
        2015: "2015, John Magufuli elected president"
    },
    "Uganda": {
        2006: "2006, Yoweri Museveni re-elected president",
        1985: "1985, National Resistance Movement takes power"
    },
    "Zambia": {
        1991: "1991, Multi-party democracy restored"
    },
    "Zimbabwe": {
        2000: "2000, Land reform program begins",
        2008: "2008, Hyperinflation crisis"
    },
    "Mozambique": {
        1992: "1992, End of Mozambican Civil War"
    },
    "Cambodia": {
        1993: "1993, UN-sponsored elections",
        1997: "1997, Coup d'état",
        1998: "1998, Khmer Rouge officially disbanded",
        1989: "1989, Vietnamese withdrawal completed"
    },
    "Myanmar": {
        2011: "2011, Start of political reforms"
    },
    "Nepal": {
        2008: "2008, Abolition of monarchy"
    },
    "Sri Lanka": {
        2009: "2009, End of Sri Lankan Civil War"
    },
    "Bangladesh": {
        1996: "1996, Sheikh Hasina becomes Prime Minister"
    },
    "Bhutan": {
        2008: "2008, First democratic elections held"
    },
    "Mongolia": {
        1990: "1990, Democratic revolution"
    },
    "Turkmenistan": {
        2006: "2006, Gurbanguly Berdimuhamedow becomes president",
        1991: "1991, Independence from Soviet Union"
    },
    "Uzbekistan": {
        1991: "1991, Independence from Soviet Union"
    },
    "Kazakhstan": {
        1991: "1991, Independence from Soviet Union"
    },
    "Kyrgyz Republic": {
        1991: "1991, Independence from Soviet Union"
    },
    "Tajikistan": {
        1991: "1991, Independence from Soviet Union",
        1992: "1992, Start of Tajik Civil War"
    },
    "Armenia": {
        1991: "1991, Independence from Soviet Union"
    },
    "Azerbaijan": {
        1991: "1991, Independence from Soviet Union"
    },
    "Belarus": {
        1991: "1991, Independence from Soviet Union"
    },
    "Moldova": {
        1991: "1991, Independence from Soviet Union"
    },
    "Georgia": {
        1991: "1991, Independence from Soviet Union",
        2008: "2008, Russo-Georgian War"
    },
    "Cyprus": {
        2004: "2004, Cyprus joins the EU"
    },
    "Togo": {
        2005: "2005, Faure Gnassingbé becomes president"
    },
    "Gabon": {
        2009: "2009, Ali Bongo Ondimba becomes president"
    },
    "Senegal": {
        2000: "2000, Abdoulaye Wade becomes president"
    },
    "Malawi": {
        1994: "1994, Multi-party democracy restored"
    },
    "Botswana": {
        1998: "1998, Festus Mogae becomes president"
    },
    "Namibia": {
        1990: "1990, Independence from South Africa"
    },
    "Haiti": {
        2004: "2004, Haitian coup d'état"
    },
    "Cuba": {
        2008: "2008, Raúl Castro becomes president",
        1991: "1991, Collapse of Soviet Union impacts economy",
        2015: "2015, US-Cuba diplomatic relations restored",
        2000: "2000, Ban on US food and medicine lifted"
    },
    "Dominican Republic": {
        2004: "2004, Hipólito Mejía becomes president"
    },
    "Jamaica": {
        2007: "2007, Port Royal earthquake",
        2010: "2010, Jamaica debt restructuring",
        1981: "Reggae artist Bob Marley dies"
    },
    "Trinidad and Tobago": {
        2007: "2007, Kamla Persad-Bissessar becomes first female prime minister"
    },
    "Chile": {
        1988: "1988, End of Pinochet dictatorship",
        2010: "2010, Major earthquake and tsunami"
    },
    "Colombia": {
        2016: "2016, Peace agreement with FARC",
        1993: "1993, Death of Pablo Escobar"
    },
    "Ecuador": {
        2000: "2000, Dollarization of economy"
    },
    "Peru": {
        1992: "1992, Capture of Shining Path leader",
        2000: "2000, Fall of Fujimori regime"
    },
    "Venezuela": {
        1999: "1999, Hugo Chávez becomes president",
        2014: "2014, Start of economic crisis"
    },
    "Bolivia": {
        2006: "2006, Evo Morales becomes president"
    },
    "Uruguay": {
        2005: "2005, First left-wing government elected"
    },
    "Paraguay": {
        1989: "1989, End of Stroessner dictatorship"
    },
    "Guyana": {
        1992: "1992, First democratic elections"
    },
    "Suriname": {
        1987: "1987, New constitution adopted"
    },
    "Costa Rica": {
        1987: "1987, Óscar Arias wins Nobel Peace Prize"
    },
    "Panama": {
        1989: "1989, US invasion of Panama",
        1999: "1999, Panama Canal handover"
    },
    "Guatemala": {
        1996: "1996, Peace accords end civil war"
    },
    "Honduras": {
        2009: "2009, Constitutional crisis and coup"
    },
    "El Salvador": {
        1992: "1992, Peace accords end civil war"
    },
    "Nicaragua": {
        1990: "1990, End of Sandinista government"
    },
    "Belize": {
        1981: "1981, Independence from United Kingdom"
    },
    "Israel": {
        1993: "1993, Oslo Accords signed",
        2006: "2006, Lebanon War"
    },
    "Iran, Islamic Rep.": {
        1980: "1980, Iran-Iraq War begins",
        2015: "2015, Nuclear deal signed"
    },
    "Saudi Arabia": {
        1990: "1990, Gulf War",
        2016: "2016, Vision 2030 economic reforms"
    },
    "United Arab Emirates": {
        2020: "2020, Abraham Accords signed"
    },
    "Kuwait": {
        1990: "1990, Iraqi invasion of Kuwait"
    },
    "Qatar": {
        2017: "2017, Qatar diplomatic crisis"
    },
    "Bahrain": {
        2011: "2011, Arab Spring protests"
    },
    "Oman": {
        2020: "2020, Sultan Haitham bin Tariq takes power"
    },
    "Yemen, Rep.": {
        2015: "2015, Civil war begins"
    },
    "South Africa": {
        1994: "1994, End of Apartheid"
    },
    "Angola": {
        2002: "2002, End of civil war"
    },
    "Cameroon": {
        2016: "2016, Anglophone crisis begins"
    },
    "Congo, Dem. Rep.": {
        1997: "1997, Fall of Mobutu regime"
    },
    "Cote d'Ivoire": {
        2011: "2011, Post-election crisis"
    },
    "Somalia": {
        1991: "1991, Collapse of central government"
    },
    "South Sudan": {
        2011: "2011, Independence from Sudan"
    },
    "Eritrea": {
        1993: "1993, Independence from Ethiopia"
    },
    "Equatorial Guinea": {
        1996: "1996, Major oil discoveries"
    },
    "Brunei Darussalam": {
        1984: "1984, Independence from United Kingdom"
    },
    "Maldives": {
        2004: "2004, Indian Ocean tsunami"
    },
    "Timor-Leste": {
        2002: "2002, Independence from Indonesia"
    },
    "Hong Kong SAR, China": {
        1997: "1997, Handover to China",
        2019: "2019, Pro-democracy protests"
    },
    "Macao SAR, China": {
        1999: "1999, Handover to China"
    },
    "Korea, Dem. People's Rep.": {
        1994: "1994, Death of Kim Il-sung",
        2011: "2011, Death of Kim Jong-il"
    },
    "Andorra": {
        1993: "1993, First constitution adopted"
    },
    "Liechtenstein": {
        2003: "2003, Constitutional reforms"
    },
    "Luxembourg": {
        2002: "2002, Euro currency introduced"
    },
    "Malta": {
        2004: "2004, Malta joins the EU"
    },
    "Monaco": {
        2005: "2005, Prince Albert II becomes ruler"
    },
    "San Marino": {
        2008: "2008, Financial crisis impacts economy"
    },
    "Albania": {
        1997: "1997, Pyramid scheme collapse",
        1991: "1991, End of communist regime"
    },
    "Bosnia and Herzegovina": {
        1995: "1995, Dayton Agreement ends war"
    },
    "Kosovo": {
        2008: "2008, Declaration of independence"
    },
    "Montenegro": {
        2006: "2006, Independence from Serbia"
    },
    "North Macedonia": {
        2001: "2001, Ethnic Albanian insurgency"
    },
    "Serbia": {
        2006: "2006, Independence of Montenegro",
        2008: "2008, Kosovo declares independence"
    },
    "Fiji": {
        2006: "2006, Military coup"
    },
    "Papua New Guinea": {
        1998: "1998, Tsunami disaster"
    },
    "Solomon Islands": {
        2003: "2003, Regional Assistance Mission begins"
    },
    "Vanuatu": {
        2015: "2015, Cyclone Pam devastation"
    },
    "Samoa": {
        2009: "2009, Change to driving on left side"
    },
    "Tonga": {
        2006: "2006, Pro-democracy riots"
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
    const series = Array.from(selected).map(ctry => {
        // Check if it's a regional average
        if (regionalAverages[ctry]) {
            return {
                country: ctry,
                values: regionalAverages[ctry].slice().sort((a, b) => d3.ascending(a.year, b.year))
            };
        }
        // Otherwise it's a regular country
        return {
            country: ctry,
            values: dataByCountry.get(ctry).slice().sort((a, b) => d3.ascending(a.year, b.year))
        };
    });

    // keep only points within the selected year window
    const [yrMin, yrMax] = yearRange ?? d3.extent(window.__DATA__, d => d.year);
    series.forEach(s => {
        s.values = s.values.filter(v => v.year >= yrMin && v.year <= yrMax);
    });

    const base = window.__DATA__.filter(d => d.year >= yrMin && d.year <= yrMax);
    const maxY = series.length
        ? d3.max(series, s => d3.max(s.values, v => v.gdp))
        : d3.max(base, d => d.gdp);  // use filtered base when nothing selected
    yScale.domain([0, maxY]);
    yAxisGroup.transition().duration(400).call(yAxis.scale(yScale));
    svg.select('.gridlines')
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

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
            // when you click a line, deselect it
            selected.delete(d.country);
            syncPickerFromSet();
            render();
        });


    // updates line colors and shapes
    linesEnter.merge(lines)
        .transition().duration(500)
        .attr('d', d => lineGen(d.values))
        .attr('stroke', d => color(d.country));

    // Draw markers
    const interestingYears = new Set([1981, 2000, 2009, 2020])

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

// Handles the country dropdown list - organized by regions

const countryPicker = d3.select('#countryPicker');

// Create optgroups for each region
regionOrder.forEach(region => {
    const countries = countriesByRegion[region];
    if (countries && countries.length > 0) {
        const optgroup = countryPicker.append('optgroup')
            .attr('label', region);

        // Add region average option at the top
        optgroup.append('option')
            .attr('value', `${region} Region Average`)
            .text(`${region} Region Average`)
            .style('font-weight', 'bold');

        // Add individual countries
        optgroup.selectAll('option.country-option')
            .data(countries)
            .join('option')
            .attr('class', 'country-option')
            .attr('value', d => d)
            .text(d => d);
    }
});
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