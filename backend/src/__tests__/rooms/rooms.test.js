import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import User from '../../models/user.js';
import Room from '../../models/room.js';

describe('Room Management', () => {
  let adminToken;
  let testRoom;

  beforeEach(async () => {
    // Create admin user
    const admin = await User.create({
      email: 'admin@example.com',
      password: 'Test@123',
      name: 'Admin User',
      role: 'admin'
    });

    adminToken = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET);

    // Create test room
    testRoom = await Room.create({
      name: 'Test Room',
      capacity: 10,
      location: 'Floor 1',
      amenities: ['projector', 'whiteboard'],
      status: 'available'
    });
  });

  describe('POST /api/rooms', () => {
    it('should allow admin to create a new room', async () => {
      const roomData = {
        name: 'New Conference Room',
        capacity: 20,
        location: 'Floor 2',
        amenities: ['projector', 'videoconference'],
        status: 'available'
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roomData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(roomData.name);
      expect(response.body.capacity).toBe(roomData.capacity);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/rooms', () => {
    it('should list all rooms', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter rooms by capacity', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .query({ minCapacity: 15 })
        .expect(200);

      response.body.forEach(room => {
        expect(room.capacity).toBeGreaterThanOrEqual(15);
      });
    });

    it('should filter rooms by availability', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .query({ status: 'available' })
        .expect(200);

      response.body.forEach(room => {
        expect(room.status).toBe('available');
      });
    });
  });

  describe('PUT /api/rooms/:id', () => {
    it('should allow admin to update room details', async () => {
      const updates = {
        name: 'Updated Room Name',
        capacity: 15
      };

      const response = await request(app)
        .put(`/api/rooms/${testRoom._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe(updates.name);
      expect(response.body.capacity).toBe(updates.capacity);
    });
  });

  describe('DELETE /api/rooms/:id', () => {
    it('should allow admin to delete a room', async () => {
      await request(app)
        .delete(`/api/rooms/${testRoom._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deletedRoom = await Room.findById(testRoom._id);
      expect(deletedRoom).toBeNull();
    });
  });

  describe('GET /api/rooms/availability', () => {
    it('should check room availability for given time slot', async () => {
      const query = {
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00'
      };

      const response = await request(app)
        .get('/api/rooms/availability')
        .query(query)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(room => {
        expect(room).toHaveProperty('available');
      });
    });
  });
});