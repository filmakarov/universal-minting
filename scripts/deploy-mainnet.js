// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, upgrades } = require("hardhat");
const toBN = ethers.BigNumber.from;

async function main() {
  const [deployer, addr1, addr2, addr3, paperKeyAddress, allowancesigner] = await ethers.getSigners();

  const mybase = "ipfs://baseuri/";

  const bBefore = ethers.BigNumber.from((await deployer.getBalance()).toString()); 

  let BNFT = await ethers.getContractFactory("LPG");
  const bnft = await BNFT.deploy(mybase);
  await bnft.deployed();

  let bAfter = ethers.BigNumber.from((await deployer.getBalance()).toString());  
  let deployCost = (bBefore.sub(bAfter));

  console.log("NFT Contract deployed to: ", bnft.address);

  console.log("Deploy cost:", ethers.utils.formatUnits( (deployCost) , unit = "ether" ), "eth\n====================\n");
  
  // CONTRACT SETUP

  let tx = await bnft.connect(deployer).setAllowancesSigner(await deployer.getAddress());
  await tx.wait(); 

  let tx2 = await bnft.connect(deployer).setReserveMinter(await deployer.getAddress());
  await tx2.wait(); 

  let mintQty = 1;
  let tx3 = await bnft.connect(deployer).reserveTokens(await deployer.getAddress(), mintQty);
  await tx3.wait();

  console.log("Total Supply: ", (await bnft.totalSupply()).toString(), ". Remaining: ", (await bnft.unclaimedSupply()).toString());

  let bAfter2 = ethers.BigNumber.from((await deployer.getBalance()).toString());  
  let txCost = (bAfter.sub(bAfter2));

  console.log("Txs cost:", ethers.utils.formatUnits( (txCost) , unit = "ether" ), "eth\n====================\n");
  console.log("Total cost:", ethers.utils.formatUnits( (txCost.add(deployCost)) , unit = "ether" ), "eth\n====================\n");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });