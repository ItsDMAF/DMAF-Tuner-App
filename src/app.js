const noteDisplay = document.getElementById("note-display");

const standardTuning = [
  { note: "E", freq: 82.42 },
  { note: "A", freq: 110.0 },
  { note: "D", freq: 146.83 },
  { note: "G", freq: 196.0 },
  { note: "B", freq: 246.94 },
  { note: "e", freq: 329.63 },
];

const context = new (window.AudioContext || window.webkitAudioContext)();
const analyser = context.createAnalyser();
analyser.fftSize = 2048;
const buffer = new Float32Array(analyser.fftSize);

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    listen();
  })
  .catch((err) => {
    console.error("Microphone access denied or failed:", err);
    alert("Please allow microphone access to use the tuner.");
  });

let lastNote = null;
let stableNote = null;
let stableCount = 0;
const STABILITY_THRESHOLD = 5;

function listen() {
  analyser.getFloatTimeDomainData(buffer);
  const freq = autoCorrelate(buffer, context.sampleRate);

  if (freq !== -1) {
    const match = getClosestNote(freq);
    const diff = Math.abs(freq - match.freq);

    if (match.note === lastNote) {
      stableCount++;
    } else {
      stableCount = 0;
    }

    lastNote = match.note;

    if (stableCount >= STABILITY_THRESHOLD) {
      if (stableNote !== match.note) {
        stableNote = match.note;
        noteDisplay.textContent = match.note.toUpperCase();

        if (diff < 1) {
          noteDisplay.style.color = "rgba(125, 154, 191, 1)";
        } else if (diff < 5) {
          noteDisplay.style.color = "rgba(227, 195, 101, 1)";
        } else {
          noteDisplay.style.color = "rgba(200, 103, 96, 1)";
        }
      }
    }
  } else {
    lastNote = null;
    stableNote = null;
    stableCount = 0;
    noteDisplay.textContent = "--";
    noteDisplay.style.color = "rgba(231, 231, 231, 1)";
  }

  requestAnimationFrame(listen);
}

function getClosestNote(freq) {
  let closest = standardTuning[0];
  let minDiff = Math.abs(freq - closest.freq);
  for (let i = 1; i < standardTuning.length; i++) {
    const diff = Math.abs(freq - standardTuning[i].freq);
    if (diff < minDiff) {
      closest = standardTuning[i];
      minDiff = diff;
    }
  }
  return closest;
}

function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    let val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0,
    r2 = SIZE - 1,
    thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1,
    maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  if (maxpos === -1) return -1;

  return sampleRate / maxpos;
}
