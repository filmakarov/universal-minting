# Universal Minting
## EIP-721 tokens with off-chain customizable gas-efficient minting.

Minting is only allowed with a signature provided by dApp.
Signature is based on the encoded message, which includes uint256 nonce with packed parameters:
- Minting limit
- Limit logic (equal, less or equal, more or equal)
- Allowance timeframe
- Price per token

Gas-efficient minting: ERC-721A
Signed allowance core: @dievardump

