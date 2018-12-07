import React, { Component } from 'react';
import { Address, Button } from "dapparatus"

export default class NewChannel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      destination: "0x5f19cEfc9C9D1BC63f9e4d4780493ff5577D238B",
      timeout: 360,
      eth: 0.1,
    };
  }
  handleInput(e){
    let update = {}
    update[e.target.name] = e.target.value
    this.setState(update)
  }
  render() {
    let {tx,web3,contracts,metaAccount,remainder} = this.props
    let remainderDisplay = ""
    let remainderAmount = 0
    if(remainder>0){
      remainderAmount = remainder
      console.log("remainderAmount",remainderAmount,"this.state.eth",web3.utils.toWei(""+this.state.eth,"ether"))

      if(parseInt(remainderAmount) > parseInt(web3.utils.toWei(""+this.state.eth,"ether"))){
        console.log("REMAINDER IS BIGGER")
        remainderAmount = web3.utils.toWei(""+this.state.eth,"ether")
      }
      let leftover = web3.utils.toWei(""+this.state.eth,"ether") - remainderAmount

      remainderDisplay = (
        <div>
          (using remainder {web3.utils.fromWei(""+remainderAmount,"ether")} ETH and sending {web3.utils.fromWei(""+leftover,"ether")} ETH)
        </div>
      )
    }
    return (
      <div>
        <h2>Open Channel:</h2>
        Teacher Address:
        <input
            style={{verticalAlign:"middle",width:400,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
            type="text" name="destination" value={this.state.destination} onChange={this.handleInput.bind(this)}
        />
        Duration (s):
        <input
            style={{verticalAlign:"middle",width:100,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
            type="text" name="timeout" value={this.state.timeout} onChange={this.handleInput.bind(this)}
        />
        ETH:
        <input
            style={{verticalAlign:"middle",width:100,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
            type="text" name="eth" value={this.state.eth} onChange={this.handleInput.bind(this)}
        />
        {remainderDisplay}
        <div>
          <Button color="green" size="2" onClick={()=>{
              this.setState({doingTransaction:true})
              tx(contracts.MVPC.open(
                metaAccount.address,
                this.state.destination,
                this.state.timeout,
                remainderAmount,
              ),160000,0,web3.utils.toWei(""+this.state.eth,"ether")-remainderAmount,(receipt)=>{
                if(receipt){
                  console.log("CHANNEL CREATED:",receipt)
                }
              })
            }}>
            Create
          </Button>
        </div>
      </div>
    )
  }
}
