/*global window, document */
/* The app shell keeps the live calculator mounted while profile reference views change. */
(function () {
	"use strict";
	var tabs = ["Calculator", "Encounters", "Trainers", "Route Items"];
	var panels = [];
	var buttons = [];
	var views = [];
	var activeTab = 0;
	var tabScroll = [0, 0, 0, 0];
	var registry;
	var profileLabel;
	var sourceData;

	function el(tag, className, text) {
		var node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined && text !== null) node.textContent = text;
		return node;
	}
	function button(text, action, className) {
		var node = el("button", className || "km-action", text);
		node.type = "button";
		node.addEventListener("click", action);
		return node;
	}
	function textMatch(text, query) {
		return String(text || "").toLowerCase().indexOf(query) !== -1;
	}
	function disclosure(title, node, open) {
		var details = el("details", "km-disclosure");
		details.appendChild(el("summary", "", title));
		if (node.parentNode) node.parentNode.insertBefore(details, node);
		details.appendChild(node);
		details.open = !!open;
		return details;
	}
	function activateTab(index, focus) {
		tabScroll[activeTab] = window.scrollY;
		activeTab = index;
		panels.forEach(function (panel, i) {
			panel.hidden = i !== index;
			buttons[i].setAttribute("aria-selected", String(i === index));
			buttons[i].tabIndex = i === index ? 0 : -1;
		});
		// Close any detached Select2 popup before its owning panel is hidden.
		if (window.jQuery) window.jQuery(".select2-offscreen").each(function () {
			if (window.jQuery(this).data("select2")) window.jQuery(this).select2("close");
		});
		if (focus) buttons[index].focus();
		window.scrollTo(0, tabScroll[index]);
	}
	function setupCalculator(wrapper) {
		var heading = el("div", "km-page-heading");
		var copy = el("div");
		copy.appendChild(el("span", "km-eyebrow", "BATTLE WORKSPACE"));
		copy.appendChild(el("h1", "", "Calculator"));
		copy.appendChild(el("p", "km-muted", "Build your matchup, adjust the field, and compare every move."));
		heading.appendChild(copy);
		var actions = el("div", "km-heading-actions");
		function jump(selector) {
			var target = document.querySelector(selector);
			var details = target.closest("details");
			if (details) details.open = true;
			target.scrollIntoView({block: "start", behavior: "smooth"});
			target.setAttribute("tabindex", "-1");
			target.focus({preventScroll: true});
		}
		actions.appendChild(button("Team and boxes", function () { jump("#team-box"); }));
		actions.appendChild(button("Import", function () { jump(".calculator-import-column"); }));
		heading.appendChild(actions);
		wrapper.insertBefore(heading, wrapper.firstChild);
		var title = wrapper.querySelector(".main-title-text");
		if (title) title.hidden = true;
		var settings = wrapper.querySelector(".calc-layout-settings");
		if (settings) disclosure("Calculation preferences", settings, false);
		var layout = el("div", "km-calculator-grid");
		var main = el("div", "km-battle-column");
		var results = el("aside", "km-results-column");
		results.setAttribute("aria-label", "Damage results");
		results.appendChild(el("span", "km-eyebrow", "LIVE COMPARISON"));
		results.appendChild(el("h2", "", "Damage results"));
		results.appendChild(el("p", "km-muted", "Select a move for the full calculation."));
		Array.prototype.forEach.call(wrapper.querySelectorAll(":scope > .move-result-group, :scope > .main-result-group"), function (node) {
			results.appendChild(node);
		});
		var combat = wrapper.querySelector(".combat-workspace");
		wrapper.insertBefore(layout, combat);
		main.appendChild(combat);
		layout.appendChild(main);
		layout.appendChild(results);
		var fieldPanel = combat.querySelector(".field-info").closest(".panel");
		fieldPanel.classList.add("km-field-panel");
		var fieldRegion = fieldPanel.firstElementChild;
		disclosure("Battlefield and conditions", fieldRegion, false);
		var format = fieldRegion.querySelector(".field-format-toggle");
		if (format) actions.insertBefore(format, actions.firstChild);
		Array.prototype.forEach.call(combat.querySelectorAll(".poke-info"), function (pokemon) {
			pokemon.querySelector(".percent-hp").setAttribute("aria-label", "Current HP percentage");
			var stats = pokemon.querySelector(".info-group table");
			if (stats) disclosure("Stats and stat stages", stats.parentNode, false);
			var firstMove = pokemon.querySelector(".move1");
			if (firstMove) pokemon.insertBefore(el("h3", "km-section-heading", "Moves"), firstMove);
			Array.prototype.forEach.call(pokemon.querySelectorAll(".move-bp"), function (input) {
				input.setAttribute("aria-label", "Move base power");
				input.title = "Base power";
			});
		});
		var lower = wrapper.querySelector(".lower-workspace");
		layout.appendChild(lower);
		lower.id = "km-team-workspace";
		var box = lower.querySelector("#team-box");
		var tools = el("div", "km-box-tools");
		[".team-box-filter-section", ".team-box-sort-section", ".color-coding-controls", ".team-box-control-section"].forEach(function (selector) {
			tools.appendChild(box.querySelector(selector));
		});
		disclosure("Search, sorting, and box tools", box.appendChild(tools), false);
	}
	function makeFilter(view, label, values) {
		var group = el("label", "km-filter");
		group.appendChild(el("span", "", label));
		var select = el("select");
		values.forEach(function (entry) {
			var option = el("option", "", entry.label || entry);
			option.value = entry.value === undefined ? entry : entry.value;
			select.appendChild(option);
		});
		select.addEventListener("change", function () { render(view); });
		group.appendChild(select);
		view.filters.appendChild(group);
		return select;
	}
	function empty(container, title, message) {
		var box = el("div", "km-empty-state");
		box.appendChild(el("h2", "", title));
		box.appendChild(el("p", "km-muted", message));
		container.appendChild(box);
	}
	function buildReference(title, kind, subtitle) {
		var panel = el("section", "km-reference-panel");
		var heading = el("div", "km-page-heading");
		var copy = el("div");
		copy.appendChild(el("span", "km-eyebrow", "PROFILE REFERENCE"));
		copy.appendChild(el("h1", "", title));
		copy.appendChild(el("p", "km-muted", subtitle));
		heading.appendChild(copy);
		panel.appendChild(heading);
		var filters = el("div", "km-reference-filters");
		var searchLabel = el("label", "km-filter km-search");
		searchLabel.appendChild(el("span", "", "Search " + title.toLowerCase()));
		var search = el("input");
		search.type = "search";
		search.placeholder = kind === "encounters" ? "Pokémon or location" : kind === "items" ? "Item, location, or landmark" : "Trainer, Pokémon, move, or location";
		searchLabel.appendChild(search);
		filters.appendChild(searchLabel);
		panel.appendChild(filters);
		var note = el("p", "km-reference-note");
		panel.appendChild(note);
		var status = el("p", "km-result-count");
		status.setAttribute("role", "status");
		panel.appendChild(status);
		var browser = el("div", "km-reference-browser");
		var list = el("nav", "km-location-list");
		list.setAttribute("aria-label", kind === "trainers" ? "Trainers" : "Locations");
		var detail = el("div", "km-reference-detail");
		browser.appendChild(list);
		browser.appendChild(detail);
		panel.appendChild(browser);
		var view = {kind: kind, panel: panel, filters: filters, search: search, note: note, status: status, list: list, detail: detail, selected: null};
		search.addEventListener("input", function () { render(view); });
		view.primary = makeFilter(view, kind === "encounters" ? "Encounter method" : kind === "items" ? "Acquisition" : "Story split", [{value: "", label: "All"}]);
		if (kind === "trainers") view.secondary = makeFilter(view, "Battle format", [{value: "", label: "All formats"}, "Single", "Double", "Not listed"]);
		filters.appendChild(button("Reset filters", function () {
			view.search.value = "";
			view.primary.value = "";
			if (view.secondary) view.secondary.value = "";
			render(view);
		}));
		views.push(view);
		return panel;
	}
	function getGroups(area) {
		var land = area.groups.filter(function (g) { return g.method === "Land"; })[0];
		return area.groups.map(function (g) {
			var weather = ["Land", "Fishing", "Shaking Trees", "Other"].indexOf(g.method) === -1;
			return {method: g.method, weather: weather, entries: weather && land ? land.entries.filter(function (e) { return e.slot <= 7; }).concat(g.entries) : g.entries};
		});
	}
	function getResults(view) {
		var query = view.search.value.toLowerCase().trim();
		var filter = view.primary.value;
		if (!sourceData) return [];
		if (view.kind === "encounters") {
			return sourceData.areas.map(function (area) {
				var groups = getGroups(area).filter(function (group) { return !filter || group.method === filter; }).map(function (group) {
					return {method: group.method, weather: group.weather, entries: group.entries.filter(function (entry) {
						return !query || textMatch(area.name, query) || textMatch(entry.pokemon, query);
					})};
				}).filter(function (group) { return group.entries.length; });
				return {id: area.id, name: area.name, groups: groups, count: groups.reduce(function (n, g) { return n + g.entries.length; }, 0)};
			}).filter(function (area) { return area.groups.length; });
		}
		if (view.kind === "trainers") return sourceData.trainers.filter(function (trainer) {
			var format = trainer.name.indexOf("[Double]") !== -1 ? "Double" : trainer.name.indexOf("[Single]") !== -1 ? "Single" : "Not listed";
			return (!filter || trainer.split === filter) && (!view.secondary.value || format === view.secondary.value) &&
				(!query || textMatch([trainer.name, trainer.location, trainer.split, JSON.stringify(trainer.team)].join(" "), query));
		});
		var rows = sourceData.routeItems.filter(function (item) {
			return (!filter || item.acquisition === filter) && (!query || textMatch([item.location, item.items, item.directions].join(" "), query));
		});
		var locations = [];
		rows.forEach(function (item) {
			var group = locations.filter(function (entry) { return entry.name === item.location; })[0];
			if (!group) { group = {id: item.location, name: item.location, items: [], count: 0}; locations.push(group); }
			group.items.push(item);
			group.count++;
		});
		return locations;
	}
	function renderEncounters(container, area) {
		container.appendChild(el("h2", "", area.name));
		area.groups.forEach(function (group) {
			var card = el("section", "km-reference-card");
			card.appendChild(el("h3", "", group.method === "Land" ? "Land (normal weather)" : group.method));
			if (group.weather) card.appendChild(el("p", "km-muted", "The first seven land slots plus this weather's three replacement slots."));
			var table = el("table", "km-data-table");
			var head = el("thead");
			var header = el("tr");
			["Pokémon", "Level", "Base rate"].forEach(function (text) { var th = el("th", "", text); th.scope = "col"; header.appendChild(th); });
			head.appendChild(header); table.appendChild(head);
			var body = el("tbody");
			group.entries.forEach(function (entry) {
				var row = el("tr");
				row.appendChild(el("td", "km-pokemon-name", entry.pokemon));
				row.appendChild(el("td", "", entry.level || "Not listed"));
				var rate = el("td", "km-rate", entry.rate === null ? "Special encounter" : entry.rate + "%");
				row.appendChild(rate); body.appendChild(row);
			});
			table.appendChild(body); card.appendChild(table); container.appendChild(card);
		});
	}
	function renderTrainer(container, trainer) {
		container.appendChild(el("h2", "", trainer.name));
		container.appendChild(el("p", "km-muted", [trainer.split, trainer.location, trainer.levelCap ? "Level cap " + trainer.levelCap : ""].filter(Boolean).join(" · ")));
		var grid = el("div", "km-trainer-roster");
		trainer.team.forEach(function (pokemon) {
			var card = el("article", "km-reference-card");
			card.appendChild(el("span", "km-eyebrow", "LEVEL " + pokemon.level));
			card.appendChild(el("h3", "", pokemon.pokemon));
			var dl = el("dl", "km-pokemon-facts");
			[["Ability", pokemon.ability], ["Item", pokemon.item || "None"], ["Nature", pokemon.nature], ["Gender", pokemon.gender]].forEach(function (pair) {
				dl.appendChild(el("dt", "", pair[0])); dl.appendChild(el("dd", "", pair[1] || "Not listed"));
			});
			card.appendChild(dl);
			var moves = el("ul", "km-move-list");
			pokemon.moves.forEach(function (move) { moves.appendChild(el("li", "", move)); });
			card.appendChild(moves);
			if (pokemon.stats) disclosure("Recorded stats", card.appendChild(el("pre", "km-recorded-stats", pokemon.stats)), false);
			grid.appendChild(card);
		});
		container.appendChild(grid);
	}
	function renderItems(container, area) {
		container.appendChild(el("h2", "", area.name));
		var notes = (sourceData.itemNotes || []).filter(function (n) { return n.location === area.name; });
		if (notes.length) {
			var content = el("div");
			notes.forEach(function (n) { content.appendChild(el("p", "km-muted", n.note)); });
			disclosure("Location notes and corrections", container.appendChild(content), false);
		}
		area.items.forEach(function (item) {
			var card = el("article", "km-reference-card km-item-card");
			var top = el("div", "km-card-heading");
			top.appendChild(el("h3", "", item.items));
			top.appendChild(el("span", "km-tag", item.acquisition));
			card.appendChild(top);
			card.appendChild(el("p", "km-item-directions", item.directions));
			if (item.edition && item.edition !== "Both") card.appendChild(el("p", "km-edition", "Edition: " + item.edition));
			var evidence = el("div", "km-item-evidence");
			evidence.appendChild(el("p", "", "Placement match: " + item.match + ". " + (item.reason || "")));
			if (item.map) evidence.appendChild(el("p", "km-muted", "Map: " + item.map));
			evidence.appendChild(el("p", "km-muted", "Guide entry " + item.id + ". Source: " + item.source + ". A data match is not in-game verification."));
			var location = (sourceData.itemLocations || []).filter(function (l) { return l.name === area.name; })[0];
			if (location) [["GameWith guide", location.gameWith], ["Bulbapedia guide", location.bulbapedia]].forEach(function (pair) {
				if (!/^https:\/\/(gamewith\.net|bulbapedia\.bulbagarden\.net)\//.test(pair[1] || "")) return;
				var link = el("a", "km-source-link", pair[0]); link.href = pair[1]; link.target = "_blank"; link.rel = "noopener noreferrer"; evidence.appendChild(link);
			});
			disclosure("Source and placement details", card.appendChild(evidence), false);
			container.appendChild(card);
		});
	}
	function render(view) {
		var results = getResults(view);
		var restoreFocus = view.list.contains(document.activeElement);
		var scrollTop = view.list.scrollTop;
		view.list.textContent = "";
		view.detail.textContent = "";
		var selected = results.filter(function (entry) { return entry.id === view.selected; })[0] || results[0];
		view.selected = selected ? selected.id : null;
		view.status.textContent = results.length + (view.kind === "trainers" ? " trainers" : " locations") + " found";
		if (!results.length) {
			empty(view.detail, sourceData ? "No matches" : "No reference data for this profile", sourceData ? "Try another search or reset the filters." : "Reference tables are specific to each ROM hack. Switch profiles to browse its available data.");
			return;
		}
		results.forEach(function (entry) {
			var b = button("", function () { view.selected = entry.id; render(view); }, "km-location-button");
			b.appendChild(el("span", "", entry.name));
			b.appendChild(el("small", "", view.kind === "trainers" ? entry.split + " · " + entry.team.length + " Pokémon" : entry.count + (view.kind === "items" ? " items" : " encounter slots")));
			b.setAttribute("aria-current", String(entry.id === view.selected));
			view.list.appendChild(b);
			if (restoreFocus && entry.id === view.selected) b.focus({preventScroll: true});
		});
		view.list.scrollTop = scrollTop;
		if (view.kind === "encounters") renderEncounters(view.detail, selected);
		else if (view.kind === "trainers") renderTrainer(view.detail, selected);
		else renderItems(view.detail, selected);
	}
	function refreshProfile() {
		var profile = registry.getActiveProfile();
		var data = window.KMCalculatorReferenceData;
		sourceData = profile && data && Object.prototype.hasOwnProperty.call(data, profile.id) ? data[profile.id] : null;
		profileLabel.textContent = profile ? profile.shortName + " / Generation " + profile.baseGeneration : "Choose a ROM hack";
		views.forEach(function (view) {
			view.selected = null; view.search.value = "";
			var options = [];
			if (sourceData) {
				if (view.kind === "encounters") sourceData.areas.forEach(function (a) { a.groups.forEach(function (g) { if (options.indexOf(g.method) === -1) options.push(g.method); }); });
				else (view.kind === "items" ? sourceData.routeItems : sourceData.trainers).forEach(function (entry) {
					var value = view.kind === "items" ? entry.acquisition : entry.split;
					if (options.indexOf(value) === -1) options.push(value);
				});
			}
			view.primary.textContent = "";
			var all = el("option", "", "All"); all.value = ""; view.primary.appendChild(all);
			options.forEach(function (value) { var option = el("option", "", value); option.value = value; view.primary.appendChild(option); });
			if (view.secondary) view.secondary.value = "";
			view.note.textContent = !sourceData ? "" : view.kind === "encounters" ? "Base encounter rates. Personal catches and duplicate-family exclusions are not applied. Special encounters have no random rate." : view.kind === "items" ? "Sword/Shield 1.3.2 base-game reference, not confirmed Royal Sword placements. Includes both editions. Some landmarks and item pools remain uncertain; expand an entry for its source and match details." : "Royal Sword trainer reference, organized by story split. Recorded teams and stats are shown as supplied.";
			render(view);
		});
	}
	function start() {
		registry = window.kmRomHackRegistry;
		if (!registry || document.getElementById("km-app-tabs")) return;
		document.body.classList.add("km-app");
		var wrapper = document.querySelector(".wrapper");
		var nav = el("nav", "km-app-tabs"); nav.id = "km-app-tabs"; nav.setAttribute("role", "tablist"); nav.setAttribute("aria-label", "App sections");
		wrapper.parentNode.insertBefore(nav, wrapper);
		profileLabel = el("span", "km-active-profile");
		document.querySelector(".km-calculator-header").appendChild(profileLabel);
		var changeProfile = document.querySelector(".km-rom-hack-change");
		if (changeProfile) document.querySelector("header").appendChild(changeProfile);
		setupCalculator(wrapper);
		panels.push(wrapper);
		panels.push(buildReference("Encounters", "encounters", "Find Pokémon by location, encounter method, and weather."));
		panels.push(buildReference("Trainers", "trainers", "Plan ahead with trainer teams, moves, and level caps."));
		panels.push(buildReference("Route Items", "items", "Find pickups, gifts, shops, and berry trees by location."));
		tabs.forEach(function (label, i) {
			var b = button(label, function () { activateTab(i, false); }, "km-app-tab");
			b.id = "km-tab-" + i; b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "km-panel-" + i);
			b.addEventListener("keydown", function (event) {
				var index = i;
				if (event.key === "ArrowRight") index = (i + 1) % tabs.length;
				else if (event.key === "ArrowLeft") index = (i + tabs.length - 1) % tabs.length;
				else if (event.key === "Home") index = 0;
				else if (event.key === "End") index = tabs.length - 1;
				else return;
				event.preventDefault(); activateTab(index, true);
			});
			buttons.push(b); nav.appendChild(b);
			panels[i].id = "km-panel-" + i; panels[i].setAttribute("role", "tabpanel"); panels[i].setAttribute("aria-labelledby", b.id);
			if (i) wrapper.parentNode.insertBefore(panels[i], wrapper.nextSibling);
		});
		var credits = document.querySelector(".credits");
		if (credits) {
			var theme = credits.querySelector("#dark-theme-toggle");
			if (theme) { theme.setAttribute("aria-label", "Appearance"); document.querySelector("header").appendChild(theme); }
			disclosure("About KM Calculator and credits", credits, false).classList.add("km-about");
		}
		window.addEventListener("kmcalculator:romhackchange", refreshProfile);
		refreshProfile(); activateTab(0, false);
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
	else start();
})();
