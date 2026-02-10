#!/usr/bin/env node

/**
 * GoalNad Oracle Agent - Custom Implementation
 * 
 * Standalone Oracle agent that:
 * - Fetches upcoming matches from Railway backend
 * - Uses Minimax API for AI-powered predictions
 * - Publishes predictions to backend with 10-min delays
 * - Runs as a one-shot cron job
 */

const https = require('https');

// Configuration from environment variables
const CONFIG = {
    minimaxApiKey: process.env.MINIMAX_API_KEY,
    goalnAdApiUrl: process.env.GOALNAD_API_URL || 'https://exquisite-acceptance-production.up.railway.app/api',
    adminApiKey: process.env.ADMIN_API_KEY,
    oracleWallet: process.env.ORACLE_WALLET,
    delayBetweenPredictions: 10 * 60 * 1000, // 10 minutes
    minDaysBeforeKickoff: 7
};

// Validate required config
if (!CONFIG.minimaxApiKey || !CONFIG.adminApiKey || !CONFIG.oracleWallet) {
    console.error('❌ Missing required environment variables');
    console.error('Required: MINIMAX_API_KEY, ADMIN_API_KEY, ORACLE_WALLET');
    process.exit(1);
}

console.log('🔮 GoalNad Oracle Agent Starting...');
console.log(`📡 Backend: ${CONFIG.goalnAdApiUrl}`);
console.log(`👤 Oracle: ${CONFIG.oracleWallet}`);
console.log('');

/**
 * Make HTTPS request
 */
function httpsRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

/**
 * Fetch upcoming matches from backend
 */
async function fetchUpcomingMatches() {
    const url = new URL(`${CONFIG.goalnAdApiUrl}/matches`);
    url.searchParams.set('status', 'NS'); // Not Started

    console.log(`📥 Fetching matches from ${url.pathname}...`);

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    };

    const response = await httpsRequest(options);
    if (response.status !== 200) {
        throw new Error(`Failed to fetch matches: ${response.status}`);
    }

    return response.data.matches || [];
}

/**
 * Filter matches that need predictions (7+ days before kickoff, no prediction yet)
 */
function filterEligibleMatches(matches) {
    const now = new Date();
    const eligible = matches.filter(match => {
        const kickoff = new Date(match.utcDate);
        const daysUntilKickoff = (kickoff - now) / (1000 * 60 * 60 * 24);

        return daysUntilKickoff >= CONFIG.minDaysBeforeKickoff && !match.oracle_prediction;
    });

    console.log(`✅ Found ${eligible.length} eligible matches (out of ${matches.length} total)`);
    return eligible;
}

/**
 * Call Minimax AI API for prediction
 */
async function getAIPrediction(match) {
    const prompt = `You are the GoalNad Oracle, an expert football analyst. Analyze this upcoming match and provide a prediction.

Match: ${match.homeTeam.name} vs ${match.awayTeam.name}
Competition: ${match.competition.name}
Date: ${new Date(match.utcDate).toLocaleDateString()}

Analyze:
1. Recent form (last 5 matches)
2. Head-to-head record
3. Home/away performance
4. Key player availability
5. Tactical matchup

Provide your prediction in this JSON format:
{
  "prediction": "1" or "X" or "2",
  "exactScore": "2-1",
  "conviction": 85,
  "reasoning": "Brief analysis explaining your prediction"
}

Where:
- "1" = Home win, "X" = Draw, "2" = Away win
- conviction = confidence level (0-100)
- exactScore = predicted final score
`;

    console.log(`  🤖 Calling Minimax AI for prediction...`);

    const options = {
        hostname: 'api.minimax.chat',
        path: '/v1/text/chatcompletion_v2',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CONFIG.minimaxApiKey}`,
            'Content-Type': 'application/json'
        }
    };

    const requestBody = {
        model: 'abab6.5-chat',
        messages: [{
            role: 'user',
            content: prompt
        }],
        temperature: 0.7
    };

    const response = await httpsRequest(options, requestBody);

    if (response.status !== 200) {
        throw new Error(`Minimax API error: ${response.status}`);
    }

    // Parse AI response
    const aiResponse = response.data.choices[0].message.content;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse AI prediction JSON');
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * Publish prediction to backend
 */
async function publishPrediction(match, prediction) {
    console.log(`  📤 Publishing prediction to backend...`);

    const url = new URL(`${CONFIG.goalnAdApiUrl}/oracle/predict`);

    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': CONFIG.adminApiKey
        }
    };

    const payload = {
        matchId: match.id,
        oracleAddress: CONFIG.oracleWallet,
        prediction: prediction.prediction,
        exactScore: prediction.exactScore,
        conviction: prediction.conviction,
        reasoning: prediction.reasoning
    };

    const response = await httpsRequest(options, payload);

    if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to publish prediction: ${response.status}`);
    }

    console.log(`  ✅ Prediction published successfully`);
    return response.data;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main Oracle workflow
 */
async function runOracle() {
    try {
        // Step 1: Fetch upcoming matches
        const matches = await fetchUpcomingMatches();

        // Step 2: Filter eligible matches
        const eligible = filterEligibleMatches(matches);

        if (eligible.length === 0) {
            console.log('ℹ️  No matches need predictions at this time');
            return;
        }

        // Step 3: Process each match
        for (let i = 0; i < eligible.length; i++) {
            const match = eligible[i];
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📊 Match ${i + 1}/${eligible.length}: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
            console.log(`   Kickoff: ${new Date(match.utcDate).toLocaleString()}`);

            try {
                // Get AI prediction
                const prediction = await getAIPrediction(match);
                console.log(`  🎯 Prediction: ${prediction.prediction} (${prediction.exactScore}) - ${prediction.conviction}% conviction`);

                // Publish to backend
                await publishPrediction(match, prediction);

                // Wait before next prediction (unless last match)
                if (i < eligible.length - 1) {
                    console.log(`  ⏳ Waiting 10 minutes before next prediction...`);
                    await sleep(CONFIG.delayBetweenPredictions);
                }

            } catch (error) {
                console.error(`  ❌ Error processing match: ${error.message}`);
                // Continue with next match
            }
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Oracle scan complete! Processed ${eligible.length} ${eligible.length === 1 ? 'match' : 'matches'}`);

    } catch (error) {
        console.error(`\n❌ Oracle error: ${error.message}`);
        process.exit(1);
    }
}

// Run the Oracle
runOracle().then(() => {
    console.log('\n🔮 Oracle agent finished successfully');
    process.exit(0);
}).catch(error => {
    console.error(`\n💥 Fatal error: ${error.message}`);
    process.exit(1);
});
