// Forum Controller
const ForumPost = require('../models/ForumPost');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { 
    catchAsync, 
    AppError, 
    NotFoundError,
    AuthorizationError 
} = require('../middleware/errorHandler');

/**
 * Get all forum posts with pagination and filters
 */
const getPosts = catchAsync(async (req, res, next) => {
    const { 
        page = 1, 
        limit = 10, 
        category, 
        sort = '-createdAt',
        search,
        tags
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category && category !== 'all') {
        filter.category = category;
    }
    
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
        ];
    }
    
    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        filter.tags = { $in: tagArray };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get posts with author and comment count
    const posts = await ForumPost.find(filter)
        .populate('author', 'username fullName profilePicture role')
        .populate('lastCommentBy', 'username fullName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Get total count for pagination
    const total = await ForumPost.countDocuments(filter);

    // Add user's like/save status if authenticated
    if (req.userId) {
        const user = await User.findById(req.userId);
        posts.forEach(post => {
            post.isLiked = user.likedPosts.includes(post._id);
            post.isSaved = user.savedPosts.includes(post._id);
        });
    }

    res.json({
        success: true,
        data: {
            posts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalPosts: total,
                hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            }
        }
    });
});

/**
 * Get single forum post with comments
 */
const getPost = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const post = await ForumPost.findById(id)
        .populate('author', 'username fullName profilePicture role bio')
        .populate({
            path: 'comments',
            populate: [
                {
                    path: 'author',
                    select: 'username fullName profilePicture role'
                },
                {
                    path: 'replies',
                    populate: {
                        path: 'author',
                        select: 'username fullName profilePicture role'
                    }
                }
            ]
        });

    if (!post) {
        return next(new NotFoundError('Post not found'));
    }

    // Increment view count
    post.views += 1;
    await post.save();

    // Add user's like/save status if authenticated
    if (req.userId) {
        const user = await User.findById(req.userId);
        post.isLiked = user.likedPosts.includes(post._id);
        post.isSaved = user.savedPosts.includes(post._id);
    }

    res.json({
        success: true,
        data: {
            post
        }
    });
});

/**
 * Create new forum post
 */
const createPost = catchAsync(async (req, res, next) => {
    const { title, content, category, tags } = req.body;

    const post = new ForumPost({
        title,
        content,
        category,
        tags: tags || [],
        author: req.userId,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    await post.save();

    // Populate author info
    await post.populate('author', 'username fullName profilePicture role');

    // Update user's post count
    await User.findByIdAndUpdate(req.userId, {
        $inc: { postsCount: 1 }
    });

    res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: {
            post
        }
    });
});

/**
 * Update forum post
 */
const updatePost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { title, content, category, tags } = req.body;

    const post = await ForumPost.findById(id);

    if (!post) {
        return next(new NotFoundError('Post not found'));
    }

    // Check if user is author or has admin/moderator role
    const user = await User.findById(req.userId);
    if (post.author.toString() !== req.userId && !['admin', 'moderator'].includes(user.role)) {
        return next(new AuthorizationError('Not authorized to update this post'));
    }

    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;
    if (tags) post.tags = tags;
    
    post.updatedAt = new Date();
    post.isEdited = true;

    await post.save();
    await post.populate('author', 'username fullName profilePicture role');

    res.json({
        success: true,
        message: 'Post updated successfully',
        data: {
            post
        }
    });
});

/**
 * Delete forum post
 */
const deletePost = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const post = await ForumPost.findById(id);

    if (!post) {
        return next(new NotFoundError('Post not found'));
    }

    // Check if user is author or has admin/moderator role
    const user = await User.findById(req.userId);
    if (post.author.toString() !== req.userId && !['admin', 'moderator'].includes(user.role)) {
        return next(new AuthorizationError('Not authorized to delete this post'));
    }

    // Delete all comments associated with the post
    await Comment.deleteMany({ post: id });

    // Remove post from all users' saved/liked posts
    await User.updateMany(
        {},
        {
            $pull: {
                savedPosts: id,
                likedPosts: id
            }
        }
    );

    // Delete the post
    await ForumPost.findByIdAndDelete(id);

    // Update user's post count
    await User.findByIdAndUpdate(post.author, {
        $inc: { postsCount: -1 }
    });

    res.json({
        success: true,
        message: 'Post deleted successfully'
    });
});

/**
 * Like/Unlike forum post
 */
const toggleLike = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const post = await ForumPost.findById(id);
    if (!post) {
        return next(new NotFoundError('Post not found'));
    }

    const user = await User.findById(req.userId);
    const isLiked = user.likedPosts.includes(id);

    if (isLiked) {
        // Unlike
        user.likedPosts.pull(id);
        post.likes -= 1;
        post.likedBy.pull(req.userId);
    } else {
        // Like
        user.likedPosts.push(id);
        post.likes += 1;
        post.likedBy.push(req.userId);
    }

    await Promise.all([user.save(), post.save()]);

    // Send real-time notification to post author
    if (!isLiked && post.author.toString() !== req.userId) {
        const liker = await User.findById(req.userId);
        if (global.notificationService && liker) {
            await global.notificationService.createForumNotification(
                post.author.toString(),
                'post-liked',
                {
                    postId: post._id,
                    postTitle: post.title,
                    likerName: liker.fullName || liker.username,
                    likerId: req.userId
                }
            );
        }

        // Real-time update to forum room
        if (global.socketService) {
            global.socketService.broadcastToRoom(`forum-post-${post._id}`, 'post-liked', {
                postId: post._id,
                userId: req.userId,
                likesCount: post.likes,
                liker: {
                    id: req.userId,
                    username: liker.username,
                    fullName: liker.fullName
                }
            });
        }
    }

    res.json({
        success: true,
        message: isLiked ? 'Post unliked' : 'Post liked',
        data: {
            isLiked: !isLiked,
            likesCount: post.likes
        }
    });
});

/**
 * Save/Unsave forum post
 */
const toggleSave = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const post = await ForumPost.findById(id);
    if (!post) {
        return next(new NotFoundError('Post not found'));
    }

    const user = await User.findById(req.userId);
    const isSaved = user.savedPosts.includes(id);

    if (isSaved) {
        // Unsave
        user.savedPosts.pull(id);
    } else {
        // Save
        user.savedPosts.push(id);
    }

    await user.save();

    res.json({
        success: true,
        message: isSaved ? 'Post removed from saved' : 'Post saved',
        data: {
            isSaved: !isSaved
        }
    });
});

/**
 * Add comment to post
 */
const addComment = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { content, parentComment } = req.body;

    const post = await ForumPost.findById(id);
    if (!post) {
        return next(new NotFoundError('Post not found'));
    }

    // Create comment
    const comment = new Comment({
        content,
        author: req.userId,
        post: id,
        parentComment: parentComment || null,
        createdAt: new Date()
    });

    await comment.save();
    await comment.populate('author', 'username fullName profilePicture role');

    // Update post
    if (!parentComment) {
        // Top-level comment
        post.comments.push(comment._id);
        post.commentsCount += 1;
        post.lastCommentAt = new Date();
        post.lastCommentBy = req.userId;
    } else {
        // Reply to comment
        const parentCommentDoc = await Comment.findById(parentComment);
        if (parentCommentDoc) {
            parentCommentDoc.replies.push(comment._id);
            await parentCommentDoc.save();
        }
    }

    await post.save();

    // Update user's comment count
    await User.findByIdAndUpdate(req.userId, {
        $inc: { commentsCount: 1 }
    });

    // Send real-time notification to post author
    if (post.author.toString() !== req.userId) {
        const commenter = await User.findById(req.userId);
        if (global.notificationService && commenter) {
            await global.notificationService.createForumNotification(
                post.author.toString(),
                'post-commented',
                {
                    postId: post._id,
                    postTitle: post.title,
                    commentId: comment._id,
                    commenterName: commenter.fullName || commenter.username,
                    commenterId: req.userId,
                    commentContent: content.substring(0, 100)
                }
            );
        }
    }

    // Send notification to parent comment author if it's a reply
    if (parentComment) {
        const parentCommentDoc = await Comment.findById(parentComment);
        if (parentCommentDoc && parentCommentDoc.author.toString() !== req.userId) {
            const commenter = await User.findById(req.userId);
            if (global.notificationService && commenter) {
                await global.notificationService.createForumNotification(
                    parentCommentDoc.author.toString(),
                    'comment-replied',
                    {
                        postId: post._id,
                        postTitle: post.title,
                        commentId: comment._id,
                        parentCommentId: parentComment,
                        replierName: commenter.fullName || commenter.username,
                        replierId: req.userId,
                        replyContent: content.substring(0, 100)
                    }
                );
            }
        }
    }

    // Real-time update to forum room
    if (global.socketService) {
        global.socketService.broadcastToRoom(`forum-post-${post._id}`, 'new-comment', {
            postId: post._id,
            comment: comment.toObject(),
            commentsCount: post.commentsCount
        });
    }

    res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: {
            comment
        }
    });
});

/**
 * Get trending posts
 */
const getTrendingPosts = catchAsync(async (req, res, next) => {
    const { limit = 5 } = req.query;

    // Calculate trending score based on likes, comments, and recency
    const posts = await ForumPost.aggregate([
        {
            $addFields: {
                trendingScore: {
                    $add: [
                        { $multiply: ['$likes', 2] },
                        { $multiply: ['$commentsCount', 3] },
                        { $multiply: ['$views', 0.1] },
                        {
                            $divide: [
                                { $subtract: [new Date(), '$createdAt'] },
                                -86400000 // Negative to give higher score to recent posts
                            ]
                        }
                    ]
                }
            }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: parseInt(limit) }
    ]);

    // Populate author information
    await ForumPost.populate(posts, {
        path: 'author',
        select: 'username fullName profilePicture role'
    });

    res.json({
        success: true,
        data: {
            posts
        }
    });
});

/**
 * Get forum statistics
 */
const getForumStats = catchAsync(async (req, res, next) => {
    const stats = await Promise.all([
        ForumPost.countDocuments(),
        Comment.countDocuments(),
        ForumPost.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        ForumPost.find({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).countDocuments()
    ]);

    res.json({
        success: true,
        data: {
            totalPosts: stats[0],
            totalComments: stats[1],
            postsByCategory: stats[2],
            postsToday: stats[3]
        }
    });
});

/**
 * Report post
 */
const reportPost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason, description } = req.body;

    const post = await ForumPost.findById(id);
    if (!post) {
        return next(new NotFoundError('Post not found'));
    }

    // Add report
    post.reports.push({
        reportedBy: req.userId,
        reason,
        description,
        reportedAt: new Date()
    });

    await post.save();

    res.json({
        success: true,
        message: 'Post reported successfully'
    });
});

module.exports = {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    toggleSave,
    addComment,
    getTrendingPosts,
    getForumStats,
    reportPost
};