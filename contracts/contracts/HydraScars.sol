// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title HydraScars — minimal iNFT for swarm-learned defenses
/// @notice Each scar = one death cause + the rule learned from it. Minted
///         on chain so the swarm's "memory of attacks" is publicly auditable.
///         Loose ERC-721 surface (ownerOf, Transfer); on-chain metadata.
contract HydraScars {
    string public constant name = "HYDRA Scars";
    string public constant symbol = "HSCAR";

    uint256 public totalSupply;
    address public owner;
    address public registry;

    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => bytes32) public causeOf;
    mapping(uint256 => string) public ruleOf;
    mapping(uint256 => uint256) public mintedAt;

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event Minted(
        uint256 indexed tokenId,
        bytes32 indexed cause,
        string rule,
        address indexed to,
        uint256 ts
    );

    error NotAuthorized();

    constructor() {
        owner = msg.sender;
    }

    function setRegistry(address _registry) external {
        if (msg.sender != owner) revert NotAuthorized();
        registry = _registry;
    }

    function mintScar(
        bytes32 cause,
        string calldata rule,
        address to
    ) external returns (uint256) {
        if (msg.sender != owner && msg.sender != registry) {
            revert NotAuthorized();
        }
        uint256 id = ++totalSupply;
        ownerOf[id] = to;
        causeOf[id] = cause;
        ruleOf[id] = rule;
        mintedAt[id] = block.timestamp;
        emit Transfer(address(0), to, id);
        emit Minted(id, cause, rule, to, block.timestamp);
        return id;
    }

    /// @dev Returns a JSON metadata blob inline. Production would base64-wrap
    ///      it into a `data:application/json;base64,…` URL but keeping it
    ///      raw JSON here keeps the contract small and human-readable.
    function tokenURI(
        uint256 tokenId
    ) external view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '{"name":"Scar #',
                    _toString(tokenId),
                    '","cause":"',
                    _bytes32ToHex(causeOf[tokenId]),
                    '","rule":',
                    _quoteString(ruleOf[tokenId]),
                    "}"
                )
            );
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (v != 0) {
            k--;
            bstr[k] = bytes1(uint8(48 + (v % 10)));
            v /= 10;
        }
        return string(bstr);
    }

    function _bytes32ToHex(
        bytes32 b
    ) internal pure returns (string memory) {
        bytes memory hexAlphabet = "0123456789abcdef";
        bytes memory out = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            out[2 * i] = hexAlphabet[uint8(b[i] >> 4)];
            out[2 * i + 1] = hexAlphabet[uint8(b[i] & 0x0f)];
        }
        return string(out);
    }

    function _quoteString(
        string memory s
    ) internal pure returns (string memory) {
        return string(abi.encodePacked('"', s, '"'));
    }
}
