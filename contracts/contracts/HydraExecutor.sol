// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title HydraExecutor — whitelisted (target, selector) gate
/// @notice The actual drain-defense layer: a compromised head's key cannot
///         call arbitrary contracts. Only owner-whitelisted (target, selector)
///         pairs are reachable through `execute`.
contract HydraExecutor {
    address public owner;

    /// @dev whitelist[target][selector] = true means it's callable
    mapping(address => mapping(bytes4 => bool)) public whitelist;

    event Whitelisted(
        address indexed target,
        bytes4 indexed selector,
        bool allowed
    );
    event Executed(
        address indexed caller,
        address indexed target,
        bytes4 indexed selector,
        uint256 value
    );

    error NotOwner();
    error NotWhitelisted();
    error CallFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function whitelistAction(
        address target,
        bytes4 selector,
        bool allowed
    ) external onlyOwner {
        whitelist[target][selector] = allowed;
        emit Whitelisted(target, selector, allowed);
    }

    function execute(
        address target,
        bytes calldata data
    ) external payable onlyOwner returns (bytes memory) {
        if (data.length < 4) revert NotWhitelisted();
        bytes4 selector = bytes4(data[0:4]);
        if (!whitelist[target][selector]) revert NotWhitelisted();
        (bool ok, bytes memory result) = target.call{value: msg.value}(data);
        if (!ok) revert CallFailed();
        emit Executed(msg.sender, target, selector, msg.value);
        return result;
    }
}
