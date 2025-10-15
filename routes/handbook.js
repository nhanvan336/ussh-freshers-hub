const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error');
const { isAuthenticated, optionalAuth, isAdmin } = require('../middleware/auth');
const { validateEvent, validateObjectId } = require('../middleware/validation');
const Event = require('../models/Event');
const User = require('../models/User');

// University Handbook main page
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  try {
    // Get upcoming events
    const upcomingEvents = await Event.find({
      startDate: { $gte: new Date() },
      status: 'published',
      isPublic: true
    })
      .sort({ startDate: 1 })
      .limit(5);
    
    // Get featured events
    const featuredEvents = await Event.find({
      isFeatured: true,
      status: 'published',
      isPublic: true
    })
      .sort({ startDate: 1 })
      .limit(3);
    
    // University information sections
    const sections = [
      {
        id: 'map',
        title: 'Bản đồ trường',
        description: 'Sơ đồ tương tác khuôn viên trường',
        icon: 'fas fa-map-marked-alt',
        url: '/handbook/campus-map'
      },
      {
        id: 'contacts',
        title: 'Danh bạ phòng ban',
        description: 'Thông tin liên hệ các phòng ban',
        icon: 'fas fa-address-book',
        url: '/handbook/contacts'
      },
      {
        id: 'calendar',
        title: 'Lịch năm học',
        description: 'Lịch học tập và sự kiện quan trọng',
        icon: 'fas fa-calendar-alt',
        url: '/handbook/academic-calendar'
      },
      {
        id: 'library',
        title: 'Hướng dẫn thư viện',
        description: 'Cách sử dụng thư viện hiệu quả',
        icon: 'fas fa-book',
        url: '/handbook/library-guide'
      },
      {
        id: 'clubs',
        title: 'Câu lạc bộ & Đoàn thể',
        description: 'Danh sách các CLB và hoạt động ngoại khóa',
        icon: 'fas fa-users',
        url: '/handbook/clubs'
      },
      {
        id: 'policies',
        title: 'Quy định & Chính sách',
        description: 'Các quy định quan trọng của trường',
        icon: 'fas fa-file-contract',
        url: '/handbook/policies'
      }
    ];
    
    res.render('pages/handbook/index', {
      title: 'Cẩm nang Đại học - USSH Freshers\' Hub',
      upcomingEvents,
      featuredEvents,
      sections,
      user: req.user
    });
  } catch (error) {
    console.error('Handbook page error:', error);
    res.render('pages/handbook/index', {
      title: 'Cẩm nang Đại học - USSH Freshers\' Hub',
      upcomingEvents: [],
      featuredEvents: [],
      sections: [],
      error: 'Có lỗi xảy ra khi tải thông tin cẩm nang',
      user: req.user
    });
  }
}));

// Campus Map
router.get('/campus-map', (req, res) => {
  const locations = [
    {
      id: 'building-a',
      name: 'Tòa nhà A',
      description: 'Phòng hành chính, đào tạo',
      facilities: ['Phòng Đào tạo', 'Phòng Tài chính', 'Phòng CTSV'],
      coordinates: { x: 100, y: 150 }
    },
    {
      id: 'building-b',
      name: 'Tòa nhà B',
      description: 'Thư viện và phòng học',
      facilities: ['Thư viện tổng hợp', 'Phòng học lớn', 'Phòng đọc sách'],
      coordinates: { x: 200, y: 100 }
    },
    {
      id: 'building-c',
      name: 'Tòa nhà C',
      description: 'Căn tin và khu vực sinh hoạt',
      facilities: ['Căn tin chính', 'Quán cafe', 'Cửa hàng tiện lợi'],
      coordinates: { x: 150, y: 250 }
    },
    {
      id: 'dormitory',
      name: 'Ký túc xá',
      description: 'Khu nhà ở sinh viên',
      facilities: ['Phòng ở sinh viên', 'Phòng sinh hoạt chung'],
      coordinates: { x: 300, y: 200 }
    }
  ];
  
  res.render('pages/handbook/campus-map', {
    title: 'Bản đồ trường - USSH Freshers\' Hub',
    locations,
    user: req.user
  });
});

// Department Contacts
router.get('/contacts', (req, res) => {
  const departments = [
    {
      name: 'Phòng Đào tạo',
      location: 'Tầng 2, Tòa A',
      phone: '024-3833-4057',
      email: 'daotao@ussh.edu.vn',
      hours: '8:00-17:00 (Thứ 2-6)',
      services: ['Đăng ký môn học', 'Bảng điểm', 'Giấy xác nhận']
    },
    {
      name: 'Phòng Tài chính - Kế toán',
      location: 'Tầng 1, Tòa A',
      phone: '024-3833-4060',
      email: 'taichinh@ussh.edu.vn',
      hours: '8:00-17:00 (Thứ 2-6)',
      services: ['Nộp học phí', 'Học bổng', 'Hóa đơn']
    },
    {
      name: 'Phòng Công tác Sinh viên',
      location: 'Tầng 3, Tòa A',
      phone: '024-3833-4055',
      email: 'ctsv@ussh.edu.vn',
      hours: '8:00-17:00 (Thứ 2-6)',
      services: ['Ký túc xá', 'Hỗ trợ sinh viên', 'Hoạt động đoàn thể']
    },
    {
      name: 'Thư viện',
      location: 'Tầng 1-3, Tòa B',
      phone: '024-3833-4065',
      email: 'thuvien@ussh.edu.vn',
      hours: '7:30-21:30 (Thứ 2-7), 8:00-17:00 (Chủ nhật)',
      services: ['Mượn sách', 'Tìm kiếm tài liệu', 'Phòng đọc riêng']
    },
    {
      name: 'Phòng CNTT',
      location: 'Tầng 4, Tòa A',
      phone: '024-3833-4070',
      email: 'cntt@ussh.edu.vn',
      hours: '8:00-17:00 (Thứ 2-6)',
      services: ['Hỗ trợ kỹ thuật', 'WiFi', 'Email sinh viên']
    }
  ];
  
  res.render('pages/handbook/contacts', {
    title: 'Danh bạ phòng ban - USSH Freshers\' Hub',
    departments,
    user: req.user
  });
});

// Academic Calendar
router.get('/academic-calendar', optionalAuth, asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const currentDate = new Date();
  const selectedMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
  const selectedYear = year ? parseInt(year) : currentDate.getFullYear();
  
  try {
    // Get events for the selected month
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0);
    
    const events = await Event.find({
      $or: [
        {
          startDate: {
            $gte: startDate,
            $lte: endDate
          }
        },
        {
          endDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      ],
      status: 'published',
      isPublic: true
    })
      .sort({ startDate: 1 });
    
    // Important academic dates
    const academicDates = [
      {
        date: '2024-09-02',
        title: 'Khai giảng năm học 2024-2025',
        type: 'academic'
      },
      {
        date: '2024-10-15',
        title: 'Hết hạn đăng ký môn học kỳ 1',
        type: 'deadline'
      },
      {
        date: '2024-12-20',
        title: 'Thi cuối kỳ 1',
        type: 'exam'
      },
      {
        date: '2025-01-15',
        title: 'Bắt đầu kỳ 2',
        type: 'academic'
      }
    ];
    
    res.render('pages/handbook/academic-calendar', {
      title: 'Lịch năm học - USSH Freshers\' Hub',
      events,
      academicDates,
      selectedMonth,
      selectedYear,
      user: req.user
    });
  } catch (error) {
    console.error('Academic calendar error:', error);
    res.render('pages/handbook/academic-calendar', {
      title: 'Lịch năm học - USSH Freshers\' Hub',
      events: [],
      academicDates: [],
      selectedMonth,
      selectedYear,
      error: 'Có lỗi xảy ra khi tải lịch học',
      user: req.user
    });
  }
}));

// Library Guide
router.get('/library-guide', (req, res) => {
  const libraryInfo = {
    hours: {
      weekdays: '7:30 - 21:30',
      weekends: '8:00 - 17:00'
    },
    floors: [
      {
        floor: 'Tầng 1',
        sections: ['Quầy tiếp nhận', 'Sách giáo trình', 'Báo chí tạp chí']
      },
      {
        floor: 'Tầng 2',
        sections: ['Sách chuyên ngành', 'Phòng đọc riêng', 'Khu vực đọc sách']
      },
      {
        floor: 'Tầng 3',
        sections: ['Tài liệu tham khảo', 'Phòng học nhóm', 'Khu vực máy tính']
      }
    ],
    services: [
      'Mượn sách (tối đa 5 cuốn/15 ngày)',
      'Tìm kiếm tài liệu trực tuyến',
      'In ấn, photocopy',
      'Truy cập cơ sở dữ liệu',
      'Hỗ trợ nghiên cứu'
    ],
    rules: [
      'Xuất trình thẻ sinh viên khi vào thư viện',
      'Giữ yên lặng trong khu vực đọc sách',
      'Không mang thức ăn vào thư viện',
      'Tắt tiếng điện thoại hoặc để chế độ rùng',
      'Trả sách đúng hạn để tránh phạt'
    ]
  };
  
  res.render('pages/handbook/library-guide', {
    title: 'Hướng dẫn thư viện - USSH Freshers\' Hub',
    libraryInfo,
    user: req.user
  });
});

// Clubs and Organizations
router.get('/clubs', (req, res) => {
  const clubs = [
    {
      name: 'Câu lạc bộ Văn học',
      description: 'Hoạt động văn học, thơ ca, sang tác',
      contact: 'vanhoc@ussh.edu.vn',
      activities: ['Thi viết thơ', 'Hội thảo văn học', 'Xuất bản tập chí'],
      meeting: 'Thứ 6 hàng tuần, 15:00-17:00'
    },
    {
      name: 'Câu lạc bộ Lịch sử',
      description: 'Nghiên cứu và trao đổi kiến thức lịch sử',
      contact: 'lichsu@ussh.edu.vn',
      activities: ['Hội thảo chuyên đề', 'Tham quan di tích', 'Nghiên cứu sử liệu'],
      meeting: 'Thứ 4 hàng tuần, 14:00-16:00'
    },
    {
      name: 'Câu lạc bộ Tâm lý học',
      description: 'Tìm hiểu và ứng dụng kiến thức tâm lý',
      contact: 'tamly@ussh.edu.vn',
      activities: ['Workshop tâm lý', 'Tư vấn đồng trang lứa tuổi', 'Game tâm lý'],
      meeting: 'Thứ 7 hàng tuần, 9:00-11:00'
    },
    {
      name: 'Câu lạc bộ Báo chí',
      description: 'Hoạt động truyền thông và báo chí',
      contact: 'baochi@ussh.edu.vn',
      activities: ['Làm báo', 'Phỏng vấn', 'Workshop kỹ năng viết'],
      meeting: 'Chủ nhật hàng tuần, 14:00-16:00'
    },
    {
      name: 'Đoàn Thanh niên',
      description: 'Hoạt động đoàn thể và tình nguyện',
      contact: 'doan@ussh.edu.vn',
      activities: ['Hoạt động tình nguyện', 'Chưọng trình kết nối', 'Giáo dục lý tưởng'],
      meeting: 'Thứ 3 hàng tuần, 15:30-17:30'
    }
  ];
  
  res.render('pages/handbook/clubs', {
    title: 'Câu lạc bộ & Đoàn thể - USSH Freshers\' Hub',
    clubs,
    user: req.user
  });
});

// Policies and Regulations
router.get('/policies', (req, res) => {
  const policies = [
    {
      title: 'Quy chế đào tạo',
      description: 'Các quy định về học tập, thi cử, đánh giá',
      sections: [
        'Điều kiện tốt nghiệp',
        'Quy định về điểm số',
        'Thủ tục xin nghỉ học',
        'Xử lý vi phạm học tập'
      ]
    },
    {
      title: 'Quy định nội trú',
      description: 'Các quy định dành cho sinh viên ở ký túc xá',
      sections: [
        'Giờ ra vào ký túc xá',
        'Quy định về vệ sinh',
        'Sử dụng thiết bị chung',
        'Xử lý vi phạm'
      ]
    },
    {
      title: 'Quy định về học bổng',
      description: 'Tiêu chí và thủ tục xin học bổng',
      sections: [
        'Học bổng học tập giỏi',
        'Học bổng khó khăn',
        'Học bổng tài trợ',
        'Thủ tục nộp hồ sơ'
      ]
    },
    {
      title: 'Quy định sử dụng thư viện',
      description: 'Hướng dẫn sử dụng dịch vụ thư viện',
      sections: [
        'Thủ tục mượn sách',
        'Sử dụng phòng đọc',
        'Truy cập tài nguyên số',
        'Quy định phạt'
      ]
    }
  ];
  
  res.render('pages/handbook/policies', {
    title: 'Quy định & Chính sách - USSH Freshers\' Hub',
    policies,
    user: req.user
  });
});

// View event details
router.get('/event/:id', optionalAuth, validateObjectId('id'), asyncHandler(async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'username fullName')
      .populate('participants.user', 'username fullName');
    
    if (!event || event.status !== 'published' || !event.isPublic) {
      return res.status(404).render('pages/404', {
        title: 'Không tìm thấy sự kiện - USSH Freshers\' Hub',
        user: req.user
      });
    }
    
    // Get related events
    const relatedEvents = await Event.find({
      _id: { $ne: event._id },
      $or: [
        { category: event.category },
        { tags: { $in: event.tags } }
      ],
      status: 'published',
      isPublic: true
    })
      .sort({ startDate: 1 })
      .limit(3);
    
    res.render('pages/handbook/event', {
      title: `${event.title} - USSH Freshers\' Hub`,
      event,
      relatedEvents,
      user: req.user
    });
  } catch (error) {
    console.error('Event view error:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - USSH Freshers\' Hub',
      message: 'Có lỗi xảy ra khi tải thông tin sự kiện',
      user: req.user
    });
  }
}));

// Register for event
router.post('/event/:id/register',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      
      if (!event || event.status !== 'published' || !event.isPublic) {
        return res.status(404).json({
          success: false,
          message: 'Sự kiện không tồn tại'
        });
      }
      
      if (!event.registrationRequired) {
        return res.status(400).json({
          success: false,
          message: 'Sự kiện này không yêu cầu đăng ký'
        });
      }
      
      try {
        event.registerUser(req.user._id);
        await event.save();
        
        res.json({
          success: true,
          message: 'Đăng ký tham gia sự kiện thành công!'
        });
      } catch (registrationError) {
        res.status(400).json({
          success: false,
          message: registrationError.message
        });
      }
    } catch (error) {
      console.error('Event registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi đăng ký sự kiện'
      });
    }
  })
);

// Unregister from event
router.post('/event/:id/unregister',
  isAuthenticated,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Sự kiện không tồn tại'
        });
      }
      
      try {
        event.unregisterUser(req.user._id);
        await event.save();
        
        res.json({
          success: true,
          message: 'Hủy đăng ký thành công'
        });
      } catch (unregistrationError) {
        res.status(400).json({
          success: false,
          message: unregistrationError.message
        });
      }
    } catch (error) {
      console.error('Event unregistration error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi hủy đăng ký'
      });
    }
  })
);

module.exports = router;