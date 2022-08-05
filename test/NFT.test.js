// Load dependencies
const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { deployments, getNamedAccounts, ethers } = require('hardhat');
const ConsoleProgressBar = require('console-progress-bar');

const toBN = ethers.BigNumber.from;

describe('NFT contr tests', () => {
  let deployer;
  let random;
  let random2;
  let unlocker;
  let holder;
  let spender;
  let allowancesigner;
  let reserveMinter;
  const ADDRESS_ZERO = ethers.constants.AddressZero;
  const mybaseURI = "fake_URI/"; //we deploy with fake uri not to disclose actual base uri 
  const unrevURI = "unrev_URI/";

  const provider = ethers.provider;
  const { hexlify, toUtf8Bytes } = ethers.utils;

  async function signAllowance(account, allowanceId, refQty, logic, startingFrom, expiringAt, price, signerAccount = allowancesigner) {
    
    const id_ = toBN(allowanceId).shl(14);
    const idQty = id_.add(refQty);
    const idQty_ = idQty.shl(2);
    const idQtyLogic = idQty_.add(logic);
    const idQtyLogic_ = idQtyLogic.shl(48);
    const idQtyLogicStart =  idQtyLogic_.add(startingFrom);
    const idQtyLogicStart_ = idQtyLogicStart.shl(48);
    const idQtyLogicStartEnd = idQtyLogicStart_.add(expiringAt);
    const idQtyLogicStartEnd_ = idQtyLogicStartEnd.shl(128);
    const nonce = idQtyLogicStartEnd_.add(price);

    const message = await nftContract.createMessage(account, nonce);
  
    //const formattedMessage = hexlify(toUtf8Bytes(message));
    const formattedMessage = hexlify(message);
    const addr = signerAccount.address.toLowerCase();
  
    /*
    const signature = await signerAccount.signMessage(
        ethers.utils.arrayify(message),
    );
    */
  
    const signature = await provider.send('eth_sign', [addr, formattedMessage]);
  
    return { nonce, signature };
  }

  beforeEach(async () => {
      [deployer, random, random2, unlocker, holder, spender, allowancesigner, reserveMinter] = await ethers.getSigners();

      // get chainId
      chainId = await ethers.provider.getNetwork().then((n) => n.chainId);

      const NFT = await ethers.getContractFactory('LPG', deployer);
      nftContract = await NFT.deploy(mybaseURI);

      await nftContract.connect(deployer).switchSaleState();
      await nftContract.connect(deployer).setReserveMinter(await reserveMinter.getAddress()); 
      await nftContract.connect(deployer).setAllowancesSigner(await allowancesigner.getAddress());

  });

  describe('Deployment', async function () {
    it('deploys', async function () {
        expect(nftContract.address).to.not.equal("");
    });
    it('deploys with correct base URI', async function () {
      const mintQty = 1;
      
      nftContract.connect(deployer).reserveTokens(await random2.getAddress(), mintQty);

      expect(await nftContract.tokenURI(await nftContract.lastTokenId())).to.include(mybaseURI);
    });

    it('deploys with 0 tokens', async function () {
      expect(await nftContract.totalSupply()).to.equal(0);
    });
  });

/*  ====== ====== ====== ====== ====== ======
    *   
    *   MINT TESTS
    * 
    * ====== ====== ====== ====== ======  ====== */
   

describe('Mint tests', async function () {

  it('can mint with valid signature', async function () {

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000);  // now
    let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
    //console.log("Starting From: ", startingFrom, " expiringAt: ", expiringAt);
    let itemPrice = toBN(10).pow(17); // 0.1eth

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(0);
    
    for (let i=0; i<10; i++) {

        const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
        );

        //await nftContract.printNonce(nonce);

        let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
        let mintCost = itemPrice.mul(mintQty);

        //console.log(i, " Mint: ", mintQty, "items");

        await nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

    }
    
    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(100);

  });

  it('can not mint more or less when logic = 0', async function () {

    let refQty = 12;
    let logic = 0;
    let startingFrom = parseInt(+new Date() / 1000);  // now
    let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
    //console.log("Starting From: ", startingFrom, " expiringAt: ", expiringAt);
    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    ); 

    let mintQty = refQty-2; //Math.floor(Math.random() * 10) + 1;
    let mintCost = itemPrice.mul(mintQty);

    await expect(
      nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
    ).to.be.revertedWith("Wrong amount, eq");

    mintQty = refQty+2; //Math.floor(Math.random() * 10) + 1;
    mintCost = itemPrice.mul(mintQty);

    await expect(
      nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
    ).to.be.revertedWith("Wrong amount, eq");

  });

  it('can not mint more when logic = 1', async function () {

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000);  // now
    let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
    //console.log("Starting From: ", startingFrom, " expiringAt: ", expiringAt);
    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    ); 

    mintQty = refQty+2; //Math.floor(Math.random() * 10) + 1;
    mintCost = itemPrice.mul(mintQty);

    await expect(
      nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
    ).to.be.revertedWith("Wrong amount, leq");

  });

  it('can not mint less when logic = 2', async function () {

    let refQty = 12;
    let logic = 2;
    let startingFrom = parseInt(+new Date() / 1000);  // now
    let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
    //console.log("Starting From: ", startingFrom, " expiringAt: ", expiringAt);
    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    ); 

    mintQty = refQty-2; //Math.floor(Math.random() * 10) + 1;
    mintCost = itemPrice.mul(mintQty);

    await expect(
      nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
    ).to.be.revertedWith("Wrong amount, geq");

  });

  // can mint with correct amount and correct logic
  // See above 'can mint with valid signature'

  // can not mint with wrong price
  // See below 'cannot presale mint with incorrect price if it is not 0' 

  // can mint during the correct both sided timframe
  // See above 'can mint with valid signature' 

  // can mint during the correct one sided timeframe with only startdate
  // 	exp = 33215818994 = 3022 year
  it('can mint during the correct one sided timeframe with only startdate', async function () {

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(0);

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000) - 1000;  // now - 1000;
    let expiringAt = 33215818994; // 3022

    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    ); 

    mintQty = refQty-2; //Math.floor(Math.random() * 10) + 1;
    mintCost = itemPrice.mul(mintQty);

    await nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(mintQty);

  });

  // can mint during the correct one sided timeframe with only enddate
  // start = 0

  it('can mint during the correct one sided timeframe with only enddate', async function () {

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(0);

    let refQty = 12;
    let logic = 1;
    let startingFrom = 0;  // now - 1000;
    let expiringAt = parseInt(+new Date() / 1000) + 10000; // 

    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    ); 

    mintQty = refQty-2; //Math.floor(Math.random() * 10) + 1;
    mintCost = itemPrice.mul(mintQty);

    await nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(mintQty);

  });

  it('can not mint before startdate', async function () {

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(0);

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000) + 1000;  // now - 1000;
    let expiringAt = 33215818994; // 3022

    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    ); 

    mintQty = refQty-2; //Math.floor(Math.random() * 10) + 1;
    mintCost = itemPrice.mul(mintQty);

    await expect (nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
      ).to.be.revertedWith("Wrong timing");

  });

  // can not mint after enddate
  it('can not mint after enddate', async function () {

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(0);

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000)-100;  // 
    let expiringAt = parseInt(+new Date() / 1000); // 

    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    ); 

    mintQty = refQty-2; //Math.floor(Math.random() * 10) + 1;
    mintCost = itemPrice.mul(mintQty);

    await expect (nftContract.mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
      ).to.be.revertedWith("Wrong timing");

  });

  it('can not order 0', async function () {
    const mintQty = 0;
    await expect (
      nftContract.connect(deployer).reserveTokens(await random2.getAddress(), mintQty),
    ).to.be.reverted;          
  });
  
  
it('can free mint token with a signature', async function () {

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(0);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);

  await nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

  expect(
      await nftContract.balanceOf(await holder.getAddress()),
  ).to.be.equal(mintQty);
});


it('can mint token with an allowance made for other person that was not used yet to other person wallet', async function () {

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);
      
  await nftContract.connect(random2).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

    expect(
        await nftContract.balanceOf(await holder.getAddress()),
    ).to.be.equal(mintQty);
});
 
it('can mint several quotas with same capacity but diff nonce', async function () {

  const quotas = 5;

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;

  for (let i=0; i<quotas; i++) {
    const { nonce: nonce, signature: allowance } = await signAllowance(
      await holder.getAddress(), // who can use
      Math.floor(Math.random() * 65530), //some random allowance id
      refQty, // quantity to compare to
      logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
      startingFrom,
      expiringAt,
      itemPrice //price
    );
      
    let mintCost = itemPrice.mul(mintQty);

    await nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

  }
  expect(
      await nftContract.balanceOf(await holder.getAddress()),
  ).to.be.equal(mintQty*quotas);
});

it('cannot reuse signature', async function () {
  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);

  await nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

  await expect(
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
  ).to.be.revertedWith('!ALREADY_USED!');
});


it('cannot mint to yourself with other persons allowance', async function () {

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await random2.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);

  await expect(
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});


it('cannot mint with signature by wrong signer', async function () {

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice, //price
    random
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);

  await expect(
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});


it('cannot mint with previously valid signature when we revoked everyhting by changing signer in the contract', async function () {
  
  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);
  
  await nftContract.connect(deployer).setAllowancesSigner(random.address);
  
  await expect(
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});


it('non owner can not change signer', async function () {
  await expect(
    nftContract.connect(random).setAllowancesSigner(random.address),
  ).to.be.revertedWith('Ownable: caller is not the owner');
});


it('cannot mint with increased nonce', async function () {

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);

  const nonce2 = nonce.add(toBN(2).shl(128));

  await expect(
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce2, allowance, {value: mintCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});


it('cannot manipulate signature', async function () {

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);

  let allowance2 =
          '0x45eacf01' + allowance.substr(-(allowance.length - 10));

  await expect(
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, mintQty, allowance2, {value: mintCost}),
  ).to.be.reverted;
}); 

it('can not order before presale started', async function () {
  let tx = await nftContract.connect(deployer).switchSaleState();
  await tx.wait();

  expect((await nftContract.saleState())).to.be.false;

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = 10; //Math.floor(Math.random() * 10) + 1;
  let mintCost = itemPrice.mul(mintQty);

  await expect (
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
  ).to.be.revertedWith('Sale is not active');          
});


it('cannot presale mint with incorrect price if it is not 0', async function () {

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);

  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );
    
  let mintQty = toBN(10); //Math.floor(Math.random() * 10) + 1;
  let mintCost = mintQty.mul(itemPrice.sub(10000000));

  await expect(
    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),
  ).to.be.revertedWith('Not Enough Eth sent');
});

it('can not order Over Capacity', async function () {
  
  let mintQty = 10;
  const capacity = await nftContract.unclaimedSupply();
  
  const cycles = capacity / mintQty;

  const consoleProgressBar = new ConsoleProgressBar({ maxValue: cycles });

  let refQty = 12;
  let logic = 1;
  let startingFrom = parseInt(+new Date() / 1000);  // now
  let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
  let itemPrice = toBN(10).pow(17);
    
  mintQty = toBN(mintQty); //Math.floor(Math.random() * 10) + 1;
  let mintCost = mintQty.mul(itemPrice);

  // claim all tokens
  for (let i=0; i<cycles; i++) {
    
    const { nonce: nonce, signature: allowance } = await signAllowance(
      await holder.getAddress(), // who can use
      Math.floor(Math.random() * 65530), //some random allowance id
      refQty, // quantity to compare to
      logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
      startingFrom,
      expiringAt,
      itemPrice //price
    );

    await nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});
    //if (i>6660) { console.log("unclaimed: ",await nftContract.unclaimedSupply() ); }
    consoleProgressBar.addValue(1);
  }

  //console.log("full mint ok");

  // all tokens are claimed
  expect(await nftContract.unclaimedSupply()).to.equal(0);
  //console.log("unclaimed: ",await nftContract.unclaimedSupply() );

  // exceeded mint
  const { nonce: nonce, signature: allowance } = await signAllowance(
    await holder.getAddress(), // who can use
    Math.floor(Math.random() * 65530), //some random allowance id
    refQty, // quantity to compare to
    logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
    startingFrom,
    expiringAt,
    itemPrice //price
  );

  await expect (

    nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost}),

  ).to.be.revertedWith('>MaxSupply');          
});


});

  /*  ====== ====== ====== ====== ====== ======
  *   
  *   ADMIN FUNCTIONS TESTS
  * 
  * ====== ====== ====== ====== ======  ====== */

describe('Admin functions tests', async function () {

  it('can not set BaseUri if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setBaseURI("234234234"),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can change baseURI', async function () {

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000);  // now
    let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
    let itemPrice = toBN(10).pow(17);

    const { nonce: nonce, signature: allowance } = await signAllowance(
      await holder.getAddress(), // who can use
      Math.floor(Math.random() * 65530), //some random allowance id
      refQty, // quantity to compare to
      logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
      startingFrom,
      expiringAt,
      itemPrice //price
    );
    
    let mintQty = toBN(10); //Math.floor(Math.random() * 10) + 1;
    let mintCost = mintQty.mul(itemPrice);

    await nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});

    let token = await nftContract.lastTokenId();

    let oldVal = await nftContract.tokenURI(token);
    let oldBaseURI = mybaseURI;
    
    let newBaseURI = "https://newBaseURI1212.com/";
    let tx = await nftContract.connect(deployer).setBaseURI(newBaseURI);
    await tx.wait();

    let newValSet = await nftContract.tokenURI(token);

    //console.log("Metadata example: ", newValSet);
    
    expect(newValSet).to.include(newBaseURI).and.not.include(oldVal).and.not.include(oldBaseURI);
  });

  it('can not set reserve minter if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setReserveMinter(random.getAddress()),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
  
  it('can set reserve minter and mint', async function () {

    let mintQty = 1;
    await expect(
        nftContract.connect(random).reserveTokens(await random.getAddress(), mintQty),
    ).to.be.revertedWith('Caller is nor reserveMinter nor owner');
    expect(await nftContract.balanceOf(await random.getAddress())).to.equal(0);
    await nftContract.connect(deployer).setReserveMinter(await random.getAddress());
    await nftContract.connect(random).reserveTokens(await random.getAddress(), mintQty);
    expect(await nftContract.balanceOf(await random.getAddress())).to.equal(mintQty);

  });

  it('can not set prov hash if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setProvenanceHash("0xwgkj9ug389"),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can set Provenance hash', async function () {

    let newPH = "0x2397234829834823";
    expect(await nftContract.provenanceHash()).to.not.include(newPH);
    await nftContract.connect(deployer).setProvenanceHash(newPH);
    expect(await nftContract.provenanceHash()).to.equal(newPH);

  });

  it('can not switch sale state if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).switchSaleState(),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  

});

  /*  ====== ====== ====== ====== ====== ======
    *   
    *   VIEW FUNCTIONS TESTS
    * 
    * ====== ====== ====== ====== ======  ====== */

describe('View functions tests', async function () {

  it('validate signature function works', async function () {

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000);  // now
    let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
    //console.log("Starting From: ", startingFrom, " expiringAt: ", expiringAt);
    let itemPrice = toBN(10).pow(17); // 0.1eth
    
    //console.log("SENT: Price: %i, Qty: %s %i, Start: %i, End: %i", itemPrice, logic, refQty, startingFrom, expiringAt);

    const { nonce: nonce, signature: allowance } = await signAllowance(
          await holder.getAddress(), // who can use
          Math.floor(Math.random() * 65530), //some random allowance id
          refQty, // quantity to compare to
          logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
          startingFrom,
          expiringAt,
          itemPrice //price
    );

    
    const { price:priceV, logicString:logicV, refQty:refQtyV, start:startV, exp:expV, sigValid } = await 
      nftContract.validateSignatureAndNonce(await holder.getAddress(), nonce, allowance);

      /*
    console.log(
      "GOT: Price: %s Qty: %s %s Start: %s End: %s Valid %s", priceV, logicV, refQtyV, startV, expV, sigValid
    );
      */

    expect(refQtyV).to.equal(refQty);
    expect(priceV).to.equal(itemPrice);
    expect(startV).to.equal(startingFrom);
    expect(expV).to.equal(expiringAt);

  });

});


/*  ====== ====== ====== ====== ====== ======
*   
*   WITHDRAWALS TESTS
* 
* ====== ====== ====== ====== ======  ====== */

describe('Withdrawals tests', async function () {
 
  it('can not withdraw if not admin', async function () {
    await expect(
        nftContract.connect(random).withdraw(100000),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can withdraw', async function () {
    let amt = toBN(10).pow(17); //0.1 eth

    let refQty = 12;
    let logic = 1;
    let startingFrom = parseInt(+new Date() / 1000);  // now
    let expiringAt = startingFrom + 7 * 24 * 60 * 60; // + 1 week from now
    let itemPrice = toBN(10).pow(17);

    const { nonce: nonce, signature: allowance } = await signAllowance(
      await holder.getAddress(), // who can use
      Math.floor(Math.random() * 65530), //some random allowance id
      refQty, // quantity to compare to
      logic,  // 0 = equal, 1 = lower_or_equal, 2 = greater_or_equal
      startingFrom,
      expiringAt,
      itemPrice //price
    );
    
    let mintQty = toBN(10); //Math.floor(Math.random() * 10) + 1;
    let mintCost = mintQty.mul(itemPrice);

    await nftContract.connect(holder).mint(mintQty, await holder.getAddress(), nonce, allowance, {value: mintCost});
        
    let balBefore = toBN(await deployer.getBalance());
    
    let txW = await nftContract.connect(deployer).withdraw(amt);
    await txW.wait();

    let balAfter = await deployer.getBalance();

    let diff = balAfter.sub(balBefore);
    //console.log("Diff: ", ethers.utils.formatUnits(diff, unit = "ether"), "eth");
    expect(diff).to.be.above(amt.sub(toBN(10).pow(16)));

  });

});


});