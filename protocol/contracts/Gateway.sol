pragma solidity >=0.5.8 <0.6.0;

import "./chainlink/ChainlinkClient.sol";
import "./chainlink/vendor/Ownable.sol";


/// @title Market of gateways.
/// @notice This is the entry point for all interactions with the Gateway.
contract Gateway is ChainlinkClient, Ownable {
    uint256 constant private ORACLE_PAYMENT = 1 * LINK;

    // Denotes Native ETH - NOTE: KyberNetwork also uses this to represent ETH
    address constant public ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;


    /* ------------------------------------------------------
     *  Makers - a maker is a liquidity provider that exist
     *    per combo of fiat/crypto pair and FiatPaymentMethod
     * ------------------------------------------------------ */

    struct Maker {
        address makerAddr; // account registering and maintaining the record
        uint256 fiatPaymentMethodIdx;
        address crypto;    // ERC20 address or ETH_ADDRESS
        string fiat;       // ISO 4217 currency code
        bool active;
    }

    /*
     * Maker ID [keccak256(makerAddr, fiatPaymentMethodIdx, crypto, fiat to)]
     *   => Maker record
     */

    mapping(bytes32 => Maker) public makers;


    /* ------------------------------------------------------
     *  Fiat Payments - a payment method and it's oracle
     *    eg. Paypal, WeChat Pay, SEPA, ... would each have
     *    one record here and one deployed Oracle handling
     *    the network interactions
     * ------------------------------------------------------ */

    struct FiatPaymentMethod {
        string displayName;
        address oracleAddr;

        // JobIds of adapter calls
        string newMakerJobId;
        string buyCryptoOrderJobId;
        string buyCryptoOrderPayedJobId;
    }

    /* All registered FiatPaymentMethods */
    FiatPaymentMethod[] public fiatPaymentMethods;


    /* ------------------------------------------------------
     *  Orders - a buy or sell order
     * ------------------------------------------------------ */

    struct Order {
        address taker;

        // Currency Pair
        address crypto; // ERC20 address or ETH_ADDRESS
        string fiat;    // ISO 4217 currency code

        // price in Fiat per 1 uint of crypto adjusted by 10 decimals
        // (eg. USD for ETH price $222.99 would be: 2229900000000)
        uint256 amount;

        // FiatPaymentMethod
        uint256 fiatPaymentMethodIdx;
    }

    /*
     * Order ID [keccack256(taker, _crypto, _fiat, _amount)]
     *   => Order
     */

    mapping(bytes32 => Order) public buyOrders;
    mapping(bytes32 => Order) public sellOrders;

    // TODO: move this into orders struct - result per Order
    bool public payoutResult;


    /* ------------------------------------------------------
     *  Events
     * ------------------------------------------------------ */

    event LogGatewayFiatPaymentMethodAdded(
        uint256 indexed methodIdx,
        string indexed name,
        address indexed oracle
    );

    event LogGatewayMakerRegistered(
        bytes32 indexed makerId,
        address indexed makerAddr,
        address crypto,
        string fiat
    );

    event LogGatewayBuyCryptoOrderCreated(
        address indexed taker,
        bytes32 indexed orderId,
        address crypto,
        string fiat,
        uint256 amount,
        uint256 fiatPaymentMethodIdx
    );

    event LogPayoutFulfilled(bytes32 requestId, bool result);


    /* ------------------------------------------------------
     *  Solidity error reasons
     * ------------------------------------------------------ */

    string constant REASON_MAKER_ALREADY_EXISTS = "Maker already exists";
    string constant REASON_OFFER_ALREADY_PLACED = "Order already placed";


    /// @notice Create the contract with a specified address for the LINK
    ///         contract.
    /// @param _link The address of the LINK token contract
    constructor(address _link) public Ownable() {
        if (_link == address(0)) {
            setPublicChainlinkToken();
        } else {
            setChainlinkToken(_link);
        }
    }

    /// @notice Add a fiat payment method to the gateway.
    /// @param _displayName A display name. eg. 'WeChat Pay'
    /// @param _oracleAddr Address of oracle with bridge to gateway
    /// @param _newMakerJobId New maker job
    /// @param _buyCryptoOrderJobId buyCryptoOrder job
    /// @param _buyCryptoOrderPayedJobId buyCryptoOrderPayed job
    /// @return methodIdx Index of the FiatPaymentMethod
    function addFiatPaymentMethod(
        string calldata _displayName,
        address _oracleAddr,
        string calldata _newMakerJobId,
        string calldata _buyCryptoOrderJobId,
        string calldata _buyCryptoOrderPayedJobId
    )
        external
        onlyOwner
        returns (uint256 methodIdx)
    {
        fiatPaymentMethods.push(
            FiatPaymentMethod(
                _displayName,
                _oracleAddr,
                _newMakerJobId,
                _buyCryptoOrderJobId,
                _buyCryptoOrderPayedJobId
            )
        );
        methodIdx = fiatPaymentMethods.length - 1;

        emit LogGatewayFiatPaymentMethodAdded(methodIdx, _displayName, _oracleAddr);
    }


    /* ------------------------------------------------------
     *    Maker Functions
     * ------------------------------------------------------ */

    /// @notice Maker registers to provide liquidity for a pair and fiat payment method.
    /// @param _fiatPaymentMethodIdx Index into fiatPaymentMethods
    /// @param _crypto ERC20 address or ETH_ADDRESS of crypto token
    /// @param _fiat ISO 4217 currency code
    /// @param _destination Payment destination on the fiatPaymentMethod network
    /// @param _ipfsHash Hash of file on ipfs holding encrypted API
    ///                  credentials for this maker
    /// @return makerId Maker ID hash for this market pair and method.
    function makerRegister(
        uint256 _fiatPaymentMethodIdx,
        address _crypto,
        string calldata _fiat,
        string calldata _destination,
        string calldata _ipfsHash
    )
        external
        // payable
        // TODO: check not already exists
        // TODO: require a security deposit
        returns (bytes32 makerId)
    {
        address makerAddr = msg.sender;
        makerId = keccak256(
            abi.encodePacked(
                makerAddr,
                _fiatPaymentMethodIdx,
                _crypto,
                _fiat
            )
        );

        FiatPaymentMethod storage fpm = fiatPaymentMethods[_fiatPaymentMethodIdx];

        // ChainLink: tell fiat payment oracle about the new maker
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(fpm.newMakerJobId),
            address(this),
            this.fulfillMakerRegister.selector
        );

        req.add("method", "newMaker");
        req.addBytes("public_account", abi.encodePacked(makerAddr));
        req.addBytes("maker_id", abi.encodePacked(makerId));
        req.addBytes("crypto", abi.encodePacked(_crypto));
        req.add("fiat", _fiat);
        req.add("destination", _destination);
        req.add("api_creds_ipfs_hash", _ipfsHash);

        sendChainlinkRequestTo(fpm.oracleAddr, req, ORACLE_PAYMENT);

        makers[makerId] = Maker(makerAddr, _fiatPaymentMethodIdx, _crypto, _fiat, true);
        emit LogGatewayMakerRegistered(makerId, makerAddr, _crypto, _fiat);
    }

    /// @notice Called by the Oracle when newMaker has been fulfilled.
    /// @param _fiatPaymentMethodIdx Index into fiatPaymentMethods
    /// @return makerId Maker ID hash for this market pair and method.
    function fulfillMakerRegister(
        uint256 _fiatPaymentMethodIdx
    )
       external
       returns (bytes32 makerId)
    {
        revert("not yet implemented");
    }

    /// @notice Taker places an order for a pair
    /// @param _crypto ERC20 address or ETH_ADDRESS of crypto token
    /// @param _fiat ISO 4217 currency code
    /// @param _amount Amount of crypto to buy (in wei if ETH or in decimals()
    ///                for an ERC20 token)
    /// @param _fiatPaymentMethodIdx Index into fiatPaymentMethods
    /// @return bytes32 orderId for the new order
    function buyCryptoOrderCreate(
        address _crypto,
        string calldata _fiat,
        uint256 _amount,
        uint256 _fiatPaymentMethodIdx
    )
        external
        returns (bytes32 orderId)
    {
        address taker = msg.sender;

        orderId = keccak256(
            abi.encodePacked(taker, _crypto, _fiat, _amount)
        );

        // TODO: check order doesn't exist already

        FiatPaymentMethod storage fpm = fiatPaymentMethods[_fiatPaymentMethodIdx];

        // ChainLink: tell fiat payment oracle about the order
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(fpm.buyCryptoOrderJobId),
            address(this),
            this.fulfillBuyCryptoOrder.selector
        );

        req.add("method", "buyCryptoOrder");
        req.addBytes("buyer_address", abi.encodePacked(taker));
        req.addBytes("order_id", abi.encodePacked(orderId));
        req.addUint("order_amount", _amount);
        req.addBytes("crypto", abi.encodePacked(_crypto));
        req.add("fiat", _fiat);

        sendChainlinkRequestTo(fpm.oracleAddr, req, ORACLE_PAYMENT);

        buyOrders[orderId] = Order(
            taker,
            _crypto,
            _fiat,
            _amount,
            _fiatPaymentMethodIdx
        );

        emit LogGatewayBuyCryptoOrderCreated(
            taker,
            orderId,
            _crypto,
            _fiat,
            _amount,
            _fiatPaymentMethodIdx
        );

        return orderId;
    }

    /// @notice Called by the Oracle when buyCryptoOrder has been fulfilled.
    /// @param _fiatPaymentMethodIdx Index into fiatPaymentMethods
    /// @return makerId Maker ID hash for this market pair and method.
    function fulfillBuyCryptoOrder(
        uint256 _fiatPaymentMethodIdx
    )
       external
       returns (bytes32 orderId)
    {
        revert("not yet implemented");
    }


    /* ------------------------------------------------------
     *    Order Functions
     * ------------------------------------------------------ */

    /// Sell crypto for fiat. A trader takes a makers order for a given amount.
    /// @notice Sells crypto for an order
    // function sellCrypto(
    //     bytes32 _makerId,
    //     bytes32 _orderId,
    //     uint256 _amount,
    //     string calldata _receiver
    //     // TODO: use an encrypted receiver
    //     // bytes32 receiver
    // )
    //     external
    //     // makerIsActive(sellOrder.oracle)
    // {
    //     // TODO: add checks
    //     // Maker storage maker = makers[_makerId];
    //     // Order storage order = orders[orderId];

    //     // TODO: dollarAmount = amount / order.price
    //     // uint256 dollarAmount = 2;

    //     // payout(maker.oracleAddr, maker.jobId, dollarAmount, receiver);
    // }

    /* ------------------------------------------------------
     *    Payout Functions
     * ------------------------------------------------------ */

    function payout(
        address _oracle,
        string calldata _jobId,
        uint amount,
        string calldata receiver
    )
        external
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