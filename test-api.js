// API Testing Script for USSH Freshers' Hub
// Run with: node test-api.js

const http = require('http');
const https = require('https');

class APITester {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.authToken = null;
        this.results = [];
    }

    // Helper method to make HTTP requests
    async makeRequest(method, path, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (this.authToken) {
                options.headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const lib = url.protocol === 'https:' ? https : http;
            const req = lib.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const result = {
                            status: res.statusCode,
                            headers: res.headers,
                            data: body ? JSON.parse(body) : null
                        };
                        resolve(result);
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: body
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // Test helper
    async test(name, testFn) {
        console.log(`\n🧪 Testing: ${name}`);
        try {
            const result = await testFn();
            this.results.push({ name, status: 'PASS', result });
            console.log(`✅ PASS: ${name}`);
            if (result && result.data) {
                console.log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
            }
            return result;
        } catch (error) {
            this.results.push({ name, status: 'FAIL', error: error.message });
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Error: ${error.message}`);
            return null;
        }
    }

    // Authentication Tests
    async testAuthentication() {
        console.log('\n🔐 === AUTHENTICATION TESTS ===');

        // Test user registration
        const testUser = {
            username: 'testuser123',
            email: 'test@example.com',
            password: 'TestPass123',
            fullName: 'Test User',
            studentId: '20240001',
            faculty: 'Computer Science',
            year: 1
        };

        const registerResult = await this.test('User Registration', async () => {
            return await this.makeRequest('POST', '/api/auth/register', testUser);
        });

        if (registerResult && registerResult.data && registerResult.data.data && registerResult.data.data.tokens) {
            this.authToken = registerResult.data.data.tokens.accessToken;
        }

        // Test user login
        await this.test('User Login', async () => {
            return await this.makeRequest('POST', '/api/auth/login', {
                identifier: testUser.email,
                password: testUser.password
            });
        });

        // Test get profile
        await this.test('Get User Profile', async () => {
            return await this.makeRequest('GET', '/api/auth/profile');
        });

        // Test check availability
        await this.test('Check Username Availability', async () => {
            return await this.makeRequest('GET', '/api/auth/check-availability?type=username&value=testuser456');
        });
    }

    // Forum Tests
    async testForum() {
        console.log('\n💬 === FORUM TESTS ===');

        // Test get posts
        await this.test('Get Forum Posts', async () => {
            return await this.makeRequest('GET', '/api/forum/posts?page=1&limit=5');
        });

        // Test create post (requires auth)
        const testPost = {
            title: 'Test Forum Post',
            content: 'This is a test post content for API testing.',
            category: 'general',
            tags: ['test', 'api']
        };

        const createPostResult = await this.test('Create Forum Post', async () => {
            return await this.makeRequest('POST', '/api/forum/posts', testPost);
        });

        let postId = null;
        if (createPostResult && createPostResult.data && createPostResult.data.data) {
            postId = createPostResult.data.data.post._id;
        }

        // Test get single post
        if (postId) {
            await this.test('Get Single Forum Post', async () => {
                return await this.makeRequest('GET', `/api/forum/posts/${postId}`);
            });

            // Test like post
            await this.test('Like Forum Post', async () => {
                return await this.makeRequest('POST', `/api/forum/posts/${postId}/like`);
            });
        }

        // Test get trending posts
        await this.test('Get Trending Posts', async () => {
            return await this.makeRequest('GET', '/api/forum/posts/trending?limit=3');
        });

        // Test forum stats
        await this.test('Get Forum Stats', async () => {
            return await this.makeRequest('GET', '/api/forum/stats');
        });
    }

    // Learning Tests
    async testLearning() {
        console.log('\n📖 === LEARNING HUB TESTS ===');

        // Test get courses
        await this.test('Get Courses', async () => {
            return await this.makeRequest('GET', '/api/learning/courses?page=1&limit=5');
        });

        // Test create course (requires auth and appropriate role)
        const testCourse = {
            title: 'Test Course',
            description: 'This is a test course for API testing.',
            instructor: 'Test Instructor',
            category: 'programming',
            difficulty: 'beginner',
            duration: 10,
            price: 0,
            curriculum: [
                {
                    title: 'Introduction',
                    lessons: [
                        { title: 'Getting Started', duration: 30 }
                    ]
                }
            ],
            tags: ['test', 'programming']
        };

        const createCourseResult = await this.test('Create Course', async () => {
            return await this.makeRequest('POST', '/api/learning/courses', testCourse);
        });

        // Test get featured courses
        await this.test('Get Featured Courses', async () => {
            return await this.makeRequest('GET', '/api/learning/courses/featured?limit=3');
        });

        // Test get course categories
        await this.test('Get Course Categories', async () => {
            return await this.makeRequest('GET', '/api/learning/courses/categories');
        });

        // Test get learning stats
        await this.test('Get Learning Stats', async () => {
            return await this.makeRequest('GET', '/api/learning/stats');
        });
    }

    // Wellness Tests
    async testWellness() {
        console.log('\n💚 === WELLNESS TESTS ===');

        // Test get wellness entries
        await this.test('Get Wellness Entries', async () => {
            return await this.makeRequest('GET', '/api/wellness/entries?page=1&limit=5');
        });

        // Test create wellness entry
        const testEntry = {
            type: 'mood',
            data: {
                mood: 'happy'
            },
            notes: 'Feeling great today!'
        };

        const createEntryResult = await this.test('Create Wellness Entry', async () => {
            return await this.makeRequest('POST', '/api/wellness/entries', testEntry);
        });

        // Test get wellness stats
        await this.test('Get Wellness Stats', async () => {
            return await this.makeRequest('GET', '/api/wellness/stats?period=30d');
        });

        // Test get mood trends
        await this.test('Get Mood Trends', async () => {
            return await this.makeRequest('GET', '/api/wellness/mood-trends?days=7');
        });

        // Test get wellness goals
        await this.test('Get Wellness Goals', async () => {
            return await this.makeRequest('GET', '/api/wellness/goals');
        });

        // Test get recommendations
        await this.test('Get Wellness Recommendations', async () => {
            return await this.makeRequest('GET', '/api/wellness/recommendations');
        });
    }

    // Documents Tests
    async testDocuments() {
        console.log('\n📄 === DOCUMENTS TESTS ===');

        // Test get documents
        await this.test('Get Documents', async () => {
            return await this.makeRequest('GET', '/api/documents?page=1&limit=5');
        });

        // Test create document
        const testDocument = {
            title: 'Test Document',
            description: 'This is a test document for API testing.',
            content: 'Test document content...',
            category: 'lecture-notes',
            subject: 'Computer Science',
            tags: ['test', 'api'],
            fileType: 'pdf'
        };

        const createDocResult = await this.test('Create Document', async () => {
            return await this.makeRequest('POST', '/api/documents', testDocument);
        });

        // Test get featured documents
        await this.test('Get Featured Documents', async () => {
            return await this.makeRequest('GET', '/api/documents/featured?limit=3');
        });

        // Test get popular documents
        await this.test('Get Popular Documents', async () => {
            return await this.makeRequest('GET', '/api/documents/popular?period=30d&limit=5');
        });

        // Test get document categories
        await this.test('Get Document Categories', async () => {
            return await this.makeRequest('GET', '/api/documents/categories');
        });

        // Test document search
        await this.test('Search Documents', async () => {
            return await this.makeRequest('GET', '/api/documents/search?q=test&limit=3');
        });

        // Test get document stats
        await this.test('Get Document Stats', async () => {
            return await this.makeRequest('GET', '/api/documents/stats');
        });
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting API Tests for USSH Freshers\' Hub');
        console.log(`📍 Base URL: ${this.baseUrl}`);
        console.log(`🕐 Started at: ${new Date().toLocaleString()}`);

        try {
            await this.testAuthentication();
            await this.testForum();
            await this.testLearning();
            await this.testWellness();
            await this.testDocuments();
        } catch (error) {
            console.log(`\n💥 Unexpected error: ${error.message}`);
        }

        // Print summary
        this.printSummary();
    }

    // Print test summary
    printSummary() {
        console.log('\n📊 === TEST SUMMARY ===');
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;

        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
        }

        console.log(`\n🏁 Testing completed at: ${new Date().toLocaleString()}`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new APITester();
    tester.runAllTests().catch(console.error);
}

module.exports = APITester;