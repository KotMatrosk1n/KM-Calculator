#!/usr/bin/env node
import {spawnSync} from "child_process";
import fs from "fs";
import path from "path";
import vm from "vm";

const rootDir = process.cwd();
const scratchRoot = process.env.SWSH_AI_RESEARCH_ROOT || "";
const romfsRoot = process.env.SWSH_ROMFS_ROOT || "";
const scriptRoot = process.env.SWSH_AI_SCRIPT_ROOT || path.join(romfsRoot, "bin", "battle", "ai_script");
const nameIndexPath = path.join(scratchRoot, "vanilla_name_index.json");
const saveTextPath = path.join(rootDir, "src", "js", "data", "save_import_text.js");
const outputPath = path.join(rootDir, "src", "js", "data", "swsh_ai_data.js");

if (!scratchRoot || !romfsRoot) {
	console.error("Set SWSH_AI_RESEARCH_ROOT and SWSH_ROMFS_ROOT before regenerating Sw/Sh AI data.");
	console.error("The checked-in swsh_ai_data.js bundle is already self-contained for normal calculator use.");
	process.exit(1);
}

function readSaveImportText() {
	const text = fs.readFileSync(saveTextPath, "utf8");
	const sandbox = {window: {}};
	vm.runInNewContext(text, sandbox, {filename: saveTextPath});
	return sandbox.window.SAVE_IMPORT_TEXT || {};
}

function normalizeName(value) {
	return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function compactNameIndex(nameIndex, saveImportText) {
	const moveIndex = {};
	const itemIndex = {};
	const abilityIndex = {};
	const speciesIndex = {};
	const seenMoves = {};
	const seenItems = {};
	const itemsById = {};

	(nameIndex.moves || []).forEach(move => {
		const key = normalizeName(move.name);
		if (!key || seenMoves[key]) return;
		seenMoves[key] = true;
		moveIndex[key] = {
			id: move.id | 0,
			name: move.name,
			type: move.type | 0,
			typeName: move.type_name || "",
			category: move.category | 0,
			power: move.power | 0,
			effect: move.effect_sequence | 0,
			priority: move.priority | 0,
			target: move.target | 0
		};
	});

	(nameIndex.items || []).forEach(item => {
		itemsById[item.id | 0] = item;
	});

	(saveImportText.items || []).forEach((name, id) => {
		const key = normalizeName(name);
		const item = itemsById[id] || {id: id, name: name};
		if (!key || seenItems[key]) return;
		seenItems[key] = true;
		itemIndex[key] = {
			id: item.id | 0,
			name: name || item.name || "",
			flingPower: item.fling_power | 0,
			holdEffect: item.hold_effect | item.effect | 0,
			holdEffectValue: item.hold_effect_value | 0,
			itemType: typeof item.item_type === "number" ? item.item_type : 0,
			groupType: typeof item.group_type === "number" ? item.group_type : 0,
			category: typeof item.category === "number" ? item.category : (typeof item.group_type === "number" ? item.group_type : 0),
			pouch: typeof item.pouch === "number" ? item.pouch : 0,
			canUseOnPokemon: !!item.can_use_on_pokemon
		};
	});

	(saveImportText.abilities || []).forEach((name, id) => {
		const key = normalizeName(name);
		if (key) abilityIndex[key] = id;
	});
	(saveImportText.species || []).forEach((name, id) => {
		const key = normalizeName(name);
		if (key) speciesIndex[key] = id;
	});

	return {
		moveIndex: moveIndex,
		itemIndex: itemIndex,
		abilityIndex: abilityIndex,
		speciesIndex: speciesIndex
	};
}

const pythonSource = String.raw`
import json
import pathlib
import struct
import sys

scratch_root = pathlib.Path(sys.argv[1])
script_root = pathlib.Path(sys.argv[2])
name_index_path = pathlib.Path(sys.argv[3])
romfs_root = pathlib.Path(sys.argv[4])
sys.path.insert(0, str(scratch_root))
import amx_tools

scripts = {
    "allowance": "btl_ai_allowance.amx",
    "basic": "btl_ai_basic.amx",
    "double": "btl_ai_double.amx",
    "expert": "btl_ai_expert.amx",
    "raid": "btl_ai_raid.amx",
    "strong": "btl_ai_strong.amx",
    "honoo_gym_rival": "btl_ai_honoo_gym_rival.amx",
    "honoo_gym_staff": "btl_ai_honoo_gym_staff.amx",
    "honoo_gym_yell": "btl_ai_honoo_gym_yell.amx",
    "jk3_ookami": "btl_ai_jk3_ookami.amx",
    "item": "btl_ai_item.amx",
    "honoo_gym_item": "btl_ai_honoo_gym_item.amx",
    "pokechange": "btl_ai_pokechange.amx",
}

branch_ops = {
    "CALL", "JUMP", "JREL", "JZER", "JNZ", "JEQ", "JNEQ", "JLESS", "JLEQ",
    "JGRTR", "JGEQ", "JSLESS", "JSLEQ", "JSGRTR", "JSGEQ",
}

def read_u8(data, offset):
    return data[offset]

def read_i8(data, offset):
    value = data[offset]
    return value - 0x100 if value >= 0x80 else value

def parse_items_from_romfs():
    path = romfs_root / "bin" / "pml" / "item" / "item.dat"
    if not path.exists():
        return {}
    data = path.read_bytes()
    if len(data) < 0x44:
        return {}
    item_count = struct.unpack_from("<H", data, 0)[0]
    max_row_index = struct.unpack_from("<H", data, 0x04)[0]
    rows_start = struct.unpack_from("<i", data, 0x40)[0]
    if rows_start < 0x44:
        return {}
    result = {}
    for item_id in range(item_count):
        row_index = struct.unpack_from("<H", data, 0x44 + (item_id * 2))[0]
        if row_index >= max_row_index:
            continue
        row = rows_start + (row_index * 0x30)
        group_type = read_u8(data, row + 0x1C)
        result[item_id] = {
            "hold_effect": read_u8(data, row + 0x0C),
            "effect": read_u8(data, row + 0x0C),
            "hold_effect_value": read_i8(data, row + 0x0D),
            "fling_power": read_u8(data, row + 0x12),
            "item_type": read_u8(data, row + 0x16),
            "group_type": group_type,
            "category": group_type,
            "pouch": read_u8(data, row + 0x11) & 0x0F,
            "can_use_on_pokemon": read_u8(data, row + 0x15) == 1,
        }
    return result

def parse_case_table(amx, pc):
    cells = amx.code_cells
    count = int(cells[pc + 1])
    default_pc = (pc + 1) + int(cells[pc + 2]) // amx.header.cell_size
    cases = []
    cursor = pc + 3
    for _ in range(count):
        value = int(cells[cursor])
        target_pc = (cursor + 1) + int(cells[cursor + 1]) // amx.header.cell_size
        cases.append([value, target_pc])
        cursor += 2
    return {"default": default_pc, "cases": cases}

def compact_program(key, filename):
    path = script_root / filename
    if not path.exists():
        raise SystemExit(f"missing AMX script: {path}")
    amx = amx_tools.decode_amx(path)
    instrs = amx_tools.disassemble(amx.code_cells)
    bounds = amx_tools.proc_bounds(instrs)
    wrappers = {
        str(pc): native_index
        for pc, native_index in amx_tools.identify_native_wrappers(instrs).items()
        if pc in bounds and bounds[pc][1] - bounds[pc][0] <= 64
    }
    switch_tables = {}
    rows = []
    for ins in instrs:
        row = [ins.pc, int(ins.opcode), list(ins.operands), int(ins.size)]
        target = ins.relative_target_pc()
        if target is not None:
            row.append(target)
        if ins.name == "SWITCH":
            table_addr = ins.address + int(ins.operands[0])
            switch_tables[str(ins.pc)] = parse_case_table(amx, table_addr // amx.header.cell_size)
        rows.append(row)
    return {
        "cellSize": amx.header.cell_size,
        "dataCells": amx.data_cells,
        "bounds": {str(pc): [lo, hi] for pc, (lo, hi) in bounds.items()},
        "wrappers": wrappers,
        "switchTables": switch_tables,
        "instructions": rows,
    }

name_index = json.loads(name_index_path.read_text(encoding="utf-8"))
romfs_items = parse_items_from_romfs()
for item in name_index.get("items", []):
    extra = romfs_items.get(int(item.get("id", 0)))
    if extra:
        item.update(extra)

payload = {
    "version": 1,
    "source": {
        "research": "local Sword/Shield AI research",
        "game": "Pokemon Sword/Shield 1.3.2",
        "scripts": "vanilla Sword/Shield AI AMX"
    },
    "opcodes": amx_tools.OPCODES,
    "scripts": {key: compact_program(key, filename) for key, filename in scripts.items()},
    "nameIndex": name_index,
}

print(json.dumps(payload, separators=(",", ":")))
`;

fs.mkdirSync(path.dirname(outputPath), {recursive: true});

const result = spawnSync("python", [
	"-c",
	pythonSource,
	scratchRoot,
	scriptRoot,
	nameIndexPath,
	romfsRoot
], {
	encoding: "utf8",
	maxBuffer: 96 * 1024 * 1024
});

if (result.status !== 0) {
	process.stderr.write(result.stderr || result.stdout || "Failed to generate Sw/Sh AI data.\n");
	process.exit(result.status || 1);
}

const generated = JSON.parse(result.stdout);
const saveImportText = readSaveImportText();
const indexes = compactNameIndex(generated.nameIndex, saveImportText);
delete generated.nameIndex;
generated.moveIndex = indexes.moveIndex;
generated.itemIndex = indexes.itemIndex;
generated.abilityIndex = indexes.abilityIndex;
generated.speciesIndex = indexes.speciesIndex;

const dataText = [
	"/* eslint-disable */",
	"var SWSH_AI_DATA = " + JSON.stringify(generated) + ";",
	"if (typeof window !== \"undefined\") window.SWSH_AI_DATA = SWSH_AI_DATA;",
	""
].join("\n");

fs.writeFileSync(outputPath, dataText, "utf8");
console.log("Generated " + path.relative(rootDir, outputPath).replace(/\\/g, "/"));
