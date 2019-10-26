pragma solidity >=0.5.8 <0.6.0;

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
        DAI,
        ETH
    }

    enum FiatCurrency {
        AUD,
        USD
    }


    /* ------------------------------------------------------
     *  Dealers - TODO split off to registry contract
     * ------------------------------------------------------ */

    struct Dealer {
        address adminAddr; // account registering and maintaining the record
        address oracleAddr;
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
        // uint256 audReserve;
    }

    // TODO: move this into offers struct - result per Offer
    bool public payoutResult;

    mapping(bytes32 => Offer) buyOffers;


    /* ------------------------------------------------------
     *  Events
     * ------------------------------------------------------ */

    event LogGatewayDealerRegistered(
        bytes32 indexed dealerId,
        address adminAddr,
        address oracleAddr,
        string jobId
    );
    event LogGatewayDealerBuyCryptoOfferCreated(
        bytes32 indexed dealerId,
        bytes32 indexed offerId,
        CryptoToken crypto,
        FiatCurrency fiat,
        uint256 price
    );
    event LogPayoutFulfilled(bytes32 requestId, bool result);
    

    /* ------------------------------------------------------
     *  Reason messages
     * ------------------------------------------------------ */

    string constant REASON_DEALER_ALREADY_EXISTS = "Dealer already exists";
    string constant REASON_OFFER_ALREADY_PLACED = "Offer already placed";


    /**
     * @notice Deploy the contract with a specified address for the LINK
     * and Oracle contract addresses
     * @dev Sets the storage for the specified addresses
     * @param _link The address of the LINK token contract
     */
    constructor(address _link) public Ownable() {
        if (_link == address(0)) {
            setPublicChainlinkToken();
        } else {
            setChainlinkToken(_link);
        }
    }


    /* ------------------------------------------------------
     *    Dealer Functions
     * ------------------------------------------------------ */

    /// @notice Dealer registers in the market
    /// @param _oracleAddr Address of the dealers pay out Oracle
    /// @param _jobId JobID for payouts at the _oracleAddr
    /// @return bytes32 dealerId Dealer ID for the new dealer
    function dealerRegister(
        address _oracleAddr,
        string calldata _jobId
    )
        external
        // TODO: check not already exists
        // TODO: require a security deposit
        returns (bytes32 dealerId)
    {
        address admin = msg.sender;
        dealerId = keccak256(abi.encodePacked(admin, _oracleAddr, _jobId));
        dealers[dealerId] = Dealer(admin, _oracleAddr, _jobId, true);
        emit LogGatewayDealerRegistered(dealerId, admin, _oracleAddr, _jobId);
    }

    /// @notice Dealer places an offer for a pair
    /// param _crypto CryptoToken to buy/sell
    /// param _fiat FiatCurrency to buy sell
    /// @param _price Price for market pair adjusted by 10 decimals (multiplied by 10^10)
    /// @return bytes32 offerId for the new offer
    function dealerBuyCryptoOfferCreate(
        // TODO: offer per pair:

        // CryptoToken _crypto,
        // FiatCurrency _fiat,
        uint256 _price
    )
        external
        // TODO: msg.sender is a registered dealer
        returns (bytes32 offerId)
    {
        // hard code for now:
        CryptoToken _crypto = CryptoToken.ETH;
        FiatCurrency _fiat = FiatCurrency.AUD;

        offerId = keccak256(
            abi.encodePacked(msg.sender, _crypto, _fiat, _price)
        );

        // TODO: offer doesn't exist already
        buyOffers[offerId] = Offer(_crypto, _fiat, _price);

        emit LogGatewayDealerBuyCryptoOfferCreated(
            0x0,  // TODO: dealer id - lookup from msg.sender
            offerId,
            _crypto,
            _fiat,
            _price
        );

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
        bytes32 dealerId,
        bytes32 offerId,
        uint256 amount,
        string calldata receiver
        // TODO: use an encrypted receiver
        // bytes32 receiver
    )
        external
        // dealerIsActive(sellOrder.oracle)
    {
        // TODO: add checks
        Dealer memory dealer = dealers[dealerId];
        // Offer memory offer = offers[offerId];

        // TODO: dollarAmount = amount / offer.price
        uint256 dollarAmount = 2;

        payout(dealer.oracleAddr, dealer.jobId, dollarAmount, receiver);
    }

    /* ------------------------------------------------------
     *    Payout Functions
     * ------------------------------------------------------ */

    function payout(
        address _oracle,
        string memory _jobId,
        uint amount,
        string memory receiver
    )
        public
        onlyOwner
    {
        Chainlink.Request memory req = buildChainlinkRequest(
                stringToBytes32(_jobId),
                address(this),
                this.fulfillPayout.selector
        );
        req.add("method", "sendPayout");
        req.addUint("amount", amount);
        req.add("currency", "AUD");
        req.add("receiver", receiver);
        sendChainlinkRequestTo(_oracle, req, ORACLE_PAYMENT);
    }


    function fulfillPayout(bytes32 _requestId, bool _result)
        public
        recordChainlinkFulfillment(_requestId)
    {
        emit LogPayoutFulfilled(_requestId, _result);
        payoutResult = _result;
    }


    /* ------------------------------------------------------
     *    Chainlink Functions
     * ------------------------------------------------------ */

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