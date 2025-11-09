import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../index.js';
import User from '../../models/user.js';

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test@123',
        name: 'Test User',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('name', userData.name);
      expect(response.body.user).not.toHaveProperty('password');

      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    it('should validate password requirements', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const password = await bcrypt.hash('Test@123', 10);
      await User.create({
        email: 'test@example.com',
        password,
        name: 'Test User',
        role: 'user'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Test@123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('userId');
    });

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Role-based Access Control', () => {
    let userToken;
    let adminToken;

    beforeEach(async () => {
      const password = await bcrypt.hash('Test@123', 10);
      
      const user = await User.create({
        email: 'user@example.com',
        password,
        name: 'Regular User',
        role: 'user'
      });

      const admin = await User.create({
        email: 'admin@example.com',
        password,
        name: 'Admin User',
        role: 'admin'
      });

      userToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      adminToken = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET);
    });

    it('should allow admin access to protected routes', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny user access to admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});