import React, { Component } from 'react';
import cookie from 'react-cookies';
import './App.css';
import { Metamask, Gas, ContractLoader, Transactions, Events, Scaler, Blockie, Address, Button } from "dapparatus"
import Web3 from 'web3';
import NewChannel from './components/newChannel.js'
import ViewChannel from './components/viewChannel.js'
import Channels from './components/channels.js'


class App extends Component {
  constructor(props) {
    super(props);

    //load signer address from cookie or generate
    let metaPrivateKey = cookie.load('metaPrivateKey');
    let metaAccount;
    let tempweb3 = new Web3();
    if (metaPrivateKey) {
      metaAccount = tempweb3.eth.accounts.privateKeyToAccount(metaPrivateKey);
      console.log("Signing account already exists...",metaAccount)
    }else{
      metaAccount = tempweb3.eth.accounts.create();
      const expires = new Date();
      expires.setDate(expires.getDate() + 365);
      cookie.save('metaPrivateKey', metaAccount.privateKey, {
        path: '/',
        expires
      });
      console.log("Generated signing account...",metaAccount)
    }
    metaAccount.address = metaAccount.address.toLowerCase()

    //load open channel id from url if it exists
    let pathParts = window.location.pathname.split("/")
    pathParts = pathParts.filter(Boolean)
    console.log("pathParts",pathParts)
    let viewChannel = ""
    if(pathParts[0]&&pathParts[0].length==66){
      viewChannel = pathParts[0]
    }
    console.log("viewChannel:",viewChannel)

    this.state = {
      web3: false,
      account: false,
      gwei: 4,
      doingTransaction: false,
      metaAccount: metaAccount,
      viewChannel: viewChannel,
    }

    setTimeout(this.poll.bind(this),500)
    setInterval(this.poll.bind(this),1500)
  }
  async poll() {
    let {contracts,account} = this.state
    if(contracts&&account){
      this.setState({remainder:await contracts.MVPC.remainder(account).call()})
    }

  }
  render() {
    let {web3,account,contracts,tx,gwei,block,avgBlockTime,etherscan,viewChannel} = this.state
    let connectedDisplay = []
    let contractsDisplay = []
    if(web3){
      connectedDisplay.push(
       <Gas
         key="Gas"
         onUpdate={(state)=>{
           console.log("Gas price update:",state)
           this.setState(state,()=>{
             console.log("GWEI set:",this.state)
           })
         }}
       />
      )

      connectedDisplay.push(
        <ContractLoader
         key="ContractLoader"
         config={{DEBUG:true}}
         web3={web3}
         require={path => {return require(`${__dirname}/${path}`)}}
         onReady={(contracts,customLoader)=>{
           console.log("contracts loaded",contracts)
           this.setState({contracts:contracts},async ()=>{
             console.log("Contracts Are Ready:",this.state.contracts)
           })
         }}
        />
      )
      connectedDisplay.push(
        <Transactions
          key="Transactions"
          config={{DEBUG:false}}
          account={account}
          gwei={gwei}
          web3={web3}
          block={block}
          avgBlockTime={avgBlockTime}
          etherscan={etherscan}
          onReady={(state)=>{
            console.log("Transactions component is ready:",state)
            this.setState(state)
          }}
          onReceipt={(transaction,receipt)=>{
            // this is one way to get the deployed contract address, but instead I'll switch
            //  to a more straight forward callback system above
            console.log("Transaction Receipt",transaction,receipt)
          }}
        />
      )

      if(contracts){
        if(viewChannel){
          contractsDisplay.push(
            <div key="UI" style={{padding:30}}>
              VIEW CHANNEL:
              <ViewChannel {...this.state}/>
            </div>
          )
        }else{
          contractsDisplay.push(
            <div key="UI" style={{padding:30}}>
              <NewChannel {...this.state}/>
              <Channels {...this.state}/>
            </div>
          )
        }
        contractsDisplay.push(
          <Events
            config={{hide:false}}
            contract={contracts.MVPC}
            eventName={"Open"}
            block={block}
            onUpdate={(eventData,allEvents)=>{
              console.log("EVENT DATA:",eventData)
              this.setState({openEvents:allEvents})
            }}
          />
        )
        contractsDisplay.push(
          <Events
            config={{hide:false}}
            contract={contracts.MVPC}
            eventName={"Close"}
            block={block}
            onUpdate={(eventData,allEvents)=>{
              console.log("EVENT DATA:",eventData)
              this.setState({closeEvents:allEvents})
            }}
          />
        )
      }

    }

    let remainderBalance = ""
    if(this.state.web3&&this.state.remainder>0){

      let withdrawButton = (
        <Button size="2" onClick={async ()=>{

            tx(contracts.MVPC.withdraw(
              this.state.account,
              ""+this.state.remainder,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
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

      remainderBalance = (
        <div style={{float:'right'}}>
          Remainder: {this.state.web3.utils.fromWei(""+this.state.remainder,"ether")} ETH {withdrawButton}
        </div>
      )
    }
    return (
      <div className="App">
        <Metamask
          config={{requiredNetwork:['Unknown','Rinkeby']}}
          onUpdate={(state)=>{
           console.log("metamask state update:",state)
           if(state.web3Provider) {
             state.web3 = new Web3(state.web3Provider)
             this.setState(state)
           }
          }}
        />

        {connectedDisplay}
        {remainderBalance}
        {contractsDisplay}
      </div>
    );
  }
}

export default App;
