import { WebClient } from '@slack/web-api';
import { db } from '../../config/database';

export class SlackClient {
  async notifyRateLimit(userId: string, senderEmail: string, limit: number) {
    try {
      const connection = await db('slack_connections').where({ user_id: userId }).first();
      if (!connection) {
        console.log(`[Slack] User ${userId} is not connected to Slack. Skipping notification.`);
        return;
      }

      const slack = new WebClient(connection.access_token);
      
      // Send message to the channel or the user who authorized the app
      // If we don't have a channel_id from incoming webhook, we can try to send it as a direct message 
      // or to a default channel. For this app, we'll send it to the channel they authorized.
      const channelId = connection.channel_id;

      if (!channelId) {
        console.log(`[Slack] No channel_id available for user ${userId}. Skipping notification.`);
        return;
      }

      const message = `Email rate limit reached for <mailto:${senderEmail}|${senderEmail}>. Limit: ${limit} emails/hour. Emails will resume in the next available window.`;

      await slack.chat.postMessage({
        channel: channelId,
        text: message,
      });
      
      console.log(`[Slack] Successfully sent rate limit notification to channel ${channelId}`);
    } catch (error: any) {
      console.error('[Slack] Failed to send notification:', error.message);
      // We do not throw. The worker should not fail because Slack notifications fail.
    }
  }
}

export const slackClient = new SlackClient();
