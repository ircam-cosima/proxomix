// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

const voices = ["drums", "bass", "harmony", "melody"];
const arrangements = [
  { bpm: 100, name: "hb" },
];

// [BPM]   [1/4 beat] [1/16 beat] [measure] [4 measures] [x 2.4]
// 66.67      0.90       0.23       3.60       14.40        6
// 100.00     0.60       0.15       2.40        9.60        4
// 133.33     0.45       0.11       1.80        7.20        3

const moreArrangements = [
  { bpm: 100, name: "ambient" },
  { bpm: 100, name: "celt" },
  { bpm: 100, name: "gadda" },
  { bpm: 100, name: "hb" },
  { bpm: 100, name: "metro" },
  { bpm: 100, name: "pseudopunk" },
  { bpm: 100, name: "technolounge" },
  { bpm: 133, name: "333" },
  { bpm: 133, name: "70s" },
  { bpm: 133, name: "ambient" },
  { bpm: 133, name: "garage" },
  { bpm: 133, name: "tec" },
  { bpm: 133, name: "technolounge" },
  { bpm: 133, name: "train" },
  { bpm: 66, name: "666" },
  { bpm: 66, name: "alt" },
  { bpm: 66, name: "ambient4" },
  { bpm: 66, name: "ambient" },
  { bpm: 66, name: "fel" },
  { bpm: 66, name: "fusion" },
  { bpm: 66, name: "metal" },
  { bpm: 66, name: "rag" },
];

// launch application when document is fully loaded
const init = () => {
  // configuration received from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const { appName, clientType, socketIO, assetsDomain, standalone, beaconUUID }  = window.soundworksConfig;
  // initialize the 'player' client
  soundworks.client.init(clientType, { appName, socketIO });
  soundworks.client.setViewContentDefinitions(viewContent);
  soundworks.client.setViewTemplateDefinitions(viewTemplates);

  const audioFiles = [];

  for(let arr of arrangements) {
    for(let voice of voices) {
      const fileName = `sounds/${arr.bpm}_${arr.name}_${voice}.mp3`;
      audioFiles.push(fileName);
    }
  }

  // create client side (player) experience
  const experience = new PlayerExperience(standalone,  assetsDomain, beaconUUID, audioFiles);

  // start the client
  soundworks.client.start();
};


if (!!window.cordova)
  document.addEventListener('deviceready', init);
else
  window.addEventListener('load', init);
