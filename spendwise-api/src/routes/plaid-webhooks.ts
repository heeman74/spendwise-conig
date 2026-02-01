import { Router } from 'express';
import express from 'express';
import { verifyPlaidWebhook } from '../lib/plaid-webhooks';
import { prisma } from '../lib/prisma';

export const plaidWebhookRouter = Router();

/**
 * POST /webhooks/plaid
 *
 * Receives and processes Plaid webhook notifications.
 *
 * Authentication is handled via JWT signature verification (verifyPlaidWebhook),
 * not the app's standard auth system.
 *
 * Uses express.raw() to preserve body as Buffer for signature verification.
 */
plaidWebhookRouter.post(
  '/webhooks/plaid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // Convert body to string for verification and parsing
      const bodyString = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : JSON.stringify(req.body);

      // Verify webhook signature
      try {
        await verifyPlaidWebhook(bodyString, req.headers);
      } catch (error) {
        console.error('[Plaid Webhook] Verification failed:', error);
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      // Parse the webhook payload
      const webhook = JSON.parse(bodyString);
      const { webhook_type, webhook_code, item_id, error } = webhook;

      console.log(`[Plaid Webhook] Received: ${webhook_type}/${webhook_code} for item ${item_id}`);

      // Handle ITEM webhooks (connection status changes)
      if (webhook_type === 'ITEM') {
        if (webhook_code === 'ERROR') {
          // Check if this is a login required error
          if (error?.error_code === 'ITEM_LOGIN_REQUIRED') {
            console.error(
              `[Plaid Webhook] ITEM_LOGIN_REQUIRED for item ${item_id}: ${error.error_message}`
            );

            // Update PlaidItem status to error
            await prisma.plaidItem.update({
              where: { plaidItemId: item_id },
              data: { status: 'error' },
            });

            console.log(`[Plaid Webhook] Updated item ${item_id} status to 'error'`);
          } else {
            console.error(
              `[Plaid Webhook] ITEM ERROR (${error?.error_code}) for item ${item_id}: ${error?.error_message}`
            );
          }
        } else if (webhook_code === 'LOGIN_REPAIRED') {
          console.log(`[Plaid Webhook] LOGIN_REPAIRED for item ${item_id}`);

          // Update PlaidItem status back to active
          await prisma.plaidItem.update({
            where: { plaidItemId: item_id },
            data: { status: 'active' },
          });

          console.log(`[Plaid Webhook] Updated item ${item_id} status to 'active'`);
        } else if (webhook_code === 'PENDING_EXPIRATION') {
          console.warn(`[Plaid Webhook] PENDING_EXPIRATION for item ${item_id}`);

          // Update PlaidItem status to pending_disconnect
          await prisma.plaidItem.update({
            where: { plaidItemId: item_id },
            data: { status: 'pending_disconnect' },
          });

          console.log(`[Plaid Webhook] Updated item ${item_id} status to 'pending_disconnect'`);
        } else {
          // Other ITEM webhooks - log for future implementation
          console.log(`[Plaid Webhook] Unhandled ITEM webhook: ${webhook_code}`);
        }
      } else {
        // Other webhook types (TRANSACTIONS, HOLDINGS, etc.) - log for future implementation
        console.log(
          `[Plaid Webhook] Unhandled webhook type: ${webhook_type}/${webhook_code} - logging for future implementation`
        );
      }

      // Always return 200 OK to Plaid to prevent retries
      res.status(200).json({ status: 'received' });
    } catch (error) {
      console.error('[Plaid Webhook] Processing error:', error);

      // Still return 200 to prevent Plaid retries for processing errors
      // (signature verification failures already returned 401)
      res.status(200).json({ status: 'error', message: 'Processing failed' });
    }
  }
);
