import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import User from '../../models/user.js';
import Room from '../../models/room.js';
import Booking from '../../models/booking.js';

describe('Booking Management', () => {
  let userToken;
  let testRoom;
  let testUser;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'user@example.com',
      password: 'Test@123',
      name: 'Test User',
      role: 'user'
    });

    userToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);

    // Create test room
    testRoom = await Room.create({
      name: 'Test Room',
      capacity: 10,
      location: 'Floor 1',
      status: 'available'
    });
  });

  describe('POST /api/bookings', () => {
    it('should create a new booking', async () => {
      const bookingData = {
        roomId: testRoom._id,
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Team Meeting'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.room).toBe(testRoom._id.toString());
      expect(response.body.user).toBe(testUser._id.toString());
    });

    it('should prevent double booking', async () => {
      const bookingData = {
        roomId: testRoom._id,
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'First Meeting'
      };

      // Create first booking
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData)
        .expect(201);

      // Try to create second booking for same time
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already booked');
    });

    it('should validate booking time constraints', async () => {
      const bookingData = {
        roomId: testRoom._id,
        date: new Date().toISOString().split('T')[0],
        startTime: '11:00',
        endTime: '10:00', // End time before start time
        purpose: 'Invalid Meeting'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('time');
    });
  });

  describe('GET /api/bookings', () => {
    beforeEach(async () => {
      // Create some test bookings
      await Booking.create({
        room: testRoom._id,
        user: testUser._id,
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Morning Meeting'
      });
    });

    it('should list user bookings', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].user).toBe(testUser._id.toString());
    });

    it('should filter bookings by date', async () => {
      const date = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/bookings?date=${date}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      response.body.forEach(booking => {
        expect(booking.date).toBe(date);
      });
    });
  });

  describe('DELETE /api/bookings/:id', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        room: testRoom._id,
        user: testUser._id,
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Cancellation Test'
      });
    });

    it('should allow user to cancel their booking', async () => {
      await request(app)
        .delete(`/api/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const cancelledBooking = await Booking.findById(testBooking._id);
      expect(cancelledBooking).toBeNull();
    });

    it('should prevent cancelling other users bookings', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'Test@123',
        name: 'Other User',
        role: 'user'
      });

      const otherUserToken = jwt.sign({ userId: otherUser._id }, process.env.JWT_SECRET);

      const response = await request(app)
        .delete(`/api/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/bookings/stats', () => {
    beforeEach(async () => {
      // Create multiple bookings for statistics
      const dates = ['2025-11-01', '2025-11-02', '2025-11-03'];
      for (const date of dates) {
        await Booking.create({
          room: testRoom._id,
          user: testUser._id,
          date,
          startTime: '10:00',
          endTime: '11:00',
          purpose: 'Stats Test'
        });
      }
    });

    it('should generate monthly booking statistics', async () => {
      const response = await request(app)
        .get('/api/bookings/stats?month=11&year=2025')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalBookings');
      expect(response.body).toHaveProperty('bookingsByRoom');
      expect(response.body).toHaveProperty('utilizationRate');
      expect(response.body.totalBookings).toBe(3);
    });
  });
});