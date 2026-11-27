import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyResult } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { Readable } from 'stream';

const dynamoDbClient = new DynamoDBClient({
    region: 'eu-west-1',
});
export const dynamoDb = DynamoDBDocument.from(dynamoDbClient);

export const clientId_Norm = '80n7e9vr4tacghn5dq44oj5c5';

export const verifier = CognitoJwtVerifier.create({
    userPoolId: 'eu-west-2_d8cTgSo6W',
    tokenUse: 'id',
    clientId: '80n7e9vr4tacghn5dq44oj5c5',
});

export const verifierSSO = CognitoJwtVerifier.create({
    userPoolId: 'eu-west-2_d8cTgSo6W',
    tokenUse: 'id',
    clientId: '291jvp8robpk9dia1ft0inf7vv',
});

export const RESPONSE_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
    'Content-Type': 'application/json',
};

export const TABLES = {
    USERS: 'Cusecho_Users',
    SWAP_REQUESTS_TYPE_PRODUCTS: 'Cusecho_SwapRequests_Type_Products-Dev',
    SWAP_NOTIFICATIONS: 'Cusecho_Swap_Notifications-Dev',
    MOBILE_DEVICETOKENS: 'Cusecho_MobileAppDevice_Table-Dev',
    SWAP_CHAT_HISTORY: 'Cusecho_Swap_Chat_Messages-Dev',
    SWAP_CHAT_SESSIONS: 'Cusecho_Swap_Chat_Sessions-Dev',
    SWAP_TRANSACTIONS: 'Swap_TransactionLogBoard-Dev',
    SWAP_PRODUCTS: 'Cusecho_SwapProducts-Dev',
    SWAP_EXCHANGE_OTPS: 'Cusecho_Swap_Echange_OTPs-Dev',
    SWAP_WITHDRAWALS: 'Cusecho_Swap_Hub_Withdrawals-Dev',
    SWAP_REQUESTS: 'Cusecho_SwapRequests-Dev',
    SWAP_TLB: 'Swap_TransactionLogBoard',
    SWAP_PENDING_TRANSACTIONS: 'SwapWalletTable',
};

export const createResponse = (
    statusCode: number,
    message: string,
    error?: string | null,
    data?: Record<string, any> | null,
): APIGatewayProxyResult => ({
    statusCode,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify({
        status: statusCode < 400 ? 'success' : 'failed',
        status_code: statusCode,
        message,
        ...(error && { error }),
        ...(data && { data }),
    }),
});

const INVITE_TOKEN_SECRET = process.env.INVITE_TOKEN_SECRET || 'cloudpactai-cusecho-swap';

export function generateInviteToken({
    swapRequestId,
    swapProductId,
    ownerId,
    requesterId,
    email,
    ttlSeconds = 60 * 60 * 24,
}: any) {
    if (!INVITE_TOKEN_SECRET) {
        throw new Error('Missing INVITE_TOKEN_SECRET');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: requesterId,
        swapRequestId,
        swapProductId,
        requesterId,
        ownerId,
        guestEmail: email,
        iat: now,
        exp: now + ttlSeconds,
    };

    // HS256 symmetric signing
    const token = jwt.sign(payload, INVITE_TOKEN_SECRET, {
        algorithm: 'HS256',
    });

    return token;
}

export const streamToString = (stream: Readable): Promise<string> => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
};

export const marketplaceURL = 'https://cusecho.store/guest-user?token=';
