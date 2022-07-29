// Load dependencies
const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { deployments, getNamedAccounts, ethers } = require('hardhat');

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
      
      // MINT TOKEN

      //expect(await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1))).to.include(mybaseURI);
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

        await nftContract.mint(await holder.getAddress(), nonce, mintQty, allowance, {value: mintCost});

    }

  });

  // can not mint more or less when logic = 0

  // can not mint more when logic = 1

  // can not mint less when logic = 2

  // can mint with correct amount and correct logic

  // can not mint with wrong price

  // can mint during the correct both sided temframe 

  // can mint dring the correct one sided timeframe with only startdate

  // can mint dring the correct one sided timeframe with only enddate

  // can not mint with before startdate

  // can not mint after enddate

  it('can not order 0', async function () {
    const mintQty = 0;
    await expect (
      nftContract.connect(deployer).reserveTokens(await random2.getAddress(), mintQty),
    ).to.be.reverted;          
  });
  
  /*
  
  it('can mint token with a signature', async function () {

    const mintQty = 3;
    const itemPrice = jsPresalePrice;

    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000 * (await provider.getBlockNumber())), //some random allowance id
        itemPrice //price
    );
      
    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
    await minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost});

    expect(
        await nftContract.balanceOf(await random.getAddress()),
    ).to.be.equal(mintQty);
});

it('can free mint token with a signature', async function () {

  const mintQty = 1;
  const itemPrice = ethers.BigNumber.from(0);

  const { nonce: nonce, signature: allowance } = await signAllowance(
      await random.getAddress(),
      mintQty,
      Math.floor(Math.random() * 1000 * (await provider.getBlockNumber())), //some random allowance id
      itemPrice //price
  );
    
  let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
  await minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost});

  expect(
      await nftContract.balanceOf(await random.getAddress()),
  ).to.be.equal(mintQty);
});

it('can mint token with an allowance made for other person that was not used yet to other person wallet', async function () {

    const mintQty = 1;
    const itemPrice = jsPresalePrice;

    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000 * (await provider.getBlockNumber())), //some random allowance id
        itemPrice 
    );
      
    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
    await minterContr.connect(random2).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost});

    expect(
        await nftContract.balanceOf(await random.getAddress()),
    ).to.be.equal(mintQty);
});
 
it('can mint several quotas with same capacity but diff nonce', async function () {

  const mintQty = 1;
  const quotas = 5;
  const itemPrice = jsPresalePrice;

  for (let i=0; i<quotas; i++) {
    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000), //some random allowance id
        itemPrice 
    );

    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
    await minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost});

  }
  expect(
      await nftContract.balanceOf(await random.getAddress()),
  ).to.be.equal(mintQty*quotas);
});

it('cannot reuse signature', async function () {

  const mintQty = 1;
  const itemPrice = jsPresalePrice;

  const allowId = Math.floor(Math.random() * 1000 * (await provider.getBlockNumber()));
    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        allowId,
        itemPrice 
    );

    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
    await minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost});

  await expect(
    minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost}),
  ).to.be.revertedWith('!ALREADY_USED!');
});

it('cannot mint to yourself with other persons allowance', async function () {

  const mintQty = 1;
  const itemPrice = jsPresalePrice;

  const allowId = Math.floor(Math.random() * 1000 * (await provider.getBlockNumber()));
    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        allowId,
        itemPrice 
    );

    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
  await expect(
    minterContr.connect(random2).presaleOrder(await random2.getAddress(), nonce, allowance, {value: totalCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});

it('cannot mint with signature by wrong signer', async function () {

  const mintQty = 1;
  const itemPrice = jsPresalePrice;

    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000), 
        itemPrice,
        random2
    );

    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
  await expect(
    minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});

it('cannot mint with previously valid signature when we revoked everyhting by changing signer in the contract', async function () {
  
  const mintQty = 1;
  const itemPrice = jsPresalePrice;

  const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000),
        itemPrice  
  );
  
  let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
  await minterContr.connect(deployer).setAllowancesSigner(random.address);
  
  await expect(
    minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});

it('non owner can not change signer', async function () {
  await expect(
    minterContr.connect(random).setAllowancesSigner(random.address),
  ).to.be.revertedWith('Ownable: caller is not the owner');
});

it('cannot mint with increased nonce', async function () {

  const mintQty = ethers.BigNumber.from(1);
  const itemPrice = jsPresalePrice;

  const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000), 
        itemPrice 
  );

  const nonce2 = nonce.add(toBN(2).shl(128));

  let totalCost = ethers.BigNumber.from(mintQty.add(2)).mul(itemPrice);

  await expect(
    minterContr.connect(random).presaleOrder(await random.getAddress(), nonce2, allowance, {value: totalCost}),
  ).to.be.revertedWith('!INVALID_SIGNATURE!');
});

it('cannot manipulate signature', async function () {

  const mintQty = 1;
  const itemPrice = jsPresalePrice;

    let { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000), //345,
        itemPrice 
    );

    allowance =
          '0x45eacf01' + allowance.substr(-(allowance.length - 10));

    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
  await expect(
    minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost}),
  ).to.be.reverted;
}); 

it('can not order before presale started', async function () {
  let tx = await minterContr.connect(deployer).switchPresale();
  await tx.wait();

  expect((await minterContr.presaleActive())).to.be.false;

  const mintQty = 1;
  const itemPrice = ethers.BigNumber.from(0);
  
  const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000 * (await provider.getBlockNumber())), //some random allowance id
        itemPrice 
  );
      
  let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);

  await expect (
    minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost}),
  ).to.be.revertedWith('Presale not active');          
});
*/

// Commented out as price is 0 here and we do not even check for it
/*
it('cannot presale mint with incorrect price if it is not 0', async function () {

  const mintQty = 2;
  const itemPrice = toBN(20000000000);

    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000), 
        itemPrice
    );

    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice.sub(10000000000));
  await expect(
    minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost}),
  ).to.be.revertedWith('Minter: Not Enough Eth');
});
*/

});

  /*  ====== ====== ====== ====== ====== ======
  *   
  *   ADMIN FUNCTIONS TESTS
  * 
  * ====== ====== ====== ====== ======  ====== */

describe('Admin functions tests', async function () {

  /*
  it('can change unrevealedUri', async function () {

    let oldBaseUri = unrevURI;
    
    let newUnrevBaseExp = "site.com";
    let tx = await nftContract.connect(deployer).setUnrevURI(newUnrevBaseExp);
    await tx.wait();

    const mintQty = 1;
    const itemPrice = await minterContr.presalePrice();

    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000 * (await provider.getBlockNumber())), //some random allowance id
        itemPrice //price
    );
      
    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
    await minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost});

    let tokenId = (await nftContract.nextTokenIndex()).sub(1);
    let newUnrevBaseSet = await nftContract.tokenURI(tokenId);
    
    expect(newUnrevBaseSet).to.equal(newUnrevBaseExp).and.to.not.equal(oldBaseUri);
  }); 

  it('can not set UnrevURI if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setUnrevURI("fddfsf"),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can not reveal if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setRevealState(true),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can reveal', async function () {
    const mintQty = 1;
    const itemPrice = await minterContr.presalePrice();

    const { nonce: nonce, signature: allowance } = await signAllowance(
        await random.getAddress(),
        mintQty,
        Math.floor(Math.random() * 1000 * (await provider.getBlockNumber())), //some random allowance id
        itemPrice //price
    );
      
    let totalCost = ethers.BigNumber.from(mintQty).mul(itemPrice);
    await minterContr.connect(random).presaleOrder(await random.getAddress(), nonce, allowance, {value: totalCost});

    expect(await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1))).to.include(unrevURI);
    
    await nftContract.connect(deployer).setRevealState(true);

    expect(await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1))).to.include(mybaseURI).and.not.include(unrevURI);

  });

  it('can not set BaseUri if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setBaseURI("234234234"),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can change baseURI', async function () {

    const mintQty = (await minterContr.maxPerMint());
    let totalCost = ethers.BigNumber.from(mintQty).mul(await minterContr.publicSalePrice());

    await minterContr.connect(random).publicOrder(await random.getAddress(), mintQty, {value: totalCost});

    let tx1 = await nftContract.connect(deployer).setRevealState(true);
    await tx1.wait();

    let oldVal = await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1));
    let oldBaseURI = mybaseURI;
    
    let newBaseURI = "https://newBaseURI1212.com/";
    let tx = await nftContract.connect(deployer).setBaseURI(newBaseURI);
    await tx.wait();

    let newValSet = await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1));

    //console.log("Metadata example: ", newValSet);
    
    expect(newValSet).to.include(newBaseURI).and.not.include(oldVal).and.not.include(oldBaseURI);
  });

  it('can not set Minter if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setMinter(random.getAddress()),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can not set GEN2 if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setADG2(random.getAddress()),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('can not set metadata ext if not admin: test onlyOwner function', async function () {
    await expect(
        nftContract.connect(random).setMetadataExtension(".exe"),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('admin can change metadata extension', async function () {

    const mintQty = (await minterContr.maxPerMint());
    let totalCost = ethers.BigNumber.from(mintQty).mul(await minterContr.publicSalePrice());

    await minterContr.connect(random).publicOrder(await random.getAddress(), mintQty, {value: totalCost});

    let tx1 = await nftContract.connect(deployer).setRevealState(true);
    await tx1.wait();

    let oldVal = await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1));
    let oldExt = ".json"
    
    let newExt = ".txt";
    let tx = await nftContract.connect(deployer).setMetadataExtension(newExt);
    await tx.wait();

    let newValSet = await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1));

    //console.log("Metadata example: ", newValSet);
    
    expect(newValSet).to.include(newExt).and.not.include(oldVal).and.not.include(oldExt);
  });

  */

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
    
    console.log("SENT: Price: %i, Qty: %s %i, Start: %i, End: %i", itemPrice, logic, refQty, startingFrom, expiringAt);

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


});