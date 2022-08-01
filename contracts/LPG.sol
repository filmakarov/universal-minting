/*
    LAUNCHPASS GENESIS
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./SignedAllowance.sol";
import "erc721a/contracts/extensions/ERC721AQueryable.sol";

import "hardhat/console.sol";

/// @title Launch Pass Genesis Project.
/// @author of the contract filio.eth (twitter.com/filmakarov)

contract LPG is ERC721AQueryable, Ownable, SignedAllowance {  

    using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                                GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 public constant MAX_ITEMS = 1000;
    string private baseURI;
    bool public saleState;
    string public provenanceHash;
    address private reserveMinter;

    /*///////////////////////////////////////////////////////////////
                                INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    constructor(string memory _myBase) ERC721A("Launch Pass Genesis", "LPG") {
            baseURI = _myBase; 
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;  // put the first token # here
    }

    /*///////////////////////////////////////////////////////////////
                        MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function mint(address to, uint256 nonce, uint256 mintQty, bytes memory signature) public payable {
        require (saleState, "Sale is not active");

        uint256 price = uint256(uint128(nonce));
        uint256 data = nonce >> 128;
        uint256 start = uint256(uint48(data>>48));
        uint256 exp = uint256(uint48(data));
        uint256 refQty = uint256((uint16(data>>96))>>2);
        uint256 logic = (data>>96)&(3);

        // amount
        if (logic == 0) {
            require(mintQty == refQty, "Wrong amount, eq");
        } else if (logic == 1) {
            require(mintQty <= refQty, "Wrong amount, leq");
        } else {
            require(mintQty >= refQty, "Wrong amount, geq");
        }

        require (_totalMinted() + mintQty <= MAX_ITEMS, ">MaxSupply");

        require(block.timestamp >= start && block.timestamp <= exp, "Wrong timing");

        require (msg.value >= price*mintQty, "Not Enough Eth sent");

        // this will throw if the allowance has already been used or is not valid
        _useAllowance(to, nonce, signature);

        _safeMint(to, mintQty); 
    }

    function reserveTokens(address to, uint256 qty) public {
        require(owner() == _msgSender() || reserveMinter == _msgSender(), "Caller is nor reserveMinter nor owner");
        _safeMint(to, qty);
    }

    /*///////////////////////////////////////////////////////////////
                       PUBLIC METADATA VIEWS
    //////////////////////////////////////////////////////////////*/

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    /*///////////////////////////////////////////////////////////////
                       VIEWS
    //////////////////////////////////////////////////////////////*/

    function unclaimedSupply() public view returns (uint256) {
        return MAX_ITEMS - _totalMinted();
    }

    function lastTokenId() public view returns (uint256) {
        require(_totalMinted() > 0, "No tokens minted");
        return _nextTokenId() - 1;
    }

    function validateSignatureAndNonce(address to, uint256 nonce, bytes memory signature) 
            public view returns (
                uint256 price,
                string memory logicString,
                uint256 refQty,
                uint256 start,
                uint256 exp,
                bool sigValid
            ) {
                uint256 data = nonce >> 128;
                uint256 logic = (data>>96)&(3);

                if (logic == 0 ) {
                    logicString = "Equal";
                } else if (logic == 1) {
                    logicString = "No More Than";
                } else {
                    logicString = "Not Less Than";
                }

                validateSignature(to, nonce, signature); //throws if signature is invalid

                return (uint256(uint128(nonce)), //price
                        logicString,        // logic
                        uint256((uint16(data>>96))>>2), // qty
                        uint256(uint48(data>>48)),  // start date
                        uint256(uint48(data)), // exp date
                        true);
    }

    /*///////////////////////////////////////////////////////////////
                       ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setReserveMinter(address _newRMinter) public onlyOwner {
        reserveMinter = _newRMinter;
    }

    function setProvenanceHash(string memory _newPH) public onlyOwner {
        provenanceHash = _newPH;
    }

    function switchSaleState() public onlyOwner {
        saleState = !saleState;
    }

    /// @notice sets allowance signer, this can be used to revoke all unused allowances already out there
    /// @param newSigner the new signer
    function setAllowancesSigner(address newSigner) external onlyOwner {
        _setAllowancesSigner(newSigner);
    }

    /// @notice Withdraws funds from the contract to msg.sender who is always the owner.
    /// No need to use reentrancy guard as receiver is always owner
    /// @param amt amount to withdraw in wei
    function withdraw(uint256 amt) public onlyOwner {
         address payable beneficiary = payable(owner());
        (bool success, ) = beneficiary.call{value: amt}("");
        if (!success) revert ("Withdrawal failed");
    }
}

//   That's all, folks!