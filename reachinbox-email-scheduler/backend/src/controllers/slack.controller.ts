import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import axios from 'axios';
import { db } from '../config/database';
import { userRepository } from '../repositories/user.repository';

export class SlackController {
  async connect(req: Request, res: Response) {
    const scopes = 'chat:write';
    const url = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${env.SLACK_REDIRECT_URI}`;
    res.redirect(url);
  }

  async callback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Missing code' });
      }

      // Exchange code for token
      const response = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          code: code as string,
          redirect_uri: env.SLACK_REDIRECT_URI,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const data = response.data;
      if (!data.ok) {
        throw new Error(data.error);
      }

      // For Phase 5 we use the dummy user
      const user = await userRepository.findById('00000000-0000-0000-0000-000000000000');
      if (!user) throw new Error('User not found');

      // Store in DB
      await db('slack_connections')
        .insert({
          user_id: user.id,
          team_id: data.team.id,
          team_name: data.team.name,
          access_token: data.access_token,
          channel_id: data.incoming_webhook?.channel_id || null, // fallback if webhook used
        })
        .onConflict('user_id')
        .merge();

      res.send('Slack connected successfully! You can close this window.');
    } catch (error) {
      next(error);
    }
  }

  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userRepository.findById('00000000-0000-0000-0000-000000000000');
      const connection = await db('slack_connections').where({ user_id: user?.id }).first();
      
      res.json({ connected: !!connection, teamName: connection?.team_name });
    } catch (error) {
      next(error);
    }
  }

  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userRepository.findById('00000000-0000-0000-0000-000000000000');
      await db('slack_connections').where({ user_id: user?.id }).delete();
      res.json({ message: 'Disconnected successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const slackController = new SlackController();
