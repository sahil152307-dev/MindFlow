// Generates a fake "study notes" JPEG to test the VLM proof verification
const sharp = require("sharp");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <rect width="800" height="600" fill="#fdfaf2"/>
  <rect x="30" y="30" width="740" height="540" rx="14" fill="#ffffff" stroke="#e5ddcc" stroke-width="2"/>
  <line x1="90" y1="30" x2="90" y2="570" stroke="#f2c9c0" stroke-width="2"/>
  <g stroke="#5a5248" stroke-width="3" stroke-linecap="round">
    <line x1="120" y1="90" x2="560" y2="90"/>
    <line x1="120" y1="130" x2="520" y2="130"/>
    <line x1="120" y1="170" x2="600" y2="170"/>
    <line x1="120" y1="210" x2="430" y2="210"/>
    <line x1="120" y1="280" x2="580" y2="280"/>
    <line x1="120" y1="320" x2="490" y2="320"/>
    <line x1="120" y1="360" x2="620" y2="360"/>
    <line x1="120" y1="430" x2="540" y2="430"/>
    <line x1="120" y1="470" x2="510" y2="470"/>
  </g>
  <text x="120" y="520" font-family="Georgia, serif" font-size="26" fill="#4a7c59">Working memory notes — done for today ✓</text>
</svg>`;

sharp(Buffer.from(svg))
  .jpeg({ quality: 80 })
  .toFile("/tmp/notes-proof.jpg")
  .then(() => console.log("saved /tmp/notes-proof.jpg"));
