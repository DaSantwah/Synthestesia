// Mock Hydra globals
global.audioBass = 0.5; global.audioMid = 0.5; global.audioHigh = 0.5; global.audioVol = 0.5;
global.audioSub = 0.5; global.audioLowMid = 0.5; global.audioPresence = 0.5; global.audioBrilliance = 0.5;
global.audioBeat = 0; global.audioBeatMid = 0; global.time = 1.0;
global.window = { colorH: 200, colorS: 50, colorL: 50, innerHeight: 1080, innerWidth: 1920 };

// Mock Hydra functions
const dummyObj = {
  out: () => {}, modulate: () => dummyObj, rotate: () => dummyObj, colorama: () => dummyObj,
  color: () => dummyObj, scale: () => dummyObj, blend: () => dummyObj, modulateRotate: () => dummyObj,
  kaleid: () => dummyObj, diff: () => dummyObj, add: () => dummyObj, scrollX: () => dummyObj,
  scrollY: () => dummyObj, modulateScale: () => dummyObj, modulateScrollY: () => dummyObj,
  luma: () => dummyObj, repeat: () => dummyObj, thresh: () => dummyObj, mult: () => dummyObj
};

['osc', 'noise', 'voronoi', 'shape', 'src'].forEach(fn => global[fn] = () => dummyObj);
global.s0 = {}; global.o0 = {};

// Load controller
import fs from 'fs';
import vm from 'vm';
const code = fs.readFileSync('hydra-controller.js', 'utf-8')
  .replace('export class HydraController', 'class HydraController')
  + '\nglobal.HydraController = HydraController;';
vm.runInThisContext(code);

const ctrl = new HydraController();
ctrl.currentPreset = 0;

let fails = 0;
let successes = 0;

for (let t = 1; t <= 5; t++) {
  console.log(`\n--- Test Cycle ${t} ---`);
  let cycleSuccess = true;
  
  for (let i = 0; i < 16; i++) {
    try {
      ctrl.applyPreset(i);
    } catch (e) {
      console.error(`Error in Preset ${i}:`, e.message);
      cycleSuccess = false;
    }
  }
  
  if (cycleSuccess) {
    console.log(`Cycle ${t} Passed: All 16 presets executed without runtime errors.`);
    successes++;
  } else {
    console.log(`Cycle ${t} Failed.`);
    fails++;
  }
  
  if (fails >= 3) {
    console.error(`\nTest stopped! 3 failures detected. Revision required.`);
    process.exit(1);
  }
}

if (successes >= 4) {
  console.log(`\nSUCCESS: Passed ${successes} out of 5 tests. Updating repo is permitted.`);
  process.exit(0);
} else {
  console.log(`\nFAILED: Not enough passes.`);
  process.exit(1);
}
