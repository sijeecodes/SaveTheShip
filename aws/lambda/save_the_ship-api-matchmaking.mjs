import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    PutCommand, 
    UpdateCommand, 
    QueryCommand 
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "SaveTheShipGameLobbies";
const GSI_NAME = "status-playerCount-index";
const MAX_PLAYERS = 5; 
const SERVER_ENDPOINT = "?????????????????";

export const handler = async (event) => {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;
    const targetId = body.pkLobbyId || body.lobbyId;

    try {
        switch (action) {
            case "matchmake":
                return await handleMatchmake(body.playerId);
            case "start":
                return await updateStatus(targetId, "in-progress", 3600);
            case "finish":
                return await updateStatus(targetId, "finished", 300);
            case "expire":
                return await updateStatus(targetId, "expired", 60);
            default:
                return response(400, { message: "Invalid action" });
        }
    } catch (err) {
        console.error("Handler Error:", err);
        return response(500, { message: err.message });
    }
};

async function handleMatchmake(playerId) {
    if (!playerId) return response(400, { message: "playerId required" });

    // Try to find an existing lobby (3 attempts for concurrency)
    for (let attempt = 0; attempt < 3; attempt++) {
        const queryResult = await ddb.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GSI_NAME,
            KeyConditionExpression: "#s = :waiting",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":waiting": "waiting" },
            ScanIndexForward: true,
            Limit: 1
        }));

        if (queryResult.Items && queryResult.Items.length > 0) {
            const lobby = queryResult.Items[0];
            const isNowFull = (lobby.playerCount + 1 >= MAX_PLAYERS);
            const newStatus = isNowFull ? "full" : "waiting";

            try {
                // ATOMIC JOIN: Adds player and updates status in one go
                await ddb.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { pkLobbyId: lobby.pkLobbyId },
                    UpdateExpression: `
                        SET players = list_append(players, :p),
                        playerCount = playerCount + :inc,
                        #s = :newStatus
                    `,
                    ConditionExpression: `
                        playerCount < :max 
                        AND #s = :waiting 
                        AND NOT contains(players, :playerId)
                    `,
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: {
                        ":p": [playerId],
                        ":inc": 1,
                        ":max": MAX_PLAYERS,
                        ":waiting": "waiting",
                        ":newStatus": newStatus,
                        ":playerId": playerId
                    }
                }));

                return response(200, { 
                    lobbyId: lobby.pkLobbyId, 
                    status: newStatus,
                    serverEndpoint: SERVER_ENDPOINT 
                });

            } catch (err) {
                if (err.name === "ConditionalCheckFailedException") continue;
                throw err;
            }
        }
    }

    // CREATE NEW LOBBY (if no "waiting" lobbies found)
    const now = Math.floor(Date.now() / 1000);
    const newLobby = {
        pkLobbyId: `lobby-${Date.now()}`,
        status: "waiting",
        players: [playerId],
        playerCount: 1,
        maxPlayers: MAX_PLAYERS,
        serverEndpoint: SERVER_ENDPOINT,
        createdAt: now,
        ttl: now + 900 // 15 min expiry
    };

    await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: newLobby
    }));

    return response(200, { 
        lobbyId: newLobby.pkLobbyId, 
        status: "waiting",
        serverEndpoint: SERVER_ENDPOINT 
    });
}

async function updateStatus(lobbyId, newStatus, ttlSeconds) {
    if (!lobbyId) return response(400, { message: "pkLobbyId required" });
    const now = Math.floor(Date.now() / 1000);

    await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pkLobbyId: lobbyId },
        UpdateExpression: "SET #s = :status, #t = :ttl",
        ExpressionAttributeNames: { "#s": "status", "#t": "ttl" },
        ExpressionAttributeValues: { ":status": newStatus, ":ttl": now + ttlSeconds }
    }));

    return response(200, { message: `Lobby set to ${newStatus}` });
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    };
}