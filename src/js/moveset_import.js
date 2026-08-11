/*global KMTrainerDataRegistry, SETDEX, TRAINERDEX, clearDoublesSlotSide, createPokemonSprite, gen, getZeroEVs, importPokemonSaveFile, importSwordShieldSaveFile, isDoublesFormatSelected, readCustomSets, rebuildKMCalculatorTrainerIndex, rebuildRoyalSwordTrainerIndex, setDoublesActiveSlot, setDoublesSlotSelection, setdex, showDoublesSlotMenu, syncTeamBoxWithCustomSets, updateDoublesSlotHighlights, updateDoublesSlotSummaries, updatePokemonLegendSprite */

var trainerDataRegistry = null;
var importedTrainerProfileIds = {};

function getMovesetImportStorage() {
	if (typeof window.getKMCalculatorStorage === "function") return window.getKMCalculatorStorage();
	if (typeof window.getRoyalSwordStorage === "function") return window.getRoyalSwordStorage();
	return window.localStorage;
}

function getTrainerGeneration() {
	if (typeof gen === "number" && gen >= 1 && gen <= 9) return gen;
	var selected = $(".gen:checked").val();
	return ~~selected || 8;
}

function getActiveTrainerProfileId() {
	if (!window.kmRomHackRegistry || typeof window.kmRomHackRegistry.getActiveProfile !== "function") return "";
	var profile = window.kmRomHackRegistry.getActiveProfile();
	return profile && profile.id ? profile.id : "__no-active-rom-hack__";
}

function getRawTrainerEntries() {
	if (typeof TRAINERDEX === "undefined") return [];
	if (Array.isArray(TRAINERDEX)) return TRAINERDEX;
	var trainers = [];
	var trainerNames = Object.keys(TRAINERDEX);
	trainerNames.sort();
	for (var i = 0; i < trainerNames.length; i++) {
		var trainerName = trainerNames[i];
		trainers.push({
			area: "Trainers",
			trainer: trainerName,
			pokemon: TRAINERDEX[trainerName]
		});
	}
	return trainers;
}

function createRoyalSwordTrainerPack() {
	var trainers = getRawTrainerEntries();
	var normalized = [];
	for (var i = 0; i < trainers.length; i++) {
		var entry = $.extend(true, {}, trainers[i]);
		entry.id = entry.id || "trainer-" + (i + 1);
		normalized.push(entry);
	}
	return {
		schema: "km-calculator.trainer-pack",
		schemaVersion: 1,
		id: "pokemon-royal-sword",
		name: "Pokemon Royal Sword",
		version: "1",
		generation: 8,
		game: "Pokemon Sword and Shield",
		mod: "Pokemon Royal Sword",
		authors: [{name: "Matroskin", url: "https://github.com/KotMatrosk1n"}],
		source: {
			name: "KM Calculator built-in trainer data",
			url: "https://github.com/KotMatrosk1n/KM-Calculator"
		},
		license: "MIT",
		trainers: normalized
	};
}

function registerImportedTrainerProfile(pack) {
	var registry = window.kmRomHackRegistry;
	if (!registry || !pack || pack.generations.length !== 1) return false;
	var profileId = pack.profileId || pack.id;
	if (registry.getProfile(profileId)) return false;
	var authors = [];
	for (var i = 0; i < pack.authors.length; i++) {
		authors.push({name: pack.authors[i].name, role: "Trainer data"});
	}
	registry.registerProfile({
		id: profileId,
		name: pack.mod || pack.name,
		shortName: pack.mod || pack.name,
		version: pack.version,
		baseGeneration: pack.generations[0],
		calcProfile: "canonical",
		trainerData: {packId: pack.id},
		saveImport: {generation: pack.generations[0]},
		tile: {
			description: pack.description || pack.name + " trainer data over Generation " + pack.generations[0] + ".",
			icon: "./img/km-calculator-icon.png",
			badge: "Generation " + pack.generations[0]
		},
		attribution: {
			authors: authors,
			source: pack.source,
			license: {name: pack.license}
		}
	});
	importedTrainerProfileIds[profileId] = true;
	return true;
}

function unregisterImportedTrainerProfiles() {
	var registry = window.kmRomHackRegistry;
	if (!registry) return;
	var profileIds = Object.keys(importedTrainerProfileIds);
	for (var i = 0; i < profileIds.length; i++) registry.unregisterProfile(profileIds[i]);
	importedTrainerProfileIds = {};
}

function initializeTrainerDataRegistry() {
	if (trainerDataRegistry || typeof KMTrainerDataRegistry === "undefined") return;
	var storage = null;
	try {
		storage = getMovesetImportStorage();
	} catch (error) {}
	trainerDataRegistry = KMTrainerDataRegistry.createRegistry({storage: storage});
	var builtIn = createRoyalSwordTrainerPack();
	if (builtIn.trainers.length) trainerDataRegistry.setBuiltInPack(builtIn);
	var report = trainerDataRegistry.load();
	var importedPacks = trainerDataRegistry.getImportedPacks();
	for (var i = 0; i < importedPacks.length; i++) registerImportedTrainerProfile(importedPacks[i]);
	if (report.errors.length && window.console && console.warn) {
		console.warn("Some imported trainer packs could not be restored:", report.errors);
	}
}

function rebuildTrainerRuntimeIndex() {
	if (typeof rebuildKMCalculatorTrainerIndex === "function") rebuildKMCalculatorTrainerIndex();
	else if (typeof rebuildRoyalSwordTrainerIndex === "function") rebuildRoyalSwordTrainerIndex();
}

function placeBsBtn() {
	var importButtons =
		"<div class='import-actions'>" +
			"<button id='import' type='button' class='bs-btn bs-btn-default'>Import From Text</button>" +
			"<button id='import-save' type='button' class='bs-btn bs-btn-default'>Import From Save</button>" +
			"<button id='import-trainer-data' type='button' class='bs-btn bs-btn-default'>Import Trainer Data</button>" +
			"<button id='remove-trainer-data' type='button' class='bs-btn bs-btn-default'>Remove Imported Trainer Data</button>" +
			"<input id='save-import-file' class='save-import-file' type='file' />" +
			"<input id='trainer-data-import-file' class='save-import-file' type='file' accept='.json,application/json' />" +
		"</div>";
	$("#import-1_wrapper").append(importButtons);

	$("#import.bs-btn").click(function () {
		var pokes = document.getElementsByClassName("import-team-text")[0].value;
		var name = document.getElementsByClassName("import-name-text")[0].value.trim() === "" ? "Custom Set" : document.getElementsByClassName("import-name-text")[0].value;
		addSets(pokes, name);
	});

	$("#import-save.bs-btn").click(function () {
		$("#save-import-file").click();
	});

	$("#save-import-file").change(function () {
		if (this.files && this.files[0]) {
			if (typeof importPokemonSaveFile === "function") importPokemonSaveFile(this.files[0]);
			else importSwordShieldSaveFile(this.files[0]);
		}
		$(this).val("");
	});

	$("#import-trainer-data.bs-btn").click(function () {
		$("#trainer-data-import-file").click();
	});

	$("#trainer-data-import-file").change(function () {
		if (this.files && this.files[0]) importTrainerDataFile(this.files[0]);
		$(this).val("");
	});

	$("#remove-trainer-data.bs-btn").click(removeImportedTrainerData);
}

function loadTrainerData(callback) {
	function finish() {
		initializeTrainerDataRegistry();
		rebuildTrainerRuntimeIndex();
		callback();
	}
	if (typeof TRAINERDEX !== "undefined") {
		finish();
		return;
	}
	var script = document.createElement("script");
	script.src = "./js/data/trainers.js";
	script.onload = finish;
	script.onerror = function () {
		finish();
	};
	document.body.appendChild(script);
}

function getTrainerEntries() {
	initializeTrainerDataRegistry();
	if (trainerDataRegistry) {
		return trainerDataRegistry.getTrainerEntries(getTrainerGeneration(), getActiveTrainerProfileId());
	}
	return getRawTrainerEntries();
}

function getTrainerEntry(trainerId) {
	if (trainerId === undefined || trainerId === null || trainerId === "") return null;
	var trainers = getTrainerEntries();
	var id = String(trainerId);
	for (var i = 0; i < trainers.length; i++) {
		if (trainers[i]._kmId === id) return trainers[i];
	}
	return trainers[~~trainerId] || null;
}

function getTrainerBattleType(entry) {
	var battleType = entry && entry.battleType ? String(entry.battleType).toLowerCase() : "single";
	return battleType.indexOf("double") === 0 ? "double" : "single";
}

function getSelectedTrainerBattleType() {
	return isDoublesFormatSelected() ? "double" : "single";
}

function getFilteredTrainerEntryIds() {
	var trainers = getTrainerEntries();
	var battleType = getSelectedTrainerBattleType();
	var ids = [];
	for (var i = 0; i < trainers.length; i++) {
		if (getTrainerBattleType(trainers[i]) === battleType) ids.push(trainers[i]._kmId || String(i));
	}
	return ids;
}

window.getTrainerEntries = getTrainerEntries;
window.getTrainerEntry = getTrainerEntry;

window.addEventListener("kmcalculator:romhackchange", function () {
	setTimeout(function () {
		refreshTrainerDataViews();
	}, 0);
});

function getTrainerPokemon(entry) {
	return entry && (entry.pokemon || entry.team) ? (entry.pokemon || entry.team) : [];
}

function getTrainerPokemonSpecies(pokemon) {
	return checkExceptionsImport(pokemon.species);
}

function getTrainerArea(entry) {
	return entry && entry.area ? entry.area : "Trainers";
}

function getTrainerName(entry) {
	return entry && (entry.trainer || entry.name) ? (entry.trainer || entry.name) : "Trainer";
}

function getTrainerPackGroup(entry) {
	var area = getTrainerArea(entry);
	return entry && entry._kmPack ? entry._kmPack.name + " — " + area : area;
}

function getTrainerPackCredit(entry) {
	if (!entry || !entry._kmPack) return "Built-in trainer data";
	var authors = [];
	for (var i = 0; i < entry._kmPack.authors.length; i++) authors.push(entry._kmPack.authors[i].name);
	return entry._kmPack.name + " v" + entry._kmPack.version + " · " + authors.join(", ") +
		" · " + entry._kmPack.source.name + " · " + entry._kmPack.license;
}

function updateTrainerDataAttribution(entry) {
	var attribution = $("#trainer-data-attribution");
	if (!attribution.length) return;
	attribution.text(entry ? getTrainerPackCredit(entry) : "No trainer data is available for this generation.");
}

function formatTrainerDataError(error) {
	var message = error && error.message ? error.message : "Trainer data could not be imported.";
	if (error && error.issues && error.issues.length) message += "\n\n" + error.issues.join("\n");
	return message;
}

function refreshTrainerDataViews(preferredTrainerId) {
	rebuildTrainerRuntimeIndex();
	if (!$("#trainer-selector").length) installTrainerControls();
	else refreshTrainerSelectorForBattleFormat(preferredTrainerId);
	$(document).trigger("kmtrainerdatachange");
}

function importTrainerDataFile(file) {
	initializeTrainerDataRegistry();
	if (!trainerDataRegistry) {
		alert("Trainer data support is unavailable in this build.");
		return;
	}
	var reader = new FileReader();
	reader.onload = function () {
		try {
			var pack = trainerDataRegistry.importPack(JSON.parse(String(reader.result || "")));
			registerImportedTrainerProfile(pack);
			refreshTrainerDataViews();
			var authors = [];
			for (var i = 0; i < pack.authors.length; i++) authors.push(pack.authors[i].name);
			alert(
				"Imported " + pack.name + " with " + pack.trainers.length + " trainer" +
				(pack.trainers.length === 1 ? "" : "s") + ".\n\n" +
				"Credit: " + authors.join(", ") + "\n" +
				"Source: " + pack.source.name + "\n" +
				"License: " + pack.license
			);
		} catch (error) {
			alert(formatTrainerDataError(error));
		}
	};
	reader.onerror = function () {
		alert("Trainer data could not be read from " + file.name + ".");
	};
	reader.readAsText(file);
}

function removeImportedTrainerData() {
	initializeTrainerDataRegistry();
	var packs = trainerDataRegistry ? trainerDataRegistry.getImportedPacks() : [];
	if (!packs.length) {
		alert("There are no imported trainer data packs to remove.");
		return;
	}
	var names = [];
	for (var i = 0; i < packs.length; i++) names.push(packs[i].name);
	if (!window.confirm("Remove all imported trainer data packs?\n\n" + names.join("\n"))) return;
	trainerDataRegistry.clearImportedPacks();
	unregisterImportedTrainerProfiles();
	refreshTrainerDataViews();
	if (window.kmRomHackRegistry && !window.kmRomHackRegistry.getActiveProfile()) {
		window.kmRomHackRegistry.requestChooser("trainer-data-removed");
	}
}

function getTrainerPokemonLabel(pokemon) {
	var species = getTrainerPokemonSpecies(pokemon);
	var label = pokemon.nickname ? pokemon.nickname + " (" + species + ")" : species;
	if (pokemon.level !== undefined) label += " Lv" + pokemon.level;
	return label;
}

function getTrainerPokemonButtonLabel(pokemon) {
	return pokemon.nickname || getTrainerPokemonSpecies(pokemon);
}

function getTrainerTeamSummary(entry) {
	var pokemon = getTrainerPokemon(entry);
	var names = [];
	for (var i = 0; i < pokemon.length; i++) {
		names.push(getTrainerPokemonButtonLabel(pokemon[i]));
	}
	return names.join(", ");
}

function getTrainerSetName(entry, pokemon) {
	return "[Trainer] " + getTrainerArea(entry) + " - " + getTrainerName(entry) + " - " + getTrainerPokemonLabel(pokemon);
}

function getTrainerSet(pokemon) {
	var set = {};
	var fields = ["ability", "item", "nature", "moves", "ivs", "dvs", "evs", "level", "gender", "teraType"];
	for (var i = 0; i < fields.length; i++) {
		var field = fields[i];
		if (pokemon[field] !== undefined) set[field] = pokemon[field];
	}
	if (typeof window.isRoyalSwordProfileActive === "function" && window.isRoyalSwordProfileActive()) {
		set.evs = getZeroEVs();
	}
	set.moves = (set.moves || []).slice(0, 4);
	while (set.moves.length < 4) set.moves.push("(No Move)");
	set.isTrainerSet = true;
	if (pokemon.nickname) set.nickname = pokemon.nickname;
	return set;
}

function addTrainerPokemonToDex(entry, pokemon) {
	var species = getTrainerPokemonSpecies(pokemon);
	if (!pokedex || !pokedex[species]) return "";
	var setName = getTrainerSetName(entry, pokemon);
	if (!setdex[species]) setdex[species] = {};
	setdex[species][setName] = getTrainerSet(pokemon);
	return species + " (" + setName + ")";
}

function getTrainerSlotSelection(trainerId, index, fullSetName) {
	var entry = getTrainerEntry(trainerId);
	var trainer = getTrainerPokemon(entry);
	var pokemon = trainer && trainer[index];
	if (!entry || !pokemon) return null;
	return {
		fullSetName: fullSetName,
		pokemonName: getTrainerPokemonSpecies(pokemon),
		displayName: getTrainerPokemonButtonLabel(pokemon),
		label: getTrainerPokemonLabel(pokemon),
		trainerId: String(trainerId),
		trainerIndex: String(index)
	};
}

function assignTrainerPokemonToSlot(trainerId, index, slot) {
	loadTrainerSlotIntoEditor(trainerId, index, slot);
}

function loadTrainerSlotIntoEditor(trainerId, index, slot) {
	var entry = getTrainerEntry(trainerId);
	var trainer = getTrainerPokemon(entry);
	if (!trainer || !trainer[index]) return;
	var fullSetName = addTrainerPokemonToDex(entry, trainer[index]);
	if (!fullSetName) {
		alert("This trainer Pokemon is not available in the selected generation.");
		return;
	}
	setDoublesActiveSlot("opponent", slot || 1);
	var selector = $("#p2 .set-selector");
	if (selector.data("select2")) {
		selector.select2("data", {id: fullSetName, text: fullSetName});
	}
	selector.val(fullSetName);
	selector.change();
	updatePokemonLegendSprite($("#p2"), "Trainer", getTrainerPokemonSpecies(trainer[index]));
	setDoublesSlotSelection("opponent", slot || 1, getTrainerSlotSelection(trainerId, index, fullSetName));
	updateDoublesSlotHighlights();
	updateDoublesSlotSummaries();
}

function selectTrainerPokemon(trainerId, index) {
	loadTrainerSlotIntoEditor(trainerId, index, 1);
}

function hideTrainerSetSelector() {
	var selector = $("#p2 .set-selector");
	$("#p2").addClass("trainer-mode");
	selector.addClass("trainer-set-selector-input");
	if (selector.data("select2")) {
		selector.select2("container").addClass("trainer-set-selector-container");
	}
}

function renderTrainerTeam(trainerId) {
	var team = $("#trainer-team");
	team.empty();
	var entry = getTrainerEntry(trainerId);
	var trainer = getTrainerPokemon(entry);
	updateTrainerDataAttribution(entry);
	if (!entry || !trainer.length) return;
	if (getTrainerBattleType(entry) !== getSelectedTrainerBattleType()) {
		refreshTrainerSelectorForBattleFormat();
		return;
	}
	clearDoublesSlotSide("opponent");
	for (var i = 0; i < trainer.length; i++) {
		var pokemon = trainer[i];
		var button = $("<button type='button' class='trainer-pokemon'></button>");
		button.append(createPokemonSprite(getTrainerPokemonSpecies(pokemon), "trainer-pokemon-sprite"));
		button.attr("aria-label", getTrainerPokemonButtonLabel(pokemon));
		button.attr("title", getTrainerPokemonLabel(pokemon));
		button.attr("data-trainer-id", trainerId);
		button.attr("data-trainer-index", i);
		button.click(function () {
			if (isDoublesFormatSelected()) return;
			selectTrainerPokemon(trainerId, ~~$(this).attr("data-trainer-index"));
		});
		button.on("contextmenu", function (event) {
			if (!isDoublesFormatSelected()) return;
			event.preventDefault();
			var trainerIndex = ~~$(this).attr("data-trainer-index");
			showDoublesSlotMenu(event, function (slot) {
				assignTrainerPokemonToSlot(trainerId, trainerIndex, slot);
			});
		});
		team.append(button);
	}
	selectTrainerPokemon(trainerId, 0);
}

window.loadTrainerSlotIntoEditor = loadTrainerSlotIntoEditor;

function selectAdjacentTrainer(direction) {
	var selector = $("#trainer-selector");
	var trainerIds = getFilteredTrainerEntryIds();
	if (!trainerIds.length) return;
	var selected = String(selector.val());
	var index = trainerIds.indexOf(selected);
	if (index < 0) index = 0;
	index = (index + direction + trainerIds.length) % trainerIds.length;
	selector.val(trainerIds[index]).change();
}

function rebuildTrainerSelectorOptions(selector, preferredTrainerId) {
	var trainerIds = getFilteredTrainerEntryIds();
	var selectedId = trainerIds.indexOf(String(preferredTrainerId)) !== -1 ? String(preferredTrainerId) : trainerIds[0];
	var hadSelect2 = !!selector.data("select2");
	if (hadSelect2) selector.select2("destroy");
	selector.empty();
	if (!trainerIds.length) {
		selector.append($("<option></option>").val("").text("No trainers available").attr("disabled", "disabled"));
		selectedId = "";
	}
	var optgroup;
	var currentArea = "";
	for (var i = 0; i < trainerIds.length; i++) {
		var trainerId = trainerIds[i];
		var entry = getTrainerEntry(trainerId);
		var area = getTrainerPackGroup(entry);
		if (area !== currentArea) {
			currentArea = area;
			optgroup = $("<optgroup></optgroup>").attr("label", area);
			selector.append(optgroup);
		}
		optgroup.append(
			$("<option></option>")
				.val(trainerId)
				.text(getTrainerName(entry))
				.attr("title", area + " > " + getTrainerName(entry) + " > " + getTrainerTeamSummary(entry))
		);
	}
	selector.val(selectedId);
	if (hadSelect2) {
		selector.select2({width: "resolve"});
		selector.select2("container").addClass("trainer-selector-container");
	}
	return selectedId;
}

function refreshTrainerSelectorForBattleFormat(preferredTrainerId) {
	var selector = $("#trainer-selector");
	if (!selector.length) return;
	var selectedId = rebuildTrainerSelectorOptions(selector, preferredTrainerId || selector.val());
	if (selectedId) renderTrainerTeam(selectedId);
	else {
		$("#trainer-team").empty();
		updateTrainerDataAttribution(null);
	}
}

function installTrainerControls() {
	if (!$("#p2").length || $("#trainer-selector").length) return;
	var controls = $("<div class='trainer-controls'></div>");
	var trainerRow = $("<div class='trainer-selector-row'></div>");
	var prevTrainer = $("<button type='button' class='btn trainer-nav trainer-prev' title='Previous Trainer' aria-label='Previous Trainer'>Prev</button>");
	var selector = $("<select id='trainer-selector' aria-label='Trainer'></select>");
	var nextTrainer = $("<button type='button' class='btn trainer-nav trainer-next' title='Next Trainer' aria-label='Next Trainer'>Next</button>");
	var team = $("<div id='trainer-team'></div>");
	var attribution = $("<div id='trainer-data-attribution' class='trainer-data-attribution' aria-live='polite'></div>");
	var selectedTrainerId = rebuildTrainerSelectorOptions(selector);
	trainerRow.append(prevTrainer).append(selector).append(nextTrainer);
	controls.append(trainerRow).append(team).append(attribution);
	$("#p2 legend").text("Trainer");
	$("#p2 legend").after(controls);
	selector.select2({width: "resolve"});
	selector.select2("container").addClass("trainer-selector-container");
	hideTrainerSetSelector();
	prevTrainer.click(function () {
		selectAdjacentTrainer(-1);
	});
	nextTrainer.click(function () {
		selectAdjacentTrainer(1);
	});
	selector.change(function () {
		renderTrainerTeam($(this).val());
	});
	$("input:radio[name='format']").change(function () {
		refreshTrainerSelectorForBattleFormat();
	});
	$(".gen").change(function () {
		setTimeout(function () {
			refreshTrainerSelectorForBattleFormat();
			rebuildTrainerRuntimeIndex();
		}, 0);
	});
	if (selectedTrainerId) renderTrainerTeam(selectedTrainerId);
	else updateTrainerDataAttribution(null);
}

function ExportPokemon(pokeInfo) {
	var pokemon = createPokemon(pokeInfo);
	var gender = pokeInfo.find(".gender").val() || 'N';
	var EV_counter = 0;
	var finalText = checkExceptionsExport(pokemon.name);
	if (gender !== 'N') finalText += " (" + gender + ")";
	if (pokemon.item) finalText += " @ " + pokemon.item;
	finalText += "\n";
	if (pokemon.ability) finalText += "Ability: " + pokemon.ability + "\n";
	if (pokemon.level !== 100) finalText += "Level: " + pokemon.level + "\n";
	if (gen === 9) {
		var teraType = pokeInfo.find(".teraType").val();
		if (teraType !== undefined && teraType !== pokemon.types[0]) {
			finalText += "Tera Type: " + teraType + "\n";
		}
	}
	if (gen > 2) {
		var EVs_Array = [];
		for (var stat in pokemon.evs) {
			var ev = pokemon.evs[stat] ? pokemon.evs[stat] : 0;
			if (ev > 0) {
				EVs_Array.push(ev + " " + calc.Stats.displayStat(stat));
			}
			EV_counter += ev;
			if (EV_counter > 510) break;
		}
		if (EVs_Array.length > 0) {
			finalText += "EVs: ";
			finalText += serialize(EVs_Array, " / ");
			finalText += "\n";
		}
		if (pokemon.nature) {
			finalText += pokemon.nature + " Nature" + "\n";
		}
	}
	var IVs_Array = [];
	for (var stat in pokemon.ivs) {
		var iv = pokemon.ivs[stat] ? pokemon.ivs[stat] : 0;
		if (iv < 31) {
			IVs_Array.push(iv + " " + calc.Stats.displayStat(stat));
		}
	}
	if (IVs_Array.length > 0) {
		finalText += "IVs: ";
		finalText += serialize(IVs_Array, " / ");
		finalText += "\n";
	}

	for (var i = 0; i < 4; i++) {
		var moveName = pokemon.moves[i].name;
		if (moveName !== "(No Move)") {
			finalText += "- " + moveName + "\n";
		}
	}
	finalText = finalText.trim();
	$("textarea.import-team-text").val(finalText);
}

$("#exportL").click(function () {
	ExportPokemon($("#p1"));
});

$("#exportR").click(function () {
	ExportPokemon($("#p2"));
});

function serialize(array, separator) {
	var text = "";
	for (var i = 0; i < array.length; i++) {
		if (i < array.length - 1) {
			text += array[i] + separator;
		} else {
			text += array[i];
		}
	}
	return text;
}

function statToLegacyStat(stat) {
	switch (stat) {
	case 'hp':
		return "hp";
	case 'atk':
		return "at";
	case 'def':
		return "df";
	case 'spa':
		return "sa";
	case 'spd':
		return "sd";
	case 'spe':
		return "sp";
	}
}

function findSpecies(row) {
	row = row.split(/[()@]/);
	// Skip if the row contains the ability As One (Spectrier / Glastrier),
	// so that it is not treated as a separate Pokemon.
	if (row.length > 0 && row[0].includes('As One')) return {offset: undefined};
	var name;
	var offset;
	for (var j = 0; j < row.length && offset === undefined; j++) {
		name = checkExceptionsImport(row[j].trim());
		if (calc.SPECIES[9][name] !== undefined) offset = j;
	}
	return {name: name, offset: offset};
}

function getGender(currentRow, j) {
	var gender;
	for (; j < currentRow.length; j++) {
		gender = currentRow[j].trim();
		if (gender === 'M' || gender === 'F' || gender === 'N') return gender;
	}
}

function getItem(currentRow, j) {
	var item;
	for (; j < currentRow.length; j++) {
		item = currentRow[j].trim();
		if (calc.ITEMS[9].indexOf(item) !== -1) return item;
	}
}

function getStats(currentPoke, rows, x) {
	currentPoke.nature = "Serious";
	var currentIV;
	var currentNature;
	currentPoke.level = 100;
	for (; x < rows.length && findSpecies(rows[x]).offset === undefined; x++) {
		var currentRow = rows[x] ? rows[x].split(/[/:]/) : '';
		var ivs = {};
		var ability;
		var teraType;
		var j;

		switch (currentRow[0]) {
		case 'Level':
			currentPoke.level = parseInt(currentRow[1].trim());
			break;
		case 'EVs':
			currentPoke.evs = getZeroEVs();
			break;
		case 'IVs':
			for (j = 1; j < currentRow.length; j++) {
				currentIV = currentRow[j].trim().split(" ");
				currentIV[1] = statToLegacyStat(currentIV[1].toLowerCase());
				ivs[currentIV[1]] = parseInt(currentIV[0]);
			}
			currentPoke.ivs = ivs;
			break;
		case 'Ability':
			ability = currentRow[1] ? currentRow[1].trim() : '';
			if (calc.ABILITIES[9].indexOf(ability) !== -1) currentPoke.ability = ability;
			break;
		case 'Tera Type':
			teraType = currentRow[1] ? currentRow[1].trim() : '';
			if (Object.keys(calc.TYPE_CHART[9]).slice(1).indexOf(teraType) !== -1) currentPoke.teraType = teraType;
			break;
		}

		currentNature = rows[x] ? rows[x].trim().split(" ") : '';
		if (currentNature[1] === "Nature" && currentNature[0] != "-") currentPoke.nature = currentNature[0];
	}
	return currentPoke;
}

function getMoves(currentPoke, rows, x) {
	var movesFound = false;
	var move;
	var moves = [];
	for (; x < rows.length && findSpecies(rows[x]).offset === undefined; x++) {
		if (rows[x]) {
			if (rows[x][0] === "-") {
				movesFound = true;
				move = rows[x].slice(2).replace("[", "").replace("]", "").trim().replace(/\s+/g, " ");
				moves.push(move);
			} else if (movesFound === true) {
				break;
			}
		}
	}
	currentPoke.moves = moves;
	return currentPoke;
}

function createDexObjectFromPokemon(poke) {
	var dexObject = {};
	if (poke.ability !== undefined) {
		dexObject.ability = poke.ability;
	}
	if (poke.teraType !== undefined) {
		dexObject.teraType = poke.teraType;
	}
	dexObject.level = poke.level;
	dexObject.evs = poke.evs || getZeroEVs();
	dexObject.ivs = poke.ivs;
	if (poke.dvs !== undefined) dexObject.dvs = poke.dvs;
	dexObject.moves = poke.moves;
	dexObject.nature = poke.nature;
	dexObject.gender = poke.gender;
	dexObject.item = poke.item;
	dexObject.nickname = poke.nickname;
	dexObject.isCustomSet = poke.isCustomSet;
	if (poke.isGmax !== undefined) dexObject.isGmax = poke.isGmax;
	if (poke.dynamaxLevel !== undefined) dexObject.dynamaxLevel = poke.dynamaxLevel;
	return dexObject;
}

function addToDex(poke) {
	var dexObject = createDexObjectFromPokemon(poke);
	if ($("#randoms").prop("checked")) {
		ensureCustomRandomDexPokemon(poke.name);
	} else {
		ensureCustomSetDexPokemon(poke.name);
	}
	var customsets = readCustomSets();
	if (!customsets[poke.name]) {
		customsets[poke.name] = {};
	}
	customsets[poke.name][poke.nameProp] = dexObject;
	if (poke.name === "Aegislash-Blade") {
		if (!customsets["Aegislash-Shield"]) customsets["Aegislash-Shield"] = {};
		if (!customsets["Aegislash-Both"]) customsets["Aegislash-Both"] = {};
		customsets["Aegislash-Shield"][poke.nameProp] = dexObject;
		customsets["Aegislash-Both"][poke.nameProp] = dexObject;
	}
	updateDex(customsets);
}

function ensureCustomSetDexPokemon(pokemon) {
	for (var index = 0; index < SETDEX.length; index++) {
		if (!SETDEX[index]) continue;
		if (!SETDEX[index][pokemon]) SETDEX[index][pokemon] = {};
	}
}

function ensureCustomRandomDexPokemon(pokemon) {
	var randomDexes = [
		typeof GEN1RANDOMBATTLE === 'undefined' ? null : GEN1RANDOMBATTLE,
		typeof GEN2RANDOMBATTLE === 'undefined' ? null : GEN2RANDOMBATTLE,
		typeof GEN3RANDOMBATTLE === 'undefined' ? null : GEN3RANDOMBATTLE,
		typeof GEN4RANDOMBATTLE === 'undefined' ? null : GEN4RANDOMBATTLE,
		typeof GEN5RANDOMBATTLE === 'undefined' ? null : GEN5RANDOMBATTLE,
		typeof GEN6RANDOMBATTLE === 'undefined' ? null : GEN6RANDOMBATTLE,
		typeof GEN7RANDOMBATTLE === 'undefined' ? null : GEN7RANDOMBATTLE,
		typeof GEN8RANDOMBATTLE === 'undefined' ? null : GEN8RANDOMBATTLE,
		typeof GEN9RANDOMBATTLE === 'undefined' ? null : GEN9RANDOMBATTLE
	];
	for (var index = 0; index < randomDexes.length; index++) {
		if (randomDexes[index] && !randomDexes[index][pokemon]) randomDexes[index][pokemon] = {};
	}
}

function updateDex(customsets) {
	for (var pokemon in customsets) {
		for (var moveset in customsets[pokemon]) {
			for (var index = 0; index < SETDEX.length; index++) {
				if (!SETDEX[index]) continue;
				if (!SETDEX[index][pokemon]) SETDEX[index][pokemon] = {};
				SETDEX[index][pokemon][moveset] = customsets[pokemon][moveset];
			}
		}
	}
	(window.getRoyalSwordStorage ? window.getRoyalSwordStorage() : localStorage).setItem("customsets", JSON.stringify(customsets));
	if (typeof syncTeamBoxWithCustomSets === "function") syncTeamBoxWithCustomSets(customsets);
}

function addSets(pokes, name) {
	var rows = pokes.split("\n");
	var currentRow;
	var species;
	var currentPoke;
	var addedPokes = 0;
	for (var i = 0; i < rows.length; i++) {
		species = findSpecies(rows[i]);
		if (species.offset !== undefined) {
			currentRow = rows[i].split(/[()@]/);
			currentPoke = JSON.parse(JSON.stringify(calc.SPECIES[9][species.name]));
			currentPoke.name = species.name;
			currentPoke.gender = getGender(currentRow, species.offset + 1);
			currentPoke.item = getItem(currentRow, species.offset + 1);
			currentPoke = getStats(currentPoke, rows, i + 1);
			currentPoke = getMoves(currentPoke, rows, i + 1);
			if (species.offset === 1 && currentRow[0].trim()) {
				currentPoke.nameProp = currentRow[0].trim();
			} else {
				currentPoke.nameProp = name;
			}
			currentPoke.isCustomSet = true;
			addToDex(currentPoke);
			addedPokes++;
		}
	}
	if (addedPokes > 0) {
		alert("Successfully imported " + addedPokes + (addedPokes === 1 ? " set" : " sets"));
	} else {
		alert("No sets imported, please check your syntax and try again");
	}
}

function checkExceptionsImport(poke) {
	if (poke && poke.endsWith("-Gmax")) poke = poke.slice(0, -5);
	if (poke === "Eternatus-Eternamax") poke = "Eternatus";
	switch (poke) {
	case 'Alcremie-Vanilla-Cream':
	case 'Alcremie-Ruby-Cream':
	case 'Alcremie-Matcha-Cream':
	case 'Alcremie-Mint-Cream':
	case 'Alcremie-Lemon-Cream':
	case 'Alcremie-Salted-Cream':
	case 'Alcremie-Ruby-Swirl':
	case 'Alcremie-Caramel-Swirl':
	case 'Alcremie-Rainbow-Swirl':
		poke = "Alcremie";
		break;
	case 'Aegislash':
		poke = "Aegislash-Shield";
		break;
	case 'Aegislash-Both':
		poke = "Aegislash-Blade";
		break;
	case 'Basculin-Red-Striped':
		poke = "Basculin";
		break;
	case 'Burmy-Plant':
	case 'Burmy-Sandy':
	case 'Burmy-Trash':
		poke = "Burmy";
		break;
	case 'Calyrex-Ice-Rider':
		poke = "Calyrex-Ice";
		break;
	case 'Calyrex-Shadow-Rider':
		poke = "Calyrex-Shadow";
		break;
	case 'Deerling-Summer':
	case 'Deerling-Autumn':
	case 'Deerling-Winter':
	case 'Deerling-Spring':
		poke = "Deerling";
		break;
	case 'Flabébé-Blue':
	case 'Flabébé-Orange':
	case 'Flabébé-Red':
	case 'Flabébé-White':
	case 'Flabébé-Yellow':
	case 'Flabebe':
	case 'Flabebe-Blue':
	case 'Flabebe-Orange':
	case 'Flabebe-Red':
	case 'Flabebe-White':
	case 'Flabebe-Yellow':
		poke = "Flabébé";
		break;
	case 'Floette-Blue':
	case 'Floette-Orange':
	case 'Floette-Red':
	case 'Floette-White':
	case 'Floette-Yellow':
		poke = "Floette";
		break;
	case 'Florges-Blue':
	case 'Florges-Orange':
	case 'Florges-Red':
	case 'Florges-White':
	case 'Florges-Yellow':
		poke = "Florges";
		break;
	case 'Furfrou-Dandy':
	case 'Furfrou-Debutante':
	case 'Furfrou-Diamond':
	case 'Furfrou-Heart':
	case 'Furfrou-Kabuki':
	case 'Furfrou-La-Reine':
	case 'Furfrou-Matron':
	case 'Furfrou-Natural':
	case 'Furfrou-Pharaoh':
	case 'Furfrou-Star':
		poke = "Furfrou";
		break;
	case 'Gastrodon-East':
	case 'Gastrodon-West':
		poke = "Gastrodon";
		break;
	case 'Giratina-Altered':
		poke = "Giratina";
		break;
	case 'Gourgeist-Average':
	case 'Gourgeist-Medium':
		poke = "Gourgeist";
		break;
	case 'Gourgeist-Jumbo':
		poke = "Gourgeist-Super";
		break;
	case 'Mimikyu-Busted-Totem':
		poke = "Mimikyu-Totem";
		break;
	case 'Mimikyu-Busted':
		poke = "Mimikyu";
		break;
	case 'Minior-Red':
	case 'Minior-Orange':
	case 'Minior-Yellow':
	case 'Minior-Green':
	case 'Minior-Blue':
	case 'Minior-Indigo':
	case 'Minior-Violet':
		poke = "Minior";
		break;
	case 'Poltchageist-Artisan':
	case 'Poltchageist-Counterfeit':
		poke = "Poltchageist";
		break;
	case 'Polteageist-Antique':
	case 'Polteageist-Phony':
		poke = "Polteageist";
		break;
	case 'Pumpkaboo-Average':
	case 'Pumpkaboo-Medium':
		poke = "Pumpkaboo";
		break;
	case 'Pumpkaboo-Jumbo':
		poke = "Pumpkaboo-Super";
		break;
	case 'Sawsbuck-Summer':
	case 'Sawsbuck-Autumn':
	case 'Sawsbuck-Winter':
	case 'Sawsbuck-Spring':
		poke = "Sawsbuck";
		break;
	case 'Shellos-East':
	case 'Shellos-West':
		poke = "Shellos";
		break;
	case 'Sinistcha-Masterpiece':
	case 'Sinistcha-Unremarkable':
		poke = "Sinistcha";
		break;
	case 'Sinistea-Antique':
	case 'Sinistea-Phony':
		poke = "Sinistea";
		break;
	case 'Tastugiri-Curly':
		poke = "Tatsugiri";
		break;
	case 'Unown-A':
	case 'Unown-B':
	case 'Unown-C':
	case 'Unown-D':
	case 'Unown-E':
	case 'Unown-F':
	case 'Unown-G':
	case 'Unown-H':
	case 'Unown-I':
	case 'Unown-J':
	case 'Unown-K':
	case 'Unown-L':
	case 'Unown-M':
	case 'Unown-N':
	case 'Unown-O':
	case 'Unown-P':
	case 'Unown-Q':
	case 'Unown-R':
	case 'Unown-S':
	case 'Unown-T':
	case 'Unown-U':
	case 'Unown-V':
	case 'Unown-W':
	case 'Unown-X':
	case 'Unown-Y':
	case 'Unown-Z':
	case 'Unown-Exclamation':
	case 'Unown-Question':
		poke = "Unown";
		break;
	case 'Vivillon-Archipelago':
	case 'Vivillon-Continental':
	case 'Vivillon-Elegant':
	case 'Vivillon-Garden':
	case 'Vivillon-High Plains':
	case 'Vivillon-Icy Snow':
	case 'Vivillon-Meadow':
	case 'Vivillon-Modern':
	case 'Vivillon-Monsoon':
	case 'Vivillon-Ocean':
	case 'Vivillon-Polar':
	case 'Vivillon-River':
	case 'Vivillon-Sandstorm':
	case 'Vivillon-Savanna':
	case 'Vivillon-Sun':
	case 'Vivillon-Tundra':
		poke = "Vivillon";
		break;
	case 'Vivillon-Pokéball':
		poke = "Vivillon-Pokeball";
		break;
	case 'Wormadam-Plant':
		poke = "Wormadam";
		break;
	case 'Xerneas-Neutral':
		poke = "Xerneas";
		break;
	}
	return poke;
}

function checkExceptionsExport(name) {
	switch (name) {
	case 'Aegislash-Shield':
	case 'Aegislash-Both':
		name = "Aegislash";
		break;
	}
	return name;
}

$(document).ready(function () {
	var customSets;
	placeBsBtn();
	if ((window.getRoyalSwordStorage ? window.getRoyalSwordStorage() : localStorage).getItem("customsets")) {
		customSets = readCustomSets();
		updateDex(customSets);
	} else {
		loadDefaultLists();
	}
	loadTrainerData(installTrainerControls);
});
