const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "../dash_pdf_components/proptypes.js");
let source = fs.readFileSync(file, "utf8");

for (const name of ["data-*", "aria-*"]) {
  const unquoted = ` ${name}:`;
  if (!source.includes(unquoted)) {
    throw new Error(`Expected generated prop ${name} in proptypes.js`);
  }
  source = source.replace(unquoted, ` '${name}':`);
}

fs.writeFileSync(file, source);
