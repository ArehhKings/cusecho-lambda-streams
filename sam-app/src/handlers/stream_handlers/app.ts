import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import {
    AttributeValue,
    DynamoDBClient,
    GetItemCommand,
    QueryCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { generateInviteToken, marketplaceURL } from '../../utils/index';
import {
    sendIlorinPurchaseEmail,
    sendIlorinTicketEmail,
    sendInviteEmail,
    sendOrderConfirmationEmail,
} from '../../utils/utils';
import { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { normalize } from 'path';

const sqsClient = new SQSClient({ region: 'eu-central-1' });

const STOREFRONT_PAYMENT = 'https://sqs.eu-central-1.amazonaws.com/056538633912/Cusecho-Storefront-Payment-Queue.fifo';

const TABLES = {
    SWAP_REQUESTS: 'Cusecho_SwapRequests',
    SWAP_PRODUCTS: 'Cusecho_SwapProducts',
};

// const ddbClient = new DynamoDBClient({ region: 'eu-west-2' });
// const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const dynamoDbClient = new DynamoDBClient({
    region: 'eu-west-2',
});

const dynamoDb = DynamoDBDocument.from(dynamoDbClient, {
    marshallOptions: {
        removeUndefinedValues: true, // This is the magic line
        convertEmptyValues: true,
    },
});
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const generateTicketCode = (): string => {
    const digits = randomInt(10000000, 99999999).toString();
    return `IAF-03-${digits}`;
};

// export const sendEmailToGuestUser = async (event: any) => {
//     for (const record of event.Records) {
//         const { eventName, dynamodb } = record;

//         if (eventName === 'INSERT') {
//             const source = dynamodb.NewImage.source.S;
//             // if (source === 'STOREFRONT') {

//             //   const swapRequestId = dynamodb.NewImage.swap_request_id.S;
//             //   const requesterId = dynamodb.NewImage.requester_id.S;
//             //   const swapProductId = dynamodb.NewImage.swapProductId.S;
//             //   const email = dynamodb.NewImage.guestEmail.S;
//             //   const ttlSeconds = 5 * 60 * 60;
//             //   const ownerId = dynamodb.NewImage.owner_id.S;
//             //   const referrerLink = "http://localhost:3000/";

//             //   const token = generateInviteToken({ swapRequestId, swapProductId, ownerId, requesterId, email, ttlSeconds });

//             //   try {
//             //     return await sendOrderConfirmationEmail(email, token);
//             //   } catch (error) {
//             //     console.error("Error sending email:", error);
//             //   }
//             // }
//             if (source === 'STOREFRONT') {
//                 const newItem = dynamodb.NewImage;

//                 const swapRequestId = newItem.swap_request_id.S;
//                 const requesterId = newItem.requester_id.S;
//                 const swapProductId = newItem.swapProductId.S;
//                 const email = newItem.guestEmail.S;
//                 const ownerId = newItem.owner_id.S;

//                 const ttlSeconds = 5 * 60 * 60;

//                 const token = generateInviteToken({
//                     swapRequestId,
//                     swapProductId,
//                     ownerId,
//                     requesterId,
//                     email,
//                     ttlSeconds,
//                 });

//                 const buyerFlowUrl = `${marketplaceURL}${encodeURIComponent(token)}`;

//                 try {
//                     console.log('Updating buyerFlowUrl →', buyerFlowUrl);

//                     await dynamoDb.update({
//                         TableName: TABLES.SWAP_REQUESTS,
//                         Key: { owner_id: ownerId, swap_request_id: swapRequestId },
//                         UpdateExpression: 'SET buyerFlowUrl = :buyerFlowUrl',
//                         ExpressionAttributeValues: {
//                             ':buyerFlowUrl': buyerFlowUrl,
//                         },
//                     });

//                     console.log('buyerFlowUrl update successful');

//                     await sendOrderConfirmationEmail(email, buyerFlowUrl);
//                     console.log('Order confirmation email sent');
//                 } catch (error) {
//                     console.error('Error updating request or sending email:', error);
//                 }
//             }
//         }

//         if (eventName === 'MODIFY') {
//             const oldStatus = dynamodb.OldImage.status.S;
//             const newStatus = dynamodb.NewImage.status.S;

//             if (oldStatus === 'PENDING' && newStatus === 'APPROVED') {
//                 const source = dynamodb.NewImage.source.S;
//                 const swapType = dynamodb.NewImage.swapType.S;

//                 if (source === 'ADZONE' && swapType === 'cash') {
//                     const swapRequestId = dynamodb.NewImage.swap_request_id.S;
//                     const requesterId = dynamodb.NewImage.requester_id.S;
//                     const swapProductId = dynamodb.NewImage.swapProductId.S;
//                     const email = dynamodb.NewImage.guestEmail.S;
//                     const ttlSeconds = 5 * 60 * 60;
//                     const ownerId = dynamodb.NewImage.owner_id.S;
//                     const referrerLink = 'http://localhost:3000/';

//                     const token = generateInviteToken({
//                         swapRequestId,
//                         swapProductId,
//                         ownerId,
//                         requesterId,
//                         email,
//                         ttlSeconds,
//                     });

//                     try {
//                         return await sendInviteEmail(email, token, referrerLink);
//                     } catch (error) {
//                         console.error('Error sending email:', error);
//                     }
//                 }
//             } else {
//                 console.log('Ignoring this request due to status change.');
//             }
//         }
//     }
// };
////////////////////////////////////

// export const sendEmailToGuestUser = async (event: any) => {
//     console.log('🚀 Lambda invoked');
//     for (const record of event.Records) {
//         const { eventName, dynamodb } = record;

//         if (eventName === 'INSERT') {
//             const source = dynamodb.NewImage.source.S;

//             if (source !== 'STOREFRONT') continue;

//             const newItem = dynamodb.NewImage;

//             // const S = (a?: any) => a?.S ?? null;

//             const swapRequestId = newItem.swap_request_id.S;
//             const requesterId = newItem.requester_id.S;
//             const swapProductId = newItem.swapProductId.S;
//             const email = newItem.guestEmail.S;
//             const ownerId = newItem.owner_id.S;

//             const ttlSeconds = 5 * 60 * 60;

//             console.log(
//                 'show all these datas',
//                 swapRequestId,
//                 'requesterId',
//                 requesterId,
//                 'swapProductId',
//                 swapProductId,
//                 'email',
//                 email,
//                 'ownerId',
//                 ownerId,
//             );

//             const token = generateInviteToken({
//                 swapRequestId,
//                 swapProductId,
//                 ownerId,
//                 requesterId,
//                 email,
//                 ttlSeconds,
//             });

//             const buyerFlowUrl = `${marketplaceURL}${encodeURIComponent(token)}`;

//             try {
//                 console.log('Updating buyerFlowUrl →', buyerFlowUrl);

//                 await dynamoDb.update({
//                     TableName: TABLES.SWAP_REQUESTS,
//                     Key: { owner_id: ownerId, swap_request_id: swapRequestId },
//                     UpdateExpression: 'SET buyerFlowUrl = :buyerFlowUrl',
//                     ExpressionAttributeValues: {
//                         ':buyerFlowUrl': buyerFlowUrl,
//                     },
//                 });

//                 console.log('buyerFlowUrl update successful');

//                 if (ownerId === '36321244-f0b1-707e-500b-de5cb7e90b57') {
//                     const result = await dynamoDb.get({
//                         TableName: TABLES.SWAP_REQUESTS,
//                         Key: { owner_id: ownerId, swap_request_id: swapRequestId },
//                     });

//                     const transactionData = result.Item;
//                     const products = transactionData?.productsFromStorefront ?? [];

//                     // flatMap creates one flat array of all individual ticket/product promises
//                     const allExecutionPromises = products.flatMap((product: any) => {
//                         const quantity = Number(product.requestedQuantity || 1);
//                         const iterations = product.product_category === 'Ticket' ? quantity : 1;
//                         const individualRequests = [];

//                         for (let i = 0; i < iterations; i++) {
//                             individualRequests.push(
//                                 (async () => {
//                                     // const purchaseId = generateTicketCode();
//                                     const purchaseId = `${swapRequestId}_${product.product_id}_${i}`;
//                                     const trackerItem = {
//                                         purchase_id: purchaseId,
//                                         product_category: product.product_category,
//                                         image: product.images[0],
//                                         productId: product.product_id,
//                                         ownerId: transactionData?.owner_id,
//                                         swap_request_id: transactionData?.swap_request_id,
//                                         email: transactionData?.guestEmail,
//                                         productName: product.product_name,
//                                         price: String(product.price), // Force string for email safety
//                                         createdAt: new Date().toISOString(),
//                                         no_of_scan: 0,
//                                         no_of_allowedScan:
//                                             product.product_category === 'Ticket'
//                                                 ? Number(product.productVariant?.sku || 1)
//                                                 : 0,
//                                         quantity: 1, // Individual record
//                                         no_of_product: product.requestedQuantity, // Reference to total order qty
//                                         colour: product.colour || 'N/A',
//                                         size: product.size || 'N/A',
//                                         shippingAddress:
//                                             transactionData?.buyerDeliveryDetails?.deliveryAddress || 'N/A',
//                                         deliveryFee: transactionData?.buyerDeliveryDetails?.deliveryFee || '0',
//                                         fullName: transactionData?.buyerDeliveryDetails?.fullName || 'N/A',
//                                         phoneNumber: transactionData?.buyerDeliveryDetails?.phoneNumber || 'N/A',
//                                     };

//                                     // 1. Database Write
//                                     await dynamoDb.put({
//                                         TableName: 'IlorinCarShow_Product_Purchase_Tracker',
//                                         Item: trackerItem,
//                                     });

//                                     // 2. Email Sending (with internal catch to prevent total failure)
//                                     try {
//                                         if (product.product_category === 'Ticket') {
//                                             await sendIlorinTicketEmail(
//                                                 email,
//                                                 purchaseId,
//                                                 trackerItem.fullName,
//                                                 trackerItem.productName,
//                                                 trackerItem.price,
//                                                 trackerItem.no_of_allowedScan,
//                                             );
//                                         } else {
//                                             await sendIlorinPurchaseEmail(
//                                                 email,
//                                                 purchaseId,
//                                                 trackerItem.productName,
//                                                 trackerItem.price,
//                                                 trackerItem.no_of_product,
//                                                 trackerItem.colour,
//                                                 trackerItem.size,
//                                                 trackerItem.shippingAddress,
//                                                 trackerItem.deliveryFee,
//                                                 trackerItem.fullName,
//                                             );
//                                         }
//                                         console.log(`Email success: ${purchaseId} for ${product.product_name}`);
//                                     } catch (emailErr) {
//                                         console.error(`Email failed for ${purchaseId}:`, emailErr);
//                                         // We don't re-throw here so other tickets can still process
//                                     }
//                                 })(),
//                             );
//                         }
//                         return individualRequests;
//                     });

//                     // Await the entire flattened list
//                     await Promise.all(allExecutionPromises);
//                 } else {
//                     await sendOrderConfirmationEmail(email, buyerFlowUrl);
//                     console.log('Order confirmation email sent');
//                 }
//             } catch (error) {
//                 console.error('Error updating request or sending email:', error);
//             }
//         }

//         if (eventName === 'MODIFY') {
//             const oldStatus = dynamodb.OldImage.status.S;
//             const newStatus = dynamodb.NewImage.status.S;

//             if (oldStatus !== 'PENDING' && newStatus !== 'APPROVED') continue;

//             const source = dynamodb.NewImage.source.S;
//             const swapType = dynamodb.NewImage.swapType.S;

//             if (source !== 'ADZONE' && swapType !== 'cash') continue;

//             const img = dynamodb.NewImage;

//             const swapRequestId = img.swap_request_id.S;
//             const requesterId = img.requester_id.S;
//             const swapProductId = img.swapProductId.S;
//             const email = img.guestEmail.S;
//             const ttlSeconds = 5 * 60 * 60;
//             const ownerId = img.owner_id.S;
//             const referrerLink = 'http://localhost:3000/';

//             const token = generateInviteToken({
//                 swapRequestId,
//                 swapProductId,
//                 ownerId,
//                 requesterId,
//                 email,
//                 ttlSeconds,
//             });

//             try {
//                 return await sendInviteEmail(email, token, referrerLink);
//             } catch (error) {
//                 console.error('Error sending email:', error);
//             }

//             // } else {
//             //     console.log('Ignoring this request due to status change.');
//             // }
//         }
//     }
// };

export const sendEmailToGuestUser = async (event: any) => {
    console.log('🚀 Lambda invoked');
    for (const record of event.Records) {
        const { eventName, dynamodb } = record;

        if (eventName === 'INSERT') {
            const source = dynamodb.NewImage.source.S;

            if (source !== 'STOREFRONT') continue;

            const newItem = dynamodb.NewImage;

            // const S = (a?: any) => a?.S ?? null;

            const swapRequestId = newItem.swap_request_id.S;
            const requesterId = newItem.requester_id.S;
            const swapProductId = newItem.swapProductId.S;
            const email = newItem.guestEmail.S;
            const ownerId = newItem.owner_id.S;

            const ttlSeconds = 5 * 60 * 60;

            console.log(
                'show all these datas',
                swapRequestId,
                'requesterId',
                requesterId,
                'swapProductId',
                swapProductId,
                'email',
                email,
                'ownerId',
                ownerId,
            );

            const token = generateInviteToken({
                swapRequestId,
                swapProductId,
                ownerId,
                requesterId,
                email,
                ttlSeconds,
            });

            const buyerFlowUrl = `${marketplaceURL}${encodeURIComponent(token)}`;

            try {
                console.log('Updating buyerFlowUrl →', buyerFlowUrl);

                await dynamoDb.update({
                    TableName: TABLES.SWAP_REQUESTS,
                    Key: { owner_id: ownerId, swap_request_id: swapRequestId },
                    UpdateExpression: 'SET buyerFlowUrl = :buyerFlowUrl',
                    ExpressionAttributeValues: {
                        ':buyerFlowUrl': buyerFlowUrl,
                    },
                });

                console.log('buyerFlowUrl update successful');

                if (ownerId === '36321244-f0b1-707e-500b-de5cb7e90b57') {
                    const result = await dynamoDb.get({
                        TableName: TABLES.SWAP_REQUESTS,
                        Key: { owner_id: ownerId, swap_request_id: swapRequestId },
                    });

                    const transactionData = result.Item;
                    const products = transactionData?.productsFromStorefront ?? [];

                    // flatMap creates one flat array of all individual ticket/product promises
                    const allExecutionPromises = products.flatMap((product: any) => {
                        const quantity = Number(product.requestedQuantity || 1);
                        const iterations = product.product_category === 'Ticket' ? quantity : 1;
                        const individualRequests = [];

                        for (let i = 0; i < iterations; i++) {
                            individualRequests.push(
                                (async () => {
                                    const purchaseId = generateTicketCode();
                                    // const purchaseId = `${swapRequestId}_${product.product_id}_${i}`;
                                    const trackerItem = {
                                        purchase_id: purchaseId,
                                        product_category: product.product_category || '',
                                        image: product.images[0] || '',
                                        productId: product.product_id || '',
                                        ownerId: transactionData?.owner_id || '',
                                        swap_request_id: transactionData?.swap_request_id || '',
                                        email: transactionData?.guestEmail || '',
                                        productName: product.product_name || '',
                                        price: String(product.price) || '0', // Force string for email safety
                                        createdAt: transactionData?.createdAt || '',
                                        no_of_scan: 0,
                                        no_of_allowedScan:
                                            product.product_category === 'Ticket'
                                                ? Number(product.productVariant?.sku || 1)
                                                : 0,
                                        quantity: 1, // Individual record
                                        no_of_product: product.requestedQuantity || 0, // Reference to total order qty
                                        colour: product.productVariant?.colour || 'N/A',
                                        size: product.productVariant?.size || 'N/A',
                                        shippingAddress:
                                            transactionData?.buyerDeliveryDetails?.deliveryAddress || 'N/A',
                                        deliveryFee: transactionData?.buyerDeliveryDetails?.deliveryFee || '0',
                                        fullName: transactionData?.buyerDeliveryDetails?.fullName || 'N/A',
                                        phoneNumber: transactionData?.buyerDeliveryDetails?.phoneNumber || 'N/A',
                                    };
                                    console.log('Prepared tracker item:', trackerItem);
                                    try {
                                        // 1. Database Write
                                        await dynamoDb.put({
                                            TableName: 'IlorinCarShow_Product_Purchase_Tracker',
                                            Item: trackerItem,
                                            ConditionExpression: 'attribute_not_exists(purchase_id)',
                                        });

                                        // 2. Email Sending (with internal catch to prevent total failure)
                                        if (product.product_category === 'Ticket') {
                                            await sendIlorinTicketEmail(
                                                email,
                                                purchaseId,
                                                trackerItem.fullName,
                                                trackerItem.productName,
                                                trackerItem.price,
                                                trackerItem.no_of_allowedScan,
                                            );
                                        } else {
                                            await sendIlorinPurchaseEmail(
                                                email,
                                                purchaseId,
                                                trackerItem.productName,
                                                trackerItem.price,
                                                trackerItem.no_of_product,
                                                trackerItem.colour,
                                                trackerItem.size,
                                                trackerItem.shippingAddress,
                                                trackerItem.deliveryFee,
                                                trackerItem.fullName,
                                            );
                                        }
                                        console.log(`Email success: ${purchaseId} for ${product.product_name}`);
                                    } catch (emailErr: any) {
                                        if (emailErr.code === 'ConditionalCheckFailedException') {
                                            // 🧠 THIS is the magic line
                                            console.log(`⛔ Duplicate skipped: ${purchaseId}`);
                                            return;
                                        }
                                        console.error(`Email failed for ${purchaseId}:`, emailErr);
                                        // We don't re-throw here so other tickets can still process
                                    }
                                })(),
                            );
                        }
                        return individualRequests;
                    });

                    // Await the entire flattened list
                    //    await Promise.all(allExecutionPromises);
                    for (const promise of allExecutionPromises) {
                        try {
                            await promise;
                        } catch (err) {
                            console.error('Item failed:', err);
                        }
                    }
                } else {
                    await sendOrderConfirmationEmail(email, buyerFlowUrl);
                    console.log('Order confirmation email sent');
                }
            } catch (error) {
                console.error('Error updating request or sending email:', error);
            }
        }

        if (eventName === 'MODIFY') {
            const oldStatus = dynamodb.OldImage.status.S;
            const newStatus = dynamodb.NewImage.status.S;

            if (oldStatus !== 'PENDING' && newStatus !== 'APPROVED') continue;

            const source = dynamodb.NewImage.source.S;
            const swapType = dynamodb.NewImage.swapType.S;

            if (source !== 'ADZONE' && swapType !== 'cash') continue;

            const img = dynamodb.NewImage;

            const swapRequestId = img.swap_request_id.S;
            const requesterId = img.requester_id.S;
            const swapProductId = img.swapProductId.S;
            const email = img.guestEmail.S;
            const ttlSeconds = 5 * 60 * 60;
            const ownerId = img.owner_id.S;
            const referrerLink = 'http://localhost:3000/';

            const token = generateInviteToken({
                swapRequestId,
                swapProductId,
                ownerId,
                requesterId,
                email,
                ttlSeconds,
            });

            try {
                return await sendInviteEmail(email, token, referrerLink);
            } catch (error) {
                console.error('Error sending email:', error);
            }

            // } else {
            //     console.log('Ignoring this request due to status change.');
            // }
        }
    }
};

async function sendToStorefrontQueue(item: any) {
    const payloader = unmarshall(item);

    const payload = {
        owner_id: payloader.owner_id,
        buyerDeliveryOption: payloader.buyerDeliveryOption,
        cashOffer: payloader.cashOffer,
        currency: payloader.currency,
        deliveryOption: payloader.deliveryOption,
        guestEmail: payloader.guestEmail,
        offeredProduct: payloader.offeredProduct,
        productsFromStorefront: payloader.productsFromStorefront ?? [],
        referrerLink: payloader.referrerLink,
        source: payloader.source,
        swapProductId: payloader.swapProductId,
        swapType: payloader.swapType,
        buyerDeliveryDetails: { ...payloader.buyerDeliveryDetails, deliveryDiscount: '0' },
        swap_request_id: payloader.swap_request_id,
        paymentGateway: payloader.paymentGateway,
        paymentGatewayId: payloader.paymentGatewayId,
        requester_id: payloader.requester_id,
        swapExchangeCode: payloader.swapExchangeCode,
        status: payloader.status,
        listingNumber: payloader.listingNumber,
    };

    const params = {
        QueueUrl: STOREFRONT_PAYMENT,
        MessageBody: JSON.stringify(payload),
        MessageGroupId: item.swap_request_id?.S || `group-${Date.now()}`,
        MessageDeduplicationId: `${item.swap_request_id?.S || Date.now()}-${Date.now()}`,
    };

    try {
        await sqsClient.send(new SendMessageCommand(params));
        console.log(`Item sent to storefront queue: ${item.swap_request_id?.S}`);
        console.log(`Item payload:`, payload);
    } catch (error) {
        console.error(`Failed to send item to storefront queue: ${item.swap_request_id?.S}`, error);
    }
}

export const storefrontUnlockPaymentToQueue = async (event: DynamoDBStreamEvent) => {
    for (const record of event.Records) {
        const { eventName, dynamodb } = record as any;

        const newItem = dynamodb?.NewImage;
        const oldItem = dynamodb?.OldImage;

        if (!newItem) continue;

        const source = newItem.source?.S;
        const newStatus = newItem.status?.S?.toUpperCase();
        const oldStatus = oldItem?.status?.S?.toUpperCase();
        const paymentChannel = oldItem?.paymentChannel?.S?.toUpperCase();
        const paymentAcknowledgementStatus = newItem?.paymentAcknowledgementStatus?.S?.toUpperCase();
        const paymentGateway = oldItem?.paymentGateway?.S?.toLowerCase();

        console.log(`Event: ${eventName}, Source: ${source}, OldStatus: ${oldStatus}, NewStatus: ${newStatus}`);

        if (source !== 'STOREFRONT') {
            console.log('⏭ Not STOREFRONT — ignored.');
            continue;
        }

        if (eventName !== 'MODIFY') {
            console.log('⏭ Not a MODIFY event — ignored.');
            continue;
        }

        if (newStatus === oldStatus) {
            console.log('⏭ No status change — ignored.');
            continue;
        }

        if (
            paymentChannel === 'BANK_TRANSFER' &&
            oldStatus === 'CONFIRMED' &&
            newStatus === 'ACCEPTED' &&
            paymentAcknowledgementStatus === 'ACKNOWLEDGED'
        ) {
            console.log(
                'BANK TRANSFER CONFIRMED, VENDOR ACCEPTS ORDER → ACCEPTED detected — sending to queue (Old:',
                oldStatus,
                ', New:',
                newStatus,
                ')',
            );
            await sendToStorefrontQueue(newItem);
            continue;
        }

        if (paymentChannel === 'BANK_TRANSFER' && newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
            console.log('🏁 Status changed → COMPLETED — sending to queue.');
            await sendToStorefrontQueue(newItem);
            continue;
        }

        if (paymentGateway === 'paystack' && newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
            console.log('🏁 Status changed → COMPLETED — sending to queue; unlock funds for storefront order');
            await sendToStorefrontQueue(newItem);
            continue;
        }
        if (paymentGateway === 'stripe' && newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
            console.log('🏁 Status changed → COMPLETED — sending to queue; unlock funds for storefront order');
            await sendToStorefrontQueue(newItem);
            continue;
        }

        console.log('⏭ Status change irrelevant — no queue send.');
    }
};
