import React, { Component } from 'react';
import { Address, Button } from "dapparatus"


import axios from 'axios';

const SEND_SIG_EVERY = 15



/*
const Room = require('ipfs-pubsub-room')
const IPFS = require('ipfs')
const ipfs = new IPFS({
  //repo: './ipfs',
  EXPERIMENTAL: {
    pubsub: true
  },
  config: {
    Addresses: {
        Swarm: [
        '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
      ]
    }
  }
})
*/

export default class ViewChannel extends Component {

  constructor(props) {
    super(props);

    this.state = {
      destination: "0x5f19cEfc9C9D1BC63f9e4d4780493ff5577D238B",
      timeout: 3000,
      eth: 0.02,
      addRemainder:0,
      ownerMode:0,
      ownerSend:0,
      lastSent:0,
      lastMessage:{},
      //ipfs: Room(ipfs,props.viewChannel),
      //ipfsSigs: Room(ipfs,props.viewChannel+"Sigs"),
    };
    setTimeout(this.poll.bind(this),500)
    setInterval(this.poll.bind(this),1500)
  }
  async poll() {
    let {viewChannel,contracts,account} = this.props
    let channel = await contracts.MVPC.sessions(viewChannel).call()
    console.log("POLLLL",channel,account)
    this.setState({channel})
    if(channel.status==2){
      return;
    }
    if(channel&&channel.destination.toLowerCase()==account){
      console.log("polling for sig...",viewChannel)
      axios.get('http://0.0.0.0:9999/sig/'+viewChannel, {
        headers: {
            'Content-Type': 'application/json',
        }
      }).then(async (response)=>{
        console.log("GOT SIG RESULT",response.data)
        if(response&&response.data){
          let valid = await contracts.MVPC.isSignatureValid(response.data.id,""+response.data.value,response.data.sig).call()
          console.log("is valid",valid)
          if(valid){
            if(!this.state.bestSig || this.state.bestSig.value<response.data.value){
              this.setState({bestSig:response.data})
            }
          }
        }
      })
      .catch((error)=>{
        console.log(error);
      });
    }
    if(this.state.ownerSend==0){
      //TODO THIS SHOULD GET BLOCKCHAIN TIME NOT LOCAL
      let timeleft = Math.round(channel.timeout-Date.now()/1000)
      let ownerSend = Math.round((this.props.web3.utils.fromWei(channel.stake,"ether") / (timeleft/60) )*10000)/10000
      this.setState({ownerSend})
    }else if(this.state.ownerMode==1){
      console.log("we need to be sending ",this.state.ownerSend,"per minute")
      if( Date.now() >= this.state.lastSent+(SEND_SIG_EVERY*1000) ){
        console.log("time for a new sig...")
        let id = this.props.viewChannel
        let value = parseInt(this.props.web3.utils.toWei(""+(this.state.ownerSend),"ether"))
        value = value * SEND_SIG_EVERY / 60
        if(this.state.lastMessage.value){
          value += parseInt(this.state.lastMessage.value)
        }
        let hash = await contracts.MVPC.getHash(id,""+value).call()
        console.log("id",id,"value",value,"hash",hash)
        let sig = this.props.web3.eth.accounts.sign(hash, this.props.metaAccount.privateKey)
        sig = sig.signature
        console.log("sig",sig)
        let valid = await contracts.MVPC.isSignatureValid(id,""+value,sig).call()
        console.log("is valid",valid)

        let lastMessage = {
          valid,
          id,
          value,
          hash,
          sig
        }
        //SEND IT
        axios.post('http://0.0.0.0:9999/sig', lastMessage, {
          headers: {
              'Content-Type': 'application/json',
          }
        }).then((response)=>{
          console.log("SIG RESULT",response.data)
        })
        .catch((error)=>{
          console.log(error);
        });
        //save state
        let lastSent = Date.now()
        this.setState({lastSent,lastMessage})

      }

    }

  }
  handleInput(e){
    let update = {}
    update[e.target.name] = e.target.value
    this.setState(update)
  }
  render() {
    let {tx,web3,contracts,metaAccount,account} = this.props
    let {channel,viewChannel,ownerMode} = this.state
    if(!channel){
      return (
        <div>
          loading...
        </div>
      )
    }

    let ownerDisplay = ""
    if(channel.destination.toLowerCase()==account){
      if(!this.state.bestSig){
        ownerDisplay = (
          <div>
            Waiting for signature from student...
          </div>
        )
      }else{
        ownerDisplay = (
          <div style={{border:"1px solid #55dd55",color:"#FFFFFF",margin:10,padding:10}}>
            {web3.utils.fromWei(""+this.state.bestSig.value,"ether")} ETH
              <Button size="2" onClick={async ()=>{
                  let hash = await contracts.MVPC.getHash(this.state.bestSig.id,""+this.state.bestSig.value).call()

                  console.log("id",this.state.bestSig.id,"value",this.state.bestSig.value,"hash",hash)
                  let receiverSig = await this.props.web3.eth.personal.sign(""+hash,this.props.account)
                  console.log("sig with account ",this.props.account,"is",receiverSig)
                  setTimeout(()=>{
                    tx(contracts.MVPC.close(
                      this.state.bestSig.id,
                      ""+this.state.bestSig.value,
                      this.state.bestSig.sig,
                      receiverSig,
                    ),260000,0,0,(receipt)=>{
                      if(receipt){
                        console.log("SESSION CLOSED:",receipt)
                        //window.location = "/"+receipt.contractAddress
                      }
                    })
                  },500)
                }}
              >
                Claim
              </Button>
          </div>
        )
      }


    }else if(channel.owner.toLowerCase()==account){
      if(ownerMode==0){
        ownerDisplay = (
          <div>
            Send <input
                style={{verticalAlign:"middle",width:100,margin:6,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
                type="text" name="ownerSend" value={this.state.ownerSend} onChange={this.handleInput.bind(this)}
            /> ETH/m
            <div>
              <Button size="2" onClick={()=>{
                  this.setState({ownerMode:1})
                }}
              >
                Start
              </Button>
            </div>
          </div>

        )
      }else{

        if(this.state.lastMessage&&this.state.lastMessage.value){
          let validColor = "1px solid #dd5555"
          if(this.state.lastMessage.valid){
            validColor = "1px solid #55dd55"
          }
          ownerDisplay = (
            <div>
              Sending {this.state.ownerSend} ETH/m
              <div style={{fontSize:12,padding:10,margin:10,border:validColor}}>
                {Date.now()-this.state.lastSent} - {this.state.lastMessage.id}
                <div>
                  <span style={{color:"#FFFFFF",padding:5}}>
                    {web3.utils.fromWei(""+this.state.lastMessage.value,"ether")} ETH
                  </span>
                  {this.state.lastMessage.hash} {this.state.lastMessage.sig}
                </div>
              </div>
            </div>
          )
        }else {
          ownerDisplay = (
            <div>
              waiting for first signature...
            </div>
          )
        }
      }
    }

    //TODO, you will want to get blockchain timestamp not local
    let timeleft = Math.round(channel.timeout-Date.now()/1000)

    let withdrawButton = ""
    if(timeleft<=0){
        //withdraw(address toAddress,uint256 amount,bytes32 optionalId)
      withdrawButton = (
        <Button size="2" onClick={async ()=>{

            tx(contracts.MVPC.withdraw(
              this.props.account,
              ""+channel.stake,
              this.props.viewChannel
            ),120000,0,0,(receipt)=>{
              if(receipt){
                console.log("SESSION WITHDRAWN:",receipt)
                //window.location = "/"+receipt.contractAddress
              }
            })

          }}
        >
          Withdraw
        </Button>
      )
    }

    if(channel.status==2){
      return (
        <div>
          <div>Channel {viewChannel}</div>
          <div>Owner {channel.owner}</div>
          <div>Signer {channel.signer}</div>
          <div>Destination {channel.destination}</div>
          <div>Status: Closed</div>
        </div>
      )
    }else {

      return (
        <div>
          <div>Channel {viewChannel}</div>
          <div>Owner {channel.owner}</div>
          <div>Signer {channel.signer}</div>
          <div>Destination {channel.destination}</div>
          <div>Status {channel.status}</div>
          <div>Timeout {timeleft}(s) {withdrawButton}</div>
          <div>Stake {web3.utils.fromWei(channel.stake,"ether")} ETH</div>
          {ownerDisplay}
        </div>
      )
    }

  }
}
