// MongoDB initialization script for USSH Freshers' Hub
print('Initializing MongoDB for USSH Freshers Hub...');

// Switch to application database
db = db.getSiblingDB('ussh_freshers_hub');

// Create application user
db.createUser({
  user: 'app_user',
  pwd: 'admin123',
  roles: [
    {
      role: 'readWrite',
      db: 'ussh_freshers_hub'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        firstName: {
          bsonType: 'string',
          minLength: 1
        },
        lastName: {
          bsonType: 'string',
          minLength: 1
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'createdAt': 1 });
db.forumposts.createIndex({ 'createdAt': -1 });
db.forumposts.createIndex({ 'category': 1 });
db.comments.createIndex({ 'postId': 1, 'createdAt': -1 });

print('MongoDB initialization completed successfully!');
