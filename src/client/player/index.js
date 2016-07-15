// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';


// list of files to load (passed to the experience)
const audioFiles = [
{ 'fileName' : 'sounds/Basse.wav',
  'gain'     : 1.3,
},
{ 'fileName' : 'sounds/BasseCountry.wav',
  'gain'     : 1.0,
},
{ 'fileName' : 'sounds/Bongo.wav',
  'gain'     : 0.7,
},
{ 'fileName' : 'sounds/GuitarSolo.wav',
  'gain'     : 0.5,
},
{ 'fileName' : 'sounds/shaker.wav',
  'gain'     : 1.0,
},
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

  // create client side (player) experience
  const experience = new PlayerExperience(standalone,  assetsDomain, beaconUUID, audioFiles);

  // start the client
  soundworks.client.start();
};


if (!!window.cordova)
  document.addEventListener('deviceready', init);
else
  window.addEventListener('load', init);
