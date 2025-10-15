// User Model Tests
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');

describe('User Model', () => {
  let validUserData;

  beforeEach(() => {
    validUserData = global.testUtils.generateUniqueUserData();
  });

  describe('User Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(validUserData.username);
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.fullName).toBe(validUserData.fullName);
      expect(savedUser.studentId).toBe(validUserData.studentId);
      expect(savedUser.major).toBe(validUserData.major);
      expect(savedUser.yearOfStudy).toBe(validUserData.yearOfStudy);
    });

    it('should set default values correctly', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();

      expect(savedUser.avatar).toBe('/images/avatars/default-avatar.png');
      expect(savedUser.bio).toBe('');
      expect(savedUser.interests).toEqual([]);
      expect(savedUser.role).toBe('student');
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.emailVerified).toBe(false);
      expect(savedUser.yearOfStudy).toBe(1);
      expect(savedUser.forumStats.postsCount).toBe(0);
      expect(savedUser.forumStats.commentsCount).toBe(0);
      expect(savedUser.forumStats.likesReceived).toBe(0);
      expect(savedUser.forumStats.reputation).toBe(0);
    });

    it('should require username', async () => {
      const userData = { ...validUserData };
      delete userData.username;

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/username.*required/i);
    });

    it('should require email', async () => {
      const userData = { ...validUserData };
      delete userData.email;

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/email.*required/i);
    });

    it('should require password', async () => {
      const userData = { ...validUserData };
      delete userData.password;

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/password.*required/i);
    });

    it('should require fullName', async () => {
      const userData = { ...validUserData };
      delete userData.fullName;

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/fullName.*required/i);
    });

    it('should require studentId', async () => {
      const userData = { ...validUserData };
      delete userData.studentId;

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/studentId.*required/i);
    });

    it('should require major', async () => {
      const userData = { ...validUserData };
      delete userData.major;

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/major.*required/i);
    });

    it('should validate username length', async () => {
      // Too short
      const shortUser = new User({
        ...validUserData,
        username: 'ab'
      });
      
      await expect(shortUser.save()).rejects.toThrow(/username.*shorter/i);

      // Too long
      const longUser = new User({
        ...validUserData,
        username: 'a'.repeat(21)
      });
      
      await expect(longUser.save()).rejects.toThrow(/username.*longer/i);
    });

    it('should validate password length', async () => {
      const user = new User({
        ...validUserData,
        password: '12345' // Too short
      });
      
      await expect(user.save()).rejects.toThrow(/password.*shorter/i);
    });

    it('should validate email format', async () => {
      const user = new User({
        ...validUserData,
        email: 'invalid-email'
      });
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should validate bio length', async () => {
      const user = new User({
        ...validUserData,
        bio: 'a'.repeat(501) // Too long
      });
      
      await expect(user.save()).rejects.toThrow(/bio.*longer/i);
    });

    it('should validate yearOfStudy range', async () => {
      // Too low
      const lowYearUser = new User({
        ...validUserData,
        yearOfStudy: 0
      });
      
      await expect(lowYearUser.save()).rejects.toThrow(/yearOfStudy.*less/i);

      // Too high
      const highYearUser = new User({
        ...validUserData,
        yearOfStudy: 7
      });
      
      await expect(highYearUser.save()).rejects.toThrow(/yearOfStudy.*greater/i);
    });

    it('should validate major enum values', async () => {
      const user = new User({
        ...validUserData,
        major: 'Invalid Major'
      });
      
      await expect(user.save()).rejects.toThrow(/major.*not a valid enum/i);
    });

    it('should validate role enum values', async () => {
      const user = new User({
        ...validUserData,
        role: 'invalid-role'
      });
      
      await expect(user.save()).rejects.toThrow(/role.*not a valid enum/i);
    });

    it('should enforce unique username', async () => {
      const user1 = new User(validUserData);
      await user1.save();

      const user2 = new User({
        ...global.testUtils.generateUniqueUserData(),
        username: validUserData.username
      });
      
      await expect(user2.save()).rejects.toThrow(/duplicate key/i);
    });

    it('should enforce unique email', async () => {
      const user1 = new User(validUserData);
      await user1.save();

      const user2 = new User({
        ...global.testUtils.generateUniqueUserData(),
        email: validUserData.email
      });
      
      await expect(user2.save()).rejects.toThrow(/duplicate key/i);
    });

    it('should enforce unique studentId', async () => {
      const user1 = new User(validUserData);
      await user1.save();

      const user2 = new User({
        ...global.testUtils.generateUniqueUserData(),
        studentId: validUserData.studentId
      });
      
      await expect(user2.save()).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const user = new User(validUserData);
      await user.save();

      expect(user.password).not.toBe(validUserData.password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
    });

    it('should not hash password if not modified', async () => {
      const user = new User(validUserData);
      await user.save();
      
      const originalHash = user.password;
      
      // Update other field
      user.fullName = 'Updated Name';
      await user.save();
      
      expect(user.password).toBe(originalHash);
    });

    it('should hash password when password is modified', async () => {
      const user = new User(validUserData);
      await user.save();
      
      const originalHash = user.password;
      
      // Update password
      user.password = 'newPassword123';
      await user.save();
      
      expect(user.password).not.toBe(originalHash);
      expect(user.password).not.toBe('newPassword123');
    });
  });

  describe('Instance Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User(validUserData);
      await user.save();
    });

    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const isMatch = await user.comparePassword(validUserData.password);
        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const isMatch = await user.comparePassword('wrongPassword');
        expect(isMatch).toBe(false);
      });

      it('should handle empty password', async () => {
        const isMatch = await user.comparePassword('');
        expect(isMatch).toBe(false);
      });

      it('should handle null password', async () => {
        const isMatch = await user.comparePassword(null);
        expect(isMatch).toBe(false);
      });
    });

    describe('updateForumStats', () => {
      it('should increment postsCount', () => {
        const initialCount = user.forumStats.postsCount;
        user.updateForumStats('postsCount', 1);
        
        expect(user.forumStats.postsCount).toBe(initialCount + 1);
      });

      it('should increment commentsCount', () => {
        const initialCount = user.forumStats.commentsCount;
        user.updateForumStats('commentsCount', 3);
        
        expect(user.forumStats.commentsCount).toBe(initialCount + 3);
      });

      it('should increment likesReceived and update reputation', () => {
        const initialLikes = user.forumStats.likesReceived;
        const initialReputation = user.forumStats.reputation;
        
        user.updateForumStats('likesReceived', 5);
        
        expect(user.forumStats.likesReceived).toBe(initialLikes + 5);
        expect(user.forumStats.reputation).toBe(initialReputation + 10); // 5 likes * 2
      });

      it('should handle negative increments', () => {
        user.forumStats.postsCount = 10;
        user.updateForumStats('postsCount', -3);
        
        expect(user.forumStats.postsCount).toBe(7);
      });

      it('should ignore invalid stat types', () => {
        const originalStats = { ...user.forumStats };
        user.updateForumStats('invalidStat', 5);
        
        expect(user.forumStats).toEqual(originalStats);
      });

      it('should default increment to 1', () => {
        const initialCount = user.forumStats.postsCount;
        user.updateForumStats('postsCount');
        
        expect(user.forumStats.postsCount).toBe(initialCount + 1);
      });
    });

    describe('toJSON', () => {
      it('should remove password from JSON output', () => {
        const jsonUser = user.toJSON();
        
        expect(jsonUser.password).toBeUndefined();
        expect(jsonUser.username).toBe(validUserData.username);
        expect(jsonUser.email).toBe(validUserData.email);
      });

      it('should include all other fields', () => {
        const jsonUser = user.toJSON();
        
        expect(jsonUser._id).toBeDefined();
        expect(jsonUser.username).toBeDefined();
        expect(jsonUser.email).toBeDefined();
        expect(jsonUser.fullName).toBeDefined();
        expect(jsonUser.studentId).toBeDefined();
        expect(jsonUser.major).toBeDefined();
        expect(jsonUser.yearOfStudy).toBeDefined();
        expect(jsonUser.role).toBeDefined();
        expect(jsonUser.isActive).toBeDefined();
      });
    });
  });

  describe('Virtual Properties', () => {
    let user;

    beforeEach(async () => {
      user = new User(validUserData);
      await user.save();
    });

    describe('displayName', () => {
      it('should return fullName when available', () => {
        expect(user.displayName).toBe(user.fullName);
      });

      it('should return username when fullName is empty', () => {
        user.fullName = '';
        expect(user.displayName).toBe(user.username);
      });

      it('should return username when fullName is null', () => {
        user.fullName = null;
        expect(user.displayName).toBe(user.username);
      });
    });

    describe('avatarUrl', () => {
      it('should return avatar path', () => {
        expect(user.avatarUrl).toBe(user.avatar);
      });

      it('should handle http URLs', () => {
        user.avatar = 'http://example.com/avatar.jpg';
        expect(user.avatarUrl).toBe('http://example.com/avatar.jpg');
      });

      it('should handle https URLs', () => {
        user.avatar = 'https://example.com/avatar.jpg';
        expect(user.avatarUrl).toBe('https://example.com/avatar.jpg');
      });
    });
  });

  describe('Mood Entries', () => {
    let user;

    beforeEach(async () => {
      user = new User(validUserData);
      await user.save();
    });

    it('should allow adding mood entries', async () => {
      user.moodEntries.push({
        mood: 'happy',
        note: 'Feeling great today!'
      });
      
      await user.save();
      
      expect(user.moodEntries).toHaveLength(1);
      expect(user.moodEntries[0].mood).toBe('happy');
      expect(user.moodEntries[0].note).toBe('Feeling great today!');
      expect(user.moodEntries[0].date).toBeDefined();
    });

    it('should validate mood enum values', async () => {
      user.moodEntries.push({
        mood: 'invalid-mood'
      });
      
      await expect(user.save()).rejects.toThrow(/mood.*not a valid enum/i);
    });

    it('should allow multiple mood entries', async () => {
      user.moodEntries.push(
        { mood: 'happy', note: 'Great day!' },
        { mood: 'neutral', note: 'Regular day' },
        { mood: 'sad', note: 'Tough day' }
      );
      
      await user.save();
      
      expect(user.moodEntries).toHaveLength(3);
    });

    it('should set default date for mood entries', async () => {
      const beforeSave = new Date();
      
      user.moodEntries.push({
        mood: 'happy'
      });
      
      await user.save();
      
      const afterSave = new Date();
      const moodDate = user.moodEntries[0].date;
      
      expect(moodDate.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(moodDate.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });
  });

  describe('Preferences', () => {
    let user;

    beforeEach(async () => {
      user = new User(validUserData);
      await user.save();
    });

    it('should have default notification preferences', () => {
      expect(user.preferences.notifications.email).toBe(true);
      expect(user.preferences.notifications.forum).toBe(true);
      expect(user.preferences.notifications.wellness).toBe(true);
    });

    it('should have default privacy preferences', () => {
      expect(user.preferences.privacy.showEmail).toBe(false);
      expect(user.preferences.privacy.showProfile).toBe(true);
    });

    it('should allow updating preferences', async () => {
      user.preferences.notifications.email = false;
      user.preferences.privacy.showEmail = true;
      
      await user.save();
      
      expect(user.preferences.notifications.email).toBe(false);
      expect(user.preferences.privacy.showEmail).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt timestamps', async () => {
      const beforeCreate = new Date();
      
      const user = new User(validUserData);
      await user.save();
      
      const afterCreate = new Date();
      
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should update updatedAt timestamp on modification', async () => {
      const user = new User(validUserData);
      await user.save();
      
      const originalUpdatedAt = user.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      user.bio = 'Updated bio';
      await user.save();
      
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes defined', () => {
      const indexes = User.schema.indexes();
      const indexFields = indexes.map(index => Object.keys(index[0])[0]);
      
      expect(indexFields).toContain('email');
      expect(indexFields).toContain('username');
      expect(indexFields).toContain('studentId');
      expect(indexFields).toContain('major');
    });
  });

  describe('Data Integrity', () => {
    it('should trim username and email', async () => {
      const userData = {
        ...validUserData,
        username: '  testuser  ',
        email: '  test@example.com  '
      };
      
      const user = new User(userData);
      await user.save();
      
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    it('should convert email to lowercase', async () => {
      const userData = {
        ...validUserData,
        email: 'TEST@EXAMPLE.COM'
      };
      
      const user = new User(userData);
      await user.save();
      
      expect(user.email).toBe('test@example.com');
    });

    it('should trim fullName', async () => {
      const userData = {
        ...validUserData,
        fullName: '  Test User  '
      };
      
      const user = new User(userData);
      await user.save();
      
      expect(user.fullName).toBe('Test User');
    });

    it('should trim interests', async () => {
      const userData = {
        ...validUserData,
        interests: ['  reading  ', '  coding  ', '  music  ']
      };
      
      const user = new User(userData);
      await user.save();
      
      expect(user.interests).toEqual(['reading', 'coding', 'music']);
    });
  });
});
