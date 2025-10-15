// Learning Hub Controller
const Course = require('../models/Course');
const User = require('../models/User');
const { 
    catchAsync, 
    AppError, 
    NotFoundError,
    AuthorizationError 
} = require('../middleware/errorHandler');

/**
 * Get all courses with filters and pagination
 */
const getCourses = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 12,
        category,
        difficulty,
        search,
        sort = '-createdAt',
        instructor,
        price
    } = req.query;

    // Build filter object
    const filter = {};

    if (category && category !== 'all') {
        filter.category = category;
    }

    if (difficulty) {
        filter.difficulty = difficulty;
    }

    if (instructor) {
        filter.instructor = { $regex: instructor, $options: 'i' };
    }

    if (price) {
        if (price === 'free') {
            filter.$or = [
                { price: 0 },
                { price: { $exists: false } }
            ];
        } else if (price === 'paid') {
            filter.price = { $gt: 0 };
        }
    }

    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { instructor: { $regex: search, $options: 'i' } }
        ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get courses
    const courses = await Course.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Get total count for pagination
    const total = await Course.countDocuments(filter);

    // Add enrollment status if user is authenticated
    if (req.userId) {
        const user = await User.findById(req.userId);
        courses.forEach(course => {
            course.isEnrolled = user.enrolledCourses.some(
                enrolled => enrolled.course.toString() === course._id.toString()
            );
        });
    }

    res.json({
        success: true,
        data: {
            courses,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalCourses: total,
                hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            }
        }
    });
});

/**
 * Get single course details
 */
const getCourse = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const course = await Course.findById(id).lean();

    if (!course) {
        return next(new NotFoundError('Course not found'));
    }

    // Increment view count
    await Course.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Add enrollment info if user is authenticated
    if (req.userId) {
        const user = await User.findById(req.userId);
        const enrollment = user.enrolledCourses.find(
            enrolled => enrolled.course.toString() === course._id.toString()
        );
        
        course.isEnrolled = !!enrollment;
        course.progress = enrollment?.progress || 0;
        course.completedLessons = enrollment?.completedLessons || [];
        course.enrollmentDate = enrollment?.enrolledAt;
    }

    res.json({
        success: true,
        data: {
            course
        }
    });
});

/**
 * Create new course (Admin/Instructor only)
 */
const createCourse = catchAsync(async (req, res, next) => {
    const {
        title,
        description,
        instructor,
        category,
        difficulty,
        duration,
        price,
        curriculum,
        prerequisites,
        tags,
        thumbnail
    } = req.body;

    const course = new Course({
        title,
        description,
        instructor,
        category,
        difficulty,
        duration,
        price: price || 0,
        curriculum: curriculum || [],
        prerequisites: prerequisites || [],
        tags: tags || [],
        thumbnail,
        createdBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    await course.save();

    res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: {
            course
        }
    });
});

/**
 * Update course
 */
const updateCourse = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
        return next(new NotFoundError('Course not found'));
    }

    // Check if user has permission to update
    const user = await User.findById(req.userId);
    if (course.createdBy.toString() !== req.userId && !['admin', 'instructor'].includes(user.role)) {
        return next(new AuthorizationError('Not authorized to update this course'));
    }

    // Update allowed fields
    const allowedUpdates = [
        'title', 'description', 'instructor', 'category', 'difficulty',
        'duration', 'price', 'curriculum', 'prerequisites', 'tags', 'thumbnail'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
            updates[key] = req.body[key];
        }
    });

    updates.updatedAt = new Date();

    const updatedCourse = await Course.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    res.json({
        success: true,
        message: 'Course updated successfully',
        data: {
            course: updatedCourse
        }
    });
});

/**
 * Delete course
 */
const deleteCourse = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
        return next(new NotFoundError('Course not found'));
    }

    // Check if user has permission to delete
    const user = await User.findById(req.userId);
    if (course.createdBy.toString() !== req.userId && user.role !== 'admin') {
        return next(new AuthorizationError('Not authorized to delete this course'));
    }

    // Remove course from all enrolled users
    await User.updateMany(
        { 'enrolledCourses.course': id },
        { $pull: { enrolledCourses: { course: id } } }
    );

    // Delete the course
    await Course.findByIdAndDelete(id);

    res.json({
        success: true,
        message: 'Course deleted successfully'
    });
});

/**
 * Enroll in course
 */
const enrollCourse = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
        return next(new NotFoundError('Course not found'));
    }

    const user = await User.findById(req.userId);

    // Check if already enrolled
    const isEnrolled = user.enrolledCourses.some(
        enrolled => enrolled.course.toString() === id
    );

    if (isEnrolled) {
        return next(new AppError('Already enrolled in this course', 400));
    }

    // Add enrollment
    user.enrolledCourses.push({
        course: id,
        enrolledAt: new Date(),
        progress: 0,
        completedLessons: []
    });

    // Update course enrollment count
    course.enrollments += 1;

    await Promise.all([user.save(), course.save()]);

    // Send enrollment notification
    if (global.notificationService) {
        await global.notificationService.createLearningNotification(
            req.userId,
            'course-enrolled',
            {
                courseId: course._id,
                courseTitle: course.title,
                instructor: course.instructor
            }
        );
    }

    // Real-time update to course room
    if (global.socketService) {
        global.socketService.broadcastToRoom(`course-${course._id}`, 'new-enrollment', {
            courseId: course._id,
            enrollmentsCount: course.enrollments,
            user: {
                id: req.userId,
                username: user.username,
                fullName: user.fullName
            }
        });
    }

    res.json({
        success: true,
        message: 'Successfully enrolled in course',
        data: {
            enrollment: user.enrolledCourses[user.enrolledCourses.length - 1]
        }
    });
});

/**
 * Unenroll from course
 */
const unenrollCourse = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findById(req.userId);
    const enrollmentIndex = user.enrolledCourses.findIndex(
        enrolled => enrolled.course.toString() === id
    );

    if (enrollmentIndex === -1) {
        return next(new AppError('Not enrolled in this course', 400));
    }

    // Remove enrollment
    user.enrolledCourses.splice(enrollmentIndex, 1);

    // Update course enrollment count
    await Course.findByIdAndUpdate(id, { $inc: { enrollments: -1 } });

    await user.save();

    res.json({
        success: true,
        message: 'Successfully unenrolled from course'
    });
});

/**
 * Update course progress
 */
const updateProgress = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { lessonId, completed } = req.body;

    const user = await User.findById(req.userId);
    const enrollment = user.enrolledCourses.find(
        enrolled => enrolled.course.toString() === id
    );

    if (!enrollment) {
        return next(new AppError('Not enrolled in this course', 400));
    }

    const course = await Course.findById(id);
    if (!course) {
        return next(new NotFoundError('Course not found'));
    }

    if (completed) {
        // Add lesson to completed if not already there
        if (!enrollment.completedLessons.includes(lessonId)) {
            enrollment.completedLessons.push(lessonId);
        }
    } else {
        // Remove lesson from completed
        enrollment.completedLessons = enrollment.completedLessons.filter(
            lesson => lesson !== lessonId
        );
    }

    // Calculate progress percentage
    const totalLessons = course.curriculum.reduce((total, section) => 
        total + (section.lessons ? section.lessons.length : 0), 0
    );
    
    enrollment.progress = totalLessons > 0 
        ? Math.round((enrollment.completedLessons.length / totalLessons) * 100)
        : 0;

    // Mark as completed if 100% progress
    if (enrollment.progress === 100 && !enrollment.completedAt) {
        enrollment.completedAt = new Date();
    }

    await user.save();

    // Send notifications for milestones
    if (global.notificationService) {
        // Lesson completed notification
        if (completed) {
            await global.notificationService.createLearningNotification(
                req.userId,
                'lesson-completed',
                {
                    courseId: course._id,
                    courseTitle: course.title,
                    lessonId,
                    lessonTitle: `Lesson ${lessonId}`,
                    progress: enrollment.progress
                }
            );
        }

        // Course completed notification
        if (enrollment.progress === 100 && enrollment.completedAt) {
            await global.notificationService.createLearningNotification(
                req.userId,
                'course-completed',
                {
                    courseId: course._id,
                    courseTitle: course.title,
                    completedAt: enrollment.completedAt
                }
            );
        }
    }

    // Real-time progress update
    if (global.socketService) {
        global.socketService.broadcastToRoom(`course-${course._id}`, 'progress-update', {
            courseId: course._id,
            userId: req.userId,
            progress: enrollment.progress,
            lessonId,
            completed,
            isCompleted: enrollment.progress === 100
        });

        // Send to user's personal room
        global.socketService.sendNotificationToUser(req.userId, {
            type: 'learning-progress',
            title: 'Progress Updated',
            message: `Progress updated to ${enrollment.progress}% in ${course.title}`,
            data: {
                courseId: course._id,
                progress: enrollment.progress,
                isCompleted: enrollment.progress === 100
            }
        });
    }

    res.json({
        success: true,
        message: 'Progress updated successfully',
        data: {
            progress: enrollment.progress,
            completedLessons: enrollment.completedLessons,
            isCompleted: enrollment.progress === 100
        }
    });
});

/**
 * Get user's enrolled courses
 */
const getEnrolledCourses = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userId)
        .populate({
            path: 'enrolledCourses.course',
            select: 'title description instructor category difficulty duration thumbnail'
        });

    const enrolledCourses = user.enrolledCourses.map(enrollment => ({
        ...enrollment.course.toObject(),
        progress: enrollment.progress,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        completedLessons: enrollment.completedLessons
    }));

    res.json({
        success: true,
        data: {
            courses: enrolledCourses
        }
    });
});

/**
 * Get featured courses
 */
const getFeaturedCourses = catchAsync(async (req, res, next) => {
    const { limit = 6 } = req.query;

    const courses = await Course.find({
        isFeatured: true
    })
    .sort({ rating: -1, enrollments: -1 })
    .limit(parseInt(limit))
    .lean();

    res.json({
        success: true,
        data: {
            courses
        }
    });
});

/**
 * Get course categories with count
 */
const getCourseCategories = catchAsync(async (req, res, next) => {
    const categories = await Course.aggregate([
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalEnrollments: { $sum: '$enrollments' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    res.json({
        success: true,
        data: {
            categories
        }
    });
});

/**
 * Rate course
 */
const rateCourse = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (rating < 1 || rating > 5) {
        return next(new AppError('Rating must be between 1 and 5', 400));
    }

    const course = await Course.findById(id);
    if (!course) {
        return next(new NotFoundError('Course not found'));
    }

    const user = await User.findById(req.userId);
    
    // Check if user is enrolled
    const isEnrolled = user.enrolledCourses.some(
        enrolled => enrolled.course.toString() === id
    );

    if (!isEnrolled) {
        return next(new AppError('Must be enrolled to rate this course', 400));
    }

    // Check if user already rated
    const existingRatingIndex = course.ratings.findIndex(
        r => r.user.toString() === req.userId
    );

    if (existingRatingIndex > -1) {
        // Update existing rating
        course.ratings[existingRatingIndex] = {
            user: req.userId,
            rating,
            review,
            createdAt: new Date()
        };
    } else {
        // Add new rating
        course.ratings.push({
            user: req.userId,
            rating,
            review,
            createdAt: new Date()
        });
    }

    // Recalculate average rating
    const totalRating = course.ratings.reduce((sum, r) => sum + r.rating, 0);
    course.rating = totalRating / course.ratings.length;

    await course.save();

    res.json({
        success: true,
        message: 'Course rated successfully',
        data: {
            rating: course.rating,
            totalRatings: course.ratings.length
        }
    });
});

/**
 * Get learning statistics
 */
const getLearningStats = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userId)
        .populate('enrolledCourses.course', 'duration');

    const enrolledCourses = user.enrolledCourses;
    const completedCourses = enrolledCourses.filter(c => c.progress === 100);
    const inProgressCourses = enrolledCourses.filter(c => c.progress > 0 && c.progress < 100);
    
    const totalLearningTime = enrolledCourses.reduce((total, enrollment) => {
        const courseHours = enrollment.course.duration || 0;
        const progressMultiplier = enrollment.progress / 100;
        return total + (courseHours * progressMultiplier);
    }, 0);

    const stats = {
        totalEnrolled: enrolledCourses.length,
        completed: completedCourses.length,
        inProgress: inProgressCourses.length,
        totalLearningTime: Math.round(totalLearningTime * 10) / 10, // Round to 1 decimal
        completionRate: enrolledCourses.length > 0 
            ? Math.round((completedCourses.length / enrolledCourses.length) * 100)
            : 0
    };

    res.json({
        success: true,
        data: {
            stats
        }
    });
});

module.exports = {
    getCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollCourse,
    unenrollCourse,
    updateProgress,
    getEnrolledCourses,
    getFeaturedCourses,
    getCourseCategories,
    rateCourse,
    getLearningStats
};