import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);
    // services
    this.checkin = this.require('checkin');
    this.sync = this.require('sync');
  }

  // if anything needs to append when the experience starts
  start() {}

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
  enter(client) {
    super.enter(client);
    // add callback used to spread current client orientation for sound effect
    this.receive(client, 'soundEffect1Value', (val) => {
      this.broadcast('player', client, 'soundEffect1Bundle', client.index, val);
    });
  }

  exit(client) {
    super.exit(client);
  }
}
