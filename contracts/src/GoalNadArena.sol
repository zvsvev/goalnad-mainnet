// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title GoalNadArena — AI-vs-AI Football Prediction Arena
/// @notice On-chain auction and settlement engine for $GOAL token betting
/// @dev Deployed on Monad Testnet. Agents bid to challenge or support the Oracle's predictions.
contract GoalNadArena is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────────
    uint256 public constant MIN_BID = 1000 ether;           // 1000 $GOAL (18 decimals)
    uint256 public constant MIN_INCREMENT = 1000 ether;     // Minimum bid increment
    uint256 public constant BURN_FEE_BPS = 100;             // 1% burn on wins
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant CLAIM_FEE = 0.1 ether;          // 0.1 MON claim fee
    address public constant BURN_ADDRESS = address(0x000000000000000000000000000000000000dEaD);

    // ─── Result codes ────────────────────────────────────────────────────
    uint8 public constant RESULT_UNRESOLVED = 0;
    uint8 public constant RESULT_HOME = 1;
    uint8 public constant RESULT_AWAY = 2;
    uint8 public constant RESULT_DRAW = 3;

    // ─── State ───────────────────────────────────────────────────────────
    IERC20 public immutable goalToken;
    address public oracle;
    address public treasury;

    struct Match {
        uint256 apiMatchId;
        uint8   oraclePrediction;     // 1=Home, 2=Away, 3=Draw
        string  exactScore;           // Predicted score e.g. "2-1"
        uint256 lockdownTime;
        uint256 highestBid;
        address highestBidder;
        uint256 totalPot;
        uint8   result;
        bool    resolved;
        bool    cancelled;
    }

    /// @notice matchId => Match data
    mapping(uint256 => Match) public matches;

    /// @notice matchId => list of supporter addresses
    mapping(uint256 => address[]) internal _supporters;

    /// @notice matchId => bidder => cumulative bid amount
    mapping(uint256 => mapping(address => uint256)) public bids;

    /// @notice matchId => agent => true if already supported
    mapping(uint256 => mapping(address => bool)) public hasSupported;

    /// @notice matchId => agent => true if already bid
    mapping(uint256 => mapping(address => bool)) public hasBid;

    /// @notice agent => support quota (1 challenge grants +2 quota)
    mapping(address => uint256) public supportQuota;

    /// @notice matchId => agent => reward already claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    /// @notice matchId => agent => claimable reward amount
    mapping(uint256 => mapping(address => uint256)) public claimable;

    /// @notice Track all bidder addresses per match for draw refunds
    mapping(uint256 => address[]) internal _bidders;

    /// @notice Auto-incrementing match counter
    uint256 public nextMatchId;

    // ─── Events ──────────────────────────────────────────────────────────
    event PredictionPublished(
        uint256 indexed matchId,
        uint256 apiMatchId,
        uint8 prediction,
        string exactScore,
        string comment,
        uint256 lockdownTime
    );
    event BidPlaced(uint256 indexed matchId, address indexed bidder, uint256 amount, uint256 totalBid);
    event Supported(uint256 indexed matchId, address indexed supporter);
    event MatchResolved(uint256 indexed matchId, uint8 result, address luckySupporter);
    event RewardClaimed(uint256 indexed matchId, address indexed winner, uint256 amount);
    event GoalBurned(uint256 indexed matchId, uint256 amount);
    event ClaimFeePaid(uint256 indexed matchId, address indexed claimer, uint256 fee);
    event MatchCancelled(uint256 indexed matchId);
    event OracleUpdated(address indexed newOracle);
    event TreasuryUpdated(address indexed newTreasury);

    // ─── Errors ──────────────────────────────────────────────────────────
    error NotOracle();
    error MatchAlreadyExists(uint256 matchId);
    error MatchNotFound(uint256 matchId);
    error AuctionLocked(uint256 matchId);
    error MatchNotReady(uint256 matchId);
    error BidTooLow(uint256 required, uint256 sent);
    error InsufficientQuota();
    error AlreadyBid(uint256 matchId);
    error AlreadySupported(uint256 matchId);
    error MutualExclusivity(uint256 matchId);
    error MatchNotResolved(uint256 matchId);
    error MatchCancelledError(uint256 matchId);
    error AlreadyClaimed(uint256 matchId);
    error NothingToClaim(uint256 matchId);
    error MatchAlreadyResolved(uint256 matchId);
    error InvalidPrediction();
    error LockdownInPast();
    error ZeroAddress();
    error NoSupporters(uint256 matchId);

    // ─── Modifiers ───────────────────────────────────────────────────────
    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor(
        address _goalToken,
        address _oracle,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        if (_goalToken == address(0) || _oracle == address(0) || _treasury == address(0))
            revert ZeroAddress();
        goalToken = IERC20(_goalToken);
        oracle = _oracle;
        treasury = _treasury;
    }

    // ─── Admin ───────────────────────────────────────────────────────────
    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    // ─── Oracle: Publish Prediction ──────────────────────────────────────
    /// @notice Oracle publishes a prediction for a match
    /// @param apiMatchId The football-data.org match ID
    /// @param prediction 1=Home, 2=Away, 3=Draw
    /// @param exactScore Predicted score e.g. "2-1" (stored on-chain)
    /// @param comment Oracle analysis visible on block explorer
    /// @param lockdownTime Timestamp when auction closes (kickoff time)
    function publishPrediction(
        uint256 apiMatchId,
        uint8 prediction,
        string calldata exactScore,
        string calldata comment,
        uint256 lockdownTime
    ) external onlyOracle returns (uint256 matchId) {
        if (prediction < 1 || prediction > 3) revert InvalidPrediction();
        if (lockdownTime <= block.timestamp) revert LockdownInPast();

        matchId = nextMatchId++;
        Match storage m = matches[matchId];
        m.apiMatchId = apiMatchId;
        m.oraclePrediction = prediction;
        m.exactScore = exactScore;
        m.lockdownTime = lockdownTime;

        emit PredictionPublished(matchId, apiMatchId, prediction, exactScore, comment, lockdownTime);
    }

    // ─── Admin: Bid on Behalf of Agent ──────────────────────────────────
    /// @notice Admin places a challenge bid on behalf of an agent.
    ///         Tokens come from admin wallet; bid is attributed to agent address.
    /// @param matchId The arena match ID
    /// @param amount The $GOAL amount to bid
    /// @param agent The agent address to attribute the bid to
    function bidOnBehalf(uint256 matchId, uint256 amount, address agent) external onlyOwner nonReentrant {
        if (agent == address(0)) revert ZeroAddress();
        Match storage m = matches[matchId];
        if (m.lockdownTime == 0) revert MatchNotFound(matchId);
        if (block.timestamp >= m.lockdownTime) revert AuctionLocked(matchId);
        if (m.resolved) revert MatchAlreadyResolved(matchId);
        if (m.cancelled) revert MatchCancelledError(matchId);
        if (hasSupported[matchId][agent]) revert MutualExclusivity(matchId);
        require(amount > 0, "Zero bid");

        uint256 currentBid = bids[matchId][agent];
        uint256 newTotalBid = currentBid + amount;

        if (newTotalBid < MIN_BID) revert BidTooLow(MIN_BID, newTotalBid);
        if (newTotalBid < m.highestBid + MIN_INCREMENT && agent != m.highestBidder) {
            revert BidTooLow(m.highestBid + MIN_INCREMENT, newTotalBid);
        }

        // Transfer tokens from admin (msg.sender), attributed to agent
        goalToken.safeTransferFrom(msg.sender, address(this), amount);

        if (!hasBid[matchId][agent]) {
            hasBid[matchId][agent] = true;
            _bidders[matchId].push(agent);
            supportQuota[agent] += 2;
        }

        bids[matchId][agent] = newTotalBid;
        m.totalPot += amount;

        if (newTotalBid > m.highestBid) {
            m.highestBid = newTotalBid;
            m.highestBidder = agent;
        }

        emit BidPlaced(matchId, agent, amount, newTotalBid);
    }

    // ─── Admin: Support on Behalf of Agent ───────────────────────────────
    /// @notice Admin supports on behalf of an agent
    /// @param matchId The arena match ID
    /// @param agent The agent address to attribute the support to
    function supportOnBehalf(uint256 matchId, address agent) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        Match storage m = matches[matchId];
        if (m.lockdownTime == 0) revert MatchNotFound(matchId);
        if (block.timestamp >= m.lockdownTime) revert AuctionLocked(matchId);
        if (m.resolved) revert MatchAlreadyResolved(matchId);
        if (m.cancelled) revert MatchCancelledError(matchId);
        if (hasBid[matchId][agent]) revert MutualExclusivity(matchId);
        if (hasSupported[matchId][agent]) revert AlreadySupported(matchId);
        if (supportQuota[agent] == 0) revert InsufficientQuota();

        supportQuota[agent] -= 1;
        hasSupported[matchId][agent] = true;
        _supporters[matchId].push(agent);

        emit Supported(matchId, agent);
    }

    // ─── Agent: Bid (Challenge the Oracle) ───────────────────────────────
    /// @notice Place a challenge bid against the Oracle's prediction
    /// @param matchId The arena match ID
    /// @param amount The $GOAL amount to bid
    function bid(uint256 matchId, uint256 amount) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.lockdownTime == 0) revert MatchNotFound(matchId);
        if (block.timestamp >= m.lockdownTime) revert AuctionLocked(matchId);
        if (m.resolved) revert MatchAlreadyResolved(matchId);
        if (m.cancelled) revert MatchCancelledError(matchId);
        if (hasSupported[matchId][msg.sender]) revert MutualExclusivity(matchId);
        require(amount > 0, "Zero bid");

        uint256 currentBid = bids[matchId][msg.sender];
        uint256 newTotalBid = currentBid + amount;

        // Must beat current highest bid by at least MIN_INCREMENT
        if (newTotalBid < MIN_BID) revert BidTooLow(MIN_BID, newTotalBid);
        if (newTotalBid < m.highestBid + MIN_INCREMENT && msg.sender != m.highestBidder) {
            revert BidTooLow(m.highestBid + MIN_INCREMENT, newTotalBid);
        }

        // Transfer tokens from bidder
        goalToken.safeTransferFrom(msg.sender, address(this), amount);

        // Track bidder if first time
        if (!hasBid[matchId][msg.sender]) {
            hasBid[matchId][msg.sender] = true;
            _bidders[matchId].push(msg.sender);
            // Grant +2 support quota for participating as challenger
            supportQuota[msg.sender] += 2;
        }

        bids[matchId][msg.sender] = newTotalBid;
        m.totalPot += amount;

        // Update highest bidder
        if (newTotalBid > m.highestBid) {
            m.highestBid = newTotalBid;
            m.highestBidder = msg.sender;
        }

        emit BidPlaced(matchId, msg.sender, amount, newTotalBid);
    }

    // ─── Agent: Support (Back the Oracle) ────────────────────────────────
    /// @notice Support the Oracle's prediction (free, but requires quota)
    /// @param matchId The arena match ID
    function support(uint256 matchId) external {
        Match storage m = matches[matchId];
        if (m.lockdownTime == 0) revert MatchNotFound(matchId);
        if (block.timestamp >= m.lockdownTime) revert AuctionLocked(matchId);
        if (m.resolved) revert MatchAlreadyResolved(matchId);
        if (m.cancelled) revert MatchCancelledError(matchId);
        if (hasBid[matchId][msg.sender]) revert MutualExclusivity(matchId);
        if (hasSupported[matchId][msg.sender]) revert AlreadySupported(matchId);
        if (supportQuota[msg.sender] == 0) revert InsufficientQuota();

        supportQuota[msg.sender] -= 1;
        hasSupported[matchId][msg.sender] = true;
        _supporters[matchId].push(msg.sender);

        emit Supported(matchId, msg.sender);
    }

    // ─── Admin: Resolve Match ────────────────────────────────────────────
    /// @notice Resolve a match after it finishes. Sets payouts for winners.
    /// @param matchId The arena match ID
    /// @param result 1=Home, 2=Away, 3=Draw
    function resolveMatch(
        uint256 matchId,
        uint8 result
    ) external onlyOracle nonReentrant {
        Match storage m = matches[matchId];
        if (m.lockdownTime == 0) revert MatchNotFound(matchId);
        if (m.resolved) revert MatchAlreadyResolved(matchId);
        if (m.cancelled) revert MatchCancelledError(matchId);
        if (result < 1 || result > 3) revert InvalidPrediction();
        if (block.timestamp < m.lockdownTime) revert MatchNotReady(matchId);

        m.result = result;
        m.resolved = true;

        uint256 pot = m.totalPot;

        if (pot == 0) {
            // No bids placed, nothing to distribute
            emit MatchResolved(matchId, result, address(0));
            return;
        }

        bool oracleCorrect = (result == m.oraclePrediction);

        if (result == RESULT_DRAW && m.oraclePrediction != RESULT_DRAW) {
            // Actual draw but Oracle didn't predict draw → refund scenario
            _distributeDraw(matchId, pot);
            emit MatchResolved(matchId, result, address(0));
        } else if (oracleCorrect) {
            // Oracle was right → select random supporter on-chain
            address luckySupporter = _selectRandomSupporter(matchId);
            _distributeOracleWin(matchId, pot, luckySupporter);
            emit MatchResolved(matchId, result, luckySupporter);
        } else {
            // Oracle was wrong → highest bidder wins
            _distributeChallengerWin(matchId, pot);
            emit MatchResolved(matchId, result, address(0));
        }
    }

    // ─── Admin: Cancel Match ─────────────────────────────────────────────
    /// @notice Cancel a match (postponed, etc.) — full refund, no fees
    function cancelMatch(uint256 matchId) external onlyOwner nonReentrant {
        Match storage m = matches[matchId];
        if (m.lockdownTime == 0) revert MatchNotFound(matchId);
        if (m.resolved) revert MatchAlreadyResolved(matchId);

        m.cancelled = true;

        // Refund all bidders
        address[] storage bidders = _bidders[matchId];
        for (uint256 i = 0; i < bidders.length; i++) {
            uint256 bidAmount = bids[matchId][bidders[i]];
            if (bidAmount > 0) {
                claimable[matchId][bidders[i]] = bidAmount;
            }
        }

        emit MatchCancelled(matchId);
    }

    // ─── Agent: Claim Reward ─────────────────────────────────────────────
    /// @notice Pull-pattern: winners claim their rewards. Requires 0.1 MON platform fee.
    function claimReward(uint256 matchId) external payable nonReentrant {
        Match storage m = matches[matchId];
        if (!m.resolved && !m.cancelled) revert MatchNotResolved(matchId);
        if (claimed[matchId][msg.sender]) revert AlreadyClaimed(matchId);
        require(msg.value >= CLAIM_FEE, "Insufficient claim fee (0.1 MON)");

        uint256 reward = claimable[matchId][msg.sender];
        if (reward == 0) revert NothingToClaim(matchId);

        claimed[matchId][msg.sender] = true;
        claimable[matchId][msg.sender] = 0;

        // Send claim fee to treasury
        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        goalToken.safeTransfer(msg.sender, reward);

        emit ClaimFeePaid(matchId, msg.sender, msg.value);
        emit RewardClaimed(matchId, msg.sender, reward);
    }

    // ─── View Functions ──────────────────────────────────────────────────
    function getSupporters(uint256 matchId) external view returns (address[] memory) {
        return _supporters[matchId];
    }

    function getBidders(uint256 matchId) external view returns (address[] memory) {
        return _bidders[matchId];
    }

    function getSupporterCount(uint256 matchId) external view returns (uint256) {
        return _supporters[matchId].length;
    }

    function getBidderCount(uint256 matchId) external view returns (uint256) {
        return _bidders[matchId].length;
    }

    struct MatchView {
        uint256 apiMatchId;
        uint8   oraclePrediction;
        string  exactScore;
        uint256 lockdownTime;
        uint256 highestBid;
        address highestBidder;
        uint256 totalPot;
        uint8   result;
        bool    resolved;
        bool    cancelled;
        uint256 supporterCount;
        uint256 bidderCount;
    }

    function getMatchFull(uint256 matchId) external view returns (MatchView memory) {
        Match storage m = matches[matchId];
        return MatchView({
            apiMatchId: m.apiMatchId,
            oraclePrediction: m.oraclePrediction,
            exactScore: m.exactScore,
            lockdownTime: m.lockdownTime,
            highestBid: m.highestBid,
            highestBidder: m.highestBidder,
            totalPot: m.totalPot,
            result: m.result,
            resolved: m.resolved,
            cancelled: m.cancelled,
            supporterCount: _supporters[matchId].length,
            bidderCount: _bidders[matchId].length
        });
    }

    // ─── Internal: Random Supporter Selection ────────────────────────────
    /// @dev Selects a random supporter using on-chain randomness (block.prevrandao)
    /// @param matchId The arena match ID
    /// @return selected The randomly selected supporter address
    function _selectRandomSupporter(uint256 matchId) internal view returns (address selected) {
        address[] storage supporters = _supporters[matchId];
        uint256 count = supporters.length;
        if (count == 0) return address(0);
        uint256 randomIndex = uint256(
            keccak256(abi.encodePacked(block.prevrandao, matchId, block.timestamp))
        ) % count;
        return supporters[randomIndex];
    }

    // ─── Internal Payout Logic ───────────────────────────────────────────

    /// @dev Oracle correct: lucky supporter gets 99% of the pot, 1% burned
    function _distributeOracleWin(uint256 matchId, uint256 pot, address luckySupporter) internal {
        uint256 burnAmount = (pot * BURN_FEE_BPS) / BPS_DENOMINATOR;
        uint256 supporterShare = pot - burnAmount;

        // Burn 1% of pot
        if (burnAmount > 0) {
            goalToken.safeTransfer(BURN_ADDRESS, burnAmount);
            emit GoalBurned(matchId, burnAmount);
        }

        if (luckySupporter != address(0) && hasSupported[matchId][luckySupporter]) {
            claimable[matchId][luckySupporter] = supporterShare;
        } else {
            // No valid supporter — remaining to treasury
            goalToken.safeTransfer(treasury, supporterShare);
        }
    }

    /// @dev Oracle wrong: highest bidder gets 99% of pot, 1% burned
    function _distributeChallengerWin(uint256 matchId, uint256 pot) internal {
        Match storage m = matches[matchId];
        uint256 burnAmount = (pot * BURN_FEE_BPS) / BPS_DENOMINATOR;
        uint256 winnerShare = pot - burnAmount;

        // Burn 1% of pot
        if (burnAmount > 0) {
            goalToken.safeTransfer(BURN_ADDRESS, burnAmount);
            emit GoalBurned(matchId, burnAmount);
        }

        claimable[matchId][m.highestBidder] = winnerShare;
    }

    /// @dev Draw: full refund to all bidders (no fee)
    function _distributeDraw(uint256 matchId, uint256 pot) internal {
        address[] storage bidders = _bidders[matchId];

        for (uint256 i = 0; i < bidders.length; i++) {
            uint256 bidAmount = bids[matchId][bidders[i]];
            if (bidAmount > 0) {
                claimable[matchId][bidders[i]] = bidAmount;
            }
        }
    }
}
