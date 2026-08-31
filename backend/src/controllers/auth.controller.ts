import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository';
import { senderRepository } from '../repositories/sender.repository';

export class AuthController {
  async googleAuth(req: Request, res: Response) {
    const scopes = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'].join(' ');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${env.GOOGLE_REDIRECT_URI}&response_type=code&scope=${scopes}&access_type=offline`;
    res.redirect(url);
  }

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Missing code' });
      }

      // Exchange code for token
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          code: code as string,
          redirect_uri: env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Get user info
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { id: google_id, name, email, picture: avatar_url } = userResponse.data;

      // Upsert user in DB
      let user = await userRepository.findByEmail(email);
      
      if (!user) {
        user = await userRepository.create({
          id: crypto.randomUUID(),
          google_id,
          name,
          email,
          avatar_url,
        });

        // Automatically assign a dummy Ethereal sender for testing purposes
        await senderRepository.create({
          user_id: user.id,
          email: env.SMTP_USER,
          ethereal_user: env.SMTP_USER,
          ethereal_password: env.SMTP_PASSWORD,
        });
      } else if (!user.google_id) {
        // Update existing user with Google ID if needed
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set HttpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('Google Callback Error:', error);
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      let user = await userRepository.findByEmail(email);
      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      user = await userRepository.create({
        id: crypto.randomUUID(),
        name,
        email,
        password_hash: passwordHash,
      });

      // Automatically assign a dummy Ethereal sender for testing purposes
      await senderRepository.create({
        user_id: user.id,
        email: env.SMTP_USER,
        ethereal_user: env.SMTP_USER,
        ethereal_password: env.SMTP_PASSWORD,
      });

      const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({ message: 'Registered successfully', user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error('Register Error:', error);
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await userRepository.findByEmail(email);
      if (!user || !user.password_hash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ message: 'Logged in successfully', user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error('Login Error:', error);
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.json({ message: 'Logged out successfully' });
  }
}

export const authController = new AuthController();
