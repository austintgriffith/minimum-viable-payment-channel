pragma solidity ^0.4.24;

/*
minimum viable payment channel

A student coder offers to pay a set rate of ETH per minute for help
with a problem or specific programming issue from an interface on Gitcoin.
An email blast goes out to all possible teachers, one accepts the rate, and
they begin to coordinate a video session. In the meantime, a key pair is
generated in the student’s browser and they deploy a contract containing
an upper bound of ETH, the addresses, and a timeout period. The teacher
helps the student with the issue and each minute an ephemeral key pair is
signing and sending messages from the student to the teacher. Finally, the
teacher can sign and submit the last message they received to get paid and
the student can withdraw remainers or use for another session.
*/

contract MVPC {

  constructor() public { }

  mapping (address => uint256) public nonce;

  enum Status {
    Null,
    Open,
    Closed
  }

  struct Session {
      Status status;
      address owner;
      address signer;
      address destination;
      uint64 timeout;
      uint256 stake;
  }
  mapping (bytes32 => Session) public sessions;

  //keep track of leftover funds
  mapping (address => uint256) public remainder;

  //signer can open a session by sending some ETH
  function open(address signer, address destination, uint64 timeout, uint256 addRemainder) public payable {
    //generate a unique id for the stake
    bytes32 id = keccak256(abi.encodePacked(address(this),signer,destination,timeout,addRemainder,nonce[signer]++));
    //make sure this stake doesn't already exist
    require(sessions[id].status==Status.Null,"MVPC::open: Session already exists");
    //you can use remainder funds from previous sessions
    uint256 value = msg.value;
    if(addRemainder>0){
      require(addRemainder<=remainder[msg.sender],"MVPC::open: not enough remainder");
      remainder[msg.sender]-=addRemainder;
      value+=addRemainder;
    }
    //create session and open it
    sessions[id] = Session({
      status: Status.Open,
      owner: msg.sender,
      signer: signer,
      destination: destination,
      timeout: timeout,
      stake: value
    });
    //emit event to let the frontend know
    emit Open(id,msg.sender,signer,destination,timeout,addRemainder,value);
  }
  event Open(bytes32 id, address indexed owner, address indexed signer, address indexed destination, uint64 timeout, uint256 addRemainder, uint256 amount);

  //offchain function to get the hash to make less work in the frontend
  function getHash(bytes32 id, uint256 value) public view returns (bytes32) {
    return keccak256(abi.encodePacked(address(this),id,value));
  }

  //the receiver can sign the signed message and submit it to collect and close
  function close(bytes32 id, uint256 value, bytes signature, bytes receiverSignature) public {
    //make sure the session exists, and is open
    require(sessions[id].status==Status.Open,"MVPC::close: Session is not open");
    //make sure the block number is after the timeout (actually, not needed right? only for withdrawl)
    //require(sessions[id].timeout<=block.number,"MVPC::close: Block number is greater than timeout (session is not done yet)");
    //get the hash, signer, receiverSigner
    bytes32 sessionHash = getHash(id,value);
    address signer = getSigner(sessionHash,signature);
    address receiverSigner = getSigner(sessionHash,receiverSignature);
    //make sure the signer is correct
    require(sessions[id].signer==signer,"MVPC::close: Signer is not correct");
    //make sure the receiver sig is correct
    require(sessions[id].destination==receiverSigner,"MVPC::close: Reciver signer is not correct");
    //close the session to avoid reentrance etc
    sessions[id].status = Status.Closed;
    //never send more than the max amount entered
    uint256 smallestValue = sessions[id].stake;
    //add any remainder for the owner if they have it and have requested it
    if(smallestValue>value){
      remainder[sessions[id].owner] += smallestValue - value;
      smallestValue = value;
    }
    //send the smallestValue to the destination
    sessions[id].destination.transfer(smallestValue);
    //emit event to let the frontend know
    emit Close(id,sessions[id].owner,sessions[id].signer,sessions[id].destination,smallestValue);
  }
  event Close(bytes32 id, address indexed owner, address indexed signer, address indexed destination, uint256 amount);


  //provide a method for receiver to check the sigs as they come in
  function isSignatureValid(bytes32 id, uint256 value, bytes signature) external view returns (bool) {
    //make sure session is open
    if(sessions[id].status!=Status.Open) return false;
    //make sure signature of hash is valid
    bytes32 sessionHash = getHash(id,value);
    address signer = getSigner(sessionHash,signature);
    if(sessions[id].signer!=signer) return false;
    return true;
  }

  //let the signer withdraw remainders (and optionally close timed out sessions)
  function withdraw(address toAddress,uint256 amount,bytes32 optionalId) public {
    //if there is an open session at optionalId past the timeout, close it
    if(optionalId!=0){
      //session must still be open
      require(sessions[optionalId].status==Status.Open,"MVPC::withdraw: Session is not open");
      //session must be past the timeout period in blocks
      require(sessions[optionalId].timeout>uint64(block.number),"MVPC::withdraw: Session is not timed out yet");
      //close the session
      sessions[optionalId].status = Status.Closed;
      //add any remainder for the owner if they have it and have requested it
      remainder[sessions[optionalId].owner] += sessions[optionalId].stake;
    }
    //make sure they have this much
    require(amount<=remainder[msg.sender],"MVPC::withdraw: not enough remainder");
    //subtract amount first
    remainder[msg.sender]-=amount;
    //then send amount totoAddress
    toAddress.transfer(amount);
    //emit event to let the frontend know
    emit Withdraw(toAddress,amount,optionalId);
  }
  event Withdraw(address toAddress,uint256 amount,bytes32 optionalId);


  function getSigner(bytes32 _hash, bytes _signature) internal pure returns (address){
    bytes32 r;
    bytes32 s;
    uint8 v;
    if (_signature.length != 65) {
      revert();
    }
    assembly {
      r := mload(add(_signature, 32))
      s := mload(add(_signature, 64))
      v := byte(0, mload(add(_signature, 96)))
    }
    if (v < 27) {
      v += 27;
    }
    if (v != 27 && v != 28) {
      revert();
    } else {
      return ecrecover(keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
      ), v, r, s);
    }
  }


}
