const W = 800, H = 500;
const R_SCALE = 0.05;
const COUNTRY_POPULATION = 8_560_200;
const entries = {};

let projection, mapGroup, panZoomInstance;
let lookup = {};
const found = {};

const BASE = (window.__SCQ_BASE__ || "").replace(/\/$/, "");
const DATA_URL = `${BASE}/swisscityquiz/data`;

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(s) {
  return (s || "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim();
}

async function loadCities() {
  const cities = await (await fetch(`${DATA_URL}/cities.json`)).json();
  for (const c of cities) {
    for (const key of [c.name, ...(c.aliases || [])]) {
      lookup[normalize(key)] = c;
    }
  }
}

async function getMap() {
  const landData = await (await fetch(`${DATA_URL}/switzerland.json`)).json();
  const waterFiles = [
    "ne_10m_lakes_europe.json",
    "ne_10m_lakes.json",
    "ne_10m_rivers_europe.json",
    "ne_10m_rivers_lake_centerlines.json",
  ];

  const combinedFeatures = [];

  for (const f of landData.features || [landData]) {
    f.properties = f.properties || {};
    f.properties.featureType = "land";
    combinedFeatures.push(f);
  }

  for (const wFile of waterFiles) {
    try {
      const wData = await (await fetch(`${DATA_URL}/${wFile}`)).json();
      for (const f of wData.features || [wData]) {
        f.properties = f.properties || {};
        f.properties.featureType = "water";
        combinedFeatures.push(f);
      }
    } catch (e) {
      console.warn(`Could not load ${wFile}`, e);
    }
  }

  return { type: "FeatureCollection", features: combinedFeatures };
}

function guess(text) {
  const city = lookup[normalize(text)];
  if (!city) return { found: false, stats: stats() };
  const already = city.name in found;
  found[city.name] = city;
  return {
    found: true,
    already,
    city: { name: city.name, lat: city.lat, lon: city.lon, population: city.population },
    stats: stats(),
  };
}

function forget(name) {
  delete found[name];
  return { stats: stats() };
}

function stats() {
  const x = Object.keys(found).length;
  const z = Object.values(found).reduce((sum, c) => sum + c.population, 0);
  const y = COUNTRY_POPULATION ? Math.round((z / COUNTRY_POPULATION) * 1000) / 10 : 0;
  return { x, y, z };
}

async function init() {
  await loadCities();
  let geojson = await getMap();

  let features = geojson.features ? geojson.features : [geojson];

  features.forEach(f => {
    let geom = f.geometry || f;
    if (geom.type === "Polygon") {
      geom.coordinates.forEach(ring => ring.reverse());
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach(poly => poly.forEach(ring => ring.reverse()));
    }
  });

  const svg = d3.select("#map")
    .attr("width", W)
    .attr("height", H);

  mapGroup = svg.append("g");

  const landOnly = features.filter(f => f.properties && f.properties.featureType === 'land');

  projection = d3.geoMercator()
    .fitSize([W, H], { type: "FeatureCollection", features: landOnly });

  const path = d3.geoPath(projection);

  mapGroup.selectAll("path")
    .data(features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => {
        if (!d.properties) return "#e9e9e9";

        if (d.properties.featureType === 'water') {
            if (d.geometry && d.geometry.type.includes('LineString')) {
                return "none";
            }
            return "#a4c8e1";
        }

        return "#e9e9e9";
    })
    .attr("stroke", d => {
        if (!d.properties) return "#888";

        if (d.properties.featureType === 'water') {
            return "#a4c8e1";
        }
        return "#888";
    })
    .attr("stroke-width", d => {
        if (d.properties && d.properties.featureType === 'water' && d.geometry && d.geometry.type.includes('LineString')) {
            return 1.2;
        }
        return 1;
    })
    .attr("vector-effect", "non-scaling-stroke");

  panZoomInstance = svgPanZoom("#map", {
    controlIconsEnabled: true,
    fit: true,
    center: true,
    minZoom: 0.5,
    maxZoom: 40,
  });

  const input = document.getElementById("guess");
  document.getElementById("enter").addEventListener("click", submit);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  input.focus();
}

function submit() {
  const input = document.getElementById("guess");
  const text = input.value.trim();
  if (!text) return;

  const res = guess(text);
  if (!res.found) {
    shake(input);
  } else {
    if (!res.already) drawCity(res.city);
    input.value = "";
  }
  updateFeedback(res.stats);
}

function drawCity(city) {
  const [x, y] = projection([city.lon, city.lat]);

  const circle = mapGroup.append("circle")
    .attr("cx", x)
    .attr("cy", y)
    .attr("r", Math.sqrt(city.population) * R_SCALE)
    .attr("fill", "rgba(213,43,30,0.35)")
    .attr("stroke", "rgba(213,43,30,0.8)")
    .attr("stroke-width", 0.5)
    .on("mouseover", function () {
      d3.select(this).attr("fill", "rgba(213,43,30,0.7)");
      d3.select("#tooltip")
        .style("opacity", 1)
        .html(`<strong>${city.name}</strong> - Population: ${city.population.toLocaleString()}`);
    })
    .on("mousemove", function (event) {
      d3.select("#tooltip")
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 25) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "rgba(213,43,30,0.35)");
      d3.select("#tooltip").style("opacity", 0);
    });

  const row = addCityRow(city);
  entries[city.name] = { row, circle: circle.node() };
}

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

function updateFeedback(s) {
  document.getElementById("feedback").innerHTML =
    `You have named <span class="highlight-stat">${s.x}</span> cities. This represents <span class="highlight-stat">${s.y}%</span> of the population (<span class="highlight-stat">${s.z.toLocaleString()}</span>)`;
}

function addCityRow(city) {
  const tbody = document.querySelector("#cities-table tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${escapeHtml(city.name)}</td>
    <td class="num">${city.population.toLocaleString()}</td>
    <td><button class="del" title="Remove">×</button></td>
  `;
  tr.querySelector(".del").addEventListener("click", () => removeCity(city.name));
  tbody.appendChild(tr);
  return tr;
}

function removeCity(name) {
  const entry = entries[name];
  if (!entry) return;
  const res = forget(name);
  entry.row.remove();
  entry.circle.remove();
  delete entries[name];
  updateFeedback(res.stats);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

init();
