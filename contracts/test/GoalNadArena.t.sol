// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/GoalToken.sol";
import "../src/GoalNadArena.sol";

contract GoalNadArenaTest is Test {
    GoalToken public token;
    GoalNadArena public arena;

    address public owner = address(1);
    address public oracleAddr = address(2);
    address public treasuryAddr = address(3);
    address public agent1 = address(10);
    address public agent2 = address(11);
    address public agent3 = address(12);
    address public supporter1 = address(20);
    address public supporter2 = address(21);

    uint256 constant INITIAL_BALANCE = 100_000 ether;
    uint256 constant ONE_DAY = 1 days;

    function setUp() public {
        vm.startPrank(owner);

        token = new GoalToken(owner);
        arena = new GoalNadArena(
            address(token),
            oracleAddr,
            treasuryAddr,
            owner
        );
        token.setArena(address(arena));

        // Fund agents
        token.mint(agent1, INITIAL_BALANCE);
        token.mint(agent2, INITIAL_BALANCE);
        token.mint(agent3, INITIAL_BALANCE);

        vm.stopPrank();

        // Approve arena for all agents
        vm.prank(agent1);
        token.approve(address(arena), type(uint256).max);
        vm.prank(agent2);
        token.approve(address(arena), type(uint256).max);
        vm.prank(agent3);
        token.approve(address(arena), type(uint256).max);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _publishMatch(uint256 apiMatchId, uint8 prediction) internal returns (uint256) {
        vm.prank(oracleAddr);
        return arena.publishPrediction(apiMatchId, prediction, block.timestamp + ONE_DAY);
    }

    // ─── GoalToken Tests ─────────────────────────────────────────────────

    function test_TokenMetadata() public view {
        assertEq(token.name(), "GoalNad Token");
        assertEq(token.symbol(), "GOAL");
        assertEq(token.decimals(), 18);
    }

    function test_Faucet() public {
        address user = address(99);
        assertEq(token.balanceOf(user), 0);

        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), 100_000 ether);
    }

    function test_FaucetCooldown() public {
        address user = address(99);
        vm.prank(user);
        token.faucet();

        vm.prank(user);
        vm.expectRevert();
        token.faucet();

        // Warp past cooldown
        vm.warp(block.timestamp + 24 hours + 1);
        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), 200_000 ether);
    }

    function test_OnlyOwnerMint() public {
        vm.prank(agent1);
        vm.expectRevert();
        token.mint(agent1, 1000 ether);
    }

    // ─── Publish Prediction Tests ────────────────────────────────────────

    function test_PublishPrediction() public {
        uint256 matchId = _publishMatch(42001, 1);
        assertEq(matchId, 0);

        (uint256 apiMatchId, uint8 pred,,,,,,, ) = arena.matches(matchId);
        assertEq(apiMatchId, 42001);
        assertEq(pred, 1);
    }

    function test_PublishPrediction_InvalidPrediction() public {
        vm.prank(oracleAddr);
        vm.expectRevert(GoalNadArena.InvalidPrediction.selector);
        arena.publishPrediction(42001, 0, block.timestamp + ONE_DAY);

        vm.prank(oracleAddr);
        vm.expectRevert(GoalNadArena.InvalidPrediction.selector);
        arena.publishPrediction(42001, 4, block.timestamp + ONE_DAY);
    }

    function test_PublishPrediction_OnlyOracle() public {
        vm.prank(agent1);
        vm.expectRevert(GoalNadArena.NotOracle.selector);
        arena.publishPrediction(42001, 1, block.timestamp + ONE_DAY);
    }

    function test_PublishMultipleMatches() public {
        uint256 id0 = _publishMatch(100, 1);
        uint256 id1 = _publishMatch(101, 2);
        uint256 id2 = _publishMatch(102, 3);
        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    // ─── Bid Tests ───────────────────────────────────────────────────────

    function test_Bid_Basic() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 1000 ether);

        assertEq(arena.bids(matchId, agent1), 1000 ether);
        assertEq(token.balanceOf(agent1), INITIAL_BALANCE - 1000 ether);
        assertEq(arena.supportQuota(agent1), 2); // +2 quota for first bid
    }

    function test_Bid_Outbid() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 1000 ether);

        vm.prank(agent2);
        arena.bid(matchId, 2000 ether);

        (, , , uint256 highestBid, address highestBidder, uint256 totalPot, , , ) = arena.matches(matchId);
        assertEq(highestBid, 2000 ether);
        assertEq(highestBidder, agent2);
        assertEq(totalPot, 3000 ether);
    }

    function test_Bid_TopUp() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 1000 ether);

        // Agent1 tops up their bid
        vm.prank(agent1);
        arena.bid(matchId, 2000 ether);

        assertEq(arena.bids(matchId, agent1), 3000 ether);
        // Quota should only be granted once
        assertEq(arena.supportQuota(agent1), 2);
    }

    function test_Bid_TooLow() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        vm.expectRevert();
        arena.bid(matchId, 500 ether); // Below MIN_BID
    }

    function test_Bid_IncrementTooLow() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 5000 ether);

        vm.prank(agent2);
        vm.expectRevert();
        arena.bid(matchId, 5500 ether); // Need at least 6000 (5000 + 1000 increment)
    }

    function test_Bid_AfterLockdown() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.warp(block.timestamp + ONE_DAY + 1);

        vm.prank(agent1);
        vm.expectRevert(abi.encodeWithSelector(GoalNadArena.AuctionLocked.selector, matchId));
        arena.bid(matchId, 1000 ether);
    }

    function test_Bid_MutualExclusivity() public {
        uint256 matchId = _publishMatch(42001, 1);

        // Agent1 bids first to get quota, then bids on another match to get more
        vm.prank(agent1);
        arena.bid(matchId, 1000 ether);

        // Agent1 now has quota=2. Give supporter1 quota by having them bid on different match
        uint256 matchId2 = _publishMatch(42002, 2);
        vm.prank(supporter1);
        token.approve(address(arena), type(uint256).max);
        vm.startPrank(owner);
        token.mint(supporter1, INITIAL_BALANCE);
        vm.stopPrank();
        vm.prank(supporter1);
        token.approve(address(arena), type(uint256).max);
        vm.prank(supporter1);
        arena.bid(matchId2, 1000 ether);

        // Now supporter1 has quota=2, support on matchId
        vm.prank(supporter1);
        arena.support(matchId);

        // Try to bid after supporting — should revert
        vm.prank(supporter1);
        vm.expectRevert(abi.encodeWithSelector(GoalNadArena.MutualExclusivity.selector, matchId));
        arena.bid(matchId, 2000 ether);
    }

    // ─── Support Tests ───────────────────────────────────────────────────

    function test_Support_Basic() public {
        uint256 matchId = _publishMatch(42001, 1);

        // Agent1 bids to get quota
        vm.prank(agent1);
        arena.bid(matchId, 1000 ether);
        assertEq(arena.supportQuota(agent1), 2);

        // Agent1 supports a different match
        uint256 matchId2 = _publishMatch(42002, 2);
        vm.prank(agent1);
        arena.support(matchId2);

        assertEq(arena.supportQuota(agent1), 1);
        assertEq(arena.getSupporterCount(matchId2), 1);
    }

    function test_Support_NoQuota() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(supporter1);
        vm.expectRevert(GoalNadArena.InsufficientQuota.selector);
        arena.support(matchId);
    }

    function test_Support_DoubleSupport() public {
        uint256 matchId = _publishMatch(42001, 1);
        uint256 matchId2 = _publishMatch(42002, 2);

        // Get quota
        vm.prank(agent1);
        arena.bid(matchId2, 1000 ether);

        vm.prank(agent1);
        arena.support(matchId);

        // Give more quota
        uint256 matchId3 = _publishMatch(42003, 1);
        vm.prank(agent1);
        arena.bid(matchId3, 1000 ether);

        vm.prank(agent1);
        vm.expectRevert(abi.encodeWithSelector(GoalNadArena.AlreadySupported.selector, matchId));
        arena.support(matchId);
    }

    // ─── Resolution Tests ────────────────────────────────────────────────

    function test_Resolve_ChallengerWins() public {
        // Oracle predicts Home (1), result is Away (2) → challenger wins
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 5000 ether);

        vm.prank(agent2);
        arena.bid(matchId, 7000 ether);

        // Warp past lockdown
        vm.warp(block.timestamp + ONE_DAY + 1);

        // Resolve: Away win (Oracle was wrong)
        vm.prank(owner);
        arena.resolveMatch(matchId, 2, address(0));

        // Agent2 (highest bidder) gets full pot (5000 + 7000 = 12000)
        assertEq(arena.claimable(matchId, agent2), 12000 ether);
        assertEq(arena.claimable(matchId, agent1), 0); // Losing challenger gets nothing

        // Claim
        uint256 balBefore = token.balanceOf(agent2);
        vm.prank(agent2);
        arena.claimReward(matchId);
        assertEq(token.balanceOf(agent2), balBefore + 12000 ether);
    }

    function test_Resolve_OracleWins_WithSupporter() public {
        // Oracle predicts Home (1), result is Home (1) → Oracle wins
        uint256 matchId = _publishMatch(42001, 1);
        uint256 matchId2 = _publishMatch(42002, 2);

        // Agent1 bids to get quota
        vm.prank(agent1);
        arena.bid(matchId2, 1000 ether);

        // Agent2 challenges
        vm.prank(agent2);
        arena.bid(matchId, 8000 ether);

        // Agent1 supports (has 2 quota from bidding on matchId2)
        vm.prank(agent1);
        arena.support(matchId);

        vm.warp(block.timestamp + ONE_DAY + 1);

        uint256 treasuryBefore = token.balanceOf(treasuryAddr);

        // Resolve: Home win (Oracle correct), agent1 is lucky supporter
        vm.prank(owner);
        arena.resolveMatch(matchId, 1, agent1);

        // Lucky supporter gets 50% of pot (8000 * 50% = 4000)
        assertEq(arena.claimable(matchId, agent1), 4000 ether);

        // Treasury gets 50% (4000)
        assertEq(token.balanceOf(treasuryAddr), treasuryBefore + 4000 ether);

        // Claim
        vm.prank(agent1);
        arena.claimReward(matchId);
    }

    function test_Resolve_OracleWins_NoSupporters() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 5000 ether);

        vm.warp(block.timestamp + ONE_DAY + 1);

        uint256 treasuryBefore = token.balanceOf(treasuryAddr);

        // Resolve: Home win, no supporters → 100% to treasury
        vm.prank(owner);
        arena.resolveMatch(matchId, 1, address(0));

        assertEq(token.balanceOf(treasuryAddr), treasuryBefore + 5000 ether);
    }

    function test_Resolve_Draw_Refund() public {
        // Oracle predicts Home (1), result is Draw (3) → draw refund
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 5000 ether);

        vm.prank(agent2);
        arena.bid(matchId, 7000 ether);

        vm.warp(block.timestamp + ONE_DAY + 1);

        uint256 treasuryBefore = token.balanceOf(treasuryAddr);

        vm.prank(owner);
        arena.resolveMatch(matchId, 3, address(0));

        // Agent1: 5000 - 1% = 4950
        assertEq(arena.claimable(matchId, agent1), 4950 ether);
        // Agent2: 7000 - 1% = 6930
        assertEq(arena.claimable(matchId, agent2), 6930 ether);
        // Treasury: 50 + 70 = 120
        assertEq(token.balanceOf(treasuryAddr), treasuryBefore + 120 ether);

        // Both can claim
        vm.prank(agent1);
        arena.claimReward(matchId);
        vm.prank(agent2);
        arena.claimReward(matchId);
    }

    function test_Resolve_DrawPredictedDraw() public {
        // Oracle predicts Draw (3), result is Draw (3) → Oracle CORRECT
        uint256 matchId = _publishMatch(42001, 3);
        uint256 matchId2 = _publishMatch(42002, 1);

        // Agent1 bids to get quota
        vm.prank(agent1);
        arena.bid(matchId2, 1000 ether);

        // Agent2 challenges
        vm.prank(agent2);
        arena.bid(matchId, 6000 ether);

        // Agent1 supports
        vm.prank(agent1);
        arena.support(matchId);

        vm.warp(block.timestamp + ONE_DAY + 1);

        // Resolve: Draw (Oracle predicted Draw → Oracle correct)
        vm.prank(owner);
        arena.resolveMatch(matchId, 3, agent1);

        // Lucky supporter gets 50%
        assertEq(arena.claimable(matchId, agent1), 3000 ether);
    }

    function test_Resolve_NoBids() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.warp(block.timestamp + ONE_DAY + 1);

        // Should resolve without error even with no bids
        vm.prank(owner);
        arena.resolveMatch(matchId, 1, address(0));

        (, , , , , , , bool resolved, ) = arena.matches(matchId);
        assertTrue(resolved);
    }

    function test_Resolve_DoubleResolve() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.warp(block.timestamp + ONE_DAY + 1);

        vm.prank(owner);
        arena.resolveMatch(matchId, 1, address(0));

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(GoalNadArena.MatchAlreadyResolved.selector, matchId));
        arena.resolveMatch(matchId, 2, address(0));
    }

    // ─── Cancel Tests ────────────────────────────────────────────────────

    function test_CancelMatch() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 5000 ether);

        vm.prank(agent2);
        arena.bid(matchId, 7000 ether);

        vm.prank(owner);
        arena.cancelMatch(matchId);

        // Full refund, no fees
        assertEq(arena.claimable(matchId, agent1), 5000 ether);
        assertEq(arena.claimable(matchId, agent2), 7000 ether);

        vm.prank(agent1);
        arena.claimReward(matchId);
        vm.prank(agent2);
        arena.claimReward(matchId);

        assertEq(token.balanceOf(agent1), INITIAL_BALANCE);
        assertEq(token.balanceOf(agent2), INITIAL_BALANCE);
    }

    // ─── Claim Edge Cases ────────────────────────────────────────────────

    function test_Claim_DoubleClaim() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 5000 ether);

        vm.warp(block.timestamp + ONE_DAY + 1);

        vm.prank(owner);
        arena.resolveMatch(matchId, 2, address(0));

        vm.prank(agent1);
        arena.claimReward(matchId);

        vm.prank(agent1);
        vm.expectRevert(abi.encodeWithSelector(GoalNadArena.AlreadyClaimed.selector, matchId));
        arena.claimReward(matchId);
    }

    function test_Claim_NothingToClaim() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 5000 ether);

        vm.warp(block.timestamp + ONE_DAY + 1);

        vm.prank(owner);
        arena.resolveMatch(matchId, 1, address(0)); // Oracle wins, no supporters

        // Agent1 (challenger) has nothing to claim since Oracle won
        vm.prank(agent1);
        vm.expectRevert(abi.encodeWithSelector(GoalNadArena.NothingToClaim.selector, matchId));
        arena.claimReward(matchId);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function test_GetMatchFull() public {
        uint256 matchId = _publishMatch(42001, 1);

        vm.prank(agent1);
        arena.bid(matchId, 3000 ether);

        GoalNadArena.MatchView memory mv = arena.getMatchFull(matchId);

        assertEq(mv.apiMatchId, 42001);
        assertEq(mv.oraclePrediction, 1);
        assertGt(mv.lockdownTime, 0);
        assertEq(mv.highestBid, 3000 ether);
        assertEq(mv.highestBidder, agent1);
        assertEq(mv.totalPot, 3000 ether);
        assertEq(mv.result, 0);
        assertFalse(mv.resolved);
        assertFalse(mv.cancelled);
        assertEq(mv.supporterCount, 0);
        assertEq(mv.bidderCount, 1);
    }
}
