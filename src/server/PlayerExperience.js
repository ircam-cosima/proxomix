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
    this.players = new Array();
  }

  // if anything needs to append when the experience starts
  start() {}

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
  enter(client) {
    super.enter(client);

    this.players.push(client);

    if (this.players.length == 1){
      this.send(this.players[0], 'status', 0);
    }
    else{
      this.send(client, 'status', 1);
    }
    this.receive(client, 'shake', (beaconInfos, when) => {
      console.log(beaconInfos, when)
      this.broadcast('player', client, 'shaked', beaconInfos, when);
    });

  }

  exit(client) {
    super.exit(client);

    console.log('++',this.players.length);
    this.players.forEach((elmt, index) => { console.log(elmt.uuid); });

    var repoll = false
    if (client == this.players[0]) {repoll = true;}

    this.players.forEach((elmt, index) => {
      if (elmt == client) { this.players.splice(index,1); }
    });

    if (repoll && this.players.length != 0) {
      // var rndm = Math.floor(Math.random() * this.players.length);
      // this.players[0] = this.players[rndm];
      // this.players.splice(rndm,1);
      this.send(this.players[0], 'status', 0);
    }

    console.log('--',this.players.length);
    this.players.forEach((elmt, index) => { console.log(elmt.uuid); });

    // // repoll for master if need be
    // if (client == this.players[0] && this.players.length != 1){
    //   var rndm = Math.floor(Math.random() * (this.players.length-1)) + 1;
    //   // console.log('aa->',this.players.length, rndm);
    //   // this.players.forEach((elmt, index) => {
    //   //   console.log(elmt.uuid);
    //   // });
    //   this.players[0] = this.players[rndm];
    //   this.players.splice(rndm,1);
    //   // console.log('pp->',this.players.length);
    //   // this.players.forEach((elmt, index) => {
    //   //   console.log(elmt.uuid);
    //   // });
    //   this.send(this.players[0], 'status', 0);

    // }

    // remove from array
    // console.log('++',this.players.length);
    // this.players.forEach((elmt, index) => {
    //   console.log(elmt.uuid);
    // });
    // var filtered = this.players.filter(function(el) { return el != client; });
    // console.log('--',this.players.length);
    // this.players.forEach((elmt, index) => {
    //   console.log(elmt.uuid);
    // });
  }
}
