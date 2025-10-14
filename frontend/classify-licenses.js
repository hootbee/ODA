const fs = require("fs");
const data = JSON.parse(fs.readFileSync("licenses.json", "utf-8"));

const groups = {
    permissive: [],
    weak: [],
    strong: [],
    proprietary: [],
};

const perms = ["MIT","ISC","BSD","Apache","CC0","Unlicense","BlueOak","0BSD"];
const weak  = ["MPL","LGPL","EPL"];
const strong= ["GPL","AGPL"];
const proprietary = ["UNLICENSED","BUSINESS","CPOL","Proprietary"];

for (const [pkg, info] of Object.entries(data)) {
    const lic = info.licenses || "";
    const key = lic.toUpperCase();
    if (perms.some(l=>key.includes(l))) groups.permissive.push(pkg);
    else if (weak.some(l=>key.includes(l))) groups.weak.push(pkg);
    else if (strong.some(l=>key.includes(l))) groups.strong.push(pkg);
    else if (proprietary.some(l=>key.includes(l))) groups.proprietary.push(pkg);
}

fs.writeFileSync("LICENSE_SUMMARY.md", `
# Third Party License Summary

## ✅ Permissive (${groups.permissive.length})
${groups.permissive.join("\n")}

## ⚠️ Weak Copyleft (${groups.weak.length})
${groups.weak.join("\n")}

## 🚨 Strong Copyleft (${groups.strong.length})
${groups.strong.join("\n")}

## 🚧 Proprietary / Custom (${groups.proprietary.length})
${groups.proprietary.join("\n")}
`);