// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 Matroskin
"use strict";

const fs = require("fs");
const path = require("path");

// Keep the directory structure so relative links between notices still resolve.
const noticeFiles = [
  "LICENSE", "LICENSING.md", "CREDITS.md", "THIRD_PARTY_NOTICES.md",
  "calc/LICENSE", "import/LICENSE", "import/THIRD_PARTY_NOTICES.md",
  "installer/windows/LICENSE", "installer/windows/README.md"
];

function copyDistributionLicenses(root, destination) {
  const copy = relative => {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(root, relative), target);
  };
  noticeFiles.forEach(copy);
  // calc/LICENSE is a Git symlink. Windows checkouts may materialize its target
  // as a text file; always ship the full retained MIT text, not that path string.
  fs.copyFileSync(path.join(root, "LICENSES", "MIT-legacy.txt"),
    path.join(destination, "calc", "LICENSE"));
  for (const name of fs.readdirSync(path.join(root, "LICENSES")).sort()) {
    if (fs.statSync(path.join(root, "LICENSES", name)).isFile()) copy("LICENSES/" + name);
  }

  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
  const packages = [];
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (!location || entry.dev) continue;
    if (!location.startsWith("node_modules/") || location.split("/").includes("..")) {
      throw new Error("Unexpected production dependency path: " + location);
    }
    const directory = path.join(root, location);
    const pkg = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
    if (pkg.version !== entry.version) throw new Error("Dependency version mismatch: " + location);
    const notices = fs.readdirSync(directory).filter(name =>
      /^(licen[sc]e|copying|notice|copyright)([._-]|$)/i.test(name) &&
      fs.statSync(path.join(directory, name)).isFile()
    );
    if (!notices.length) {
      // This exact upstream release declares MIT but contains no license file.
      // Preserve its declaration and the separately documented MIT text.
      if (pkg.name !== "lazy-val" || pkg.version !== "1.0.5" || pkg.license !== "MIT") {
        throw new Error("No production dependency license found: " + location);
      }
      notices.push("package.json");
    }
    // Preserve names, nested dependency identity, and the complete original texts.
    notices.forEach(name => copy(location + "/" + name));
    packages.push({name: pkg.name, version: pkg.version, license: pkg.license, location, notices});
  }
  fs.writeFileSync(path.join(destination, "production-dependencies.json"),
    JSON.stringify(packages, null, 2) + "\n");
  return packages.length;
}

module.exports = {copyDistributionLicenses};
