/**
 * @type import('hardhat/config').HardhatUserConfig
 */

 require('@nomiclabs/hardhat-ethers');
 require("@nomiclabs/hardhat-waffle");
 require("@nomiclabs/hardhat-etherscan");
 require('hardhat-contract-sizer');
 require("hardhat-gas-reporter");

 const { alchemyApiKeyRinkeby, alchemyApiKeyMain, privkey, etherScanApiKey } = require('./secrets.json');
 
module.exports = {
  solidity: "0.8.14",
  networks: {
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${alchemyApiKeyRinkeby}`,
      gasPrice: 5000000000, //5 gwei
      timeout: 3600000,
      accounts: [`0x${privkey}`]
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${alchemyApiKeyRinkeby}`,
      gasPrice: 5000000000, //5 gwei
      timeout: 3600000,
      accounts: [`0x${privkey}`]
    },
    localhost: {
      gasPrice: 30000000000, //30 gwei
      mining: {
        auto: false,
        interval: [13000, 16000]
      },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKeyMain}`,
      gasPrice: 30000000000, //30 gwei
      accounts: [`0x${privkey}`]
    }
  },
  etherscan: {
    apiKey: `${etherScanApiKey}`
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 35,
    coinmarketcap: '04cef6de-97ed-42e1-87f7-14469f3911f3'
  },
};
