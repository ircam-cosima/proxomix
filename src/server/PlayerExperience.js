import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // services
    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.sync = this.require('sync');

    // local attributes
    const numClientMax = 5;
    this.players = new Array(numClientMax);
  }

  // if anything needs to append when the experience starts
  start() {}

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
  enter(client) {
    super.enter(client);

    // find room for client in local list
    var emptyInd = this.findFirstEmpty(this.players);
    if (emptyInd < 0) emptyInd = this.players.length;
      // add client in local list
      this.players[emptyInd] = client.uuid;
      // define client beacon parameters
      var beaconInfo = {
        major: 0,
        minor: emptyInd
      };
      // send beacon setup info to client
      this.send(client, 'player:beacon', beaconInfo);
      console.log('welcoming client:', emptyInd, this.players[emptyInd]);
  }

  exit(client) {
    super.exit(client);

    var elmtPos = this.players.map((x) => {
      return x;
    }).indexOf(client.uuid);
    console.log('removing client:', elmtPos, this.players[elmtPos]);
    // this.players.splice(elmtPos, 1);
    this.players[elmtPos] = null; // can't use splice, have to keep index consistent since it points to clients' beacon minor IDs.
  }

  findFirstEmpty(array) {
    var emptyInd = -1;
    for (var i = 0; i < array.length; i++) {
      if (array[i] == null) {
        emptyInd = i;
        break;
      }
    }
    return emptyInd;
  }
}
