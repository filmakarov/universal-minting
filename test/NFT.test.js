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
  console.log("Starting From: ", startingFrom, " expiringAt: ", expiringAt);
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

      console.log(i, " Mint: ", mintQty, "items");

      await nftContract.mint(await holder.getAddress(), nonce, mintQty, allowance, {value: mintCost});

  }

  });
  
  it('can not order 0', async function () {
    const mintQty = 0;
    await expect (
      nftContract.connect(deployer).reserveTokens(await random2.getAddress(), mintQty),
    ).to.be.revertedWith('CAN_NOT_MINT_0');          
  });
  
  
  // can be commented out as takes time
  // passes at final check

  /*
  it('can not order Over Capacity', async function () {
  
    const mintQty = (await minterContr.maxPerMint());
    let totalCost = ethers.BigNumber.from(mintQty).mul(await minterContr.publicSalePrice());

    const capacity = await minterContr.unclaimedSupply();
    for (let i=0; i<capacity; i++) {
      await minterContr.connect(random).publicOrder(await random.getAddress(), mintQty, {value: totalCost});
    }
    await expect (
      minterContr.connect(random2).publicOrder(await random2.getAddress(), mintQty, {value: totalCost}),
    ).to.be.revertedWith('>MaxSupply');          
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

  /*

  it('can return correct tokens of Owner', async function () {

    const mintQty = 1;
    let totalCost = ethers.BigNumber.from(mintQty).mul(await minterContr.publicSalePrice());

    expect(await nftContract.totalSupply()).to.equal(0);
    expect(await nftContract.balanceOf(await random.getAddress())).to.equal(0);

    let totMinted = await nftContract.totalMinted();

    await minterContr.connect(random).publicOrder(await random.getAddress(), mintQty, {value: totalCost});
    await minterContr.connect(random2).publicOrder(await random2.getAddress(), mintQty, {value: totalCost});
    await minterContr.connect(random).publicOrder(await random.getAddress(), mintQty, {value: totalCost});
    await minterContr.connect(deployer).publicOrder(await deployer.getAddress(), mintQty, {value: totalCost});
    await minterContr.connect(holder).publicOrder(await holder.getAddress(), mintQty, {value: totalCost});
    await minterContr.connect(random).publicOrder(await random.getAddress(), mintQty, {value: totalCost});
    
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);

    let expToO = [toBN((startIndex.add(totMinted)).add(0)), toBN((startIndex.add(totMinted)).add(2)), toBN((startIndex.add(totMinted)).add(5))];
    
    let gotToO = await nftContract.tokensOfOwner(await random.getAddress());
    
    for (let i=0; i<expToO.length; i++) {
      //console.log("got from contract: " , gotToO[i]);
      expect(gotToO[i]).to.equal(expToO[i]);
    }

  }); 

  */

});


});