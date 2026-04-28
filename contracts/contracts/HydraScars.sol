// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice ERC-721 receiver hook for safeTransferFrom.
interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

/// @notice Inline base64 encoder so tokenURI can return a self-contained
///         data: URI without an off-chain dependency.
library Base64 {
    string internal constant TABLE =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        bytes memory table = bytes(TABLE);

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            for {
                let dataPtr := data
                let endPtr := add(data, mload(data))
            } lt(dataPtr, endPtr) {

            } {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 1), 0x3d)
                mstore8(sub(resultPtr, 2), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }
        return string(result);
    }
}

/// @title HydraScars — ERC-721 iNFT for swarm-learned defenses
/// @notice Each scar = one death cause + the rule learned from it. Minted on
///         chain so the swarm's "memory of attacks" is publicly auditable. The
///         rule string is stored in `ruleOf[tokenId]` (not an off-chain hash)
///         and surfaced via `tokenURI` as a data:application/json;base64 URI
///         that explorer UIs render as a proper NFT card.
///
///         Standards: full ERC-721 + ERC-165 + ERC-721Metadata. ERC-7857
///         compliance is deferred — see SPONSORS.md for rationale.
contract HydraScars {
    // === ERC-721 Metadata ===
    string public constant name = "HYDRA Scars";
    string public constant symbol = "HSCAR";

    // === ownership / authorisation ===
    address public owner;
    address public registry;

    uint256 public totalSupply;

    // === ERC-721 storage ===
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // === embedded scar memory (load-bearing — do not remove) ===
    mapping(uint256 => bytes32) public causeOf;
    mapping(uint256 => string) public ruleOf;
    mapping(uint256 => uint256) public mintedAt;
    /// @dev "resurrected" by default, "defended" once scar-enforced defense ships (v2 build).
    mapping(uint256 => string) public outcomeOf;

    // === events ===
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MintedScar(
        uint256 indexed tokenId,
        bytes32 indexed cause,
        string rule,
        address indexed inheritor
    );
    event OutcomeUpdated(uint256 indexed tokenId, string outcome);

    // === errors ===
    error NotAuthorized();
    error TokenDoesNotExist();
    error NotOwnerOrApproved();
    error TransferToZeroAddress();
    error TransferFromIncorrectOwner();
    error ApprovalToCurrentOwner();
    error ApproveToCaller();
    error TransferToNonERC721ReceiverImplementer();

    constructor() {
        owner = msg.sender;
    }

    function setRegistry(address _registry) external {
        if (msg.sender != owner) revert NotAuthorized();
        registry = _registry;
    }

    // ============== ERC-165 ==============

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f;   // ERC-721Metadata
    }

    // ============== ERC-721 ==============

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        if (o == address(0)) revert TokenDoesNotExist();
        return o;
    }

    function balanceOf(address holder) external view returns (uint256) {
        if (holder == address(0)) revert TransferToZeroAddress();
        return _balances[holder];
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (to == tokenOwner) revert ApprovalToCurrentOwner();
        if (msg.sender != tokenOwner && !_operatorApprovals[tokenOwner][msg.sender]) {
            revert NotOwnerOrApproved();
        }
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        if (operator == msg.sender) revert ApproveToCaller();
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address holder, address operator) external view returns (bool) {
        return _operatorApprovals[holder][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (!_isAuthorized(msg.sender, tokenId)) revert NotOwnerOrApproved();
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public {
        if (!_isAuthorized(msg.sender, tokenId)) revert NotOwnerOrApproved();
        _transfer(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, data);
    }

    function _isAuthorized(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return
            spender == tokenOwner ||
            _tokenApprovals[tokenId] == spender ||
            _operatorApprovals[tokenOwner][spender];
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        if (ownerOf(tokenId) != from) revert TransferFromIncorrectOwner();
        if (to == address(0)) revert TransferToZeroAddress();
        delete _tokenApprovals[tokenId];
        unchecked {
            _balances[from] -= 1;
            _balances[to] += 1;
        }
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (
                bytes4 retval
            ) {
                if (retval != IERC721Receiver.onERC721Received.selector) {
                    revert TransferToNonERC721ReceiverImplementer();
                }
            } catch {
                revert TransferToNonERC721ReceiverImplementer();
            }
        }
    }

    // ============== mint + mutate ==============

    function mintScar(
        bytes32 cause,
        string calldata rule,
        address to
    ) external returns (uint256) {
        if (msg.sender != owner && msg.sender != registry) revert NotAuthorized();
        if (to == address(0)) revert TransferToZeroAddress();
        uint256 id = ++totalSupply;
        _owners[id] = to;
        unchecked {
            _balances[to] += 1;
        }
        causeOf[id] = cause;
        ruleOf[id] = rule;
        mintedAt[id] = block.timestamp;
        outcomeOf[id] = "resurrected";
        emit Transfer(address(0), to, id);
        emit MintedScar(id, cause, rule, to);
        return id;
    }

    /// @dev Lets the registry/owner mark a scar as "defended" once a future
    ///      attack of the same cause is mechanically blocked instead of
    ///      resulting in a resurrection. Wired in a v2 build step.
    function setOutcome(uint256 tokenId, string calldata newOutcome) external {
        if (msg.sender != owner && msg.sender != registry) revert NotAuthorized();
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
        outcomeOf[tokenId] = newOutcome;
        emit OutcomeUpdated(tokenId, newOutcome);
    }

    // ============== ERC-721 Metadata: tokenURI ==============

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();

        bytes memory json = abi.encodePacked(
            '{"name":"Scar #',
            _toString(tokenId),
            '","description":"A defense rule the HYDRA swarm has learned. Each scar is minted on the death of an agent and inherited by every survivor and future spawn - the swarm gets stronger every time it is attacked.","cause":"',
            _bytes32ToHex(causeOf[tokenId]),
            '","rule":',
            _quoteString(ruleOf[tokenId]),
            ',"attributes":[{"trait_type":"cause","value":',
            _quoteString(_decodeBytes32(causeOf[tokenId])),
            '},{"trait_type":"scar_id","value":',
            _toString(tokenId),
            '},{"trait_type":"outcome","value":',
            _quoteString(outcomeOf[tokenId]),
            "}]}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    // ============== helpers ==============

    function _decodeBytes32(bytes32 b) internal pure returns (string memory) {
        uint256 len;
        while (len < 32 && b[len] != 0) {
            unchecked {
                len++;
            }
        }
        bytes memory s = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            s[i] = b[i];
        }
        return string(s);
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

    function _bytes32ToHex(bytes32 b) internal pure returns (string memory) {
        bytes memory hexAlphabet = "0123456789abcdef";
        bytes memory out = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            out[2 * i] = hexAlphabet[uint8(b[i] >> 4)];
            out[2 * i + 1] = hexAlphabet[uint8(b[i] & 0x0f)];
        }
        return string(out);
    }

    function _quoteString(string memory s) internal pure returns (string memory) {
        return string(abi.encodePacked('"', s, '"'));
    }
}
