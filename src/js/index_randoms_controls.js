/*global applyTeamBoxFilters, getActiveCalcGeneration, getDisplayGeneration, getDoublesActiveSlot, getDoublesSlotSelection, getModifiedDisplayValue, isDoublesFormatSelected, isRoyalSwordProfileActive, refreshColorCode, renderMoveResultDisplay, setMoveResultDisplay, updateModifiedStatsDisplay */

var pendingCalculationTimer = null;
var PC_HANDLER = function () {
	if (pendingCalculationTimer) clearTimeout(pendingCalculationTimer);
	pendingCalculationTimer = setTimeout(function () {
		pendingCalculationTimer = null;
		performCalculations();
		if (window.AUTO_REFRESH && typeof refreshColorCode === "function") {
			refreshColorCode();
		} else if (typeof applyTeamBoxFilters === "function") {
			applyTeamBoxFilters();
		}
	}, 0);
};
var damageResults;
var doublesSlot2DamageResults;

$("#p2 .ability").bind("keyup change", function () {
	autosetWeather($(this).val(), 1);
	autosetTerrain($(this).val(), 1);
});

var resultLocations = [[], []];
var doublesSlot2ResultLocations = [[], []];
for (var i = 0; i < 4; i++) {
	resultLocations[0].push({
		"move": "#resultMoveL" + (i + 1),
		"damage": "#resultDamageL" + (i + 1)
	});
	resultLocations[1].push({
		"move": "#resultMoveR" + (i + 1),
		"damage": "#resultDamageR" + (i + 1)
	});
	doublesSlot2ResultLocations[0].push({
		"move": "#resultMoveLSlot2_" + (i + 1),
		"damage": "#resultDamageLSlot2_" + (i + 1)
	});
	doublesSlot2ResultLocations[1].push({
		"move": "#resultMoveRSlot2_" + (i + 1),
		"damage": "#resultDamageRSlot2_" + (i + 1)
	});
}

var mainResultTargets = {
	slot1: {
		main: "#mainResult",
		damageValues: "#damageValues",
		firstDmgValues: "#firstDmgValues",
		restDmgValues: "#restDmgValues"
	},
	slot2: {
		main: "#mainResultSlot2",
		damageValues: "#damageValuesSlot2",
		firstDmgValues: "#firstDmgValuesSlot2",
		restDmgValues: "#restDmgValuesSlot2"
	}
};

function getResultMoveLabel(move) {
	return move ? move.name.replace("Hidden Power", "HP") : "Assign Slot 2";
}

function getResultMoveTitle(label) {
	if (!label || label.indexOf("Assign") === 0) return "Select a move to show detailed results.";
	return "Select " + label + " to show detailed results.";
}

function setResultMoveLabel(location, label) {
	$(location.move + " + label")
		.text(label)
		.attr("title", getResultMoveTitle(label));
}

function syncDoublesTargetControls() {
	var isDoubles = typeof isDoublesFormatSelected === "function" && isDoublesFormatSelected();
	$(".doubles-target-control").prop("hidden", !isDoubles);
}

function getOpposingSide(side) {
	return side === "player" ? "opponent" : "player";
}

function getDoublesTarget(attackerSide, attackerSlot) {
	if (typeof isDoublesFormatSelected !== "function" || !isDoublesFormatSelected()) {
		return {relation: "foe", side: getOpposingSide(attackerSide), slot: 1};
	}
	var selector = $(".slot-target-selector[data-attacker-side='" + attackerSide + "'][data-attacker-slot='" + attackerSlot + "']");
	var value = selector.val() || "foe:1";
	var parts = value.split(":");
	var relation = parts[0] === "ally" ? "ally" : "foe";
	var targetSlot = ~~parts[1] === 2 ? 2 : 1;
	if (relation === "ally" && targetSlot === attackerSlot) targetSlot = attackerSlot === 1 ? 2 : 1;
	return {
		relation: relation,
		side: relation === "ally" ? attackerSide : getOpposingSide(attackerSide),
		slot: targetSlot
	};
}

function getDoublesEditorInfo(side) {
	return side === "player" ? $("#p1") : $("#p2");
}

function getLiveDoublesSlotPokemon(side, slot, fullSetName) {
	if (typeof getDoublesActiveSlot !== "function" || getDoublesActiveSlot(side) !== slot) return null;
	var editorInfo = getDoublesEditorInfo(side);
	if (!editorInfo.length || editorInfo.find(".set-selector").val() !== fullSetName) return null;
	return createPokemon(editorInfo);
}

function getPokemonFromDoublesSlot(side, slot, fallbackInfo) {
	if (typeof isDoublesFormatSelected === "function" && isDoublesFormatSelected() &&
		typeof getDoublesSlotSelection === "function") {
		var selection = getDoublesSlotSelection(side, slot);
		if (selection && selection.fullSetName) {
			var livePokemon = getLiveDoublesSlotPokemon(side, slot, selection.fullSetName);
			if (livePokemon) return livePokemon;
			try {
				return createPokemon(selection.fullSetName);
			} catch (e) {
				return null;
			}
		}
	}
	return fallbackInfo ? createPokemon(fallbackInfo) : null;
}

function getFallbackInfoForSlot(side, slot, playerInfo, opponentInfo) {
	if (slot !== 1) return null;
	return side === "player" ? playerInfo : opponentInfo;
}

function getPokemonForSlot(side, slot, playerInfo, opponentInfo) {
	return getPokemonFromDoublesSlot(side, slot, getFallbackInfoForSlot(side, slot, playerInfo, opponentInfo));
}

function canMoveHitDoublesTarget(move, target) {
	var allyTargets = {
		adjacentAlly: true,
		adjacentAllyOrSelf: true,
		all: true,
		allAdjacent: true,
		allies: true,
		allySide: true,
		allyTeam: true,
		any: true,
		normal: true,
		scripted: true
	};
	var allyOnlyTargets = {
		adjacentAlly: true,
		adjacentAllyOrSelf: true,
		allies: true,
		allySide: true,
		allyTeam: true,
		self: true
	};
	if (!move || !target) return false;
	if (typeof isDoublesFormatSelected !== "function" || !isDoublesFormatSelected()) return true;
	if (target.relation === "ally") return !!allyTargets[move.target];
	return !allyOnlyTargets[move.target];
}

function calculateAttackerMoves(attackerSide, attacker, defender, target) {
	if (!attacker || !defender) return null;
	var baseField = createField();
	var leftPokemon = attackerSide === "player" ? attacker : defender;
	var rightPokemon = attackerSide === "player" ? defender : attacker;
	checkStatBoost(leftPokemon, rightPokemon);
	var field = attackerSide === "player" ? baseField : baseField.clone().swap();
	if (target && target.relation === "ally") field.defenderSide = field.attackerSide.clone();
	var results = [];
	for (var i = 0; i < 4; i++) {
		results[i] = canMoveHitDoublesTarget(attacker.moves[i], target) ?
			calc.calculate(getActiveCalcGeneration(), attacker, defender, attacker.moves[i], field) :
			null;
	}
	return {results: results, field: field};
}

function buildMovePanel(attackerSide, attackerSlot, playerInfo, opponentInfo) {
	var target = getDoublesTarget(attackerSide, attackerSlot);
	var targetSide = target.side;
	var targetSlot = target.slot;
	var attacker = getPokemonForSlot(attackerSide, attackerSlot, playerInfo, opponentInfo);
	var defender = getPokemonForSlot(targetSide, targetSlot, playerInfo, opponentInfo);
	var calculation = calculateAttackerMoves(attackerSide, attacker, defender, target);
	return {
		attackerSide: attackerSide,
		attackerSlot: attackerSlot,
		target: target,
		targetSide: targetSide,
		targetSlot: targetSlot,
		attacker: attacker,
		defender: defender,
		field: calculation ? calculation.field : null,
		results: calculation ? calculation.results : null
	};
}

function renderMoveListWithoutDamage(pokemon, locations, headerSelector, emptyLabel) {
	$(headerSelector).text(pokemon ? pokemon.name + "'s Moves (select one to show detailed results)" : emptyLabel);
	for (var i = 0; i < 4; i++) {
		setResultMoveLabel(locations[i], pokemon && pokemon.moves[i] ? getResultMoveLabel(pokemon.moves[i]) : "Assign Slot 2");
		setMoveResultDisplay(locations[i], "??? - ???%", "pending");
	}
}

function setMainResultText(targets, message, details) {
	$(targets.main).text(message);
	$(targets.firstDmgValues).text(details || "");
	$(targets.restDmgValues).text("");
	$(targets.firstDmgValues).css("display", "block");
}

function parseDisplayedStat(rawText) {
	var match = (rawText || "").match(/([+-]?)\s*(HP|Atk|Def|SpA|SpD|Spe)(?: \((HP|Atk|Def|SpA|SpD|Spe)\))?/);
	if (!match) return null;
	var statByDisplay = {
		HP: "hp",
		Atk: "atk",
		Def: "def",
		SpA: "spa",
		SpD: "spd",
		Spe: "spe"
	};
	return {
		sign: match[1] || "",
		displayStat: match[2],
		actualDisplayStat: match[3] || match[2],
		actualStat: statByDisplay[match[3] || match[2]]
	};
}

function getRoyalSwordStatDescription(pokemon, rawText) {
	var parsed = parseDisplayedStat(rawText);
	if (!parsed || !pokemon || !pokemon.ivs) return rawText;
	var iv = typeof pokemon.ivs[parsed.actualStat] !== "undefined" ? pokemon.ivs[parsed.actualStat] : 31;
	var text = iv + parsed.sign + " " + parsed.displayStat;
	if (parsed.actualDisplayStat !== parsed.displayStat) text += " (" + parsed.actualDisplayStat + ")";
	return text;
}

function getRoyalSwordFullDesc(result) {
	if (!isRoyalSwordProfileActive()) return result.fullDesc(notation, false);
	var rawDesc = result.rawDesc || {};
	var original = {
		attackEVs: rawDesc.attackEVs,
		HPEVs: rawDesc.HPEVs,
		defenseEVs: rawDesc.defenseEVs
	};
	if (rawDesc.attackEVs) rawDesc.attackEVs = getRoyalSwordStatDescription(result.attacker, rawDesc.attackEVs);
	if (rawDesc.HPEVs) rawDesc.HPEVs = getRoyalSwordStatDescription(result.defender, rawDesc.HPEVs);
	if (rawDesc.defenseEVs) rawDesc.defenseEVs = getRoyalSwordStatDescription(result.defender, rawDesc.defenseEVs);
	try {
		return result.fullDesc(notation, false);
	} finally {
		rawDesc.attackEVs = original.attackEVs;
		rawDesc.HPEVs = original.HPEVs;
		rawDesc.defenseEVs = original.defenseEVs;
	}
}

function renderMainResult(result, targets) {
	var desc = getRoyalSwordFullDesc(result);
	if (desc.indexOf('--') === -1) desc += ' -- possibly the worst move ever';
	$(targets.main).text(desc);
	var summary = displayDamageHits(result.damage);
	var rest = "";
	var newLine = summary.indexOf('\n');
	if (newLine > -1) {
		rest = summary.substring(newLine + 1);
		summary = summary.substring(0, newLine);
	}
	$(targets.firstDmgValues).text("Possible damage amounts: (" + summary + ")");
	if (rest !== "") $(targets.restDmgValues).text("(" + rest + ")");

	if (rest.trim() === "") {
		$(targets.firstDmgValues).css("display", "block");
		$(targets.restDmgValues).text("");
	} else {
		$(targets.damageValues).removeAttr("open");
		$(targets.firstDmgValues).css("display", "revert");
	}
}

function renderMovePanel(panel, locations, headerSelector, emptyLabel, alertState) {
	if (!panel.attacker) {
		renderMoveListWithoutDamage(null, locations, headerSelector, emptyLabel);
		return null;
	}
	$(headerSelector).text(panel.attacker.name + "'s Moves (select one to show detailed results)");
	if (!panel.defender || !panel.results) {
		renderMoveListWithoutDamage(panel.attacker, locations, headerSelector, emptyLabel);
		for (var missingIndex = 0; missingIndex < 4; missingIndex++) {
			$(locations[missingIndex].damage).text("Choose target");
		}
		return null;
	}
	var maxDamages = [];
	var attackerSpeed = panel.attacker.stats.spe;
	for (var i = 0; i < 4; i++) {
		var result = panel.results[i];
		var move = panel.attacker.moves[i];
		setResultMoveLabel(locations[i], getResultMoveLabel(move));
		if (!result) {
			setMoveResultDisplay(locations[i], "Invalid target", "invalid");
			continue;
		}
		if (result.attacker && result.attacker.stats && result.attacker.stats.spe !== undefined) {
			attackerSpeed = result.attacker.stats.spe;
		}
		var maxDamage = result.range()[1] * move.hits;
		if (!alertState.zProtectAlerted && maxDamage > 0 && panel.attacker.item.indexOf(" Z") === -1 && panel.field.defenderSide.isProtected && move.isZ) {
			alert('Although only possible while hacking, Z-Moves fully damage through protect without a Z-Crystal');
			alertState.zProtectAlerted = true;
		}
		maxDamages.push({moveOrder: i, maxDamage: maxDamage});
		maxDamages.sort(function (firstMove, secondMove) {
			return secondMove.maxDamage - firstMove.maxDamage;
		});
		renderMoveResultDisplay(locations[i], result, move, notation);
	}
	if (!maxDamages.length) return null;
	return {
		button: $(locations[maxDamages[0].moveOrder].move),
		speed: attackerSpeed
	};
}

function renderMovePanelPair(panels, locations, headerSelectors, emptyLabels) {
	var alertState = {zProtectAlerted: false};
	var best = [];
	for (var i = 0; i < panels.length; i++) {
		best[i] = renderMovePanel(panels[i], locations[i], headerSelectors[i], emptyLabels[i], alertState);
	}
	if (best[0] && best[1]) return best[0].speed >= best[1].speed ? best[0].button : best[1].button;
	if (best[0]) return best[0].button;
	if (best[1]) return best[1].button;
	return null;
}

function chooseResultMove(bestResult, targets, emptyMessage) {
	if (!bestResult || !bestResult.length) {
		setMainResultText(targets, emptyMessage, "Possible damage amounts: (choose attackers and targets)");
		return;
	}
	bestResult.prop("checked", true);
	bestResult.change();
}

function renderDoublesSlot2Results(playerInfo, opponentInfo) {
	var panels = [
		buildMovePanel("player", 2, playerInfo, opponentInfo),
		buildMovePanel("opponent", 2, playerInfo, opponentInfo)
	];
	doublesSlot2DamageResults = [
		panels[0].results || [],
		panels[1].results || []
	];
	var bestResult = renderMovePanelPair(
		panels,
		doublesSlot2ResultLocations,
		["#resultHeaderLSlot2", "#resultHeaderRSlot2"],
		["Player Slot 2's Moves (select one to show detailed results)", "Trainer Slot 2's Moves (select one to show detailed results)"]
	);
	if (!panels[0].results && !panels[1].results) {
		setMainResultText(mainResultTargets.slot2, "Assign both Slot 2 Pokemon to calculate.", "Possible damage amounts: (assign both Slot 2 Pokemon)");
		return;
	}
	chooseResultMove(bestResult, mainResultTargets.slot2, "Choose Slot 2 attackers and targets to calculate.");
}

function performCalculations() {
	syncDoublesTargetControls();
	var p1info = $("#p1");
	var p2info = $("#p2");
	var visibleP1 = createPokemon(p1info);
	var visibleP2 = createPokemon(p2info);
	var visibleField = createField();
	if (typeof checkStatBoost === "function") checkStatBoost(visibleP1, visibleP2);
	updateModifiedStatsDisplay(p1info, visibleP1, visibleField, visibleField.attackerSide);
	updateModifiedStatsDisplay(p2info, visibleP2, visibleField, visibleField.defenderSide);

	var panels = [
		buildMovePanel("player", 1, p1info, p2info),
		buildMovePanel("opponent", 1, p1info, p2info)
	];
	damageResults = [
		panels[0].results || [],
		panels[1].results || []
	];
	var bestResult = renderMovePanelPair(
		panels,
		resultLocations,
		["#resultHeaderL", "#resultHeaderR"],
		["Player Slot 1's Moves (select one to show detailed results)", "Trainer Slot 1's Moves (select one to show detailed results)"]
	);
	if ($('.locked-move').length) {
		bestResult = $('.locked-move');
	} else if (bestResult && bestResult.length) {
		stickyMoves.setSelectedMove(bestResult.prop("id"));
	}
	chooseResultMove(bestResult, mainResultTargets.slot1, "Choose Slot 1 attackers and targets to calculate.");
	if (typeof isDoublesFormatSelected === "function" && isDoublesFormatSelected()) {
		renderDoublesSlot2Results(p1info, p2info);
	}
}

function getDamageRoll(damage, highRoll) {
	if (typeof damage === 'number') return damage;
	if (!damage || !damage.length) return 0;
	if (typeof damage[0] === 'number') return highRoll ? damage[damage.length - 1] : damage[0];
	var total = 0;
	for (var i = 0; i < damage.length; i++) {
		if (typeof damage[i] === 'number') {
			total += damage[i];
		} else if (damage[i] && damage[i].length) {
			total += highRoll ? damage[i][damage[i].length - 1] : damage[i][0];
		}
	}
	return total;
}

function getDamagePercent(result, move, defender, highRoll) {
	if (!result || !move || !defender || !defender.stats || !defender.stats.hp) return 0;
	var damage = getDamageRoll(result.damage, highRoll);
	if (result.damage && result.damage.length && typeof result.damage[0] === 'number') {
		damage *= move.hits || 1;
	}
	return damage / defender.stats.hp * 100;
}

function createColorCodePokemon(pokeInfo) {
	if (typeof pokeInfo === "string" && pokeInfo === $("#p1 .set-selector").val()) {
		return createPokemon($("#p1"));
	}
	return createPokemon(pokeInfo);
}

function calculateColorCodeMoves(generation, p1, p1field, p2, p2field) {
	generation = getActiveCalcGeneration();
	checkStatBoost(p1, p2);
	var results = [[], []];
	for (var i = 0; i < 4; i++) {
		try {
			results[0][i] = calc.calculate(generation, p1, p2, p1.moves[i], p1field);
		} catch (e) {
			results[0][i] = null;
		}
		try {
			results[1][i] = calc.calculate(generation, p2, p1, p2.moves[i], p2field);
		} catch (e) {
			results[1][i] = null;
		}
	}
	return results;
}

function getFirstResultAttacker(results, fallbackPokemon) {
	for (var i = 0; i < results.length; i++) {
		if (results[i] && results[i].attacker) return results[i].attacker;
	}
	return fallbackPokemon;
}

function getColorCodeSpeed(pokemon, results, field, side) {
	for (var i = 0; i < results.length; i++) {
		if (results[i] && results[i].attacker && results[i].attacker.stats && typeof results[i].attacker.stats.spe === "number") {
			return results[i].attacker.stats.spe;
		}
	}
	return getModifiedDisplayValue(pokemon, "sp", getDisplayGeneration(), field, side);
}

function calculationsColors(p1info) {
	var p2info = $("#p2");
	var p1 = createColorCodePokemon(p1info);
	var p2 = createPokemon(p2info);
	var p1field = createField();
	var p2field = p1field.clone().swap();
	var colorDamageResults = calculateColorCodeMoves(getActiveCalcGeneration(), p1, p1field, p2, p2field);
	var p1Color = getFirstResultAttacker(colorDamageResults[0], p1);
	var p2Color = getFirstResultAttacker(colorDamageResults[1], p2);

	var p1Speed = getColorCodeSpeed(p1, colorDamageResults[0], p1field, p1field.attackerSide);
	var p2Speed = getColorCodeSpeed(p2, colorDamageResults[1], p2field, p2field.attackerSide);
	var fastest = p1Speed > p2Speed ? "F" : p1Speed < p2Speed ? "S" : "T";
	var p1KO = 0;
	var p2KO = 0;
	var p1HighestDamage = 0;
	var p2HighestDamage = 0;
	for (var i = 0; i < 4; i++) {
		var p1Result = colorDamageResults[0][i];
		var p1LowestRoll = getDamagePercent(p1Result, p1.moves[i], p2Color, false);
		var p1HighestRoll = getDamagePercent(p1Result, p1.moves[i], p2Color, true);
		p1HighestDamage = Math.max(p1HighestDamage, p1HighestRoll);
		if (p1LowestRoll >= 100) {
			p1KO = 1;
		} else if (p1HighestRoll >= 100 && p1KO === 0) {
			p1KO = 2;
		}

		var p2Result = colorDamageResults[1][i];
		var p2LowestRoll = getDamagePercent(p2Result, p2.moves[i], p1Color, false);
		var p2HighestRoll = getDamagePercent(p2Result, p2.moves[i], p1Color, true);
		p2HighestDamage = Math.max(p2HighestDamage, p2HighestRoll);
		if (p2LowestRoll >= 100) {
			p2KO = 4;
		} else if (p2HighestRoll >= 100 && p2KO < 3) {
			p2KO = 3;
		}
	}
	if (Math.round(p2HighestDamage * 3) < 100 && p1HighestDamage > p2HighestDamage) {
		return {speed: fastest, code: p1HighestDamage > 100 ? "WMO" : "W"};
	}
	p1KO = p1KO > 0 ? p1KO.toString() : "";
	p2KO = p2KO > 0 ? p2KO.toString() : "";
	return {speed: fastest, code: p1KO + p2KO};
}

$(".result-move").change(function () {
	var found = findDamageResult($(this));
	if (found && found.result) {
		renderMainResult(found.result, found.targets);
	}
});

function displayDamageHits(damage) {
	// Fixed Damage
	if (typeof damage === 'number') return damage.toString();
	// Standard Damage
	if (damage.length > 2 && typeof damage[0] === 'number')
		return damage.join(', ');
	// Fixed Parental Bond Damage
	if (typeof damage[0] === 'number' && typeof damage[1] === 'number') {
		return '1st Hit: ' + damage[0] + '; 2nd Hit: ' + damage[1];
	}
	// Multihit Damage
	var fullText = "";
	for (var i = 1; i <= damage.length; i++) {
		var txt = toOrdinal(i) + " Hit: " + damage[i - 1].join(', ');
		if (i > 1 && i < damage.length) txt += "; ";
		fullText += txt;
		if (i % 2 == 1 && i < damage.length) fullText += "\n";
	}
	return fullText;
}

function toOrdinal(num) {
	if (typeof num !== "number" || !Number.isInteger(num)) {
		return "Input must be an integer.";
	}
	switch (num) {
	case 1:
		return num + "st";
	case 2:
		return num + "nd";
	case 3:
		return num + "rd";
	default:
		return num + "th";
	}
}

function findDamageResult(resultMoveObj) {
	var selector = "#" + resultMoveObj.attr("id");
	for (var i = 0; i < resultLocations.length; i++) {
		for (var j = 0; j < resultLocations[i].length; j++) {
			if (resultLocations[i][j].move === selector) {
				return {result: damageResults && damageResults[i] ? damageResults[i][j] : null, targets: mainResultTargets.slot1};
			}
		}
	}
	for (var slot2Side = 0; slot2Side < doublesSlot2ResultLocations.length; slot2Side++) {
		for (var slot2Move = 0; slot2Move < doublesSlot2ResultLocations[slot2Side].length; slot2Move++) {
			if (doublesSlot2ResultLocations[slot2Side][slot2Move].move === selector) {
				return {
					result: doublesSlot2DamageResults && doublesSlot2DamageResults[slot2Side] ? doublesSlot2DamageResults[slot2Side][slot2Move] : null,
					targets: mainResultTargets.slot2
				};
			}
		}
	}
}

function checkStatBoost(p1, p2) {
	if (p1 && p1.boosts && $('#StatBoostL').prop("checked")) {
		for (var stat in p1.boosts) {
			if (stat === 'hp') continue;
			p1.boosts[stat] = Math.min(6, p1.boosts[stat] + 1);
		}
	}
	if (p2 && p2.boosts && $('#StatBoostR').prop("checked")) {
		for (var stat in p2.boosts) {
			if (stat === 'hp') continue;
			p2.boosts[stat] = Math.min(6, p2.boosts[stat] + 1);
		}
	}
}

function calculateAllMoves(gen, p1, p1field, p2, p2field) {
	checkStatBoost(p1, p2);
	gen = getActiveCalcGeneration();
	var results = [[], []];
	for (var i = 0; i < 4; i++) {
		results[0][i] = calc.calculate(gen, p1, p2, p1.moves[i], p1field);
		results[1][i] = calc.calculate(gen, p2, p1, p2.moves[i], p2field);
	}
	return results;
}

$(".mode").change(function () {
	var params = new URLSearchParams(window.location.search);
	params.delete('mode');
	if (window.history && window.history.replaceState) {
		window.history.replaceState({}, document.title, window.location.pathname + (params.toString() ? '?' + params : ''));
	}
});

$(".notation").change(function () {
	performCalculations();
});

$(document).ready(function () {
	var params = new URLSearchParams(window.location.search);
	var m = params.get('mode');
	if (m) {
		params.delete('mode');
		if (window.history && window.history.replaceState) {
			window.history.replaceState({}, document.title, window.location.pathname + (params.toString() ? '?' + params : ''));
		}
	}

	var importParam = params.get('import');
	if (importParam) {
		try {
			var decodedImport = atob(importParam); // Decode base64
			$('.import-team-text').val(decodedImport); // Set value to text area
		} catch (e) {
			console.error('Failed to decode Import parameter:', e);
		}
	}

	$(".calc-trigger").bind("change keyup", PC_HANDLER);
	$(".slot-target-selector").change(PC_HANDLER);
	performCalculations();
});

function installMainResultCopy(resultSelector, tooltipSelector) {
	$(resultSelector).click(function () {
		navigator.clipboard.writeText($(resultSelector).text()).then(function () {
			var tooltip = document.querySelector(tooltipSelector);
			if (!tooltip) return;
			tooltip.style.visibility = 'visible';
			setTimeout(function () {
				tooltip.style.visibility = 'hidden';
			}, 1500);
		});
	});
}

/* Click-to-copy function */
installMainResultCopy("#mainResult", "#tooltipText");
installMainResultCopy("#mainResultSlot2", "#tooltipTextSlot2");
