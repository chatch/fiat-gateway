pragma solidity ^0.5.12;

import "./chainlink/ChainlinkClient.sol";
import "./chainlink/vendor/Ownable.sol";


/// @title Market of gateways.
/// @notice This is the entry point for all interactions with the Gateway.
contract Gateway is ChainlinkClient, Ownable {
    uint256 constant private ORACLE_PAYMENT = 1 * LINK;

    /* ------------------------------------------------------
     *  Supported Currencies
     *  TODO: move to an updatable list
     * ------------------------------------------------------ */

    enum CryptoToken {
        ETH,
        DAI
    }

    enum FiatCurrency {
        USD,
        AUD
    }


    /* ------------------------------------------------------
     *  Dealers
     * ------------------------------------------------------ */

    struct Dealer {
        address admin; // account registering and maintaining the record
        address oracle;
        string jobId;
        bool active;
    }

    /* Dealer ID to Dealer details*/
    mapping(bytes32 => Dealer) public dealers;


    /* ------------------------------------------------------
     *  Offers
     * ------------------------------------------------------ */

    struct Offer {
        // Currency Pair
        CryptoToken crypto;
        FiatCurrency fiat;

        // fiat per crypto adjusted by 10 decimals
        // (eg. USD for ETH price $222.99 would be: 2229900000000)
        uint256 price;

        // reserve amounts
        // TODO: add these and change to a structure that supports any currency:

        // uint256 ethReserve;
        // uint256 usdReserve;
    }

    mapping(bytes32 => Offer) buyOffers;


    /* ------------------------------------------------------
     *  Events
     * ------------------------------------------------------ */

    event LogGatewayDealerRegistered(
        bytes32 dealerId,
        address admin,
        address oracleId,
        string jobId
    );
    event LogGatewayDealerBuyCryptoOfferCreated(
        bytes32 offerId,
        CryptoToken crypto,
        FiatCurrency fiat,
        uint256 price
    );


    /// @dev Set owner and chainlink LINK address
    constructor() public Ownable() {
        setPublicChainlinkToken();
    }


    /* ------------------------------------------------------
     *  Reason messages
     * ------------------------------------------------------ */

    string constant REASON_DEALER_ALREADY_EXISTS = "Dealer already exists";
    string constant REASON_OFFER_ALREADY_PLACED = "Offer already placed";


    /* ------------------------------------------------------
     *    Dealer Functions
     * ------------------------------------------------------ */

    function dealerRegister(
        address _oracleId,
        string calldata _jobId
    )
        external
        // TODO: check not already exists
        returns (bytes32 dealerId)
    {
        address admin = msg.sender;
        dealerId = keccak256(abi.encodePacked(admin, _oracleId, _jobId));
        dealers[dealerId] = Dealer(admin, _oracleId, _jobId, true);
        emit LogGatewayDealerRegistered(dealerId, admin, _oracleId, _jobId);
    }

    function dealerBuyCryptoOfferCreate(
        CryptoToken _crypto,
        FiatCurrency _fiat,
        uint256 _price
    )
        external
        // TODO: msg.sender is a registered dealer
        returns (bytes32 offerId)
    {

        offerId = keccak256(
            abi.encodePacked(msg.sender, _crypto, _fiat, _price)
        );
        // TODO: offer doesn't exist already
        buyOffers[offerId] = Offer(_crypto, _fiat, _price);
        return offerId;
    }

    // function dealerOfferUpdate() external returns (bytes32 dealerId);
    // function dealerOfferRemove() external returns (bytes32 dealerId);


    /* ------------------------------------------------------
     *    Order Functions
     * ------------------------------------------------------ */

    /// Sell crypto for fiat. A trader takes a dealers offer for a given amount.
    /// @notice Sells crypto for an offer
    function sellCrypto(
        uint256 ethAmount,
        bytes32 payoutIdEncrypted
    )
        external
        // dealerIsActive(sellOrder.oracle)
        returns (bytes32 sellId)
    {
        // implement me
    }

    function sellFilled(
        bytes32 sellOrderId,
        bytes32 payoutIdEncrypted
    )
        external
        // onlyOracle(sellOrder.oracle)
    {
        // implement me
    }


    // function pay(address _oracle, string memory _jobId)
    //     public
    //     onlyOwner
    // {
    //     Chainlink.Request memory req = buildChainlinkRequest(
    //             stringToBytes32(_jobId),
    //             address(this),
    //             this.fulfillEthereumChange.selector
    //     );
    //     req.add("get", "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD");
    //     req.add("path", "RAW.ETH.USD.CHANGEPCTDAY");
    //     req.addInt("times", 1000000000);
    //     sendChainlinkRequestTo(_oracle, req, ORACLE_PAYMENT);
    // }


    // function fulfillEthereumPrice(bytes32 _requestId, uint256 _price)
    //     public
    //     recordChainlinkFulfillment(_requestId)
    // {
    //     emit RequestEthereumPriceFulfilled(_requestId, _price);
    //     currentPrice = _price;
    // }

    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    )
        public
        onlyOwner
    {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
    }

    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            result := mload(add(source, 32))
        }
    }

}