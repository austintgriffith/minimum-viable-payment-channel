# Minimum Viable Payment Channel

[![screencast](https://user-images.githubusercontent.com/2653167/49658666-72057a00-f9f7-11e8-8504-da56c5ee6c0c.png)](https://youtu.be/PYJsNwIiHLg)

This screencast walks through a smart contract where one user opens a channel and sends micropayments via off-chain signatures. Then the receiver closes the channel and collects their payment. 


-------------------

## Developement 

You will want ganache up and running already:
```
ganache-cli
```

Clone and install:
```
git clone https://github.com/austintgriffith/minimum-viable-payment-channel
cd minimum-viable-payment-channel
clevis init
npm i
```

Then compile, deploy, and publish the contracts:
```
clevis test full
```

Then fire up the backend:
```
node backend.js
```

Then fire up the frontend:
```
npm start
```
