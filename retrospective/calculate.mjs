import fs from "fs";

const csv = fs.readFileSync("CSV/TR04.csv", "utf-8"); // reads csv
const lines = csv.split("\n").slice(1); // salta l’intestazione

const estimated = [];
const actual = [];

for (const line of lines) { // clean up
  if (!line.trim()) continue; 
  const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").trim());

  // colonna 3 → "Estimation time", colonna 4 → "Spent time"
  const est = parseFloat(cols[3]);
  const act = parseFloat(cols[4]);

  if (!isNaN(est) && !isNaN(act)) {
    estimated.push(est);
    actual.push(act);
  }
}

// show the result
//console.log("Estimated:", estimated);
//console.log("Actual:", actual);

const sum = arr => arr.reduce((a, b) => a + b, 0);

// Funzione per calcolare media
function mean(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// Funzione per calcolare deviazione standard
function stdev(arr) {
  const avg = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (arr.length);
  return Math.sqrt(variance);
}

// Total Estimation Error Ratio
function totalEstimationErrorRatio(spent, estimated) {
  const ratio = sum(spent) / sum(estimated) - 1;
  return ratio; // valore frazionario (es. 0.1 = +10%)
}

// Absolute Relative Task Estimation Error
function absoluteRelativeTaskEstimationError(spent, estimated) {
  const n = spent.length;
  const total = spent.reduce((acc, val, i) => {
    return acc + Math.abs(val / estimated[i] - 1);
  }, 0);
  return total / n; // valore medio assoluto percentuale
}

// Calcoli
const lenghtEst = estimated.length;
const meanEst = mean(estimated);
const stdevEst = stdev(estimated);         

const lenghtAct = actual.length;
const meanAct = mean(actual);
const stdevAct = stdev(actual);

// Output
console.log("\n\n=== Estimated ===");
console.log("Number of tasks:",lenghtEst);
console.log("Media:", meanEst.toFixed(2), "hours");
console.log("Dev st:", stdevEst.toFixed(2));

console.log("\n=== Actual ===");
console.log("Number of tasks:",lenghtAct);
console.log("Media:", meanAct.toFixed(2), "hours");
console.log("Dev st:", stdevAct.toFixed(2));

// Calcolo
const teer = totalEstimationErrorRatio(actual, estimated);
const artee = absoluteRelativeTaskEstimationError(actual, estimated);

// Output
console.log("\nTotal Estimation Error Ratio:", (teer * 100).toFixed(2) + "%");
console.log("Absolute Relative Task Estimation Error:", (artee * 100).toFixed(2) + "%\n");