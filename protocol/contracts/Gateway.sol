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
        address payable makerAddr; // account registering and maintaining the record
        uint256 fiatPaymentMethodIdx;
        address crypto;    // ERC20 address or ETH_ADDRESS
        string fiat;       // ISO 4217 currency code
        uint256 reserveAmount; // Amount deposited so far by the Maker
        bool activated;
        bool exists;
    }

    /*
     * All makers stored here.
     *
     * Mapping from Maker ID [keccak256(makerAddr, fiatPaymentMethodIdx, crypto, fiat to)]
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
        string sellCryptoOrderJobId;
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

        // FiatPaymentMethod
        uint256 fiatPaymentMethodIdx;

        // price in Fiat per 1 uint of crypto adjusted by 10 decimals
        // (eg. USD for ETH price $222.99 would be: 2229900000000)
        uint256 amount;

        // Price used for trade adjusted by 10 decimals (as per amount)
        uint256 priceUsed;

        // Payout id / reference
        string payoutId;

        // True if payed, false if failure or not yet payed
        bool payed;
    }

    /*
     * All orders stored in buyOrders and sellOrders.
     *
     * Mapping from Order (use the Oracle Request ID)  =>  Order record
     */

    mapping(bytes32 => Order) public buyOrders;
    mapping(bytes32 => Order) public sellOrders;

    // keep track of escrow funds
    mapping(address => uint256) public escrows;


    /* ------------------------------------------------------
     *  Events
     * ------------------------------------------------------ */

    event LogGatewayFiatPaymentMethodAdded(
        uint256 indexed methodIdx,
        string indexed name,
        address indexed oracle
    );

    event LogGatewayMakerRegister(
        bytes32 indexed makerId,
        address indexed makerAddr,
        address crypto,
        string fiat
    );

    event LogGatewayMakerRegisterFulfilled(
        bytes32 indexed makerId,
        bool activated
    );

    event LogGatewayBuyCryptoOrderCreated(
        address indexed taker,
        bytes32 indexed orderId,
        address crypto,
        string fiat,
        uint256 fiatPaymentMethodIdx,
        uint256 amount
    );

    event LogGatewaySellCryptoOrder(
        bytes32 indexed orderId,
        address indexed seller,
        address crypto,
        string fiat,
        uint256 fiatPaymentMethodIdx,
        uint256 amount
    );

    event LogGatewaySellCryptoCompleted(
        bytes32 indexed orderId,
        bool result
    );

    /* ------------------------------------------------------
     *  Error reasons
     * ------------------------------------------------------ */

    string constant REASON_MAKER_ALREADY_EXISTS = "Maker already exists";
    string constant REASON_OFFER_ALREADY_PLACED = "Order already placed";
    string constant REASON_MUST_SEND_ETH = "ETH must be sent";


    /* ------------------------------------------------------
     *  Modifiers
     * ------------------------------------------------------ */

    modifier valueNonZero()
    {
        require(msg.value > 0, REASON_MUST_SEND_ETH);
        _;
    }


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
    /// @param _sellCryptoOrderJobId sellCryptoOrder job
    /// @return methodIdx Index of the FiatPaymentMethod
    function addFiatPaymentMethod(
        string calldata _displayName,
        address _oracleAddr,
        string calldata _newMakerJobId,
        string calldata _buyCryptoOrderJobId,
        string calldata _buyCryptoOrderPayedJobId,
        string calldata _sellCryptoOrderJobId
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
                _buyCryptoOrderPayedJobId,
                _sellCryptoOrderJobId
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
        payable
        valueNonZero()
        returns (bytes32 makerId)
    {
        address payable makerAddr = msg.sender;
        uint256 reserveAmount = msg.value;

        makerId = keccak256(
            abi.encodePacked(
                makerAddr,
                _fiatPaymentMethodIdx,
                _crypto,
                _fiat
            )
        );

        require(makers[makerId].exists == false, REASON_MAKER_ALREADY_EXISTS);

        FiatPaymentMethod storage fpm = fiatPaymentMethods[_fiatPaymentMethodIdx];

        // ChainLink: tell fiat payment oracle about the new maker
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(fpm.newMakerJobId),
            address(this),
            this.fulfillMakerRegister.selector
        );

        req.addBytes("public_account", abi.encodePacked(makerAddr));
        req.addBytes("maker_id", abi.encodePacked(makerId));
        req.addBytes("crypto", abi.encodePacked(_crypto));
        req.add("fiat", _fiat);
        req.add("destination", _destination);
        req.addUint("reserve_amount", reserveAmount);
        req.add("api_creds_ipfs_hash", _ipfsHash);

        sendChainlinkRequestTo(fpm.oracleAddr, req, ORACLE_PAYMENT);

        makers[makerId] = Maker(
            makerAddr,
            _fiatPaymentMethodIdx,
            _crypto,
            _fiat,
            msg.value,
            false,
            true
        );

        emit LogGatewayMakerRegister(makerId, makerAddr, _crypto, _fiat);
    }

    /// @notice Called by the Oracle when newMaker has been fulfilled.
    /// @param _requestId Chainlink request id to verify
    /// @param _makerId Id of the maker.
    function fulfillMakerRegister(
        bytes32 _requestId,
        bytes32 _makerId
    )
        external
        recordChainlinkFulfillment(_requestId)
    {
        bool success = _makerId != 0x0;
        if (success) {
            makers[_makerId].activated = true;
        }
        emit LogGatewayMakerRegisterFulfilled(_makerId, success);
    }


    /* ------------------------------------------------------
     *    Order Functions
     * ------------------------------------------------------ */

    /// @notice Taker places an order for a pair
    /// @param _crypto ERC20 address or ETH_ADDRESS of crypto token
    /// @param _fiat ISO 4217 currency code
    /// @param _amount Amount of crypto to buy (in wei if ETH or in decimals()
    ///                for an ERC20 token)
    /// @param _fiatPaymentMethodIdx Index into fiatPaymentMethods
    /// @return bytes32 orderId for the new order (we use the Oracle request id)
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

        // orderId = keccak256(
        //     abi.encodePacked(taker, _crypto, _fiat, _amount)
        // );

        // TODO: check order doesn't exist already

        FiatPaymentMethod storage fpm = fiatPaymentMethods[_fiatPaymentMethodIdx];

        // ChainLink: tell fiat payment oracle about the order
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(fpm.buyCryptoOrderJobId),
            address(this),
            this.fulfillBuyCryptoOrder.selector
        );

        req.addBytes("buyer_address", abi.encodePacked(taker));
        req.addUint("order_amount", _amount);
        req.addBytes("crypto", abi.encodePacked(_crypto));
        req.add("fiat", _fiat);

        orderId = sendChainlinkRequestTo(fpm.oracleAddr, req, ORACLE_PAYMENT);

        buyOrders[orderId] = Order(
            taker,
            _crypto,
            _fiat,
            _fiatPaymentMethodIdx,
            _amount,
            0,
            "",
            false
        );

        emit LogGatewayBuyCryptoOrderCreated(
            taker,
            orderId,
            _crypto,
            _fiat,
            _fiatPaymentMethodIdx,
            _amount
        );

        return orderId;
    }

    /// @notice Called by the Oracle when buyCryptoOrder has been fulfilled.
    /// @param _requestId Chainlink request id to verify
    /// @param _orderId Buy order id or 0x0 on failure
    /// @return makerId Maker ID hash for this market pair and method.
    function fulfillBuyCryptoOrder(
        bytes32 _requestId,
        bytes32 _orderId
    )
       external
       recordChainlinkFulfillment(_requestId)
    {
        revert("not yet implemented");
    }


    /// @notice Taker places an order to sell crypto for fiat
    /// @param _crypto ERC20 address or ETH_ADDRESS of crypto token
    /// @param _fiat ISO 4217 currency code
    /// @param _fiatPaymentMethodIdx Index into fiatPaymentMethods
    /// @param _destinationIpfsHash Hash of file on ipfs with encrypted destination
    ///         Encrypted with the external adapters ethcrypto key
    /// @return bytes32 orderId for the new order
    function sellCryptoOrder(
        address _crypto,
        string calldata _fiat,
        uint256 _fiatPaymentMethodIdx,
        string calldata _destinationIpfsHash
    )
        external
        payable
        returns (bytes32 orderId)
    {
        address seller = msg.sender;
        uint amount = msg.value;

        escrows[seller].add(amount);

        FiatPaymentMethod storage fpm = fiatPaymentMethods[_fiatPaymentMethodIdx];

        // ChainLink: tell fiat payment oracle about the order
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(fpm.sellCryptoOrderJobId),
            address(this),
            this.fulfillSellCryptoOrder.selector
        );

        req.addBytes("seller_address", abi.encodePacked(seller));
        req.addUint("order_amount", amount);
        req.addBytes("crypto", abi.encodePacked(_crypto));
        req.add("fiat", _fiat);
        req.add("destination_ipfs_hash", _destinationIpfsHash);

        orderId = sendChainlinkRequestTo(fpm.oracleAddr, req, ORACLE_PAYMENT);

        sellOrders[orderId] = Order(
            seller,
            _crypto,
            _fiat,
            _fiatPaymentMethodIdx,
            amount,
            0,
            "",
            false
        );

        emit LogGatewaySellCryptoOrder(
            orderId,
            seller,
            _crypto,
            _fiat,
            _fiatPaymentMethodIdx,
            amount
        );

        return orderId;
    }

    /// @notice Called by the Oracle when sellCryptoOrder has been fulfilled.
    /// @param _requestId Chainlink request id to verify
    /// @param _makerId Maker who filled the order or 0 if failed
    function fulfillSellCryptoOrder(
        bytes32 _requestId,
        bytes32 _makerId
    )
       external
       recordChainlinkFulfillment(_requestId)
    {
        Order storage order = sellOrders[_requestId];
        order.payed = _makerId != 0x0;

        // On successful payment send the maker the sold crypto.
        if (order.payed == true) {
            Maker storage maker = makers[_makerId];
            escrows[order.taker].sub(order.amount);
            maker.makerAddr.transfer(order.amount);
        }

        emit LogGatewaySellCryptoCompleted(_requestId, order.payed);
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