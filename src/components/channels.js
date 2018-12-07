import React, { Component } from 'react';
import { Address, Blockie, Scaler } from "dapparatus"

export default class Channels extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
    setTimeout(this.poll.bind(this),500)
    setInterval(this.poll.bind(this),1500)
  }
  async poll() {
    let {openEvents,contracts} = this.props
    if(contracts){
      let channels = this.state.channels
      if(!channels) channels={}
      for(let e in openEvents){
        channels[openEvents[e].id] = await contracts.MVPC.sessions(openEvents[e].id).call()
      }
      this.setState({channels:channels})
    }
  }
  render() {
    let {channels} = this.state
    let channelsDisplay = []
    for(let c in channels){
      channelsDisplay.push(
        <div key={c}>
          <div style={{fontSize:12}}>
            {channels[c].status},
            <a href={"/"+c}>{c}</a>,
            {channels[c].owner},
            {channels[c].signer},
            {channels[c].destination},
            {channels[c].timeout},
            {channels[c].stake},
          </div>
        </div>
      )

    }
    return (
      <div>
        <h2>Channels</h2>
        {channelsDisplay}
      </div>
    )
  }
}
